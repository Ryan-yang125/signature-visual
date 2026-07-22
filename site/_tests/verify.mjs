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

  const requiredSkillFiles = [
    'agents/openai.yaml',
    'references/visual-direction.md',
    'references/composition.md',
    'references/material-language.md',
    'references/motion-direction.md',
    'references/pattern-language.md',
    'references/reference-study.md',
    'references/visual-qa.md',
    'references/failure-signatures.md',
    'scripts/visual-qa.mjs',
    'scripts/visual-qa.test.mjs'
  ];
  for (const relativePath of requiredSkillFiles) {
    await stat(path.join(skillDirectory, relativePath));
  }

  for (const fragment of ['visual thesis', 'Direction Cards', 'signature rule', 'deterministic', 'contact sheet']) {
    if (!skillText.toLowerCase().includes(fragment.toLowerCase())) {
      throw new Error(`SKILL.md is missing V2 director contract: ${fragment}`);
    }
  }

  const agentMetadata = await readFile(path.join(skillDirectory, 'agents', 'openai.yaml'), 'utf8');
  if (!agentMetadata.includes('$signature-visual')) throw new Error('agents/openai.yaml default prompt must invoke $signature-visual');

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

  const javascriptFiles = files.filter(file => /\.m?js$/.test(file));
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
        const networkErrors = [];
        page.on('console', message => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        });
        page.on('pageerror', error => pageErrors.push(error.message));
        page.on('requestfailed', request => networkErrors.push(`${request.url()}: ${request.failure()?.errorText ?? 'request failed'}`));
        page.on('response', response => {
          if (response.status() >= 400) networkErrors.push(`${response.url()}: HTTP ${response.status()}`);
        });

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
          if (networkErrors.length) failures.push(`${viewport.name} ${pathname}: network ${networkErrors.join(' | ')}`);

          if (pathname !== '/') {
            const bridge = await page.evaluate(() => {
              const visual = window.__signatureVisual;
              return {
                present: Boolean(visual),
                ready: Boolean(visual?.ready),
                setSeed: typeof visual?.setSeed === 'function',
                seek: typeof visual?.seek === 'function',
                setPointer: typeof visual?.setPointer === 'function',
                render: typeof visual?.render === 'function',
                describe: typeof visual?.describe === 'function'
              };
            });
            if (Object.values(bridge).some(value => value !== true)) {
              failures.push(`${viewport.name} ${pathname}: incomplete deterministic bridge ${JSON.stringify(bridge)}`);
            }
          }

          if (pathname === '/' && viewport.name === 'desktop') {
            await page.click('[data-direction="glass"]');
            await page.click('[data-progress="0.75"]');
            const director = await page.evaluate(() => ({
              direction: document.querySelector('.direction-stage')?.dataset.direction,
              name: document.querySelector('#stage-name')?.textContent,
              readout: document.querySelector('#motion-readout')?.textContent,
              loadedFrames: document.querySelectorAll('iframe[data-loaded="true"]').length
            }));
            if (director.direction !== 'glass' || !director.name?.includes('Glass') || !director.readout?.includes('75%')) {
              failures.push(`desktop /: director controls failed ${JSON.stringify(director)}`);
            }
          }

          if (pathname === '/' && viewport.name === 'mobile') {
            const targets = await page.evaluate(() => {
              const parse = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
              const luminance = value => {
                const channels = parse(value).map(channel => {
                  const normalized = channel / 255;
                  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
                });
                return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
              };
              const background = getComputedStyle(document.body).backgroundColor;
              const backgroundLuminance = luminance(background);
              return [...document.querySelectorAll('.score-states button')].map(button => {
                const color = getComputedStyle(button).color;
                const foregroundLuminance = luminance(color);
                const contrast = (Math.max(backgroundLuminance, foregroundLuminance) + 0.05) / (Math.min(backgroundLuminance, foregroundLuminance) + 0.05);
                return { height: button.getBoundingClientRect().height, contrast };
              });
            });
            if (targets.some(target => target.height < 24 || target.contrast < 4.5)) {
              failures.push(`mobile /: motion-score targets fail size/contrast ${JSON.stringify(targets)}`);
            }
          }

          if (pathname === '/examples/spatial-lineage/' && viewport.name === 'desktop') {
            const accessibleNodes = await page.locator('#diagram').getByRole('button').count();
            const requestNode = page.locator('[data-node="request"]');
            await requestNode.focus();
            await requestNode.press('Enter');
            const detail = await page.locator('#detail').textContent();
            await requestNode.press('Escape');
            const escaped = await page.evaluate(() => document.activeElement?.dataset?.node !== 'request');
            if (accessibleNodes !== 9 || !detail?.includes('policy request') || !escaped) {
              failures.push(`desktop ${pathname}: keyboard/accessibility contract failed ${JSON.stringify({ accessibleNodes, detail, escaped })}`);
            }
          }
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
    const reducedSelectors = new Map([
      ['/examples/particle-current/', '.loom'],
      ['/examples/living-orb/', '.specimen-sheet'],
      ['/examples/radiance-field/', '.bench'],
      ['/examples/spatial-lineage/', '.decision-room']
    ]);

    for (const pathname of requiredPages) {
      const reducedPage = await reducedContext.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      reducedPage.on('console', message => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      reducedPage.on('pageerror', error => pageErrors.push(error.message));

      try {
        const response = await reducedPage.goto(`http://127.0.0.1:${port}${pathname}`, {
          waitUntil: 'domcontentloaded',
          timeout: 45000
        });
        if (!response?.ok()) failures.push(`reduced ${pathname}: HTTP ${response?.status()}`);
        await reducedPage.waitForTimeout(pathname.includes('living-orb') ? 3500 : 1800);

        const state = await reducedPage.evaluate(() => ({
          reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
          overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
          bridgeReady: Boolean(window.__signatureVisual?.ready)
        }));
        if (!state.reduced) failures.push(`reduced ${pathname}: media preference was not applied`);
        if (state.overflow) failures.push(`reduced ${pathname}: horizontal overflow`);
        if (pathname !== '/' && !state.bridgeReady) failures.push(`reduced ${pathname}: visual bridge is not ready`);
        if (consoleErrors.length) failures.push(`reduced ${pathname}: console ${consoleErrors.join(' | ')}`);
        if (pageErrors.length) failures.push(`reduced ${pathname}: page ${pageErrors.join(' | ')}`);

        const selector = reducedSelectors.get(pathname);
        if (selector) {
          const visual = reducedPage.locator(selector).first();
          const firstFrame = await visual.screenshot({ type: 'png' });
          await reducedPage.waitForTimeout(700);
          const secondFrame = await visual.screenshot({ type: 'png' });
          if (!firstFrame.equals(secondFrame)) failures.push(`reduced ${pathname}: authored still changed over time`);
        }
      } catch (error) {
        failures.push(`reduced ${pathname}: ${error.message}`);
      } finally {
        await reducedPage.close();
      }
    }
    await reducedContext.close();

    const fallbackContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await fallbackContext.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function patchedContext(type, ...args) {
        if (String(type).startsWith('webgl')) return null;
        return original.call(this, type, ...args);
      };
    });
    const fallbackPage = await fallbackContext.newPage();
    const fallbackErrors = [];
    fallbackPage.on('console', message => {
      if (message.type() === 'error') fallbackErrors.push(message.text());
    });
    fallbackPage.on('pageerror', error => fallbackErrors.push(error.message));
    try {
      await fallbackPage.goto(`http://127.0.0.1:${port}/examples/living-orb/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await fallbackPage.waitForTimeout(800);
      const fallback = await fallbackPage.evaluate(() => ({
        ready: Boolean(window.__signatureVisual?.ready),
        renderer: window.__signatureVisual?.describe?.().renderer,
        fallbackVisible: getComputedStyle(document.querySelector('.fallback-organism')).opacity !== '0',
        canvasCount: document.querySelectorAll('#three-stage canvas').length
      }));
      if (!fallback.ready || fallback.renderer !== 'fallback' || !fallback.fallbackVisible || fallback.canvasCount !== 0 || fallbackErrors.length) {
        failures.push(`living-orb GPU fallback failed ${JSON.stringify({ fallback, fallbackErrors })}`);
      }
    } finally {
      await fallbackContext.close();
    }
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
        const controllerContract = await page.evaluate(() => window.__starters.map(controller => ({
          callable: typeof controller === 'function',
          dispose: typeof controller.dispose === 'function',
          setSeed: typeof controller.setSeed === 'function',
          seek: typeof controller.seek === 'function',
          setPointer: typeof controller.setPointer === 'function',
          render: typeof controller.render === 'function'
        })));
        if (controllerContract.some(contract => Object.values(contract).some(value => value !== true))) {
          failures.push(`${viewport.name} starter controller contract: ${JSON.stringify(controllerContract)}`);
        }
        const deterministicContract = await page.evaluate(() => {
          const names = ['canvas', 'three', 'webgl', 'svg'];
          const snapshotSeeds = () => names.map(name => window.__starterObservations[name].seed);
          for (const controller of window.__starters) controller.setSeed('signature-seed-alpha');
          const alpha = snapshotSeeds();
          for (const controller of window.__starters) controller.setSeed('signature-seed-beta');
          const beta = snapshotSeeds();
          for (const controller of window.__starters) {
            controller.seek({ time: 1.5, progress: 0.5 });
            controller.setPointer({ x: 0.5, y: 0.25, active: 1 });
            controller.render();
          }
          return { alpha, beta, observations: window.__starterObservations };
        });
        if (new Set(deterministicContract.alpha).size !== 1 || new Set(deterministicContract.beta).size !== 1) {
          failures.push(`${viewport.name} starter named seeds disagree: ${JSON.stringify(deterministicContract)}`);
        }
        if (deterministicContract.alpha[0] === deterministicContract.beta[0] || deterministicContract.alpha.some(seed => !Number.isInteger(seed) || seed === 0)) {
          failures.push(`${viewport.name} starter named seeds did not normalize distinctly: ${JSON.stringify(deterministicContract)}`);
        }
        const pointerExpectations = {
          canvas: { x: 0.5, y: 0.25 },
          three: { x: 0, y: 0.5 },
          webgl: { x: 0.5, y: 0.75 },
          svg: { x: 0.5, y: 0.25 }
        };
        for (const [name, expected] of Object.entries(pointerExpectations)) {
          const actual = deterministicContract.observations[name].pointer;
          if (!actual || Math.abs(actual.x - expected.x) > 0.001 || Math.abs(actual.y - expected.y) > 0.001 || actual.active !== 1) {
            failures.push(`${viewport.name} ${name} pointer contract: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
          }
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
