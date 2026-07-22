export const factory = Object.freeze({
  owner: 'soutarounaka1016-max',
  dashboardRepo: 'factory',
  excludedRepos: ['factory', 'codex'],
});

const businessIdeaMetadata = {
  name: '事業アイデア管理アプリ',
  description: '思いついた事業アイデアを調査、仮説、検証、改善、事業化候補まで育てるWebアプリ。',
  memo: '実際の利用で、入力のしやすさと検証記録の流れを確認する。',
  priority: 4,
};

const appOverrides = {
  'study-canvas': {
    name: 'Study Canvas',
    description: '受験勉強の計画、手書きキャンバス、タスクを一か所で管理するWebアプリ。',
    publicUrl: 'https://soutarounaka1016-max.github.io/study-canvas/',
    memo: '手動タスクカード、週間目標、自由ノートを中心に改善する。',
    priority: 5,
  },
  'idea.withGPT': {
    ...businessIdeaMetadata,
    publicUrl: 'https://soutarounaka1016-max.github.io/idea.withGPT/',
  },
  // 旧名のリポジトリがAPIやテストデータから返った場合だけ同じ日本語表示を使う。
  // 固定登録はしないため、現在の正式版と二重表示にはならない。
  'business-idea-manager': {
    ...businessIdeaMetadata,
    publicUrl: 'https://soutarounaka1016-max.github.io/business-idea-manager/',
  },
  market: {
    name: 'Market',
    memo: '公開状態を維持し、重大なエラーが出たときだけ対応する。',
    priority: 2,
  },
};

/**
 * GitHub APIが一時的に失敗しても、中心アプリだけは表示を継続します。
 * 事業アイデア管理アプリは正式リポジトリをAPIから自動検出し、旧名を固定登録しません。
 */
export const pinnedApps = ['study-canvas'].map((repo) => ({
  id: repo,
  owner: factory.owner,
  repo,
  developmentStatus: 'active',
  ...appOverrides[repo],
}));

const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value.trim());

export function formatRepositoryName(repoName = '') {
  return repoName
    .split(/[-_.]+/)
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
    memo: override.memo || '次の更新内容は、実際の利用結果を見て決める。',
    priority: override.priority || 3,
  };
}

export function mergeApps(...groups) {
  const appsByRepo = new Map();
  groups.flat().filter(Boolean).forEach((app) => {
    if (!app.owner || !app.repo) return;
    const key = `${app.owner.toLowerCase()}/${app.repo.toLowerCase()}`;
    appsByRepo.set(key, { ...(appsByRepo.get(key) || {}), ...app });
  });

  return [...appsByRepo.values()].sort((a, b) => {
    const updatedDifference = (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0);
    return updatedDifference || a.name.localeCompare(b.name, 'ja');
  });
}