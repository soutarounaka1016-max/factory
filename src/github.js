const API = 'https://api.github.com';
const CACHE_PREFIX = 'ai-factory-dashboard:snapshot:';

async function fetchJson(endpoint, signal) {
  try {
    const response = await fetch(`${API}${endpoint}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal,
    });
    if (!response.ok) return { error: { endpoint, status: response.status, message: `HTTP ${response.status}` } };
    return { data: await response.json() };
  } catch (error) {
    return { error: { endpoint, message: error instanceof Error ? error.message : '不明な通信エラー' } };
  }
}

const cacheKey = (config) => `${CACHE_PREFIX}${config.owner}/${config.repo}`;

function saveCache(snapshot) {
  try { localStorage.setItem(cacheKey(snapshot.config), JSON.stringify({ ...snapshot, fromCache: false })); } catch { /* 表示継続 */ }
}

function readCache(config) {
  try {
    const raw = localStorage.getItem(cacheKey(config));
    return raw ? { ...JSON.parse(raw), config, fromCache: true } : undefined;
  } catch { return undefined; }
}

const isDeployWorkflow = (run) => /(pages|deploy|deployment|公開)/i.test(run?.name || '');
const isQualityWorkflow = (run) => /(\bci\b|test|build|check|検証|テスト)/i.test(run?.name || '') && !isDeployWorkflow(run);

export async function loadSnapshot(config, signal) {
  const root = `/repos/${config.owner}/${config.repo}`;
  const [repo, commits, runs, pulls] = await Promise.all([
    fetchJson(root, signal),
    fetchJson(`${root}/commits?per_page=1`, signal),
    fetchJson(`${root}/actions/runs?branch=main&per_page=20`, signal),
    fetchJson(`${root}/pulls?state=open&per_page=5`, signal),
  ]);

  const workflowRuns = runs.data?.workflow_runs || [];
  const latestWorkflow = workflowRuns[0];
  const latestRun = workflowRuns.find(isQualityWorkflow)
    || workflowRuns.find((run) => !isDeployWorkflow(run))
    || latestWorkflow;
  const deployRun = workflowRuns.find(isDeployWorkflow);
  const selectedRuns = [latestRun, deployRun].filter((run, index, array) => run && array.findIndex((item) => item.id === run.id) === index);
  const jobResponses = await Promise.all(selectedRuns.map((run) => fetchJson(`${root}/actions/runs/${run.id}/jobs?per_page=100`, signal)));
  const jobs = jobResponses.flatMap((response) => response.data?.jobs || []);
  const errors = [repo.error, commits.error, runs.error, pulls.error, ...jobResponses.map((response) => response.error)].filter(Boolean);

  const fresh = {
    config,
    fetchedAt: new Date().toISOString(),
    fromCache: false,
    repo: repo.data,
    commit: commits.data?.[0],
    latestWorkflow,
    latestRun,
    deployRun,
    jobs,
    pullRequests: pulls.data || [],
    errors,
  };
  if (fresh.repo || fresh.commit || fresh.latestWorkflow) {
    saveCache(fresh);
    return fresh;
  }
  const cached = readCache(config);
  return cached ? { ...cached, errors, fetchedAt: fresh.fetchedAt } : fresh;
}
