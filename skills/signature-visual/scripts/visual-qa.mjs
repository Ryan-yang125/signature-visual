#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const DEFAULT_EPOCH = '2024-01-01T00:00:00.000Z';
const DEFAULT_HOOK = '__signatureVisual';
const DEFAULT_SEED = 'signature-visual-v2';

const exampleManifest = {
  name: 'Hero visual review',
  serveRoot: './public',
  url: '/hero/',
  outputDir: './visual-qa-output',
  viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  captureSelector: 'main',
  readySelector: 'canvas',
  hook: DEFAULT_HOOK,
  seed: 'hero-direction-a',
  states: [
    { name: 'rest', progress: 0 },
    { name: 'develop', progress: 0.5 },
    { name: 'peak', progress: 1 },
    { name: 'ambient-2s', timeMs: 2000 },
    {
      name: 'pointer-center',
      timeMs: 1800,
      pointer: [{ atMs: 600, x: 0.5, y: 0.5 }]
    }
  ]
};

const helpText = `Signature Visual deterministic QA

Usage:
  node visual-qa.mjs <manifest.json> [--output <directory>] [--headed]
  node visual-qa.mjs --print-example
  node visual-qa.mjs --help

The manifest captures every state in a fresh browser context with:
  - a seeded Math.random()
  - a fixed UTC epoch and Playwright-controlled performance/RAF time
  - a fixed viewport, DPR, locale, timezone, color scheme, and motion preference
  - scripted pointer events at exact virtual times

State fields:
  progress   Timeline progress from 0 through 1. Requires the hook seek() or setProgress().
  timeMs     Final ambient capture time in milliseconds.
  pointer    One event or an array of { atMs, x, y, target?, unit?, steps?, leave? }.
             x/y use target-relative ratios by default. Set unit to "px" for pixels.
  settleMs   Used when pointer is present and timeMs is omitted. Default: 500.

Optional page hook:
  window.__signatureVisual = {
    ready: true,                                 // boolean, Promise, or function
    setSeed(seed) { /* reset deterministic state */ },
    seek({ time, timeMs, progress }) { /* set the exact state */ },
    setPointer({ x, y, active }) { /* update */ },
    render() { /* commit the frame */ },
    describe() { return { phase, time, progress }; }
  };

Timeline states require seek() or setProgress(). Ambient states work through the virtual clock
and gain an exact render boundary through seek() and render(). Pointer states use setPointer()
when available and browser pointer events everywhere else. The legacy __signatureVisualQA
methods setProgress() and renderAt() remain supported.

Outputs:
  captures/*.png       One deterministic image per state.
  contact-sheet.html   Dependency-free visual comparison grid.
  results.json         Stable state metadata and SHA-256 image hashes.

Manifest controls:
  readySelector, captureSelector, fullPage, timeoutMs, reducedMotion, colorScheme,
  locale, timezoneId, failOnConsoleError, and failOnNetworkError.

Options:
  --output <dir>       Override outputDir. Resolved from the current working directory.
  --headed             Show Chromium while capturing.
  --print-example      Print an example manifest as JSON.
  -h, --help           Show this help.
`;

class CliError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VisualQaError';
  }
}

function parseArguments(argv) {
  const options = { headed: false, output: undefined, manifest: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '-h' || argument === '--help') return { action: 'help' };
    if (argument === '--print-example') return { action: 'example' };
    if (argument === '--headed') {
      options.headed = true;
      continue;
    }
    if (argument === '--output') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) throw new CliError('--output requires a directory path.');
      options.output = value;
      index += 1;
      continue;
    }
    if (argument.startsWith('-')) throw new CliError(`Unknown option: ${argument}`);
    if (options.manifest) throw new CliError(`Only one manifest is accepted. Received: ${argument}`);
    options.manifest = argument;
  }
  if (!options.manifest) throw new CliError('A manifest path is required. Run with --help for the schema.');
  return { action: 'capture', ...options };
}

function requireCondition(condition, message) {
  if (!condition) throw new CliError(message);
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function normalizePointer(pointer, stateName, defaultTarget) {
  const items = pointer === undefined ? [] : Array.isArray(pointer) ? pointer : [pointer];
  return items.map((event, index) => {
    requireCondition(event && typeof event === 'object', `State "${stateName}" pointer ${index + 1} requires an object.`);
    const atMs = event.atMs ?? 0;
    requireCondition(finiteNumber(atMs) && atMs >= 0, `State "${stateName}" pointer ${index + 1} has an invalid atMs.`);
    const leave = event.leave === true || event.active === false;
    const unit = event.unit ?? 'ratio';
    requireCondition(unit === 'ratio' || unit === 'px', `State "${stateName}" pointer ${index + 1} unit must be "ratio" or "px".`);
    if (!leave) {
      requireCondition(finiteNumber(event.x) && finiteNumber(event.y), `State "${stateName}" pointer ${index + 1} requires numeric x and y.`);
      if (unit === 'ratio') {
        requireCondition(event.x >= 0 && event.x <= 1 && event.y >= 0 && event.y <= 1, `State "${stateName}" pointer ${index + 1} ratio coordinates must be between 0 and 1.`);
      }
    }
    const steps = event.steps ?? 1;
    requireCondition(positiveInteger(steps), `State "${stateName}" pointer ${index + 1} steps requires a positive integer.`);
    return {
      atMs,
      x: leave ? 0 : event.x,
      y: leave ? 0 : event.y,
      active: !leave,
      leave,
      unit,
      steps,
      target: event.target ?? defaultTarget ?? 'body'
    };
  }).sort((left, right) => left.atMs - right.atMs);
}

function normalizeManifest(raw, manifestPath, outputOverride) {
  requireCondition(raw && typeof raw === 'object' && !Array.isArray(raw), 'Manifest root requires a JSON object.');
  requireCondition(typeof raw.url === 'string' && raw.url.length > 0, 'Manifest url requires a non-empty string.');
  requireCondition(Array.isArray(raw.states) && raw.states.length > 0, 'Manifest states requires at least one capture state.');

  const manifestDirectory = path.dirname(manifestPath);
  const viewport = raw.viewport ?? {};
  const width = viewport.width ?? 1440;
  const height = viewport.height ?? 900;
  const deviceScaleFactor = viewport.deviceScaleFactor ?? 1;
  requireCondition(positiveInteger(width) && positiveInteger(height), 'Viewport width and height require positive integers.');
  requireCondition(finiteNumber(deviceScaleFactor) && deviceScaleFactor > 0 && deviceScaleFactor <= 4, 'deviceScaleFactor requires a number greater than 0 and at most 4.');

  const captureSelector = raw.captureSelector;
  const readySelector = raw.readySelector;
  if (captureSelector !== undefined) requireCondition(typeof captureSelector === 'string' && captureSelector.length > 0, 'captureSelector requires a non-empty string.');
  if (readySelector !== undefined) requireCondition(typeof readySelector === 'string' && readySelector.length > 0, 'readySelector requires a non-empty string.');

  const seenNames = new Set();
  const states = raw.states.map((state, index) => {
    requireCondition(state && typeof state === 'object' && !Array.isArray(state), `State ${index + 1} requires an object.`);
    const name = state.name;
    requireCondition(typeof name === 'string' && name.trim().length > 0, `State ${index + 1} requires a non-empty name.`);
    requireCondition(!seenNames.has(name), `State name "${name}" is duplicated.`);
    seenNames.add(name);

    const progress = state.progress;
    if (progress !== undefined) requireCondition(finiteNumber(progress) && progress >= 0 && progress <= 1, `State "${name}" progress must be between 0 and 1.`);
    const pointer = normalizePointer(state.pointer, name, captureSelector);
    const lastPointerTime = pointer.at(-1)?.atMs ?? 0;
    let timeMs = state.timeMs;
    if (timeMs === undefined && pointer.length > 0) {
      const settleMs = state.settleMs ?? 500;
      requireCondition(finiteNumber(settleMs) && settleMs >= 0, `State "${name}" settleMs requires a non-negative number.`);
      timeMs = lastPointerTime + settleMs;
    }
    if (timeMs !== undefined) {
      requireCondition(finiteNumber(timeMs) && timeMs >= 0, `State "${name}" timeMs requires a non-negative number.`);
      requireCondition(timeMs >= lastPointerTime, `State "${name}" timeMs must reach its last pointer event at ${lastPointerTime}ms.`);
    }
    requireCondition(progress !== undefined || timeMs !== undefined, `State "${name}" requires progress, timeMs, or pointer.`);
    return { name: name.trim(), progress, timeMs, pointer };
  });

  const serveRoot = raw.serveRoot === undefined ? undefined : path.resolve(manifestDirectory, raw.serveRoot);
  if (serveRoot) requireCondition(raw.url.startsWith('/'), 'A manifest using serveRoot requires url to start with "/".');
  if (!serveRoot) requireCondition(/^https?:\/\//.test(raw.url), 'An absolute http(s) url is required when serveRoot is absent.');

  const manifestOutput = raw.outputDir ?? './visual-qa-output';
  requireCondition(typeof manifestOutput === 'string' && manifestOutput.length > 0, 'outputDir requires a non-empty string.');
  const outputDirectory = outputOverride
    ? path.resolve(process.cwd(), outputOverride)
    : path.resolve(manifestDirectory, manifestOutput);

  const timeoutMs = raw.timeoutMs ?? 30000;
  requireCondition(positiveInteger(timeoutMs), 'timeoutMs requires a positive integer.');
  const hook = raw.hook ?? DEFAULT_HOOK;
  requireCondition(typeof hook === 'string' && hook.length > 0, 'hook requires a non-empty global property name.');
  requireCondition(typeof (raw.seed ?? DEFAULT_SEED) === 'string' || finiteNumber(raw.seed), 'seed requires a string or finite number.');
  const epoch = raw.epoch ?? DEFAULT_EPOCH;
  requireCondition(
    (typeof epoch === 'string' && Number.isFinite(Date.parse(epoch))) || finiteNumber(epoch),
    'epoch requires an ISO date string or finite millisecond timestamp.'
  );
  requireCondition(typeof (raw.locale ?? 'en-US') === 'string' && (raw.locale ?? 'en-US').length > 0, 'locale requires a non-empty string.');
  requireCondition(typeof (raw.timezoneId ?? 'UTC') === 'string' && (raw.timezoneId ?? 'UTC').length > 0, 'timezoneId requires a non-empty string.');

  const reducedMotion = raw.reducedMotion ?? 'no-preference';
  requireCondition(reducedMotion === 'reduce' || reducedMotion === 'no-preference', 'reducedMotion must be "reduce" or "no-preference".');
  const colorScheme = raw.colorScheme;
  if (colorScheme !== undefined) requireCondition(colorScheme === 'light' || colorScheme === 'dark' || colorScheme === 'no-preference', 'colorScheme must be "light", "dark", or "no-preference".');

  return {
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : path.basename(manifestPath, path.extname(manifestPath)),
    url: raw.url,
    serveRoot,
    outputDirectory,
    viewport: { width, height, deviceScaleFactor },
    captureSelector,
    readySelector,
    hook,
    seed: raw.seed ?? DEFAULT_SEED,
    epoch,
    locale: raw.locale ?? 'en-US',
    timezoneId: raw.timezoneId ?? 'UTC',
    reducedMotion,
    colorScheme,
    fullPage: raw.fullPage === true,
    failOnConsoleError: raw.failOnConsoleError !== false,
    failOnNetworkError: raw.failOnNetworkError === true,
    timeoutMs,
    states
  };
}

async function loadManifest(manifestArgument, outputOverride) {
  const manifestPath = path.resolve(process.cwd(), manifestArgument);
  let source;
  try {
    source = await readFile(manifestPath, 'utf8');
  } catch (error) {
    throw new CliError(`Unable to read manifest ${manifestPath}: ${error.message}`);
  }
  let raw;
  try {
    raw = JSON.parse(source);
  } catch (error) {
    throw new CliError(`Manifest JSON is invalid at ${manifestPath}: ${error.message}`);
  }
  return { manifest: normalizeManifest(raw, manifestPath, outputOverride), manifestPath };
}

async function findCachedPlaywrightPackage() {
  const cacheRoot = path.join(os.homedir(), '.npm', '_npx');
  const candidates = [];
  try {
    const entries = await readdir(cacheRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const packageJson = path.join(cacheRoot, entry.name, 'node_modules', 'playwright', 'package.json');
      try {
        const info = await stat(packageJson);
        candidates.push({ packageJson, modified: info.mtimeMs });
      } catch {
        // Ignore incomplete npx cache entries.
      }
    }
  } catch {
    return undefined;
  }
  candidates.sort((left, right) => right.modified - left.modified);
  return candidates[0]?.packageJson;
}

async function loadPlaywright() {
  const direct = createRequire(import.meta.url);
  try {
    return direct('playwright');
  } catch {
    const explicitPackage = process.env.SIGNATURE_VISUAL_PLAYWRIGHT_PACKAGE;
    if (explicitPackage) {
      try {
        return createRequire(path.resolve(explicitPackage))('playwright');
      } catch (error) {
        throw new CliError(`SIGNATURE_VISUAL_PLAYWRIGHT_PACKAGE could not load Playwright: ${error.message}`);
      }
    }
    const packageJson = await findCachedPlaywrightPackage();
    if (packageJson) return createRequire(packageJson)('playwright');
    throw new CliError('Playwright is unavailable. Add it with `npm add -D playwright` or prime the npx cache with `npx --yes playwright --version`.');
  }
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.wasm': 'application/wasm'
  })[extension] ?? 'application/octet-stream';
}

function startStaticServer(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, 'http://127.0.0.1');
      let relative = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
      if (!relative || relative.endsWith('/')) relative += 'index.html';
      const filePath = path.resolve(root, relative);
      const pathFromRoot = path.relative(root, filePath);
      if (pathFromRoot.startsWith('..') || path.isAbsolute(pathFromRoot)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const info = await stat(filePath);
      if (!info.isFile()) throw new Error('Missing file');
      response.writeHead(200, {
        'content-type': contentType(filePath),
        'content-length': info.size,
        'cache-control': 'no-store'
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve({ server, port: server.address().port });
    });
  });
}

function seedRandom({ seed }) {
  const text = String(seed);
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  value >>>= 0;
  Math.random = () => {
    value += 0x6d2b79f5;
    let output = value;
    output = Math.imul(output ^ (output >>> 15), output | 1);
    output ^= output + Math.imul(output ^ (output >>> 7), output | 61);
    return ((output ^ (output >>> 14)) >>> 0) / 4294967296;
  };
  Object.defineProperty(window, '__signatureVisualQASeed', {
    value: text,
    configurable: false,
    enumerable: false,
    writable: false
  });
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function pollPage(page, predicate, argument, timeoutMs, label) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      if (await page.evaluate(predicate, argument)) return;
    } catch {
      // Navigation and module evaluation can briefly replace the execution context.
    }
    await delay(40);
  }
  throw new CliError(`Timed out after ${timeoutMs}ms waiting for ${label}.`);
}

function withTimeout(promise, timeoutMs, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new CliError(message)), timeoutMs);
    })
  ]).finally(() => clearTimeout(timer));
}

async function settlePage(page, manifest, needsTimelineHook) {
  if (manifest.readySelector) {
    await page.locator(manifest.readySelector).first().waitFor({ state: 'attached', timeout: manifest.timeoutMs });
  }
  await pollPage(
    page,
    () => (!document.fonts || document.fonts.status === 'loaded') && [...document.images].every(image => image.complete),
    null,
    manifest.timeoutMs,
    'fonts and images'
  );

  if (needsTimelineHook) {
    await pollPage(
      page,
      ({ hook }) => [hook, '__signatureVisual', '__signatureVisualQA']
        .filter((name, index, names) => name && names.indexOf(name) === index)
        .some(name => window[name] && (typeof window[name].seek === 'function' || typeof window[name].setProgress === 'function')),
      { hook: manifest.hook },
      manifest.timeoutMs,
      `window.${manifest.hook}.seek() or setProgress()`
    );
  }

  const hasHook = await page.evaluate(({ hook }) => [hook, '__signatureVisual', '__signatureVisualQA']
    .filter((name, index, names) => name && names.indexOf(name) === index)
    .some(name => Boolean(window[name])), { hook: manifest.hook });
  if (hasHook) {
    const ready = await withTimeout(
      page.evaluate(async ({ hook }) => {
        const name = [hook, '__signatureVisual', '__signatureVisualQA']
          .filter((candidate, index, candidates) => candidate && candidates.indexOf(candidate) === index)
          .find(candidate => window[candidate]);
        const api = name ? window[name] : undefined;
        if (!api || api.ready === undefined || api.ready === true) return true;
        if (api.ready === false) return false;
        if (typeof api.ready === 'function') return Boolean(await api.ready());
        return Boolean(await api.ready);
      }, { hook: manifest.hook }),
      manifest.timeoutMs,
      `Timed out after ${manifest.timeoutMs}ms waiting for window.${manifest.hook}.ready.`
    );
    if (!ready) {
      await pollPage(
        page,
        async ({ hook }) => {
          const name = [hook, '__signatureVisual', '__signatureVisualQA']
            .filter((candidate, index, candidates) => candidate && candidates.indexOf(candidate) === index)
            .find(candidate => window[candidate]);
          const api = name ? window[name] : undefined;
          if (!api || api.ready === undefined || api.ready === true) return true;
          if (typeof api.ready === 'function') return Boolean(await api.ready());
          if (api.ready && typeof api.ready.then === 'function') return Boolean(await api.ready);
          return false;
        },
        { hook: manifest.hook },
        manifest.timeoutMs,
        `window.${manifest.hook}.ready`
      );
    }
  }
}

async function callHook(page, hook, method, argument, required = false) {
  const result = await page.evaluate(async ({ hookName, methodName, value }) => {
    const names = [hookName, '__signatureVisual', '__signatureVisualQA']
      .filter((name, index, candidates) => name && candidates.indexOf(name) === index);
    const name = names.find(candidate => window[candidate] && typeof window[candidate][methodName] === 'function');
    if (!name) return { called: false };
    const output = await window[name][methodName](value);
    return { called: true, hook: name, output };
  }, { hookName: hook, methodName: method, value: argument });
  if (required && !result.called) {
    throw new CliError(`window.${hook}.${method}() is required for this state.`);
  }
  return result;
}

async function applyPointer(page, manifest, event) {
  const locator = page.locator(event.target).first();
  let hookX = event.x;
  let hookY = event.y;
  if (event.active && event.unit === 'px') {
    await locator.waitFor({ state: 'attached', timeout: manifest.timeoutMs });
    const box = await locator.boundingBox();
    if (!box) throw new CliError(`Pointer target "${event.target}" has no visible bounding box.`);
    hookX = event.x / Math.max(1, box.width);
    hookY = event.y / Math.max(1, box.height);
  }
  const handled = await callHook(page, manifest.hook, 'setPointer', {
    x: hookX,
    y: hookY,
    active: event.active,
    unit: 'ratio',
    target: event.target
  });
  if (handled.called) return;

  await locator.waitFor({ state: 'attached', timeout: manifest.timeoutMs });
  if (event.leave) {
    await locator.dispatchEvent('pointerleave', { pointerType: 'mouse', clientX: -1, clientY: -1 });
    await locator.dispatchEvent('mouseleave', { clientX: -1, clientY: -1 });
    return;
  }
  await locator.scrollIntoViewIfNeeded({ timeout: manifest.timeoutMs });
  const box = await locator.boundingBox();
  if (!box) throw new CliError(`Pointer target "${event.target}" has no visible bounding box.`);
  const x = event.unit === 'px' ? box.x + event.x : box.x + box.width * event.x;
  const y = event.unit === 'px' ? box.y + event.y : box.y + box.height * event.y;
  await page.mouse.move(x, y, { steps: event.steps });
}

async function runStateClock(page, manifest, state) {
  await callHook(page, manifest.hook, 'setSeed', manifest.seed);
  let currentTime = 0;
  for (const pointer of state.pointer) {
    const advance = pointer.atMs - currentTime;
    if (advance > 0) await page.clock.runFor(advance);
    await applyPointer(page, manifest, pointer);
    currentTime = pointer.atMs;
  }
  if (state.timeMs !== undefined) {
    const advance = state.timeMs - currentTime;
    if (advance > 0) await page.clock.runFor(advance);
  }
  const exactTimeMs = state.timeMs ?? 0;
  const seek = await callHook(page, manifest.hook, 'seek', {
    time: exactTimeMs / 1000,
    timeMs: exactTimeMs,
    progress: state.progress
  });
  let committed = seek.called;
  if (!seek.called) {
    const renderAt = await callHook(page, manifest.hook, 'renderAt', exactTimeMs);
    committed ||= renderAt.called;
    if (state.progress !== undefined) {
      const setProgress = await callHook(page, manifest.hook, 'setProgress', state.progress, true);
      committed ||= setProgress.called;
    }
  }
  const render = await callHook(page, manifest.hook, 'render', undefined);
  if (!render.called && !committed) await callHook(page, manifest.hook, 'flush', undefined);
  const description = await callHook(page, manifest.hook, 'describe', undefined);
  return description.called ? description.output : null;
}

function safeFilePart(value) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return normalized || 'state';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function stateSummary(state, manifest) {
  const parts = [];
  if (state.progress !== undefined) parts.push(`progress ${(state.progress * 100).toFixed(0)}%`);
  if (state.timeMs !== undefined) parts.push(`t=${state.timeMs}ms`);
  if (state.pointer.length) parts.push(`${state.pointer.length} pointer event${state.pointer.length === 1 ? '' : 's'}`);
  parts.push(`${manifest.viewport.width}×${manifest.viewport.height}@${manifest.viewport.deviceScaleFactor}x`);
  parts.push(manifest.reducedMotion === 'reduce' ? 'reduced motion' : 'full motion');
  parts.push(`seed ${String(manifest.seed)}`);
  return parts.join(' · ');
}

function createContactSheet(manifest, pageUrl, results) {
  const cards = results.map(result => `
      <figure>
        <img src="./${escapeHtml(result.file)}" alt="${escapeHtml(result.name)} capture" />
        <figcaption>
          <strong>${escapeHtml(result.name)}</strong>
          <span>${escapeHtml(result.summary)}</span>
          <code>${escapeHtml(result.sha256.slice(0, 16))}</code>
        </figcaption>
      </figure>`).join('');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(manifest.name)} — visual QA</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #0b0d12; color: #f4f6fb; }
      * { box-sizing: border-box; }
      body { margin: 0; padding: clamp(20px, 4vw, 56px); background: radial-gradient(circle at 15% 0%, #182039, #0b0d12 38%); }
      header { max-width: 1100px; margin: 0 auto 28px; }
      h1 { margin: 0 0 10px; font-size: clamp(28px, 4vw, 52px); line-height: 1; letter-spacing: -0.035em; }
      header p { margin: 6px 0; color: #aeb7ca; overflow-wrap: anywhere; }
      main { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap: 20px; max-width: 1600px; margin: 0 auto; }
      figure { margin: 0; overflow: hidden; border: 1px solid #252b39; border-radius: 16px; background: #11141c; box-shadow: 0 18px 60px rgb(0 0 0 / 24%); }
      img { display: block; width: 100%; height: auto; background: #090b10; }
      figcaption { display: grid; grid-template-columns: 1fr auto; gap: 5px 16px; align-items: baseline; padding: 15px 17px 17px; }
      figcaption strong { font-size: 16px; }
      figcaption span { grid-column: 1; color: #9aa5ba; font-size: 13px; }
      figcaption code { grid-column: 2; grid-row: 1 / span 2; color: #7f8ba4; font-size: 11px; }
      @media print { :root, body { background: white; color: black; } figure { break-inside: avoid; box-shadow: none; } header p, figcaption span, figcaption code { color: #444; } }
    </style>
  </head>
  <body>
    <header>
      <h1>${escapeHtml(manifest.name)}</h1>
      <p>${escapeHtml(pageUrl)}</p>
      <p>${manifest.viewport.width} × ${manifest.viewport.height} @ ${manifest.viewport.deviceScaleFactor}x · seed ${escapeHtml(manifest.seed)}</p>
    </header>
    <main>${cards}
    </main>
  </body>
</html>
`;
}

async function captureState(browser, manifest, pageUrl, state, index, captureDirectory) {
  const contextOptions = {
    viewport: { width: manifest.viewport.width, height: manifest.viewport.height },
    deviceScaleFactor: manifest.viewport.deviceScaleFactor,
    locale: manifest.locale,
    timezoneId: manifest.timezoneId,
    reducedMotion: manifest.reducedMotion
  };
  if (manifest.colorScheme) contextOptions.colorScheme = manifest.colorScheme;
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const networkErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => {
    networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'request failed'}`);
  });
  page.on('response', response => {
    if (response.status() >= 400) networkErrors.push(`${response.request().method()} ${response.url()}: HTTP ${response.status()}`);
  });

  try {
    await page.clock.install({ time: manifest.epoch });
    await page.clock.pauseAt(manifest.epoch);
    await page.addInitScript(seedRandom, { seed: manifest.seed });
    const response = await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: manifest.timeoutMs });
    if (!response?.ok()) throw new CliError(`Page returned HTTP ${response?.status() ?? 'unknown'} for ${pageUrl}.`);
    await page.addStyleTag({
      content: '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'
    });
    await page.clock.runFor(0);
    await settlePage(page, manifest, state.progress !== undefined);
    await page.clock.runFor(0);
    const description = await runStateClock(page, manifest, state);
    await page.evaluate(() => {
      for (const canvas of document.querySelectorAll('canvas')) {
        const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
        context?.finish?.();
      }
    });
    await page.clock.runFor(0);

    if ((manifest.failOnConsoleError && (consoleErrors.length || pageErrors.length)) || (manifest.failOnNetworkError && networkErrors.length)) {
      const messages = [
        ...consoleErrors.map(value => `console: ${value}`),
        ...pageErrors.map(value => `page: ${value}`),
        ...networkErrors.map(value => `network: ${value}`)
      ];
      throw new CliError(`State "${state.name}" emitted browser errors:\n${messages.join('\n')}`);
    }

    let buffer;
    if (manifest.captureSelector) {
      const locator = page.locator(manifest.captureSelector).first();
      await locator.waitFor({ state: 'visible', timeout: manifest.timeoutMs });
      buffer = await locator.screenshot({ type: 'png', timeout: manifest.timeoutMs });
    } else {
      buffer = await page.screenshot({ type: 'png', fullPage: manifest.fullPage, timeout: manifest.timeoutMs });
    }

    const prefix = String(index + 1).padStart(2, '0');
    const filename = `${prefix}-${safeFilePart(state.name)}.png`;
    const relativeFile = path.posix.join('captures', filename);
    await writeFile(path.join(captureDirectory, filename), buffer);
    return {
      name: state.name,
      summary: stateSummary(state, manifest),
      file: relativeFile,
      sha256: createHash('sha256').update(buffer).digest('hex'),
      progress: state.progress,
      timeMs: state.timeMs,
      pointer: state.pointer.map(event => ({
        atMs: event.atMs,
        x: event.leave ? null : event.x,
        y: event.leave ? null : event.y,
        active: event.active,
        unit: event.unit,
        target: event.target
      })),
      description,
      diagnostics: { consoleErrors, pageErrors, networkErrors }
    };
  } finally {
    await context.close();
  }
}

async function runCapture(options) {
  const { manifest, manifestPath } = await loadManifest(options.manifest, options.output);
  let server;
  let pageUrl = manifest.url;
  if (manifest.serveRoot) {
    try {
      const rootInfo = await stat(manifest.serveRoot);
      if (!rootInfo.isDirectory()) throw new Error('path is not a directory');
    } catch (error) {
      throw new CliError(`serveRoot is unavailable at ${manifest.serveRoot}: ${error.message}`);
    }
    const started = await startStaticServer(manifest.serveRoot);
    server = started.server;
    pageUrl = `http://127.0.0.1:${started.port}${manifest.url}`;
  }

  let browser;
  try {
    const { chromium } = await loadPlaywright();
    try {
      browser = await chromium.launch({ headless: !options.headed });
    } catch (error) {
      throw new CliError(`Chromium could not launch: ${error.message}\nRun \`npx playwright install chromium\` if the browser binary is absent.`);
    }
    const captureDirectory = path.join(manifest.outputDirectory, 'captures');
    await mkdir(captureDirectory, { recursive: true });
    const results = [];
    for (let index = 0; index < manifest.states.length; index += 1) {
      const state = manifest.states[index];
      const result = await captureState(browser, manifest, pageUrl, state, index, captureDirectory);
      results.push(result);
      console.log(`Captured ${state.name} → ${result.file}`);
    }

    const stableResults = {
      schemaVersion: 1,
      name: manifest.name,
      sourceManifest: path.basename(manifestPath),
      url: manifest.url,
      seed: String(manifest.seed),
      epoch: manifest.epoch,
      viewport: manifest.viewport,
      reducedMotion: manifest.reducedMotion,
      colorScheme: manifest.colorScheme ?? null,
      captureSelector: manifest.captureSelector ?? null,
      states: results
    };
    await writeFile(path.join(manifest.outputDirectory, 'results.json'), `${JSON.stringify(stableResults, null, 2)}\n`);
    await writeFile(path.join(manifest.outputDirectory, 'contact-sheet.html'), createContactSheet(manifest, manifest.url, results));
    console.log(`Contact sheet → ${path.join(manifest.outputDirectory, 'contact-sheet.html')}`);
    return stableResults;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }
}

export { exampleManifest, normalizeManifest, runCapture };

async function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed.action === 'help') {
    process.stdout.write(helpText);
    return;
  }
  if (parsed.action === 'example') {
    process.stdout.write(`${JSON.stringify(exampleManifest, null, 2)}\n`);
    return;
  }
  await runCapture(parsed);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  main().catch(error => {
    const label = error instanceof CliError ? 'Visual QA error' : 'Visual QA failure';
    process.stderr.write(`${label}: ${error.message}\n`);
    process.exitCode = 1;
  });
}
