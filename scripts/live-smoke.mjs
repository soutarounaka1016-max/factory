import { chromium } from '@playwright/test';

const url = process.env.PAGE_URL;
if (!url) throw new Error('PAGE_URL is required');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
if (!response?.ok()) throw new Error(`Page returned ${response?.status() ?? 'no response'}`);

await page.getByRole('heading', { name: 'AI工場ダッシュボード' }).waitFor({ timeout: 30000 });
await page.getByRole('heading', { name: '全体概要' }).waitFor({ timeout: 30000 });
await page.getByRole('heading', { name: 'エラーセンター' }).waitFor({ timeout: 30000 });
await page.getByRole('heading', { name: '生産ラインとアプリ一覧' }).waitFor({ timeout: 30000 });
await page.getByRole('button', { name: /最新状態に更新/ }).waitFor({ timeout: 30000 });

const cards = page.locator('.app-card');
await cards.first().waitFor({ timeout: 30000 });
const cardCount = await cards.count();
if (cardCount < 1) throw new Error('No application cards were rendered');

const ids = await cards.evaluateAll((items) => items.map((item) => item.getAttribute('data-app-id')).filter(Boolean));
if (new Set(ids.map((id) => id.toLowerCase())).size !== ids.length) {
  throw new Error(`Duplicate application cards: ${ids.join(', ')}`);
}

const visibleSkipLink = await page.locator('.skip-link').isVisible();
if (visibleSkipLink) throw new Error('Skip link is visible without keyboard focus');

const invalidOpenLinks = await page.locator('.app-card a.action-link').evaluateAll((links) => links
  .map((link) => link.getAttribute('href'))
  .filter((href) => !href || !/^https:\/\//.test(href)));
if (invalidOpenLinks.length) throw new Error(`Invalid application links: ${invalidOpenLinks.join(', ')}`);

if (errors.length) throw new Error(`JavaScript errors: ${errors.join('; ')}`);
await page.screenshot({ path: 'live-smoke.png', fullPage: true });
await browser.close();
