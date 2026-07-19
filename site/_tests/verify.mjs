import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadPlaywright, startStaticServer } from './test-support.mjs';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(testDirectory, '..');
const projectDirectory = path.resolve(siteDirectory, '..');
const skillDirectory = path.join(projectDirectory, 'skills', 'signature-visual');
const requiredPages = [
  '/',
  '/examples/particle-current/',
  '/examples/living-orb/',
  '/examples/radiance-field/',
  '/examples/spatial-lineage/'
];

async function listFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await listFiles(fullPath)));
    else output.push(fullPath);
  }
  return output;
}

async function verifySkill() {
  const files = await listFiles(skillDirectory);
  const skillPath = path.join(skillDirectory, 'SKILL.md');
  const skillText = await readFile(skillPath, 'utf8');
  const lineCount = skillText.split('\n').length;
  if (lineCount > 500) throw new Error(`SKILL.md has ${lineCount} lines; expected 500 or fewer`);
  if (skillText.includes('TODO')) throw new Error('SKILL.md contains a TODO');

  const markdownFiles = files.filter(file => file.endsWith('.md'));
  for (const file of markdownFiles) {
    const text = await readFile(file, 'utf8');
    const links = [...text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(match => match[1]);
    for (const link of links) {
      if (/^(https?:|#|mailto:)/.test(link)) continue;
      const target = path.resolve(path.dirname(file), link.split('#')[0]);
      try {
        await stat(target);
      } catch {
        throw new Error(`Broken reference in ${path.relative(projectDirectory, file)}: ${link}`);
      }
    }
  }

  const javascriptFiles = files.filter(file => file.endsWith('.js'));
  for (const file of javascriptFiles) {
    const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (check.status !== 0) throw new Error(check.stderr || `Syntax check failed: ${file}`);
  }

  const requiredFragments = [
    'ResizeObserver',
    'IntersectionObserver',
    'prefers-reduced-motion',
    'requestAnimationFrame',
    'visibilitychange',
    'dispose'
  ];
  const starterFiles = javascriptFiles.filter(file => file.includes(`${path.sep}starters${path.sep}`));
  for (const file of starterFiles) {
    const text = await readFile(file, 'utf8');
    for (const fragment of requiredFragments) {
      if (!text.includes(fragment)) {
        throw new Error(`${path.basename(file)} is missing lifecycle fragment: ${fragment}`);
      }
    }
  }
}

async function verifyBrowser() {
  const { chromium } = await loadPlaywright();
  const { server, port } = await startStaticServer(siteDirectory);
  const browser = await chromium.launch({ headless: true });
  const failures = [];

  try {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 }
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.name === 'mobile' ? 2 : 1
      });

      for (const pathname of requiredPages) {
        const page = await context.newPage();
        const consoleErrors = [];
        const pageErrors = [];
        page.on('console', message => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        });
        page.on('pageerror', error => pageErrors.push(error.message));

        try {
          const response = await page.goto(`http://127.0.0.1:${port}${pathname}`, {
            waitUntil: 'domcontentloaded',
            timeout: 45000
          });
          if (!response?.ok()) failures.push(`${viewport.name} ${pathname}: HTTP ${response?.status()}`);
          await page.waitForTimeout(pathname.includes('living-orb') ? 3500 : 1800);
          const overflow = await page.evaluate(() => {
            const hasOverflow = document.documentElement.scrollWidth > window.innerWidth + 2;
            if (!hasOverflow) return null;
            const offenders = [...document.querySelectorAll('*')]
              .map(element => ({
                tag: element.tagName.toLowerCase(),
                className: typeof element.className === 'string' ? element.className : '',
                rect: element.getBoundingClientRect()
              }))
              .filter(item => item.rect.right > window.innerWidth + 2 || item.rect.left < -2)
              .slice(0, 8)
              .map(item => `${item.tag}.${item.className} [${item.rect.left.toFixed(0)}, ${item.rect.right.toFixed(0)}]`);
            return offenders;
          });
          if (overflow) failures.push(`${viewport.name} ${pathname}: horizontal overflow ${overflow.join(', ')}`);
          if (consoleErrors.length) failures.push(`${viewport.name} ${pathname}: console ${consoleErrors.join(' | ')}`);
          if (pageErrors.length) failures.push(`${viewport.name} ${pathname}: page ${pageErrors.join(' | ')}`);
        } catch (error) {
          failures.push(`${viewport.name} ${pathname}: ${error.message}`);
        } finally {
          await page.close();
        }
      }
      await context.close();
    }

    const reducedContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: 'reduce'
    });
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await reducedPage.waitForTimeout(500);
    await reducedContext.close();
  } finally {
    await browser.close();
    server.close();
  }

  if (failures.length) throw new Error(`Browser verification failed:\n${failures.join('\n')}`);
}

async function verifyStarters() {
  const { chromium } = await loadPlaywright();
  const { server, port } = await startStaticServer(projectDirectory);
  const browser = await chromium.launch({ headless: true });
  const failures = [];

  try {
    for (const viewport of [
      { name: 'desktop', width: 1280, height: 900 },
      { name: 'mobile', width: 390, height: 844 }
    ]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      const errors = [];
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', error => errors.push(error.message));

      try {
        await page.goto(`http://127.0.0.1:${port}/site/_tests/starter-harness.html`, {
          waitUntil: 'domcontentloaded',
          timeout: 45000
        });
        await page.waitForFunction(() => window.__starterReady === true, null, { timeout: 45000 });
        await page.waitForTimeout(2200);
        for (const selector of ['#canvas', '#three', '#webgl', '#svg']) {
          await page.hover(selector);
        }
        const mounted = await page.evaluate(() => ({
          canvas: document.querySelectorAll('#canvas canvas').length,
          three: document.querySelectorAll('#three canvas').length,
          webgl: document.querySelectorAll('#webgl canvas').length,
          svg: document.querySelectorAll('#svg svg').length
        }));
        if (Object.values(mounted).some(count => count !== 1)) {
          failures.push(`${viewport.name} starter mount counts: ${JSON.stringify(mounted)}`);
        }
        await page.evaluate(() => window.__disposeAll());
        await page.waitForTimeout(100);
        const remaining = await page.evaluate(() => document.querySelectorAll('.tile canvas, .tile svg').length);
        if (remaining !== 0) failures.push(`${viewport.name} starter teardown left ${remaining} visual nodes`);
        if (errors.length) failures.push(`${viewport.name} starter errors: ${errors.join(' | ')}`);
      } catch (error) {
        failures.push(`${viewport.name} starter harness: ${error.message}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (failures.length) throw new Error(`Starter verification failed:\n${failures.join('\n')}`);
}

await verifySkill();
await verifyBrowser();
await verifyStarters();
console.log('Signature Visual verification passed: skill links, live starters, teardown, desktop, mobile, and reduced motion.');
