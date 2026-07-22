import './styles.css';
import { factory, pinnedApps } from './apps.js';
import { discoverApps, loadSnapshot } from './github.js';
import { deriveState } from './status.js';
import { firstLine, formatDate, shortSha } from './format.js';

const root = document.querySelector('#app');
if (!root) throw new Error('App root was not found');

let snapshots = [];
let appConfigs = pinnedApps;
let controller;
let loading = false;
let updateState = 'idle';
let updateMessage = '初回取得を開始します。';

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const statusHtml = (status) => `<span class="status status-${status.tone}" title="${escapeHtml(status.detail || status.label)}"><span aria-hidden="true">${status.icon}</span>${escapeHtml(status.label)}</span>`;
const link = (url, label, className = 'action-link') => `<a class="${className} external" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;

function linksFor(snapshot) {
  const base = `https://github.com/${snapshot.config.owner}/${snapshot.config.repo}`;
  return { repo: base, actions: `${base}/actions`, pulls: `${base}/pulls`, issues: `${base}/issues` };
}

function progressFor(state) {
  if (state.overall.tone === 'danger') return { value: 62, label: '修正中' };
  if (state.overall.tone === 'running') return { value: 82, label: '自動確認中' };
  if (state.overall.tone === 'warning' || state.overall.tone === 'neutral') return { value: 88, label: '確認待ち' };
  if (state.publication.tone === 'success' && state.tests.tone === 'success' && state.build.tone === 'success') return { value: 100, label: '公開完了' };
  return { value: 45, label: '開発中' };
}

function priorityFor(snapshot, state) {
  if (state.overall.tone === 'danger') return { score: 5, reason: '失敗した確認があるため最優先' };
  if (state.overall.tone === 'running') return { score: 4, reason: '処理完了後の確認が必要' };
  if (state.overall.tone === 'warning' || state.overall.tone === 'neutral') return { score: 3, reason: '未確認項目を減らす必要がある' };
  const configured = Math.max(1, Math.min(5, snapshot.config.priority || 2));
  return { score: configured, reason: configured >= 4 ? '利用頻度と重要度が高い' : '現在は安定稼働を優先' };
}

function card(snapshot) {
  const state = deriveState(snapshot);
  const links = linksFor(snapshot);
  const progress = progressFor(state);
  const priority = priorityFor(snapshot, state);
  return `<article class="app-card" data-app-id="${escapeHtml(snapshot.config.id)}">
    <div class="card-header">
      <div class="card-title"><h3>${escapeHtml(snapshot.config.name)}</h3><p>${escapeHtml(snapshot.config.description)}</p></div>
      ${statusHtml(state.overall)}
    </div>
    <div class="pipeline" aria-label="開発進行度 ${progress.value}%"><div class="pipeline-top"><span>${escapeHtml(progress.label)}</span><strong>${progress.value}%</strong></div><div class="pipeline-track"><span style="width:${progress.value}%"></span></div></div>
    <dl class="status-grid">
      <div class="status-cell"><dt>開発状態</dt><dd>${statusHtml(state.development)}</dd></div>
      <div class="status-cell"><dt>公開状態</dt><dd>${statusHtml(state.publication)}</dd></div>
      <div class="status-cell"><dt>最新テスト</dt><dd>${statusHtml(state.tests)}</dd></div>
      <div class="status-cell"><dt>ビルド</dt><dd>${statusHtml(state.build)}</dd></div>
      <div class="status-cell"><dt>Chromium</dt><dd>${statusHtml(state.chromium)}</dd></div>
      <div class="status-cell"><dt>WebKit</dt><dd>${statusHtml(state.webkit)}</dd></div>
      <div class="status-cell"><dt>Pages確認</dt><dd>${statusHtml(state.pages)}</dd></div>
      <div class="status-cell"><dt>優先度</dt><dd><span class="priority-stars" aria-label="優先度 ${priority.score} / 5">${'★'.repeat(priority.score)}${'☆'.repeat(5 - priority.score)}</span></dd></div>
    </dl>
    <div class="memo-box"><strong>AIメモ</strong><p>${escapeHtml(snapshot.config.memo || state.nextAction)}</p><small>${escapeHtml(priority.reason)}</small></div>
    <div class="commit-box"><p><strong>${escapeHtml(shortSha(snapshot.commit?.sha))}</strong> ${escapeHtml(firstLine(snapshot.commit?.commit?.message))}</p><p class="commit-meta">更新 ${escapeHtml(formatDate(snapshot.commit?.commit?.author?.date || snapshot.repo?.pushed_at))}${snapshot.fromCache ? '・前回取得データ' : ''}</p></div>
    <div class="card-actions">
      ${link(snapshot.config.publicUrl, '開く')}
      ${link(links.repo, 'GitHub')}
      ${link(links.issues, 'Issues')}
      ${link(links.actions, 'Actions')}
      ${link(links.pulls, 'Pull Request')}
      <button class="detail-button" type="button" data-detail="${escapeHtml(snapshot.config.id)}">詳細を確認</button>
    </div>
  </article>`;
}

function metrics() {
  const states = snapshots.map(deriveState);
  const workflowRuns = snapshots.flatMap((snapshot) => [snapshot.latestRun, snapshot.deployRun].filter(Boolean));
  const successfulRuns = workflowRuns.filter((run) => run.conclusion === 'success').length;
  const completedRuns = workflowRuns.filter((run) => run.status === 'completed').length;
  return {
    total: snapshots.length,
    healthy: states.filter((state) => state.overall.tone === 'success').length,
    attention: states.filter((state) => state.overall.tone !== 'success').length,
    openPrs: snapshots.reduce((sum, item) => sum + (item.pullRequests?.length || 0), 0),
    successRate: completedRuns ? Math.round((successfulRuns / completedRuns) * 100) : 0,
  };
}

function errorItems() {
  return snapshots.flatMap((snapshot) => {
    const state = deriveState(snapshot);
    const issues = [];
    if (state.tests.tone === 'danger') issues.push('テスト失敗');
    if (state.build.tone === 'danger') issues.push('ビルド失敗');
    if (state.publication.tone === 'danger') issues.push('公開失敗');
    if (state.pages.tone === 'warning') issues.push('公開URL未確認');
    if (snapshot.errors?.length) issues.push(`情報取得失敗 ${snapshot.errors.length}件`);
    if (!issues.length && ['warning', 'neutral'].includes(state.overall.tone)) issues.push('確認結果が不足');
    return issues.map((issue) => ({ name: snapshot.config.name, issue, id: snapshot.config.id }));
  });
}

function historyItems() {
  return snapshots
    .filter((snapshot) => snapshot.commit)
    .sort((a, b) => Date.parse(b.commit.commit.author.date) - Date.parse(a.commit.commit.author.date))
    .slice(0, 8);
}

function factoryNow() {
  const states = snapshots.map((snapshot) => ({ snapshot, state: deriveState(snapshot) }));
  const broken = states.find(({ state }) => state.overall.tone === 'danger');
  const running = states.find(({ state }) => state.overall.tone === 'running');
  const uncertain = states.find(({ state }) => ['warning', 'neutral'].includes(state.overall.tone));
  if (broken) return { tone: 'danger', title: '修正が必要', detail: `${broken.snapshot.config.name}で失敗を検出しています。` };
  if (running) return { tone: 'running', title: '自動確認中', detail: `${running.snapshot.config.name}のGitHub Actionsが動いています。` };
  if (uncertain) return { tone: 'warning', title: '確認が必要', detail: `${uncertain.snapshot.config.name}に未確認項目があります。` };
  if (states.length && states.every(({ state }) => state.overall.tone === 'success')) return { tone: 'success', title: '稼働中', detail: '取得できた全アプリの主要確認が成功しています。' };
  return { tone: 'neutral', title: '情報取得中', detail: '工場の状態を読み込んでいます。' };
}

function render() {
  const c = metrics();
  const errors = errorItems();
  const history = historyItems();
  const now = factoryNow();
  const overallHealth = c.total ? Math.round((c.healthy / c.total) * 100) : 0;
  root.innerHTML = `<div class="shell">
    <header class="topbar">
      <div><p class="eyebrow">AI FACTORY CONTROL ROOM</p><h1>AI工場ダッシュボード</h1><p class="subtitle">アプリの開発、テスト、公開、異常、次の作業を一画面で管理する司令室です。</p></div>
      <button id="refresh" class="refresh-button" type="button" ${loading ? 'disabled' : ''}>${loading ? '↻ 更新中' : '↻ 最新状態に更新'}</button>
    </header>
    <div class="update-banner" role="status" aria-live="polite" data-state="${updateState}"><span>${escapeHtml(updateMessage)}</span><span>${snapshots[0] ? `最終取得 ${escapeHtml(formatDate(snapshots[0].fetchedAt))}` : ''}</span></div>
    <main id="main">
      <section class="factory-status factory-${now.tone}" aria-labelledby="factory-title"><div><p class="eyebrow">FACTORY STATUS</p><h2 id="factory-title">${escapeHtml(now.title)}</h2><p>${escapeHtml(now.detail)}</p></div><div class="health-ring" aria-label="工場健康度 ${overallHealth}%"><strong>${overallHealth}%</strong><span>健康度</span></div></section>
      <section aria-labelledby="summary-title"><div class="section-heading"><h2 id="summary-title">全体概要</h2><p>工場全体の数字</p></div>
        <div class="summary-grid">
          <div class="summary-card"><strong>${c.total}</strong><span>公開アプリ</span></div>
          <div class="summary-card"><strong>${c.healthy}</strong><span>正常</span></div>
          <div class="summary-card"><strong>${c.attention}</strong><span>確認が必要</span></div>
          <div class="summary-card"><strong>${c.openPrs}</strong><span>開いているPR</span></div>
          <div class="summary-card"><strong>${c.successRate}%</strong><span>取得済み実行の成功率</span></div>
        </div>
      </section>
      <section aria-labelledby="errors-title"><div class="section-heading"><h2 id="errors-title">エラーセンター</h2><p>失敗と未確認項目を表示</p></div>
        <div class="error-center">${errors.length ? errors.map((item) => `<button type="button" data-detail="${escapeHtml(item.id)}"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.issue)}</span></button>`).join('') : '<div class="all-clear"><strong>重大なエラーなし</strong><span>全アプリの主要確認結果を取得できています。</span></div>'}</div>
      </section>
      <section aria-labelledby="apps-title"><div class="section-heading"><h2 id="apps-title">生産ラインとアプリ一覧</h2><p>企画 → 実装 → テスト → 公開</p></div>
        <div class="app-grid">${snapshots.length ? snapshots.map(card).join('') : '<div class="empty-state">アプリ一覧と状態を取得しています。</div>'}</div>
      </section>
      <section aria-labelledby="history-title"><div class="section-heading"><h2 id="history-title">更新履歴</h2><p>各アプリの最新コミット</p></div>
        <div class="history-list">${history.length ? history.map((snapshot) => `<article><time>${escapeHtml(formatDate(snapshot.commit.commit.author.date))}</time><div><strong>${escapeHtml(snapshot.config.name)}</strong><p>${escapeHtml(firstLine(snapshot.commit.commit.message))}</p></div><a class="external" href="${escapeHtml(snapshot.commit.html_url)}" target="_blank" rel="noopener noreferrer">確認</a></article>`).join('') : '<div class="empty-state">更新履歴を取得しています。</div>'}</div>
      </section>
    </main>
    <footer class="footer">公開GitHub APIから状態を読み取ります。認証情報は保存しません。匿名APIには回数制限があるため、更新ボタンの連打は控えてください。</footer>
  </div><dialog id="detail-dialog" aria-labelledby="detail-title"><div id="dialog-content"></div></dialog>`;
  root.querySelector('#refresh')?.addEventListener('click', refresh);
  root.querySelectorAll('[data-detail]').forEach((button) => button.addEventListener('click', () => openDetail(button.dataset.detail)));
}

function openDetail(id) {
  const snapshot = snapshots.find((item) => item.config.id === id);
  const dialog = root.querySelector('#detail-dialog');
  const content = root.querySelector('#dialog-content');
  if (!snapshot || !dialog || !content) return;
  const state = deriveState(snapshot);
  const links = linksFor(snapshot);
  const run = snapshot.latestWorkflow || snapshot.latestRun;
  const pr = snapshot.pullRequests?.[0];
  const runStatus = !run ? '未確認' : run.status !== 'completed' ? statusHtml({ label: '実行中', tone: 'running', icon: '↻' }) : run.conclusion === 'success' ? statusHtml({ label: '成功', tone: 'success', icon: '✓' }) : statusHtml({ label: '失敗', tone: 'danger', icon: '!' });
  content.innerHTML = `<div class="dialog-header"><div><h2 id="detail-title">${escapeHtml(snapshot.config.name)}</h2><p>${escapeHtml(snapshot.config.description)}</p></div><button class="close-button" type="button" aria-label="詳細を閉じる">×</button></div>
    <div class="dialog-body">
      <section class="detail-section"><h3>状態と最新情報</h3><dl class="detail-list">
        <dt>現在の状態</dt><dd>${statusHtml(state.overall)}</dd>
        <dt>最新コミット</dt><dd>${snapshot.commit ? `<a class="external" href="${escapeHtml(snapshot.commit.html_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(shortSha(snapshot.commit.sha))} ${escapeHtml(firstLine(snapshot.commit.commit.message))}</a>` : '未確認'}</dd>
        <dt>最新更新日時</dt><dd>${escapeHtml(formatDate(snapshot.commit?.commit?.author?.date || snapshot.repo?.pushed_at))}</dd>
        <dt>最新ワークフロー</dt><dd>${run ? `<a class="external" href="${escapeHtml(run.html_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(run.name)} #${run.run_number}</a> ${runStatus}` : runStatus}</dd>
        <dt>通常テスト</dt><dd>${statusHtml(state.tests)}</dd><dt>ビルド</dt><dd>${statusHtml(state.build)}</dd><dt>Chromium</dt><dd>${statusHtml(state.chromium)}</dd><dt>WebKit</dt><dd>${statusHtml(state.webkit)}</dd><dt>GitHub Pages</dt><dd>${statusHtml(state.pages)}</dd>
        <dt>Pull Request</dt><dd>${pr ? `<a class="external" href="${escapeHtml(pr.html_url)}" target="_blank" rel="noopener noreferrer">#${pr.number} ${escapeHtml(pr.title)}</a>` : '現在開いているPRなし'}</dd>
        <dt>取得日時</dt><dd>${escapeHtml(formatDate(snapshot.fetchedAt))}${snapshot.fromCache ? '（前回取得データ）' : ''}</dd>
      </dl></section>
      <section class="detail-section"><h3>AIメモと次の作業</h3><p>${escapeHtml(snapshot.config.memo || state.nextAction)}</p><p>${escapeHtml(state.nextAction)}</p></section>
      <section class="detail-section"><h3>自動ヘルスチェック</h3><div class="health-checks"><span>${statusHtml(state.tests)} テスト</span><span>${statusHtml(state.build)} ビルド</span><span>${statusHtml(state.chromium)} Chromium</span><span>${statusHtml(state.webkit)} WebKit</span><span>${statusHtml(state.pages)} 公開</span></div></section>
      <section class="detail-section"><h3>関連リンク</h3><div class="link-list">${link(snapshot.config.publicUrl, '公開URL')}${link(links.repo, 'リポジトリ')}${link(links.actions, 'GitHub Actions')}${link(links.pulls, 'Pull Request')}${link(links.issues, 'Issues')}</div></section>
      <section class="detail-section"><h3>エラー概要</h3>${snapshot.errors?.length ? `<ul class="error-list">${snapshot.errors.map((error) => `<li>${escapeHtml(error.endpoint)}: ${escapeHtml(error.message)}</li>`).join('')}</ul>` : '<p>取得エラーはありません。</p>'}</section>
    </div>`;
  content.querySelector('.close-button')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }, { once: true });
  dialog.showModal();
}

async function refresh() {
  controller?.abort();
  controller = new AbortController();
  loading = true;
  updateState = 'loading';
  updateMessage = 'GitHubからアプリ一覧と最新状態を取得しています。';
  render();
  try {
    const discovery = await discoverApps(factory, pinnedApps, controller.signal);
    appConfigs = discovery.apps;
    snapshots = await Promise.all(appConfigs.map((config) => loadSnapshot(config, controller.signal)));
    const errors = discovery.errors.length + snapshots.reduce((sum, item) => sum + (item.errors?.length || 0), 0);
    updateState = errors ? 'error' : 'success';
    updateMessage = errors ? `更新しましたが、${errors}件の情報を取得できませんでした。` : `最新状態へ更新しました。${appConfigs.length}件の公開アプリを検出しています。`;
  } catch (error) {
    updateState = 'error';
    updateMessage = `更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`;
  } finally {
    loading = false;
    render();
  }
}

render();
refresh();
