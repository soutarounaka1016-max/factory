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
  return { repo: base, actions: `${base}/actions`, pulls: `${base}/pulls` };
}

function card(snapshot) {
  const state = deriveState(snapshot);
  const links = linksFor(snapshot);
  return `<article class="app-card" data-app-id="${escapeHtml(snapshot.config.id)}">
    <div class="card-header">
      <div class="card-title"><h3>${escapeHtml(snapshot.config.name)}</h3><p>${escapeHtml(snapshot.config.description)}</p></div>
      ${statusHtml(state.overall)}
    </div>
    <dl class="status-grid">
      <div class="status-cell"><dt>開発状態</dt><dd>${statusHtml(state.development)}</dd></div>
      <div class="status-cell"><dt>公開状態</dt><dd>${statusHtml(state.publication)}</dd></div>
      <div class="status-cell"><dt>最新テスト</dt><dd>${statusHtml(state.tests)}</dd></div>
      <div class="status-cell"><dt>ビルド</dt><dd>${statusHtml(state.build)}</dd></div>
      <div class="status-cell"><dt>Chromium</dt><dd>${statusHtml(state.chromium)}</dd></div>
      <div class="status-cell"><dt>WebKit</dt><dd>${statusHtml(state.webkit)}</dd></div>
      <div class="status-cell"><dt>Pages確認</dt><dd>${statusHtml(state.pages)}</dd></div>
    </dl>
    <div class="commit-box">
      <p><strong>${escapeHtml(shortSha(snapshot.commit?.sha))}</strong> ${escapeHtml(firstLine(snapshot.commit?.commit?.message))}</p>
      <p class="commit-meta">更新 ${escapeHtml(formatDate(snapshot.commit?.commit?.author?.date || snapshot.repo?.pushed_at))}${snapshot.fromCache ? '・前回取得データ' : ''}</p>
    </div>
    <div class="card-actions">
      ${link(snapshot.config.publicUrl, '公開版')}
      ${link(links.repo, 'GitHub')}
      ${link(links.actions, 'Actions')}
      ${link(links.pulls, 'Pull Request')}
      <button class="detail-button" type="button" data-detail="${escapeHtml(snapshot.config.id)}">詳細を確認</button>
    </div>
  </article>`;
}

function counts() {
  const states = snapshots.map(deriveState);
  return {
    total: snapshots.length,
    healthy: states.filter((s) => s.overall.tone === 'success').length,
    testFail: states.filter((s) => [s.tests, s.chromium, s.webkit].some((x) => x.tone === 'danger')).length,
    publishFail: states.filter((s) => s.publication.tone === 'danger').length,
    attention: states.filter((s) => ['danger', 'warning', 'neutral'].includes(s.overall.tone)).length,
  };
}

function render() {
  const c = counts();
  root.innerHTML = `<div class="shell">
    <header class="topbar">
      <div><p class="eyebrow">AI FACTORY CONTROL ROOM</p><h1>AI工場ダッシュボード</h1><p class="subtitle">複数のWebアプリの開発、テスト、ビルド、公開状態を、iPadから一画面で確認します。</p></div>
      <button id="refresh" class="refresh-button" type="button" ${loading ? 'disabled' : ''}>${loading ? '↻ 更新中' : '↻ 最新状態に更新'}</button>
    </header>
    <div class="update-banner" role="status" aria-live="polite" data-state="${updateState}"><span>${escapeHtml(updateMessage)}</span><span>${snapshots[0] ? `最終取得 ${escapeHtml(formatDate(snapshots[0].fetchedAt))}` : ''}</span></div>
    <main id="main">
      <section aria-labelledby="summary-title"><div class="section-heading"><h2 id="summary-title">全体概要</h2><p>文字と記号でも状態を表示</p></div>
        <div class="summary-grid">
          <div class="summary-card"><strong>${c.total}</strong><span>登録アプリ</span></div>
          <div class="summary-card"><strong>${c.healthy}</strong><span>正常</span></div>
          <div class="summary-card"><strong>${c.testFail}</strong><span>テスト失敗</span></div>
          <div class="summary-card"><strong>${c.publishFail}</strong><span>公開失敗</span></div>
          <div class="summary-card"><strong>${c.attention}</strong><span>確認が必要</span></div>
        </div>
      </section>
      <section aria-labelledby="apps-title"><div class="section-heading"><h2 id="apps-title">アプリ一覧</h2><p>GitHub Pagesから自動検出</p></div>
        <div class="app-grid">${snapshots.length ? snapshots.map(card).join('') : '<div class="empty-state">アプリ一覧と状態を取得しています。</div>'}</div>
      </section>
    </main>
    <footer class="footer">GitHub Pagesが有効な公開リポジトリを自動検出し、公開GitHub APIだけを匿名で利用します。トークン、APIキー、パスワードは保存しません。匿名APIには回数制限があるため、連打は人間の尊厳とともに控えてください。</footer>
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
        <dt>通常テスト</dt><dd>${statusHtml(state.tests)}</dd>
        <dt>ビルド</dt><dd>${statusHtml(state.build)}</dd>
        <dt>Chromium</dt><dd>${statusHtml(state.chromium)}</dd>
        <dt>WebKit</dt><dd>${statusHtml(state.webkit)}</dd>
        <dt>GitHub Pages</dt><dd>${statusHtml(state.pages)}</dd>
        <dt>Pull Request</dt><dd>${pr ? `<a class="external" href="${escapeHtml(pr.html_url)}" target="_blank" rel="noopener noreferrer">#${pr.number} ${escapeHtml(pr.title)}</a>` : '現在開いているPRなし'}</dd>
        <dt>取得日時</dt><dd>${escapeHtml(formatDate(snapshot.fetchedAt))}${snapshot.fromCache ? '（前回取得データ）' : ''}</dd>
      </dl></section>
      <section class="detail-section"><h3>次に確認すべきこと</h3><p>${escapeHtml(state.nextAction)}</p></section>
      <section class="detail-section"><h3>関連リンク</h3><div class="link-list">${link(snapshot.config.publicUrl, '公開URL')}${link(links.repo, 'リポジトリ')}${link(links.actions, 'GitHub Actions')}${link(links.pulls, 'Pull Request')}</div></section>
      <section class="detail-section"><h3>エラー概要</h3>${snapshot.errors?.length ? `<ul class="error-list">${snapshot.errors.map((e) => `<li>${escapeHtml(e.endpoint)}: ${escapeHtml(e.message)}</li>`).join('')}</ul>` : '<p>取得エラーはありません。</p>'}</section>
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
    updateMessage = errors
      ? `更新しましたが、${errors}件の情報を取得できませんでした。`
      : `最新状態へ更新しました。${appConfigs.length}件の公開アプリを検出しています。`;
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
