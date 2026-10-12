import { expect, test, type Page } from '@playwright/test';

// Keep tests hermetic: block fonts and deck sprites, and fail on any page error.
test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com|limitlesstcg\.net/, (r) => r.abort());
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  (page as any).__errors = errors;
});
test.afterEach(async ({ page }) => {
  expect((page as any).__errors, 'page errors').toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'horizontal scroll').toBeLessThanOrEqual(1);
});

const go = (page: Page, route: string) => page.goto(`./#/${route}`);

test('meta overview shows the snapshot and full table', async ({ page }) => {
  await go(page, '');
  await expect(page.getByText('Meta snapshot')).toBeVisible();
  await expect(page.locator('.podium-card')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'The meta' })).toBeVisible();
  await expect(page.locator('table.data tbody tr').first()).toBeVisible();
});

test('source filter and post-rotation toggle change the results', async ({ page }) => {
  await go(page, '');
  const sub = page.locator('.hero-sub');
  const before = await sub.textContent();
  await page.getByRole('radio', { name: 'Offline' }).click();
  await expect(sub).not.toHaveText(before!);
  await page.getByRole('radio', { name: 'All' }).click();
  // Secondary filters sit behind the "Filters" button.
  await page.locator('.filters-btn').click();
  await page.getByRole('switch', { name: /Post-rotation/ }).check();
  await expect(page.getByText('Projected post-rotation meta')).toBeVisible();
  await expect(page.locator('table.data tbody').getByText('Rotates')).toHaveCount(0);
});

test('offline view hides win rates', async ({ page }) => {
  await go(page, '');
  await page.getByRole('radio', { name: 'Offline' }).click();
  await expect(page.locator('h1')).toContainText('offline');
  await expect(page.getByRole('columnheader', { name: /Win rate/ })).toHaveCount(0);
});

test('All, Offline and Online tabs, with one meta table', async ({ page, isMobile }) => {
  await go(page, '');
  await expect(page.getByRole('radio')).toHaveText(['All', 'Offline', 'Online']);
  await expect(page.locator('main table.data')).toHaveCount(1);
  // Inline share bars on desktop; phones show just the % to fit the screen.
  if (!isMobile) await expect(page.locator('.share-bar').first()).toBeVisible();
});

test('matchups explain and switch when a source has no pairings', async ({ page }) => {
  await go(page, '');
  await page.getByRole('radio', { name: 'Offline' }).click();
  await go(page, 'matchups');
  await expect(page.getByText('Matchups use online events')).toBeVisible();
  await page.getByRole('button', { name: 'Show all events' }).click();
  await expect(page.locator('table.heat td.cell').first()).toBeVisible();
});

test('trends draw a chart', async ({ page }) => {
  await go(page, 'trends');
  await expect(page.locator('svg.line-chart path[stroke]').first()).toBeVisible();
});

test('matchups render a heatmap', async ({ page }) => {
  await go(page, 'matchups');
  await expect(page.locator('table.heat td.cell').first()).toBeVisible();
});

test('field planner re-ranks when the field changes and expands a breakdown', async ({ page }) => {
  await go(page, 'field');
  const first = page.locator('tr.clickable').first();
  await expect(first).toBeVisible();
  await page.locator('input.pct-input').first().fill('90');
  await first.click();
  await expect(page.locator('tr.detail')).toBeVisible();
  await expect(page.locator('tr.detail').getByText('Everything else')).toBeVisible();
});

test('deck page shows usage, price and a TCGplayer link', async ({ page }) => {
  await go(page, 'deck/deck-charlie');
  await expect(page.getByRole('heading', { name: 'Card usage' })).toBeVisible();
  await expect(page.getByText(/Deck price:/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Buy on TCGplayer/ })).toHaveAttribute('href', /tcgplayer\.com\/massentry/);
});

test('tournament search and detail page', async ({ page }) => {
  await go(page, 'tournaments');
  await page.getByRole('searchbox').fill('online event 1');
  await page.getByRole('link', { name: /Test online event 1$/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Standings' })).toBeVisible();
});

test('phones get a bottom tab bar', async ({ page, isMobile }) => {
  await go(page, '');
  const tabbar = page.locator('nav.tabbar');
  if (!isMobile) { await expect(tabbar).toBeHidden(); return; }
  await expect(tabbar).toBeVisible();
  await tabbar.getByRole('link', { name: 'Planner' }).click();
  await expect(page.getByRole('heading', { name: 'What should I play?' })).toBeVisible();
});

test('filters panel uses chips and has no date inputs', async ({ page }) => {
  await go(page, '');
  await page.locator('.filters-btn').click();
  await page.getByRole('radiogroup', { name: 'Period' }).getByRole('radio', { name: '30d' }).click();
  await expect(page.locator('.filters-summary')).toContainText('Last 30 days');
  await expect(page.locator('input[type="date"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.locator('.filters-summary')).toContainText('Since rotation');
});

test('theme toggle switches to dark', async ({ page }) => {
  await go(page, '');
  await page.getByRole('button', { name: /Theme/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
