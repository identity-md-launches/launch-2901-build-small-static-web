import { createServer } from 'node:http';
import { readFile, mkdir, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const root = resolve('dist');
const out = resolve('test/scratch/production');
await mkdir(out, { recursive: true });
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!path.startsWith('/preview/')) { res.writeHead(404).end(); return; }
    const file = resolve(root, path.slice('/preview/'.length) || 'index.html');
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    res.end(bytes);
  } catch { res.writeHead(404).end('Not found'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
const endpoint = 'https://api.squeekchain.com/v1/economy/state';
const recorded = JSON.parse(await readFile(new URL('./fixtures/economy.json', import.meta.url), 'utf8'));
const fresh = () => ({ ...structuredClone(recorded), generatedAt: new Date().toISOString(), chain: { ...recorded.chain, safeBlockTimestamp: new Date().toISOString() } });
let passes = 0;
const results = [];
async function check(name, fn) {
  await fn(); passes++; results.push({ name, passed: true }); console.log(`PASS ${name}`);
}

try {
  for (const [engine, launcher] of [['chromium', chromium], ['webkit', webkit]]) {
    let browser;
    try { browser = await launcher.launch({ headless: true }); }
    catch {
      results.push({ name: `${engine}: browser launch`, passed: false, skipped: true, limitation: 'Browser runtime could not launch; this engine was not verified.' });
      console.log(`NOT VERIFIED ${engine}: browser runtime could not launch.`);
      continue;
    }
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      const localFailures = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.url().startsWith(url) && response.status() >= 400) localFailures.push(response.url()); });
      let mode = 'success';
      let requestCount = 0;
      let releasePending;
      await page.route(endpoint, async route => {
        requestCount++;
        if (mode === 'pending') await new Promise(done => { releasePending = done; });
        if (mode === 'network') return route.abort('failed');
        if (mode === 'http') return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"database_unavailable"}' });
        if (mode === 'rate') return route.fulfill({ status: 429, contentType: 'application/json', headers: { 'Retry-After': '2', 'Access-Control-Expose-Headers': 'Retry-After' }, body: '{"error":"rate_limited"}' });
        if (mode === 'unavailable') return route.fulfill({ json: { schemaVersion: 2, status: 'unavailable', reason: 'indexer_unavailable' } });
        if (mode === 'malformed') return route.fulfill({ body: '<html>not json</html>', contentType: 'text/html' });
        if (mode === 'version') return route.fulfill({ json: { ...fresh(), schemaVersion: 3 } });
        if (mode === 'wrongchain') return route.fulfill({ json: { ...fresh(), chain: { ...fresh().chain, chainId: '1' } } });
        if (mode === 'stale') return route.fulfill({ json: { ...fresh(), chain: recorded.chain } });
        if (mode === 'zero') { const data = fresh(); data.nft.live = '0'; data.nft.burned = data.nft.issued; data.identities.staking = null; return route.fulfill({ json: data }); }
        return route.fulfill({ json: fresh() });
      });

      await check(`${engine}: loads the production export at a subpath`, async () => {
        await page.goto(url);
        await page.getByRole('status').filter({ hasText: 'API connected' }).waitFor();
        assert.equal(await page.locator('.metric-round .metric-value').innerText(), BigInt(recorded.lifecycle.currentRound).toLocaleString('en-US'));
        assert.equal(await page.locator('.metric-nft .metric-value').innerText(), BigInt(recorded.nft.live).toLocaleString('en-US'));
        assert.equal(await page.locator('.contract-row:visible').count(), 5);
        assert.deepEqual(errors, []); assert.deepEqual(localFailures, []);
        assert.equal(await page.evaluate(() => document.fonts.check('400 16px "DM Sans"')), true);
      });
      await check(`${engine}: product and refresh are in the first 390px screen`, async () => {
        const heading = await page.locator('h1').boundingBox();
        const action = await page.getByRole('button', { name: 'Refresh now', exact: true }).boundingBox();
        const round = await page.locator('.metric-round').boundingBox();
        assert(heading.y > 0 && action.y + action.height < 844 && round.y + round.height < 844);
      });
      await check(`${engine}: refresh has a visible pending state and prevents duplicate requests`, async () => {
        mode = 'pending';
        const before = requestCount;
        await page.getByRole('button', { name: 'Refresh now', exact: true }).click();
        await page.getByRole('button', { name: 'Refreshing…', exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Refreshing…', exact: true }).isDisabled(), true);
        assert.equal(requestCount, before + 1);
        mode = 'success'; releasePending();
        await page.getByRole('button', { name: 'Refresh now', exact: true }).waitFor();
      });
      await check(`${engine}: auto refresh can be paused and resumed`, async () => {
        const checkbox = page.getByRole('checkbox', { name: 'Auto refresh' });
        await checkbox.uncheck(); assert.equal(await checkbox.isChecked(), false);
        // Bring a hidden page back with auto-refresh off: it must not request.
        const before = requestCount;
        await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
        assert.equal(requestCount, before);
        await checkbox.check(); assert.equal(await checkbox.isChecked(), true);
        await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
        await page.waitForFunction(() => document.querySelector('.connection-status').textContent.includes('API connected'));
        assert(requestCount > before);
        await checkbox.uncheck();
      });
      await check(`${engine}: exact amounts and supporting addresses expand`, async () => {
        await page.getByText('View exact amounts', { exact: true }).click();
        assert(await page.locator('.exact-values').isVisible());
        assert((await page.locator('.exact-values').innerText()).includes('28,935,304.258689777280764915'));
        await page.getByText('View supporting contracts', { exact: true }).click();
        assert.equal(await page.locator('.contract-row').count(), 9);
        await page.getByText('About this snapshot', { exact: true }).click();
        assert(await page.locator('.snapshot-values').isVisible());
        assert.equal(await page.locator('.contract-address').first().getAttribute('href'), `https://sepolia.etherscan.io/address/${recorded.identities.core}`);
      });
      await check(`${engine}: copy reports success and clipboard failure honestly`, async () => {
        await page.evaluate(() => { window.__copied = ''; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.__copied = value; } } }); });
        await page.getByRole('button', { name: 'Copy SqueekCore address', exact: true }).click();
        assert.equal(await page.evaluate(() => window.__copied), recorded.identities.core);
        assert((await page.locator('.copy-status').innerText()).includes('address copied'));
        await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('permission denied'); } } }); });
        await page.getByRole('button', { name: 'Copy SqueekToken address', exact: true }).click();
        assert((await page.locator('.copy-status').innerText()).includes('Select the full address'));
      });
      await check(`${engine}: keyboard navigation reaches the main action and disclosures`, async () => {
        await page.goto(url);
        await page.getByRole('button', { name: 'Refresh now', exact: true }).waitFor();
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to dashboard');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Refresh now');
        await page.keyboard.press('Enter');
        await page.getByRole('button', { name: 'Refresh now', exact: true }).waitFor();
        await page.locator('.exact-details summary').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('.exact-details').getAttribute('open'), '');
      });
      for (const [state, expected] of [['http', 'HTTP 503'], ['network', 'Check your connection'], ['unavailable', 'reports that economy data is unavailable'], ['malformed', 'changed or is incomplete'], ['version', 'version is not supported'], ['wrongchain', 'different network']]) {
        await check(`${engine}: ${state} failure keeps the last snapshot and recovers`, async () => {
          mode = state;
          await page.getByRole('button', { name: 'Refresh now', exact: true }).click();
          await page.getByRole('alert').waitFor();
          assert((await page.getByRole('alert').innerText()).includes(expected));
          assert.equal(await page.locator('.metric-nft .metric-value').innerText(), BigInt(recorded.nft.live).toLocaleString('en-US'));
          mode = 'success';
          await page.getByRole('button', { name: 'Refresh now', exact: true }).click();
          await page.getByRole('status').filter({ hasText: 'API connected' }).waitFor();
          assert.equal(await page.getByRole('alert').count(), 0);
        });
      }
      await check(`${engine}: initial failure shows unknown, then retry fills the dashboard`, async () => {
        mode = 'http'; await page.reload();
        await page.getByRole('alert').waitFor();
        assert.equal(await page.locator('.metric-round .metric-value').innerText(), 'Unavailable');
        assert.equal(await page.locator('.contract-address').count(), 0);
        assert.equal(await page.getByRole('meter').count(), 0);
        const scan = await new AxeBuilder({ page }).analyze();
        assert.deepEqual(scan.violations.map(v => v.id), []);
        mode = 'success'; await page.getByRole('button', { name: 'Refresh now', exact: true }).click();
        await page.getByRole('status').filter({ hasText: 'API connected' }).waitFor();
      });
      await check(`${engine}: stale safe block is labeled even with a fresh API timestamp`, async () => {
        mode = 'stale'; await page.getByRole('button', { name: 'Refresh now', exact: true }).click();
        await page.getByText('This snapshot may be delayed.', { exact: true }).waitFor();
        mode = 'success'; await page.getByRole('button', { name: 'Refresh now', exact: true }).click();
        await page.getByRole('status').filter({ hasText: 'API connected' }).waitFor();
      });
      await check(`${engine}: rate limit honors Retry-After before enabling refresh`, async () => {
        mode = 'rate'; await page.getByRole('button', { name: 'Refresh now', exact: true }).click();
        await page.getByRole('button', { name: /^Wait / }).waitFor();
        assert.equal(await page.getByRole('button', { name: /^Wait / }).isDisabled(), true);
        mode = 'success'; await page.getByRole('button', { name: 'Refresh now', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Refresh now', exact: true }).click();
        await page.getByRole('status').filter({ hasText: 'API connected' }).waitFor();
      });
      await check(`${engine}: real zero and an unbound contract are distinct from missing data`, async () => {
        mode = 'zero'; await page.getByRole('button', { name: 'Refresh now', exact: true }).click();
        await page.getByText('Not bound in this deployment', { exact: true }).waitFor();
        assert.equal(await page.locator('.metric-nft .metric-value').innerText(), '0');
        mode = 'success'; await page.getByRole('button', { name: 'Refresh now', exact: true }).click();
        await page.getByRole('status').filter({ hasText: 'API connected' }).waitFor();
      });
      await check(`${engine}: auto refresh polls at 30 seconds and stops when paused`, async () => {
        const timerPage = await context.newPage();
        await timerPage.clock.install();
        let reads = 0;
        await timerPage.route(endpoint, route => { reads++; return route.fulfill({ json: fresh() }); });
        await timerPage.goto(url);
        await timerPage.getByRole('status').filter({ hasText: 'API connected' }).waitFor();
        const initial = reads;
        await timerPage.clock.fastForward(30_001);
        await timerPage.getByRole('status').filter({ hasText: 'API connected' }).waitFor();
        assert(reads > initial);
        await timerPage.getByRole('checkbox', { name: 'Auto refresh' }).uncheck();
        const paused = reads;
        await timerPage.clock.fastForward(60_001);
        assert.equal(reads, paused);
        await timerPage.close();
      });
      await check(`${engine}: a hung request times out after 12 seconds`, async () => {
        const timeoutPage = await context.newPage();
        await timeoutPage.clock.install();
        let pendingRoute;
        await timeoutPage.route(endpoint, route => { pendingRoute = route; });
        await timeoutPage.goto(url);
        await timeoutPage.getByRole('button', { name: 'Refreshing…', exact: true }).waitFor();
        await timeoutPage.clock.fastForward(12_001);
        await timeoutPage.getByRole('alert').waitFor();
        assert((await timeoutPage.getByRole('alert').innerText()).includes('took too long'));
        await pendingRoute?.abort().catch(() => {});
        await timeoutPage.close();
      });
      for (const width of [320, 390, 560, 820, 1090, 1440]) {
        await check(`${engine}: ${width}px reflows without horizontal overflow`, async () => {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
          const scan = await new AxeBuilder({ page }).analyze();
          assert.deepEqual(scan.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
          await page.screenshot({ path: resolve(out, `${engine}-${width}.png`), fullPage: true });
        });
      }
      await check(`${engine}: 200% text enlargement reflows at 390px`, async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => document.documentElement.style.fontSize = '200%');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
        assert.equal(await page.locator('.metric-round .metric-value').evaluate(element => { const range = document.createRange(); range.selectNodeContents(element); return range.getClientRects().length; }), 1, 'The round number remains on one line at 200% text size.');
        await page.screenshot({ path: resolve(out, `${engine}-text-200.png`), fullPage: true });
        await page.evaluate(() => document.documentElement.style.fontSize = '');
      });
      await check(`${engine}: metadata and local share image are present`, async () => {
        assert((await page.title()).includes('Squeekchain'));
        for (const selector of ['meta[name="description"]','meta[property="og:title"]','meta[property="og:image"]','link[rel="icon"]']) assert(await page.locator(selector).count());
        assert((await stat(resolve(root, 'social-card.png'))).size > 1000);
        assert.deepEqual(localFailures, []); assert.deepEqual(errors, []);
      });
      await page.close();
    } finally { await browser.close(); }
  }
  assert(passes > 0, 'No browser could be verified.');
  console.log(`${passes} production interaction/layout/accessibility checks passed. Limitations: ${results.filter(r => r.skipped).length} browser engine(s) not verified.`);
} finally {
  await new Promise(done => server.close(done));
  await import('node:fs/promises').then(fs => fs.writeFile(resolve(out, 'results.json'), JSON.stringify({ passes, results }, null, 2)));
}
