import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const localStaticMode = Boolean(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH);
async function openApp(page) {
  if (!localStaticMode) {
    await page.goto('./');
    return;
  }
  let html = await fs.readFile(path.resolve('dist/index.html'), 'utf8');
  const cssMatch = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/);
  const jsMatch = html.match(/<script[^>]+src="([^"]+\.js)"[^>]*><\/script>/);
  if (!cssMatch || !jsMatch) throw new Error('Built assets were not found');
  const assetPath = (value) => value.replace(/^\/[^/]+\//, '');
  const css = await fs.readFile(path.resolve('dist', assetPath(cssMatch[1])), 'utf8');
  const js = await fs.readFile(path.resolve('dist', assetPath(jsMatch[1])), 'utf8');
  html = html.replace(cssMatch[0], `<style>${css}</style>`).replace(jsMatch[0], `<script type="module">${js}</script>`);
  await page.setContent(html, { waitUntil: 'load' });
}

const owner = 'soutarounaka1016-max';
const apiBase = 'https://api.github.com';
const discoveryUrl = `${apiBase}/users/${owner}/repos?per_page=100&type=owner&sort=updated&direction=desc`;
const repoRoot = `${apiBase}/repos/${owner}`;

const discoveredRepositories = [
  {
    name: 'idea.withGPT', owner: { login: owner }, description: '事業アイデアを育てるアプリ。',
    homepage: 'https://soutarounaka1016-max.github.io/idea.withGPT/', has_pages: true,
    private: false, archived: false, fork: false, pushed_at: '2026-07-22T01:00:00Z',
  },
  {
    name: 'study-canvas', owner: { login: owner }, description: '勉強管理アプリ。',
    homepage: 'https://soutarounaka1016-max.github.io/study-canvas/', has_pages: true,
    private: false, archived: false, fork: false, pushed_at: '2026-07-21T10:00:00Z',
  },
  { name: 'factory', owner: { login: owner }, description: 'ダッシュボード自身。', has_pages: true, private: false, archived: false, fork: false },
  { name: 'unfinished-repository', owner: { login: owner }, has_pages: false, private: false, archived: false, fork: false },
];

async function mockGithub(page, fail = false) {
  await page.route('https://api.github.com/**', async (route) => {
    const url = route.request().url();
    if (fail) return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'rate limited' }) });
    if (url === discoveryUrl) return route.fulfill({ json: discoveredRepositories });
    if (url === `${repoRoot}/study-canvas` || url === `${repoRoot}/idea.withGPT`) {
      return route.fulfill({ json: { html_url: url.replace(apiBase, 'https://github.com'), updated_at: '2026-07-22T01:00:00Z', pushed_at: '2026-07-22T01:00:00Z', default_branch: 'main', archived: false, open_issues_count: 0 } });
    }
    if (url.includes('/commits?')) return route.fulfill({ json: [{ sha: 'abcdef1234567890', html_url: 'https://github.com/example/commit/abcdef1', commit: { message: 'feat: fixture', author: { name: 'AI', date: '2026-07-22T00:55:00Z' } } }] });
    if (url.includes('/actions/runs?')) return route.fulfill({ json: { workflow_runs: [
      { id: 11, name: 'Deploy GitHub Pages', status: 'completed', conclusion: 'success', html_url: 'https://github.com/example/actions/runs/11', run_number: 11, updated_at: '2026-07-22T01:03:00Z' },
      { id: 10, name: 'Test', status: 'completed', conclusion: 'success', html_url: 'https://github.com/example/actions/runs/10', run_number: 10, updated_at: '2026-07-22T00:59:00Z' },
    ] } });
    if (url.includes('/actions/runs/10/jobs')) return route.fulfill({ json: { jobs: [
      { name: 'Unit tests', status: 'completed', conclusion: 'success' }, { name: 'Build', status: 'completed', conclusion: 'success' },
      { name: 'Chromium', status: 'completed', conclusion: 'success' }, { name: 'WebKit', status: 'completed', conclusion: 'success' },
    ] } });
    if (url.includes('/actions/runs/11/jobs')) return route.fulfill({ json: { jobs: [
      { name: 'Deploy GitHub Pages', status: 'completed', conclusion: 'success' }, { name: 'Verify published URL', status: 'completed', conclusion: 'success' },
    ] } });
    if (url.includes('/pulls?')) return route.fulfill({ json: [{ number: 7, title: '改善', html_url: 'https://github.com/example/pull/7', draft: false, updated_at: '' }] });
    return route.abort();
  });
}

test.beforeEach(async ({ page }) => { await mockGithub(page); });

test('discovers apps and renders the control room', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openApp(page);
  const studyCard = page.locator('[data-app-id="study-canvas"]');
  const businessCard = page.locator('[data-app-id="idea.withGPT"]');
  await expect(studyCard.getByRole('heading', { name: 'Study Canvas' })).toBeVisible();
  await expect(businessCard.getByRole('heading', { name: '事業アイデア管理アプリ' })).toBeVisible();
  await expect(page.locator('.app-card')).toHaveCount(2);
  await expect(studyCard.getByRole('link', { name: '開く' })).toHaveAttribute('href', 'https://soutarounaka1016-max.github.io/study-canvas/');
  await expect(businessCard.getByRole('link', { name: '開く' })).toHaveAttribute('href', 'https://soutarounaka1016-max.github.io/idea.withGPT/');
  await expect(page.getByRole('heading', { name: 'エラーセンター' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '更新履歴' })).toBeVisible();
  await expect(page.getByText('AIメモ').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('opens detail panel with health checks and next action', async ({ page }) => {
  await openApp(page);
  await page.locator('[data-app-id="idea.withGPT"]').getByRole('button', { name: '詳細を確認' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '事業アイデア管理アプリ' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'AIメモと次の作業' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '自動ヘルスチェック' })).toBeVisible();
});

test('manual update works', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText(/最新状態へ更新しました/)).toBeVisible();
  await page.getByRole('button', { name: /最新状態に更新/ }).click();
  await expect(page.getByText(/最新状態へ更新しました/)).toBeVisible();
});

test('API failure keeps the pinned app and shows the error', async ({ page }) => {
  await page.unroute('https://api.github.com/**');
  await mockGithub(page, true);
  await openApp(page);
  await expect(page.getByRole('heading', { name: 'Study Canvas' })).toBeVisible();
  await expect(page.getByText(/情報を取得できませんでした/)).toBeVisible();
  await page.getByRole('button', { name: '詳細を確認' }).first().click();
  await expect(page.getByText(/HTTP 403/).first()).toBeVisible();
});

test('main elements stay within viewport', async ({ page }) => {
  await openApp(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(overflow).toBe(false);
  await expect(page.getByRole('button', { name: '詳細を確認' }).first()).toBeVisible();
});