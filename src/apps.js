export const factory = Object.freeze({
  owner: 'soutarounaka1016-max',
  dashboardRepo: 'codex',
  excludedRepos: ['codex'],
});

const appOverrides = {
  'study-canvas': {
    name: 'Study Canvas',
    description: '受験勉強の計画、手書きキャンバス、タスクを一か所で管理するWebアプリ。',
    publicUrl: 'https://soutarounaka1016-max.github.io/study-canvas/',
  },
  'business-idea-manager': {
    name: '事業アイデア管理アプリ',
    description: '思いついた事業アイデアを調査、仮説、検証、改善、事業化候補まで育てるWebアプリ。',
    publicUrl: 'https://soutarounaka1016-max.github.io/business-idea-manager/',
  },
};

/**
 * GitHub APIが一時的に失敗しても、主要アプリだけは表示を継続します。
 * 新しい公開アプリはGitHub Pagesの有効化後に自動検出されるため、通常は追記不要です。
 */
export const pinnedApps = Object.entries(appOverrides).map(([repo, override]) => ({
  id: repo,
  owner: factory.owner,
  repo,
  developmentStatus: 'active',
  ...override,
}));

const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value.trim());

export function formatRepositoryName(repoName = '') {
  return repoName
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.length <= 3 ? word.toUpperCase() : `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

export function isDiscoverableRepository(repo, config = factory) {
  const excluded = new Set([config.dashboardRepo, ...(config.excludedRepos || [])]);
  return Boolean(
    repo?.name
    && repo.has_pages
    && repo.private !== true
    && !repo.archived
    && !repo.fork
    && !excluded.has(repo.name),
  );
}

export function repositoryToApp(repo, defaultOwner = factory.owner) {
  const repoName = repo?.name || '';
  const owner = repo?.owner?.login || defaultOwner;
  const override = appOverrides[repoName] || {};
  const defaultPublicUrl = `https://${owner}.github.io/${repoName}/`;

  return {
    id: repoName,
    name: override.name || formatRepositoryName(repoName) || repoName,
    description: override.description || repo?.description || 'GitHub Pagesで公開されているWebアプリ。',
    owner,
    repo: repoName,
    publicUrl: override.publicUrl || (isHttpUrl(repo?.homepage) ? repo.homepage.trim() : defaultPublicUrl),
    developmentStatus: repo?.archived ? 'paused' : 'active',
    updatedAt: repo?.pushed_at || repo?.updated_at || '',
  };
}

export function mergeApps(...groups) {
  const appsByRepo = new Map();
  groups.flat().filter(Boolean).forEach((app) => {
    if (!app.owner || !app.repo) return;
    const key = `${app.owner}/${app.repo}`;
    appsByRepo.set(key, { ...(appsByRepo.get(key) || {}), ...app });
  });

  return [...appsByRepo.values()].sort((a, b) => {
    const updatedDifference = (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0);
    return updatedDifference || a.name.localeCompare(b.name, 'ja');
  });
}
