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

if (errors.length) throw new Error(`JavaScript errors: ${errors.join('; ')}`);
await page.screenshot({ path: 'live-smoke.png', fullPage: true });
await browser.close();