import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { defaults, initialPools, matchesRule, poolsToCsv, samplePool } from '../src/model.ts';

const output = resolve('artifacts');
await mkdir(output, { recursive: true });
const results = { checks: [], widths: [], axe: [], consoleErrors: [], failedRequests: [], externalRequests: [], contrast: [], limitations: ['Chromium automation only; no physical device, native browser zoom or screen reader testing.'] };
const pass = name => { results.checks.push(name); console.log(`PASS ${name}`); };
for (const token0 of ['ETH', 'WETH', 'USDC']) {
  for (const token1 of ['ETH', 'WETH', 'DAI']) {
    const pool = { ...samplePool(0), token0, token1 };
    const eligible0 = !['ETH', 'WETH'].includes(token0);
    const eligible1 = !['ETH', 'WETH'].includes(token1);
    assert.equal(matchesRule(pool, defaults), eligible0 || eligible1);
    assert.equal(matchesRule(pool, { ...defaults, mode: 'both' }), eligible0 && eligible1);
  }
}
assert.equal(matchesRule(samplePool(0), { ...defaults, poolType: 'Constant product' }), false);
assert.equal(matchesRule({ ...samplePool(0), token0: 'eth', token1: 'weth' }, defaults), false);
assert.equal(initialPools().filter(p => matchesRule(p, defaults)).length, 6);
assert.equal(poolsToCsv(initialPools(1700000000000), defaults).split('\r\n').length, 9);
pass('Token rule truth table, type restriction, case handling and CSV rows');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/iframe') {
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><html lang="en"><head><title>Iframe validation</title><style>body{margin:0}iframe{border:0;width:100vw;height:100vh;display:block}</style></head><body><iframe title="Poolwatch" sandbox="allow-scripts allow-same-origin allow-downloads" src="/preview/"></iframe></body></html>'); return;
  }
  const relative = path.replace(/^\/preview\//, '') || 'index.html';
  if (!path.startsWith('/preview/') || relative.includes('..')) { res.writeHead(404); res.end(); return; }
  try { const file = await readFile(resolve('dist', relative)); res.setHeader('Content-Type', mime[extname(relative)] || 'application/octet-stream'); res.end(file); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1200, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => results.consoleErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') results.consoleErrors.push(message.text()); });
  page.on('requestfailed', request => results.failedRequests.push(request.url()));
  page.on('request', request => { if (!request.url().startsWith(origin) && !request.url().startsWith('blob:')) results.externalRequests.push(request.url()); });
  await page.goto(`${origin}/preview/`);
  await expect(page.getByRole('heading', { name: 'New pool monitor.' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.fonts.check('500 14px "DM Sans Variable"')), true);
  for (const width of [1200, 768, 560, 360, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, overflowing: Array.from(document.querySelectorAll("body *")).filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right})).slice(0,20) }));
    assert.ok(overflow.scroll <= width, `Page overflow at ${width}: ${JSON.stringify(overflow)}`);
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    results.axe.push({ width, violations: scan.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })) });
    results.widths.push({ width, scrollWidth: overflow.scroll });
    if (width === 1200 || width === 360) await page.screenshot({ path: `${output}/${width === 1200 ? 'desktop' : 'mobile'}.png`, fullPage: true });
  }
  pass('Production export renders without page overflow at 1200, 768, 560, 360 and 320 CSS pixels');
  assert.ok(results.axe.every(s => s.violations.length === 0), JSON.stringify(results.axe, null, 2));
  pass('Axe WCAG A/AA scan has zero detected violations at five widths');
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.getByRole('button', { name: 'Matches 6', exact: true }).click();
  await expect(page.locator('.pool-row')).toHaveCount(6);
  await expect(page.locator('.pool-row').filter({ hasText: 'ETH / WETH' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Excluded 2', exact: true }).click();
  await expect(page.locator('.pool-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'All pools 8', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search token pairs' }).fill('unfindable');
  await expect(page.getByRole('heading', { name: 'No pools found' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Filter pool type').selectOption('Constant product');
  await expect(page.locator('.pool-row')).toHaveCount(3);
  await page.getByLabel('Filter pool type').selectOption('All types');
  await page.getByRole('searchbox').fill(' usdc / weth ');
  await expect(page.locator('.pool-row')).toHaveCount(1);
  await page.getByRole('searchbox').fill('dai');
  await expect(page.locator('.pool-row')).toHaveCount(1);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  const csv = await readFile(await download.path(), 'utf8');
  assert.equal(csv.split('\r\n').length, 2);
  assert.ok(csv.includes('DAI') && csv.includes('Illustrative sample'));
  await page.getByRole('searchbox').fill('');
  await page.getByRole('button', { name: 'Show more' }).click();
  await expect(page.locator('.pool-row')).toHaveCount(8);
  pass('Result tabs, case-insensitive search, type filter, empty recovery, show more and filtered CSV download');
  await page.getByRole('button', { name: /View USDC/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('This is a demonstration record', { exact: false })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /View USDC/ })).toBeFocused();
  await page.getByRole('button', { name: 'Edit alert rule', exact: true }).click();
  await page.getByLabel('Both tokens are not ETH or WETH', { exact: false }).check();
  await page.getByRole('button', { name: 'Save rule' }).click();
  await expect(page.getByRole('button', { name: 'Matches 3', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Matches 3', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit alert rule', exact: true }).click();
  await page.getByLabel('At least one token is not ETH or WETH', { exact: false }).check();
  await page.getByRole('button', { name: 'Save rule' }).click();
  pass('Pool details, modal Escape/focus restoration, both-token rule and persistence across reload');
  await page.clock.install();
  await page.getByRole('button', { name: 'Start demo feed' }).click();
  await expect(page.locator('.alert-list li')).toHaveCount(1);
  await page.clock.fastForward(6100);
  await expect(page.locator('.alert-list li')).toHaveCount(2);
  await page.getByRole('button', { name: 'Pause demo feed' }).click();
  await page.clock.fastForward(13000);
  await expect(page.locator('.alert-list li')).toHaveCount(2);
  await page.getByRole('button', { name: 'Add a sample pool' }).click();
  await expect(page.locator('.alert-list li')).toHaveCount(3);
  await page.getByRole('button', { name: 'Add a sample pool' }).click();
  await expect(page.locator('.alert-list li')).toHaveCount(3);
  await page.getByRole('button', { name: 'Send test alert' }).click();
  await expect(page.locator('.alert-list li')).toHaveCount(4);
  await page.getByRole('button', { name: /Mark Test notification/ }).click();
  await expect(page.locator('.alert-list .read-alert')).toHaveCount(1);
  await page.getByRole('button', { name: 'Mark all read' }).click();
  await expect(page.locator('.alert-list .read-alert')).toHaveCount(4);
  pass('Immediate/timed feed, pause, one-event replay, eligible delivery, ETH/WETH exclusion, test alert and read states');
  await page.getByRole('button', { name: 'Edit alert rule', exact: true }).click();
  await page.getByRole('switch', { name: 'Enable pool alerts' }).uncheck();
  await page.getByRole('button', { name: 'Save rule' }).click();
  await page.getByRole('button', { name: 'Add a sample pool' }).click();
  await expect(page.locator('.alert-list li')).toHaveCount(4);
  await page.getByRole('button', { name: 'Send test alert' }).click();
  await expect(page.locator('.alert-list li')).toHaveCount(5);
  pass('Disabled alerts suppress matching events; explicit delivery test remains independent');
  await page.getByRole('button', { name: 'Edit alert rule', exact: true }).click();
  const modalScan = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  assert.deepEqual(modalScan.violations.map(v => v.id), []);
  await page.screenshot({ path: `${output}/rule-dialog.png`, fullPage: false });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'How it works' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.reload();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Start demo feed' })).toBeFocused();
  await page.screenshot({ path: `${output}/keyboard-focus.png` });
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Pause demo feed' })).toBeVisible();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.button-primary').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  pass('Help dialog, modal accessibility scan, reduced-motion styling and keyboard skip/start/pause flow');
  const contrastPairs = await page.evaluate(() => {
    const background = el => { while (el) { const c = getComputedStyle(el).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; el = el.parentElement; } return 'rgb(255, 255, 255)'; };
    return ['h1','.page-heading p','.button-primary','.demo-label','.nav-active','.stat-tag','.rule-state','.signal-card p','.signal-link','.feed-state','.pool-table-head','.match-badge','.text-button','.local-caption'].map(selector => { const el = document.querySelector(selector); return { selector, fg: getComputedStyle(el).color, bg: background(el) }; });
  });
  function lum(color) { const rgb = color.match(/[\d.]+/g).slice(0,3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]; }
  for (const pair of contrastPairs) { const a = lum(pair.fg), b = lum(pair.bg); const ratio = (Math.max(a,b)+.05)/(Math.min(a,b)+.05); results.contrast.push({ ...pair, ratio: +ratio.toFixed(2) }); assert.ok(ratio >= 4.5, `${pair.selector} contrast ${ratio}`); }
  pass('Fourteen rendered foreground/background text pairs meet 4.5:1');
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole('button', { name: 'Edit alert rule', exact: true }).click();
  await page.getByRole('switch', { name: 'Enable pool alerts' }).check();
  await page.getByRole('button', { name: 'Save rule' }).click();
  await page.getByRole('button', { name: 'Start demo feed' }).click();
  await page.getByRole('button', { name: 'Pause demo feed' }).click();
  await expect(page.locator('.alert-list li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await page.screenshot({ path: `${output}/mobile-active.png`, fullPage: true });
  await page.goto(`${origin}/iframe`);
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Start demo feed' }).click();
  await frame.getByRole('button', { name: 'Pause demo feed' }).click();
  await expect(frame.locator('.alert-list li')).toHaveCount(1);
  pass('Mobile rule editing and replay; sandboxed iframe primary workflow');
  const blockedContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
  await blockedContext.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } }); });
  const blocked = await blockedContext.newPage();
  await blocked.goto(`${origin}/preview/`);
  await blocked.getByRole('button', { name: 'Edit alert rule', exact: true }).click();
  await blocked.getByLabel('Both tokens are not ETH or WETH', { exact: false }).check();
  await blocked.getByRole('button', { name: 'Save rule' }).click();
  await expect(blocked.getByText('Saved for this session only')).toBeVisible();
  await expect(blocked.getByRole('button', { name: 'Matches 3', exact: true })).toBeVisible();
  await blocked.getByRole('button', { name: 'Send test alert' }).click();
  await expect(blocked.locator('.alert-list li')).toHaveCount(1);
  await blockedContext.close();
  pass('Storage-denied fallback retains session rules and working alert delivery');
  assert.deepEqual(results.consoleErrors, []);
  assert.deepEqual(results.failedRequests, []);
  assert.deepEqual(results.externalRequests, []);
  pass('Zero application console errors, failed requests or external runtime requests');
  await context.close();
} catch (error) { results.error = error.stack; throw error; }
finally { await writeFile(`${output}/checks.json`, JSON.stringify(results, null, 2)+'\n'); await browser?.close(); await new Promise(r => server.close(r)); }
