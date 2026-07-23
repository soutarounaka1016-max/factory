export const progressMilestones = [
  { key: 'development', name: '開発開始', weight: 10 },
  { key: 'tests', name: '通常テスト', weight: 20 },
  { key: 'build', name: 'ビルド', weight: 15 },
  { key: 'chromium', name: 'Chromium', weight: 15 },
  { key: 'webkit', name: 'WebKit', weight: 15 },
  { key: 'pages', name: '公開URL確認', weight: 25 },
];

const toneScores = {
  success: 1,
  info: 1,
  running: 0.5,
  warning: 0.25,
  neutral: 0,
  danger: 0,
};

export function calculateProgress(tones = {}) {
  const milestones = progressMilestones.map((milestone) => ({
    ...milestone,
    tone: Object.hasOwn(toneScores, tones[milestone.key]) ? tones[milestone.key] : 'neutral',
  }));

  const score = milestones.reduce((sum, milestone) => sum + milestone.weight * toneScores[milestone.tone], 0);
  const percentage = Math.max(5, Math.min(99, Math.round(score)));
  const completed = milestones.filter((milestone) => ['success', 'info'].includes(milestone.tone));
  const failed = milestones.filter((milestone) => milestone.tone === 'danger');
  const running = milestones.filter((milestone) => milestone.tone === 'running');
  const incomplete = milestones.filter((milestone) => !['success', 'info'].includes(milestone.tone));
  const next = failed[0] || running[0] || incomplete[0] || null;

  let stateLabel = '主要工程確認済み';
  if (failed.length) stateLabel = `修正: ${failed[0].name}`;
  else if (running.length) stateLabel = `実行中: ${running[0].name}`;
  else if (next) stateLabel = `次: ${next.name}`;

  return {
    percentage,
    completed: completed.length,
    total: milestones.length,
    stateLabel,
    milestones,
  };
}
