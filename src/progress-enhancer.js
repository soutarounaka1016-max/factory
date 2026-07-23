import { calculateProgress, progressMilestones } from './progress-calculator.js';

const cellKeyByLabel = new Map([
  ['開発状態', 'development'],
  ['最新テスト', 'tests'],
  ['ビルド', 'build'],
  ['Chromium', 'chromium'],
  ['WebKit', 'webkit'],
  ['Pages確認', 'pages'],
]);

const knownTones = ['success', 'info', 'running', 'warning', 'danger', 'neutral'];

function toneOf(status) {
  if (!status) return 'neutral';
  return knownTones.find((tone) => status.classList.contains(`status-${tone}`)) || 'neutral';
}

function tonesFromCard(card) {
  const tones = {};
  card.querySelectorAll('.status-grid .status-cell').forEach((cell) => {
    const label = cell.querySelector('dt')?.textContent?.trim();
    const key = cellKeyByLabel.get(label);
    if (key) tones[key] = toneOf(cell.querySelector('.status'));
  });
  return tones;
}

function enhanceCard(card) {
  const pipeline = card.querySelector('.pipeline');
  const label = pipeline?.querySelector('.pipeline-top span');
  const value = pipeline?.querySelector('.pipeline-top strong');
  const bar = pipeline?.querySelector('.pipeline-track span');
  if (!pipeline || !label || !value || !bar) return;

  const tones = tonesFromCard(card);
  const signature = progressMilestones.map((milestone) => tones[milestone.key] || 'neutral').join('|');
  if (card.dataset.progressSignature === signature) return;
  card.dataset.progressSignature = signature;

  const progress = calculateProgress(tones);
  label.textContent = `${progress.completed}/${progress.total}工程完了・${progress.stateLabel}`;
  value.textContent = `${progress.percentage}%`;
  bar.style.width = `${progress.percentage}%`;
  pipeline.setAttribute('aria-label', `開発進行度 ${progress.percentage}%、${progress.completed}/${progress.total}工程完了、${progress.stateLabel}`);
  pipeline.title = progress.milestones
    .map((milestone) => `${milestone.name}: ${milestone.tone === 'success' || milestone.tone === 'info' ? '完了' : milestone.tone === 'running' ? '実行中' : milestone.tone === 'danger' ? '失敗' : '未完了'}`)
    .join(' / ');
}

function enhanceProgress() {
  document.querySelectorAll('.app-card-active').forEach(enhanceCard);
}

let scheduled = false;
const scheduleEnhancement = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    enhanceProgress();
  });
};

const root = document.querySelector('#app');
if (root) {
  const observer = new MutationObserver(scheduleEnhancement);
  observer.observe(root, { childList: true, subtree: true });
  scheduleEnhancement();
}
