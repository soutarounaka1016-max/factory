const make = (label, tone, icon, detail = '') => ({ label, tone, icon, detail });
const success = (label, detail) => make(label, 'success', '✓', detail);
const danger = (label, detail) => make(label, 'danger', '!', detail);
const warning = (label, detail) => make(label, 'warning', '△', detail);
const neutral = (label = '未確認', detail) => make(label, 'neutral', '?', detail);
const running = (detail) => make('実行中', 'running', '↻', detail);
const info = (label, detail) => make(label, 'info', '●', detail);

const normalize = (value = '') => value.toLowerCase().replace(/[\s_\-/()\[\]]+/g, '');
const findJob = (jobs, patterns) => jobs.find((job) => patterns.some((pattern) => pattern.test(normalize(job.name))));

function outcome(item, okLabel = '成功') {
  if (!item) return neutral();
  if (item.status !== 'completed') return running('GitHub Actionsで処理中');
  if (['success', 'neutral', 'skipped'].includes(item.conclusion)) return success(okLabel);
  return danger(okLabel === 'テスト成功' ? 'テスト失敗' : '失敗', `結論: ${item.conclusion || '不明'}`);
}

export function deriveState(snapshot) {
  const jobs = snapshot.jobs || [];
  const testJob = findJob(jobs, [/unit/, /vitest/, /^test$/, /test(?!.*(chromium|webkit|e2e))/]);
  const buildJob = findJob(jobs, [/build/, /ビルド/]);
  const chromiumJob = findJob(jobs, [/chromium/, /chrome/]);
  const webkitJob = findJob(jobs, [/webkit/, /safari/]);
  const deployJob = findJob(jobs, [/deploy/, /pages/, /verifypublished/, /公開/]);

  const tests = outcome(testJob || snapshot.latestRun, 'テスト成功');
  const build = outcome(buildJob || snapshot.latestRun, '成功');
  const chromium = outcome(chromiumJob, '成功');
  const webkit = outcome(webkitJob, '成功');

  const pages = outcome(deployJob || snapshot.deployRun, '公開中');

  const publication = pages.label === '公開中'
    ? success('公開中')
    : ['公開失敗', '失敗'].includes(pages.label)
      ? danger('公開失敗')
      : pages.label === '実行中' ? running('公開処理中') : neutral();

  const development = snapshot.config.developmentStatus === 'paused'
    ? warning('更新待ち', '設定で一時停止') : info('開発中');

  const commitTime = Date.parse(snapshot.commit?.commit?.author?.date || '') || 0;
  const runTime = Date.parse(snapshot.latestRun?.updated_at || '') || 0;
  const updateWaiting = Boolean(commitTime && (!runTime || commitTime > runTime + 30000));

  let overall;
  if ([tests, build, chromium, webkit].some((item) => item.tone === 'danger')) overall = danger('テスト失敗', '失敗した確認があります');
  else if (publication.tone === 'danger') overall = danger('公開失敗');
  else if ([tests, build, chromium, webkit, publication].some((item) => item.tone === 'running')) overall = running('処理の完了待ち');
  else if (updateWaiting) overall = warning('更新待ち', '最新コミット後の確認結果がありません');
  else if (publication.label === '公開中' && tests.tone === 'success' && build.tone === 'success') overall = success('公開中', '主要確認は正常です');
  else overall = neutral('未確認', snapshot.errors?.length ? '一部情報の取得に失敗しました' : '確認結果が不足しています');

  let nextAction = '公開版をiPad Safariで開き、主要操作を確認してください。';
  if (snapshot.errors?.length) nextAction = '取得失敗の項目を確認し、時間を置いて手動更新してください。';
  if (updateWaiting) nextAction = '最新コミットに対応するGitHub Actionsの完了を確認してください。';
  if (overall.tone === 'danger') nextAction = '失敗したGitHub Actionsを開き、最初のエラーを確認してください。';
  if (overall.tone === 'running') nextAction = 'GitHub Actionsの完了後に更新してください。';

  return { development, publication, tests, build, chromium, webkit, pages, overall, nextAction };
}
