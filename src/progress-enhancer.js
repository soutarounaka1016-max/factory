const milestoneWeights = [
  { name: '開発開始', weight: 10 },
  { name: '公開準備', weight: 15 },
  { name: '通常テスト', weight: 15 },
  { name: 'ビルド', weight: 15 },
  { name: 'Chromium', weight: 10 },
  { name: 'WebKit', weight: 10 },
  { name: '公開URL確認', weight: 25 },
];

const toneScores = {
  success: 1,
  info: 1,
  running: 0.7,
  warning: 0.5,
  danger: 0.35,
  neutral: 0.15,
};

function toneOf(status) {
  if (!status) return 'neutral';
  return Object.keys(toneScores).find((tone) => status.classList.contains(`status-${tone}`)) || 'neutral';
}

function enhanceCard(card) {
  const cells = [...card.querySelectorAll('.status-grid .status-cell')].slice(0, milestoneWeights.length);
  const pipeline = card.querySelector('.pipeline');
  const label = pipeline?.querySelector('.pipeline-top span');
  const value = pipeline?.querySelector('.pipeline-top strong');
  const bar = pipeline?.querySelector('.pipeline-track span');
  if (!pipeline || !label || !value || !bar || cells.length !== milestoneWeights.length) return;

  const tones = cells.map((cell) => toneOf(cell.querySelector('.status')));
  const signature = tones.join('|');
  if (card.dataset.progressSignature === signature) return;
  card.dataset.progressSignature = signature;

  const score = milestoneWeights.reduce((sum, milestone, index) => sum + milestone.weight * toneScores[tones[index]], 0);
  const percentage = Math.max(10, Math.min(99, Math.round(score)));
  const completed = tones.filter((tone) => tone === 'success' || tone === 'info').length;

  let stateLabel = '工程を確認中';
  if (tones.includes('danger')) stateLabel = '修正が必要';
  else if (tones.includes('running')) stateLabel = '自動確認中';
  else if (tones.includes('warning') || tones.includes('neutral')) stateLabel = '未確認あり';
  else stateLabel = '主要工程確認済み';

  label.textContent = `${completed}/${milestoneWeights.length}工程完了・${stateLabel}`;
  value.textContent = `${percentage}%`;
  bar.style.width = `${percentage}%`;
  pipeline.setAttribute('aria-label', `開発進行度 ${percentage}%、${completed}/${milestoneWeights.length}工程完了`);
  pipeline.title = '開発開始、公開準備、通常テスト、ビルド、Chromium、WebKit、公開URL確認の状態から計算しています。';
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

const observer = new MutationObserver(scheduleEnhancement);
observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
scheduleEnhancement();
