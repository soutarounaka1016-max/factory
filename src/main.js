import './styles.css';
import './completion.css';
import './card-layout.css';
import { factory, pinnedApps } from './apps.js';
import { discoverApps, loadSnapshot } from './github.js';
import { deriveState } from './status.js';
import { firstLine, formatDate, shortSha } from './format.js';
import { isAppCompleted, setAppCompleted } from './completion.js';
import { getAppPriority, setAppPriority } from './priority.js';

const root = document.querySelector('#app');
if (!root) throw new Error('App root was not found');

let snapshots = [];
let controller;
let loading = false;
let updateState = 'idle';
let updateMessage = '初回取得を開始します。';

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const statusHtml = (status) => `<span class="status status-${status.tone}" title="${escapeHtml(status.detail || status.label)}"><span aria-hidden="true">${status.icon}</span>${escapeHtml(status.label)}</span>`;
const link = (url, label, className = 'action-link') => url ? `<a class="${className} external" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>` : '';

function linksFor(snapshot) {
  const base = `https://github.com/${snapshot.config.owner}/${snapshot.config.repo}`;
  return { repo: base, actions: `${base}/actions`, pulls: `${base}/pulls`, issues: `${base}/issues` };
}

function completedStatus() {
  return { label: '完了', tone: 'success', icon: '✓', detail: 'この端末で完了済みに設定されています' };
}

const progressWeight = { success: 1, running: 0.5, warning: 0.25, neutral: 0, danger: 0 };
function progressFor(state, completed = false) {
  if (completed) return { value: 100, label: '開発完了' };
  const stages = [state.tests, state.build, state.chromium, state.webkit, state.pages];
  const score = stages.reduce((sum, item) => sum + (progressWeight[item.tone] ?? 0), 0);
  const value = Math.min(95, Math.round((score / stages.length) * 95));
  const done = stages.filter((item) => item.tone === 'success').length;
  const next = state.nextAction || '確認結果を取得してください。';
  return { value, label: `${done}/${stages.length}工程完了`, next };
}

function priorityFor(snapshot) {
  return getAppPriority(snapshot.config.id, snapshot.config.priority || 3);
}

function activeSortScore(snapshot) {
  const state = deriveState(snapshot);
  const toneScore = { danger: 500, running: 400, warning: 300, neutral: 200, success: 100 }[state.overall.tone] || 0;
  return toneScore + priorityFor(snapshot) * 10;
}

function priorityControl(snapshot) {
  const value = priorityFor(snapshot);
  return `<label class="priority-control">優先度<select data-priority="${escapeHtml(snapshot.config.id)}" aria-label="${escapeHtml(snapshot.config.name)}の優先度">${[5,4,3,2,1].map((score) => `<option value="${score}" ${score === value ? 'selected' : ''}>${score}・${['','低い','やや低い','普通','高い','最優先'][score]}</option>`).join('')}</select></label>`;
}

function activeCard(snapshot) {
  const state = deriveState(snapshot);
  const progress = progressFor(state);
  const updated = formatDate(snapshot.commit?.commit?.author?.date || snapshot.repo?.pushed_at);
  return `<article class="app-card app-card-active simplified-card" data-app-id="${escapeHtml(snapshot.config.id)}">
    <div class="card-header"><div class="card-title"><h3>${escapeHtml(snapshot.config.name)}</h3><p>${escapeHtml(snapshot.config.description)}</p></div>${statusHtml(state.overall)}</div>
    <div class="pipeline" aria-label="開発進行度 ${progress.value}%"><div class="pipeline-top"><span>${escapeHtml(progress.label)}</span><strong>${progress.value}%</strong></div><div class="pipeline-track"><span style="width:${progress.value}%"></span></div></div>
    <div class="next-action"><span>次にやること</span><strong>${escapeHtml(progress.next)}</strong></div>
    <dl class="status-grid essential-status-grid">
      <div class="status-cell"><dt>単体テスト</dt><dd>${statusHtml(state.tests)}</dd></div>
      <div class="status-cell"><dt>iPad Safari</dt><dd>${statusHtml(state.webkit)}</dd></div>
      <div class="status-cell"><dt>公開URL</dt><dd>${statusHtml(state.pages)}</dd></div>
    </dl>
    <div class="card-meta-row"><span>最終更新 ${escapeHtml(updated)}${snapshot.fromCache ? '・前回取得データ' : ''}</span>${priorityControl(snapshot)}</div>
    <div class="completion-actions"><button class="completion-button" type="button" data-complete="${escapeHtml(snapshot.config.id)}">✓ 完了済みに移す</button></div>
    <div class="card-actions primary-card-actions">${link(snapshot.config.publicUrl, '開く')}<button class="detail-button" type="button" data-detail="${escapeHtml(snapshot.config.id)}">詳細</button></div>
  </article>`;
}

function completedCard(snapshot) {
  const links = linksFor(snapshot);
  return `<article class="completed-card" data-app-id="${escapeHtml(snapshot.config.id)}"><div class="completed-card-main"><div><div class="completed-title-row"><h3>${escapeHtml(snapshot.config.name)}</h3>${statusHtml(completedStatus())}</div><p>${escapeHtml(snapshot.config.description)}</p><small>最終更新 ${escapeHtml(formatDate(snapshot.commit?.commit?.author?.date || snapshot.repo?.pushed_at))}</small></div><div class="completed-card-actions">${link(snapshot.config.publicUrl, '開く', 'compact-link')}${link(links.repo, 'GitHub', 'compact-link')}<button class="compact-link detail-button" type="button" data-detail="${escapeHtml(snapshot.config.id)}">詳細</button><button class="resume-button" type="button" data-complete="${escapeHtml(snapshot.config.id)}">↺ 開発を再開</button></div></div></article>`;
}

function splitSnapshots() {
  const active = snapshots.filter((snapshot) => !isAppCompleted(snapshot.config.id)).sort((a, b) => activeSortScore(b) - activeSortScore(a));
  const completed = snapshots.filter((snapshot) => isAppCompleted(snapshot.config.id)).sort((a, b) => Date.parse(b.commit?.commit?.author?.date || 0) - Date.parse(a.commit?.commit?.author?.date || 0));
  return { active, completed };
}

function metrics() {
  const { active, completed } = splitSnapshots();
  const states = active.map(deriveState);
  return { active: active.length, completed: completed.length, healthy: states.filter((state) => state.overall.tone === 'success').length, attention: states.filter((state) => state.overall.tone !== 'success').length };
}

function factoryNow() {
  const { active } = splitSnapshots();
  if (!active.length && snapshots.length) return { tone: 'success', title: 'すべて完了', detail: '登録アプリはすべて完了済みです。' };
  const entries = active.map((snapshot) => ({ snapshot, state: deriveState(snapshot) }));
  const broken = entries.find(({ state }) => state.overall.tone === 'danger');
  const running = entries.find(({ state }) => state.overall.tone === 'running');
  const uncertain = entries.find(({ state }) => ['warning', 'neutral'].includes(state.overall.tone));
  if (broken) return { tone: 'danger', title: '修正が必要', detail: `${broken.snapshot.config.name}で失敗を検出しています。` };
  if (running) return { tone: 'running', title: '自動確認中', detail: `${running.snapshot.config.name}を確認しています。` };
  if (uncertain) return { tone: 'warning', title: '確認が必要', detail: `${uncertain.snapshot.config.name}に未確認項目があります。` };
  return { tone: 'success', title: '正常', detail: '開発中アプリの主要確認が成功しています。' };
}

function render() {
  const c = metrics();
  const now = factoryNow();
  const { active, completed } = splitSnapshots();
  const health = c.active ? Math.round((c.healthy / c.active) * 100) : snapshots.length ? 100 : 0;
  root.innerHTML = `<div class="shell"><header class="topbar"><div><p class="eyebrow">AI FACTORY CONTROL ROOM</p><h1>AI工場ダッシュボード</h1><p class="subtitle">開発中アプリの状態、次の作業、優先順位を一画面で確認します。</p></div><button id="refresh" class="refresh-button" type="button" ${loading ? 'disabled' : ''}>${loading ? '↻ 更新中' : '↻ 最新状態に更新'}</button></header>
  <div class="update-banner" role="status" aria-live="polite" data-state="${updateState}"><span>${escapeHtml(updateMessage)}</span><span>${snapshots[0] ? `最終取得 ${escapeHtml(formatDate(snapshots[0].fetchedAt))}` : ''}</span></div><main id="main">
  <section class="factory-status factory-${now.tone}"><div><p class="eyebrow">FACTORY STATUS</p><h2>${escapeHtml(now.title)}</h2><p>${escapeHtml(now.detail)}</p></div><div class="health-ring"><strong>${health}%</strong><span>開発中</span></div></section>
  <section><div class="section-heading"><h2>全体概要</h2><p>判断に必要な数字だけ表示</p></div><div class="summary-grid compact-summary"><div class="summary-card summary-card-primary"><strong>${c.active}</strong><span>開発中</span></div><div class="summary-card"><strong>${c.completed}</strong><span>完了</span></div><div class="summary-card"><strong>${c.attention}</strong><span>要確認</span></div></div></section>
  <section class="active-apps-section"><div class="section-heading section-heading-emphasis"><div><p class="eyebrow">MAIN WORKSPACE</p><h2>開発中のアプリ</h2></div><p>${active.length}件・異常と優先度の高い順</p></div><div class="app-grid active-app-grid">${active.length ? active.map(activeCard).join('') : '<div class="empty-state empty-state-success"><strong>開発中のアプリはありません</strong></div>'}</div></section>
  <section class="completed-apps-section"><div class="section-heading"><div><p class="eyebrow">ARCHIVE</p><h2>完了したアプリ開発</h2></div><p>${completed.length}件</p></div><div class="completed-list">${completed.length ? completed.map(completedCard).join('') : '<div class="empty-state">完了済みのアプリはまだありません。</div>'}</div></section>
  </main><footer class="footer">GitHubから状態を取得します。完了状態と優先度はこの端末のブラウザに保存され、別端末とは同期されません。</footer></div><dialog id="detail-dialog" aria-labelledby="detail-title"><div id="dialog-content"></div></dialog>`;
  root.querySelector('#refresh')?.addEventListener('click', refresh);
  root.querySelectorAll('[data-detail]').forEach((button) => button.addEventListener('click', () => openDetail(button.dataset.detail)));
  root.querySelectorAll('[data-complete]').forEach((button) => button.addEventListener('click', () => toggleCompletion(button.dataset.complete)));
  root.querySelectorAll('[data-priority]').forEach((select) => select.addEventListener('change', () => changePriority(select.dataset.priority, select.value)));
}

function changePriority(id, value) {
  const snapshot = snapshots.find((item) => item.config.id === id);
  const saved = setAppPriority(id, value);
  updateState = saved ? 'success' : 'error';
  updateMessage = saved ? `${snapshot?.config.name || id}の優先度を${value}に変更しました。` : '優先度を保存できませんでした。';
  render();
}

function toggleCompletion(id) {
  const snapshot = snapshots.find((item) => item.config.id === id);
  if (!snapshot) return;
  const completed = !isAppCompleted(id);
  const saved = setAppCompleted(id, completed);
  updateState = saved ? 'success' : 'error';
  updateMessage = saved ? `${snapshot.config.name}を${completed ? '完了済み' : '開発中'}に変更しました。` : '完了状態を保存できませんでした。';
  render();
}

function openDetail(id) {
  const snapshot = snapshots.find((item) => item.config.id === id);
  const dialog = root.querySelector('#detail-dialog');
  const content = root.querySelector('#dialog-content');
  if (!snapshot || !dialog || !content) return;
  const state = deriveState(snapshot);
  const links = linksFor(snapshot);
  const pr = snapshot.pullRequests?.[0];
  content.innerHTML = `<div class="dialog-header"><div><h2 id="detail-title">${escapeHtml(snapshot.config.name)}</h2><p>${escapeHtml(snapshot.config.description)}</p></div><button class="close-button" type="button" aria-label="詳細を閉じる">×</button></div><div class="dialog-body"><section class="detail-section"><h3>技術的な確認結果</h3><dl class="detail-list"><dt>単体テスト</dt><dd>${statusHtml(state.tests)}</dd><dt>公開ファイル作成</dt><dd>${statusHtml(state.build)}</dd><dt>Chromium</dt><dd>${statusHtml(state.chromium)}</dd><dt>iPad Safari</dt><dd>${statusHtml(state.webkit)}</dd><dt>公開URL</dt><dd>${statusHtml(state.pages)}</dd><dt>最新コミット</dt><dd>${snapshot.commit ? `<a class="external" href="${escapeHtml(snapshot.commit.html_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(shortSha(snapshot.commit.sha))} ${escapeHtml(firstLine(snapshot.commit.commit.message))}</a>` : '未確認'}</dd><dt>Pull Request</dt><dd>${pr ? `<a class="external" href="${escapeHtml(pr.html_url)}" target="_blank" rel="noopener noreferrer">#${pr.number} ${escapeHtml(pr.title)}</a>` : '現在開いているPRなし'}</dd><dt>取得状態</dt><dd>${snapshot.fromCache ? '前回取得データ' : '最新取得データ'}</dd></dl></section><section class="detail-section"><h3>関連リンク</h3><div class="link-list">${link(snapshot.config.publicUrl, '公開URL')}${link(links.repo, 'GitHub')}${link(links.actions, 'Actions')}${link(links.pulls, 'Pull Request')}${link(links.issues, 'Issues')}</div></section></div>`;
  content.querySelector('.close-button')?.addEventListener('click', () => dialog.close());
  dialog.onclick = (event) => { if (event.target === dialog) dialog.close(); };
  dialog.showModal();
}

async function refresh() {
  controller?.abort();
  controller = new AbortController();
  loading = true;
  updateState = 'loading';
  updateMessage = 'GitHubから最新状態を取得しています。';
  render();
  try {
    const discovery = await discoverApps(factory, pinnedApps, controller.signal);
    snapshots = await Promise.all(discovery.apps.map((config) => loadSnapshot(config, controller.signal)));
    const errors = discovery.errors.length + snapshots.reduce((sum, item) => sum + (item.errors?.length || 0), 0);
    updateState = errors ? 'error' : 'success';
    updateMessage = errors ? `更新しましたが、${errors}件を取得できませんでした。` : `最新状態へ更新しました。${snapshots.length}件の公開アプリを検出しています。`;
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
