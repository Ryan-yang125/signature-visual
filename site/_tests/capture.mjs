import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlaywright, startStaticServer } from './test-support.mjs';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(testDirectory, '..');
const outputDirectory = path.join(siteDirectory, 'screenshots');
await mkdir(outputDirectory, { recursive: true });

const captures = [
  { name: 'og-signature-visual.png', path: '/', width: 1600, height: 900, homeProgress: 0.5 },
  { name: 'particle-current.png', path: '/examples/particle-current/', width: 1400, height: 900, progress: 0.68 },
  { name: 'living-orb.png', path: '/examples/living-orb/', width: 1400, height: 900, progress: 0.68 },
  { name: 'radiance-field.png', path: '/examples/radiance-field/', width: 1400, height: 900, progress: 0.7 },
  { name: 'spatial-lineage.png', path: '/examples/spatial-lineage/', width: 1400, height: 900, progress: 0.8 },
  { name: 'mobile-home.png', path: '/', width: 390, height: 844, dpr: 2 }
];

const { chromium } = await loadPlaywright();
const { server, port } = await startStaticServer(siteDirectory);
const browser = await chromium.launch({ headless: true });

try {
  for (const capture of captures) {
    const context = await browser.newContext({
      viewport: { width: capture.width, height: capture.height },
      deviceScaleFactor: capture.dpr ?? 1
    });
    const page = await context.newPage();
    const errors = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: '2024-01-01T00:00:00.000Z' });
    await page.clock.pauseAt('2024-01-01T00:00:00.000Z');
    await page.goto(`http://127.0.0.1:${port}${capture.path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    await page.clock.runFor(0);
    await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());
    if (capture.progress !== undefined) {
      await page.waitForFunction(() => window.__signatureVisual?.ready === true, null, { timeout: 45000 });
      await page.evaluate(progress => {
        window.__signatureVisual.setSeed('site-screenshot-v2');
        window.__signatureVisual.seek({ progress });
        window.__signatureVisual.render();
      }, capture.progress);
    }
    if (capture.homeProgress !== undefined) {
      await page.click(`[data-progress="${capture.homeProgress}"]`);
    }
    await page.clock.runFor(0);
    if (errors.length) throw new Error(`${capture.path}: ${errors.join(' | ')}`);
    await page.screenshot({
      path: path.join(outputDirectory, capture.name),
      fullPage: false
    });
    await context.close();
    console.log(`Captured ${capture.name}`);
  }
} finally {
  await browser.close();
  server.close();
}
