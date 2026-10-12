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

const go = (page: Page, route: string) => page.goto(`./${route}`);

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
  await page.getByRole('radio', { name: 'Online' }).click();
  // Secondary filters sit behind the "Filters" button.
  await page.locator('.filters-btn').click();
  await page.getByRole('switch', { name: /Post-rotation/ }).check();
  await expect(page.getByText('Projected post-rotation meta (2027)')).toBeVisible();
  await expect(page.locator('table.data tbody').getByText('Rotates')).toHaveCount(0);
});

test('offline view hides win rates', async ({ page }) => {
  await go(page, '');
  await page.getByRole('radio', { name: 'Offline' }).click();
  await expect(page.locator('h1')).toContainText('offline');
  await expect(page.getByRole('columnheader', { name: /Win rate/ })).toHaveCount(0);
});

test('decks without sprites (Other) get a placeholder icon', async ({ page }) => {
  await go(page, '');
  await expect(page.locator('main table.data .deck-placeholder').first()).toBeVisible();
});

test('Online (default) and Offline tabs, one meta table, no top-cut picker', async ({ page, isMobile }) => {
  await go(page, '');
  await expect(page.getByRole('radio', { name: 'Online' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'All' })).toHaveCount(0);
  await expect(page.getByText('Top cut', { exact: true })).toHaveCount(0);
  await expect(page.locator('main table.data')).toHaveCount(1);
  // Inline share bars on desktop; phones show just the % to fit the screen.
  if (!isMobile) await expect(page.locator('.share-bar').first()).toBeVisible();
});

test('matchups explain and switch when a source has no pairings', async ({ page }) => {
  await go(page, '');
  await page.getByRole('radio', { name: 'Offline' }).click();
  await go(page, 'matchups');
  await expect(page.getByText('Matchups use online events')).toBeVisible();
  await page.getByRole('button', { name: 'Show online data' }).click();
  await expect(page.locator('table.heat td.cell').first()).toBeVisible();
});

test('trends show risers, fallers and every deck', async ({ page }) => {
  await go(page, 'trends');
  await expect(page.getByRole('heading', { name: 'What’s moving' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rising' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Falling' })).toBeVisible();
  await expect(page.locator('.mover-list li').first()).toBeVisible();
  await expect(page.locator('.mover-list .delta').first()).toContainText('pts');
  await expect(page.getByRole('heading', { name: 'Every deck' })).toBeVisible();
});

test('meta table has a trend column on desktop', async ({ page, isMobile }) => {
  await go(page, '');
  const header = page.getByRole('columnheader', { name: /Trend/ });
  if (isMobile) { await expect(header).toBeHidden(); return; }
  await expect(header).toBeVisible();
  await expect(page.locator('main table.data .trend-cell svg.spark').first()).toBeVisible();
});

test('matchups render a heatmap of every deck for the period, with no extra pickers', async ({ page }) => {
  await go(page, 'matchups');
  await expect(page.locator('table.heat td.cell').first()).toBeVisible();
  await expect(page.locator('main select')).toHaveCount(0);
  const rows = await page.locator('table.heat tbody tr').count();
  await page.locator('.filters-btn').click();
  await page.getByRole('radiogroup', { name: 'Period' }).getByRole('radio', { name: '14d' }).click();
  await expect(page.getByText(/in this period/)).toBeVisible();
  expect(await page.locator('table.heat tbody tr').count()).toBeLessThanOrEqual(rows);
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

test('deck page shows rotation year, price and a TCGplayer link, but no card usage', async ({ page }) => {
  await go(page, 'decks/deck-charlie');
  await expect(page.getByRole('heading', { name: 'Card usage' })).toHaveCount(0);
  await expect(page.locator('.rot-line')).toContainText('2027');
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
  await expect(page.locator('.filters-summary')).toContainText('Since 2026 rotation');
});

test('pages have real URLs: in-site links navigate without a reload', async ({ page }) => {
  await go(page, '');
  await page.evaluate(() => { (window as any).__alive = true; });
  await page.locator('.podium-card').first().click();
  await expect(page).toHaveURL(/\/decks\/[^/]+$/);
  await expect(page.locator('.deck-title')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.podium-card')).toHaveCount(3);
  // Deck names inside clickable table rows stop propagation; they must still navigate in-app.
  await page.locator('main table.data a.deck-name').first().click();
  await expect(page).toHaveURL(/\/decks\/[^/]+$/);
  expect(await page.evaluate(() => (window as any).__alive), 'page reloaded').toBe(true);
});

test('old #/ links redirect to the new URLs', async ({ page }) => {
  await page.goto('./#/deck/deck-charlie');
  await expect(page).toHaveURL(/\/decks\/deck-charlie$/);
  await expect(page.locator('.deck-title')).toBeVisible();
  await page.goto('./#/trends');
  await expect(page).toHaveURL(/\/trends$/);
});

test('every page is prerendered with its own title, description and canonical', async ({ request }) => {
  const html = await (await request.get('./decks/deck-charlie/')).text();
  expect(html).toMatch(/<title>Deck Charlie deck list, meta share &amp; price/);
  expect(html).toMatch(/<meta name="description" content="Deck Charlie:/);
  expect(html).toContain('<link rel="canonical" href="http://localhost:4174/decks/deck-charlie/"');
  expect(html).toMatch(/<h1>Deck Charlie deck list/);
  const sitemap = await (await request.get('./sitemap.xml')).text();
  expect(sitemap).toContain('/decks/deck-charlie/</loc>');
  expect(await (await request.get('./robots.txt')).text()).toContain('Sitemap:');
});

test('the page title follows the page you are on', async ({ page }) => {
  await go(page, 'trends');
  await expect(page).toHaveTitle(/meta trends/);
  await page.getByRole('link', { name: 'Matchups' }).first().click();
  await expect(page).toHaveTitle(/matchup win rates/);
});

test('theme toggle switches to dark', async ({ page }) => {
  await go(page, '');
  await page.getByRole('button', { name: /Theme/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
