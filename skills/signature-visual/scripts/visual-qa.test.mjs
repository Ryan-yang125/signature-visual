#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { comparePngBuffers } from './visual-qa.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(scriptDirectory, 'visual-qa.mjs');
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'signature-visual-qa-'));
const fixtureDirectory = path.join(temporaryDirectory, 'fixture');

function run(argumentsList, expectedStatus = 0, extraEnvironment = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...argumentsList], {
    cwd: temporaryDirectory,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnvironment },
    maxBuffer: 8 * 1024 * 1024
  });
  assert.equal(
    result.status,
    expectedStatus,
    `Command exited ${result.status}.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
  return result;
}

function paeth(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function decodePng(buffer) {
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'Expected a PNG signature.');
  let offset = 8;
  let width;
  let height;
  let bytesPerPixel;
  const compressed = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8, 'Self-test PNG decoder supports 8-bit channels.');
      assert.equal(data[12], 0, 'Self-test PNG decoder supports non-interlaced images.');
      bytesPerPixel = data[9] === 6 ? 4 : data[9] === 2 ? 3 : undefined;
      assert.ok(bytesPerPixel, `Self-test PNG decoder received unsupported color type ${data[9]}.`);
    } else if (type === 'IDAT') {
      compressed.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }
  assert.ok(width && height && bytesPerPixel && compressed.length, 'PNG is missing required image chunks.');
  const encoded = inflateSync(Buffer.concat(compressed));
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(height * stride);
  let sourceOffset = 0;
  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const filter = encoded[sourceOffset];
    sourceOffset += 1;
    const rowOffset = rowIndex * stride;
    const previousOffset = rowOffset - stride;
    for (let column = 0; column < stride; column += 1) {
      const raw = encoded[sourceOffset];
      sourceOffset += 1;
      const left = column >= bytesPerPixel ? pixels[rowOffset + column - bytesPerPixel] : 0;
      const above = rowIndex > 0 ? pixels[previousOffset + column] : 0;
      const upperLeft = rowIndex > 0 && column >= bytesPerPixel ? pixels[previousOffset + column - bytesPerPixel] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) predictor = paeth(left, above, upperLeft);
      else assert.equal(filter, 0, `Unsupported PNG filter ${filter}.`);
      pixels[rowOffset + column] = (raw + predictor) & 255;
    }
  }
  return { width, height, bytesPerPixel, pixels };
}

function comparePng(leftBuffer, rightBuffer) {
  const left = decodePng(leftBuffer);
  const right = decodePng(rightBuffer);
  assert.equal(left.width, right.width);
  assert.equal(left.height, right.height);
  assert.equal(left.bytesPerPixel, right.bytesPerPixel);
  let totalDifference = 0;
  let changedChannels = 0;
  let maximumDifference = 0;
  for (let index = 0; index < left.pixels.length; index += 1) {
    const difference = Math.abs(left.pixels[index] - right.pixels[index]);
    totalDifference += difference;
    if (difference > 2) changedChannels += 1;
    maximumDifference = Math.max(maximumDifference, difference);
  }
  return {
    meanDifference: totalDifference / left.pixels.length,
    changedRatio: changedChannels / left.pixels.length,
    maximumDifference
  };
}

try {
  await mkdir(fixtureDirectory, { recursive: true });
  await writeFile(path.join(fixtureDirectory, 'index.html'), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; background: #070b18; }
      #visual { position: relative; width: 640px; height: 360px; overflow: hidden; background: #111937; }
      svg { display: block; width: 100%; height: 100%; }
      text { fill: #dfe6ff; font: 16px ui-monospace, monospace; }
      #primary { position: absolute; right: 16px; bottom: 14px; border: 1px solid #7185ff; border-radius: 999px; padding: 8px 12px; color: #e8ecff; background: #1b2553; }
      [data-runtime-mounted] { position: absolute; inset: 0; pointer-events: none; }
    </style>
  </head>
  <body>
    <div id="visual">
      <svg viewBox="0 0 640 360" role="img" aria-label="Deterministic QA fixture">
        <rect id="field" width="640" height="360" fill="#111937" />
        <path id="path" d="M40 280 C190 40 440 50 600 250" fill="none" stroke="#526eff" stroke-width="10" />
        <circle id="orb" cx="40" cy="280" r="34" fill="#ff7466" />
        <circle id="pointer" cx="320" cy="180" r="24" fill="#71dfc8" opacity="0" />
        <text id="label" x="28" y="38"></text>
      </svg>
      <button id="primary" type="button">Activate</button>
    </div>
    <script>
      const field = document.querySelector('#field');
      const orb = document.querySelector('#orb');
      const pointer = document.querySelector('#pointer');
      const label = document.querySelector('#label');
      const visual = document.querySelector('#visual');
      const primary = document.querySelector('#primary');
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
      let mountNumber = 0;

      function createController() {
        mountNumber += 1;
        const marker = document.createElement('span');
        marker.dataset.runtimeMounted = String(mountNumber);
        visual.append(marker);
        let sample = Math.random();
        let progress = 0;
        let timeMs = 0;
        let pointerState = { x: 0.5, y: 0.5, active: false };
        let width = 0;
        let height = 0;
        let focused = true;
        let reduced = reducedMotion.matches;
        let disposed = false;
        let contextLost = false;
        let activations = 0;
        let frame = 0;

        function measure() {
          const rect = visual.getBoundingClientRect();
          width = rect.width;
          height = rect.height;
        }

        function pauseReasons() {
          reduced = reducedMotion.matches;
          const reasons = [];
          if (width <= 0 || height <= 0) reasons.push('zero-size');
          if (!focused) reasons.push('window-blur');
          if (reduced) reasons.push('reduced-motion');
          if (contextLost) reasons.push('context-lost');
          if (disposed) reasons.push('disposed');
          return reasons;
        }

        function draw() {
          const wave = Math.sin(timeMs * 0.003) * 18;
          orb.setAttribute('cx', String(40 + progress * 560));
          orb.setAttribute('cy', String(280 - Math.sin(progress * Math.PI) * 190 + wave));
          pointer.setAttribute('cx', String(pointerState.x * 640));
          pointer.setAttribute('cy', String(pointerState.y * 360));
          pointer.setAttribute('opacity', pointerState.active ? '0.9' : '0');
          field.setAttribute('fill', progress > 0.75 ? '#29122e' : '#111937');
          label.textContent = 'p=' + progress.toFixed(2) + ' t=' + Math.round(timeMs) + ' seed=' + sample.toFixed(6);
        }

        function animate(now) {
          frame = 0;
          if (pauseReasons().length) return;
          timeMs = now;
          draw();
          frame = requestAnimationFrame(animate);
        }

        function sync() {
          cancelAnimationFrame(frame);
          frame = 0;
          measure();
          if (pauseReasons().length === 0) frame = requestAnimationFrame(animate);
          else draw();
        }

        function updatePointer(event) {
          const rect = visual.getBoundingClientRect();
          pointerState = {
            x: (event.clientX - rect.left) / Math.max(1, rect.width),
            y: (event.clientY - rect.top) / Math.max(1, rect.height),
            active: true
          };
          draw();
        }

        function cancelPointer() {
          pointerState.active = false;
          draw();
        }

        function onBlur() {
          focused = false;
          cancelPointer();
          sync();
        }

        function onFocus() {
          focused = true;
          sync();
        }

        function onMotion(event) {
          reduced = event.matches;
          sync();
        }

        function onActivation() {
          activations += 1;
        }

        const resizeObserver = new ResizeObserver(sync);
        resizeObserver.observe(visual);
        visual.addEventListener('pointermove', updatePointer);
        visual.addEventListener('pointerleave', cancelPointer);
        visual.addEventListener('pointercancel', cancelPointer);
        visual.addEventListener('lostpointercapture', cancelPointer);
        window.addEventListener('blur', onBlur);
        window.addEventListener('focus', onFocus);
        reducedMotion.addEventListener('change', onMotion);
        primary.addEventListener('click', onActivation);
        sync();
        draw();

        return {
          get ready() { return !disposed; },
          setSeed(value) {
            sample = [...String(value)].reduce((total, character) => (total * 33 + character.charCodeAt(0)) % 1000000, 5381) / 1000000;
            draw();
          },
          seek(state) {
            if (state.progress !== undefined) progress = state.progress;
            if (Number.isFinite(state.timeMs)) timeMs = state.timeMs;
            draw();
          },
          setPointer(state) {
            pointerState = { x: state.x, y: state.y, active: state.active };
            draw();
          },
          render() { draw(); },
          loseContext() {
            contextLost = true;
            sync();
          },
          restoreContext() {
            contextLost = false;
            sync();
          },
          dispose() {
            if (disposed) return;
            disposed = true;
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            visual.removeEventListener('pointermove', updatePointer);
            visual.removeEventListener('pointerleave', cancelPointer);
            visual.removeEventListener('pointercancel', cancelPointer);
            visual.removeEventListener('lostpointercapture', cancelPointer);
            window.removeEventListener('blur', onBlur);
            window.removeEventListener('focus', onFocus);
            reducedMotion.removeEventListener('change', onMotion);
            primary.removeEventListener('click', onActivation);
            marker.remove();
          },
          describe() {
            measure();
            const reasons = pauseReasons();
            return {
              ready: !disposed,
              disposed,
              paused: reasons.length > 0,
              pauseReasons: reasons,
              width,
              height,
              reducedMotion: reduced,
              pointer: { ...pointerState },
              pointerActive: pointerState.active,
              activations,
              contextLost,
              fallback: contextLost,
              mountNumber,
              progress,
              timeMs
            };
          }
        };
      }

      let controller = createController();
      window.__signatureVisual = {
        get ready() { return controller.ready; },
        setSeed(value) { return controller.setSeed(value); },
        seek(value) { return controller.seek(value); },
        setPointer(value) { return controller.setPointer(value); },
        render() { return controller.render(); },
        describe() { return controller.describe(); },
        loseContext() { return controller.loseContext(); },
        restoreContext() { return controller.restoreContext(); },
        dispose() { return controller.dispose(); },
        remount() {
          controller.dispose();
          controller = createController();
          return controller.describe();
        }
      };
    </script>
  </body>
</html>
`);

  const manifest = {
    $schema: './skills/signature-visual/schemas/visual-qa-manifest-v3.schema.json',
    schemaVersion: 3,
    name: 'Visual QA self test',
    tier: 'production',
    serveRoot: './fixture',
    url: '/',
    viewport: { width: 800, height: 500, deviceScaleFactor: 1 },
    captureSelector: '#visual',
    readySelector: '#visual svg',
    seed: 'repeatable-fixture-seed',
    derivedImages: { thumbnailWidth: 160, blurRadius: 14, silhouette: true },
    capabilities: {
      resize: true,
      zeroSize: true,
      pointer: true,
      windowFocus: true,
      keyboard: true,
      reducedMotion: true,
      lifecycle: true,
      gpu: { supported: true, note: 'The fixture exposes deterministic context-loss hooks.' },
      primaryAction: true
    },
    runtimeScenarios: [
      {
        name: 'resize and zero-size recovery',
        requires: ['resize', 'zeroSize'],
        steps: [
          { action: 'setOwnerSize', width: 360, height: 240 },
          { action: 'assertHook', path: 'width', equals: 360 },
          { action: 'assertHook', path: 'height', equals: 240 },
          { action: 'setOwnerSize', width: 0, height: 0 },
          { action: 'assertHook', path: 'paused', equals: true },
          { action: 'assertHook', path: 'pauseReasons', includes: 'zero-size' },
          { action: 'setOwnerSize', width: 420, height: 220 },
          { action: 'assertHook', path: 'paused', equals: false },
          { action: 'assertHook', path: 'width', equals: 420 }
        ]
      },
      {
        name: 'pointer cancellation and focus loss',
        requires: ['pointer', 'windowFocus'],
        steps: [
          { action: 'pointerEvent', event: 'pointermove', x: 0.25, y: 0.4 },
          { action: 'assertHook', path: 'pointer.active', equals: true },
          { action: 'pointerEvent', event: 'pointercancel' },
          { action: 'assertHook', path: 'pointer.active', equals: false },
          { action: 'pointerEvent', event: 'pointermove', x: 0.7, y: 0.2 },
          { action: 'pointerEvent', event: 'lostpointercapture' },
          { action: 'assertHook', path: 'pointer.active', equals: false },
          { action: 'pointerEvent', event: 'pointermove', x: 0.5, y: 0.5 },
          { action: 'pointerEvent', event: 'pointerleave' },
          { action: 'assertHook', path: 'pointer.active', equals: false },
          { action: 'windowBlur' },
          { action: 'assertHook', path: 'pauseReasons', includes: 'window-blur' },
          { action: 'windowFocus' },
          { action: 'assertHook', path: 'paused', equals: false }
        ]
      },
      {
        name: 'semantic primary action',
        requires: ['keyboard', 'primaryAction'],
        steps: [
          { action: 'activate', selector: '#primary', via: 'pointer' },
          { action: 'assertHook', path: 'activations', equals: 1 },
          { action: 'activate', selector: '#primary', via: 'keyboard', key: 'Enter' },
          { action: 'assertHook', path: 'activations', equals: 2 },
          { action: 'assertFocus', selector: '#primary' }
        ]
      },
      {
        name: 'runtime preference and lifecycle',
        requires: ['reducedMotion', 'lifecycle'],
        steps: [
          { action: 'setReducedMotion', value: 'reduce' },
          { action: 'assertHook', path: 'pauseReasons', includes: 'reduced-motion' },
          { action: 'setReducedMotion', value: 'no-preference' },
          { action: 'assertHook', path: 'reducedMotion', equals: false },
          { action: 'dispose' },
          { action: 'assertHook', path: 'disposed', equals: true },
          { action: 'assertSelector', selector: '[data-runtime-mounted]', count: 0 },
          { action: 'dispose' },
          { action: 'assertSelector', selector: '[data-runtime-mounted]', count: 0 },
          { action: 'remount' },
          { action: 'assertHook', path: 'ready', equals: true },
          { action: 'assertSelector', selector: '[data-runtime-mounted]', count: 1 },
          { action: 'assertNoErrors' }
        ]
      },
      {
        name: 'gpu fallback and recovery',
        requires: ['gpu'],
        steps: [
          { action: 'gpuContext', state: 'lost' },
          { action: 'assertHook', path: 'contextLost', equals: true },
          { action: 'assertHook', path: 'fallback', equals: true },
          { action: 'assertHook', path: 'pauseReasons', includes: 'context-lost' },
          { action: 'gpuContext', state: 'restored' },
          { action: 'assertHook', path: 'contextLost', equals: false },
          { action: 'assertHook', path: 'fallback', equals: false }
        ]
      }
    ],
    states: [
      { name: 'timeline-rest', progress: 0 },
      { name: 'timeline-middle', progress: 0.5 },
      { name: 'timeline-peak', progress: 1 },
      { name: 'ambient-1200', timeMs: 1200 },
      {
        name: 'pointer-script',
        timeMs: 1400,
        pointer: [
          { atMs: 400, x: 0.2, y: 0.25 },
          { atMs: 900, x: 0.8, y: 0.7, steps: 3 }
        ]
      },
      {
        name: 'pointer-leave',
        settleMs: 300,
        pointer: [
          { atMs: 100, x: 0.5, y: 0.5 },
          { atMs: 500, leave: true }
        ]
      }
    ]
  };
  const manifestPath = path.join(temporaryDirectory, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const help = run(['--help']);
  assert.match(help.stdout, /Usage:/);
  assert.match(help.stdout, /setProgress/);
  assert.match(help.stdout, /contact-sheet\.html/);
  assert.match(help.stdout, /contact-sheet\.png/);
  assert.match(help.stdout, /determinism signals/);

  const example = run(['--print-example']);
  const parsedExample = JSON.parse(example.stdout);
  assert.equal(parsedExample.schemaVersion, 3);
  assert.equal(parsedExample.tier, 'capture');
  assert.ok(Array.isArray(parsedExample.states));
  assert.ok(parsedExample.states.some(state => state.progress !== undefined));
  assert.ok(parsedExample.states.some(state => state.pointer));

  for (const schemaName of ['visual-qa-manifest-v3.schema.json', 'visual-qa-results-v3.schema.json', 'design-record.schema.json']) {
    const schema = JSON.parse(await readFile(path.join(scriptDirectory, '..', 'schemas', schemaName), 'utf8'));
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  }

  const starterDirectory = path.join(scriptDirectory, '..', 'references', 'starters');
  for (const starterName of ['canvas-field.js', 'svg-technical-system.js', 'three-living-form.js', 'webgl-shader-field.js']) {
    const source = await readFile(path.join(starterDirectory, starterName), 'utf8');
    for (const contractMarker of ['zero-size', 'pointercancel', 'lostpointercapture', "addEventListener('blur'", 'initialization-error', 'fallback', 'function describe()', "Object.defineProperty(dispose, 'ready'"]) {
      assert.ok(source.includes(contractMarker), `${starterName} is missing runtime contract marker: ${contractMarker}`);
    }
    assert.match(source, /if \((?:destroyed|disposed)\) return;/, `${starterName} requires idempotent disposal.`);
  }
  for (const gpuStarter of ['three-living-form.js', 'webgl-shader-field.js']) {
    const source = await readFile(path.join(starterDirectory, gpuStarter), 'utf8');
    assert.match(source, /webglcontextlost/);
    assert.match(source, /webglcontextrestored/);
  }

  const firstRun = path.join(temporaryDirectory, 'run-one');
  const secondRun = path.join(temporaryDirectory, 'run-two');
  run([manifestPath, '--output', firstRun]);
  run([manifestPath, '--output', secondRun]);

  const ownership = JSON.parse(await readFile(path.join(firstRun, '.signature-visual-qa'), 'utf8'));
  assert.deepEqual(ownership, { schemaVersion: 1, owner: 'signature-visual-qa' });

  const firstResults = JSON.parse(await readFile(path.join(firstRun, 'results.json'), 'utf8'));
  const secondResults = JSON.parse(await readFile(path.join(secondRun, 'results.json'), 'utf8'));
  assert.equal(firstResults.schemaVersion, 3);
  assert.equal(firstResults.sourceSchemaVersion, 3);
  assert.equal(firstResults.tier, 'production');
  assert.equal(firstResults.hashPurpose, 'determinism-only');
  assert.deepEqual(firstResults.derivedImages, { thumbnailWidth: 160, blurRadius: 14, silhouette: true });
  assert.equal(firstResults.runtime.scenarios.length, manifest.runtimeScenarios.length);
  assert.ok(firstResults.runtime.scenarios.every(scenario => scenario.passed && scenario.assertionCount > 0));
  assert.equal(firstResults.runtime.capabilities.gpu.supported, true);
  assert.deepEqual(firstResults.runtime, secondResults.runtime, 'Runtime evidence should replay exactly, including final semantic descriptions.');
  assert.equal(firstResults.states.length, manifest.states.length);
  assert.equal(firstResults.states[1].description.progress, 0.5);
  assert.equal(firstResults.states[1].description.timeMs, 0);
  assert.equal(firstResults.states[1].description.pointerActive, false);
  assert.equal(firstResults.states[1].description.ready, true);
  assert.equal(firstResults.states[4].description.pointerActive, true);
  assert.equal(firstResults.states[5].description.pointerActive, false);
  for (let index = 0; index < firstResults.states.length; index += 1) {
    const firstState = firstResults.states[index];
    const secondState = secondResults.states[index];
    assert.equal(firstState.name, secondState.name);
    const comparison = comparePng(
      await readFile(path.join(firstRun, firstState.file)),
      await readFile(path.join(secondRun, secondState.file))
    );
    assert.ok(
      comparison.meanDifference < 0.02 && comparison.changedRatio < 0.0002,
      `${firstState.name} drifted across runs: ${JSON.stringify(comparison)}`
    );
    const exportedComparison = comparePngBuffers(
      await readFile(path.join(firstRun, firstState.file)),
      await readFile(path.join(secondRun, secondState.file))
    );
    assert.ok(exportedComparison.meanDifference < 0.02 && exportedComparison.changedRatio < 0.0002);

    const raw = decodePng(await readFile(path.join(firstRun, firstState.file)));
    const thumbnail = decodePng(await readFile(path.join(firstRun, firstState.derived.thumbnail)));
    const blurred = decodePng(await readFile(path.join(firstRun, firstState.derived.blur)));
    const silhouette = decodePng(await readFile(path.join(firstRun, firstState.derived.silhouette)));
    assert.equal(thumbnail.width, 160);
    assert.equal(thumbnail.height, Math.round(raw.height * 160 / raw.width));
    assert.equal(blurred.width, raw.width);
    assert.equal(blurred.height, raw.height);
    for (let pixel = 0; pixel < silhouette.pixels.length; pixel += silhouette.bytesPerPixel) {
      const value = silhouette.pixels[pixel];
      assert.ok(value === 0 || value === 255, 'Silhouette pixels must be black or white.');
      assert.equal(silhouette.pixels[pixel + 1], value);
      assert.equal(silhouette.pixels[pixel + 2], value);
    }
  }
  assert.ok(new Set(firstResults.states.map(state => state.sha256)).size >= 4, 'The fixture states should create visibly distinct captures.');

  const contactSheet = await readFile(path.join(firstRun, 'contact-sheet.html'), 'utf8');
  assert.equal((contactSheet.match(/<figure>/g) ?? []).length, manifest.states.length);
  assert.doesNotMatch(contactSheet, /<script/);
  for (const state of firstResults.states) assert.match(contactSheet, new RegExp(state.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const contactSheetPng = decodePng(await readFile(path.join(firstRun, firstResults.contactSheet.png)));
  assert.equal(contactSheetPng.width, 160 * manifest.states.length + 8 * (manifest.states.length - 1));
  assert.equal(contactSheetPng.height, 90);

  const staleCapturePath = path.join(firstRun, 'captures', '99-retired-state.png');
  const staleDerivedPath = path.join(firstRun, 'derived', 'thumbnails', '99-retired-state.png');
  const preservedNotePath = path.join(firstRun, 'review-notes.txt');
  await writeFile(staleCapturePath, 'stale');
  await writeFile(staleDerivedPath, 'stale');
  await writeFile(preservedNotePath, 'keep this reviewer note');
  run([manifestPath, '--output', firstRun]);
  await assert.rejects(readFile(staleCapturePath), error => error.code === 'ENOENT');
  await assert.rejects(readFile(staleDerivedPath), error => error.code === 'ENOENT');
  assert.equal(await readFile(preservedNotePath, 'utf8'), 'keep this reviewer note');
  const refreshedResults = JSON.parse(await readFile(path.join(firstRun, 'results.json'), 'utf8'));
  assert.deepEqual(refreshedResults.states.map(state => state.name), manifest.states.map(state => state.name));

  const invalidPath = path.join(temporaryDirectory, 'invalid.json');
  await writeFile(invalidPath, JSON.stringify({ url: 'https://example.com', states: [{ name: 'bad', progress: 2 }] }));
  const invalid = run([invalidPath], 1);
  assert.match(invalid.stderr, /progress must be between 0 and 1/);

  const unsafeOutput = run([manifestPath, '--output', temporaryDirectory], 1);
  assert.match(unsafeOutput.stderr, /dedicated subdirectory/);

  const unsafeOutputLink = path.join(temporaryDirectory, 'unsafe-output-link');
  await symlink(temporaryDirectory, unsafeOutputLink, 'dir');
  const unsafeLinkedOutput = run([manifestPath, '--output', unsafeOutputLink], 1);
  assert.match(unsafeLinkedOutput.stderr, /symbolic-link resolution/);

  const unownedOutput = path.join(temporaryDirectory, 'unowned-output');
  await mkdir(unownedOutput);
  await writeFile(path.join(unownedOutput, 'unrelated-project-file.txt'), 'preserve me');
  const unowned = run([manifestPath, '--output', unownedOutput], 1);
  assert.match(unowned.stderr, /has no \.signature-visual-qa ownership marker/);
  assert.equal(await readFile(path.join(unownedOutput, 'unrelated-project-file.txt'), 'utf8'), 'preserve me');

  const invalidCapabilityPath = path.join(temporaryDirectory, 'invalid-capability.json');
  await writeFile(invalidCapabilityPath, JSON.stringify({
    schemaVersion: 3,
    tier: 'production',
    url: 'https://example.com',
    states: [{ name: 'rest', progress: 0 }],
    capabilities: { resize: { supported: false } }
  }));
  const invalidCapability = run([invalidCapabilityPath], 1);
  assert.match(invalidCapability.stderr, /marked N\/A requires a reason/);

  const uncoveredCapabilityPath = path.join(temporaryDirectory, 'uncovered-capability.json');
  await writeFile(uncoveredCapabilityPath, JSON.stringify({
    schemaVersion: 3,
    tier: 'capture',
    url: 'https://example.com',
    states: [{ name: 'rest', progress: 0 }],
    capabilities: { resize: true },
    runtimeScenarios: []
  }));
  const uncoveredCapability = run([uncoveredCapabilityPath], 1);
  assert.match(uncoveredCapability.stderr, /Supported capability "resize" requires coverage/);

  const labelOnlyCapabilityPath = path.join(temporaryDirectory, 'label-only-capability.json');
  await writeFile(labelOnlyCapabilityPath, JSON.stringify({
    schemaVersion: 3,
    tier: 'capture',
    url: 'https://example.com',
    states: [{ name: 'rest', progress: 0 }],
    capabilities: { resize: true },
    runtimeScenarios: [{
      name: 'resize in name only',
      requires: ['resize'],
      steps: [
        { action: 'wait', timeMs: 10 },
        { action: 'assertHook', path: 'ready', equals: true }
      ]
    }]
  }));
  const labelOnlyCapability = run([labelOnlyCapabilityPath], 1);
  assert.match(labelOnlyCapability.stderr, /requires a viewport or non-zero owner resize action/);

  await writeFile(path.join(fixtureDirectory, 'no-hook.html'), '<!doctype html><div id="visual">No bridge</div>');
  const missingHookPath = path.join(temporaryDirectory, 'missing-hook.json');
  await writeFile(missingHookPath, JSON.stringify({
    serveRoot: './fixture',
    url: '/no-hook.html',
    timeoutMs: 300,
    states: [{ name: 'timeline', progress: 0.5 }]
  }));
  const missingHook = run([missingHookPath, '--output', path.join(temporaryDirectory, 'missing-hook-output')], 1);
  assert.match(missingHook.stderr, /seek\(\) or setProgress\(\)/);
  const successfulEvidenceBeforeFailure = await readFile(path.join(firstRun, 'results.json'), 'utf8');
  const failedReplacement = run([missingHookPath, '--output', firstRun], 1);
  assert.match(failedReplacement.stderr, /seek\(\) or setProgress\(\)/);
  assert.equal(await readFile(path.join(firstRun, 'results.json'), 'utf8'), successfulEvidenceBeforeFailure);
  assert.equal(await readFile(preservedNotePath, 'utf8'), 'keep this reviewer note');

  const evidenceBeforeInjectedPromotionFailure = await readFile(path.join(firstRun, 'results.json'), 'utf8');
  const contactSheetBeforeInjectedPromotionFailure = await readFile(path.join(firstRun, 'contact-sheet.png'));
  const injectedPromotionFailure = run(
    [manifestPath, '--output', firstRun],
    1,
    { SIGNATURE_VISUAL_QA_TEST_FAIL_PROMOTION_AFTER: '2' }
  );
  assert.match(injectedPromotionFailure.stderr, /Injected promotion failure after 2 managed artifacts/);
  assert.equal(await readFile(path.join(firstRun, 'results.json'), 'utf8'), evidenceBeforeInjectedPromotionFailure);
  assert.deepEqual(await readFile(path.join(firstRun, 'contact-sheet.png')), contactSheetBeforeInjectedPromotionFailure);
  assert.equal(await readFile(preservedNotePath, 'utf8'), 'keep this reviewer note');
  assert.equal(
    (await readdir(temporaryDirectory)).some(name => name.startsWith('.run-one.backup-')),
    false,
    'A completed rollback should remove its empty backup directory.'
  );

  await writeFile(path.join(fixtureDirectory, 'pointer-fallback.html'), `<!doctype html>
    <style>html,body{margin:0}#visual{position:relative;width:320px;height:180px;background:#111937}i{position:absolute;width:24px;height:24px;border-radius:50%;background:#71dfc8;opacity:0}</style>
    <div id="visual"><i></i></div>
    <script>
      const visual = document.querySelector('#visual');
      const marker = document.querySelector('i');
      visual.addEventListener('pointermove', event => {
        const rect = visual.getBoundingClientRect();
        marker.style.left = (event.clientX - rect.left - 12) + 'px';
        marker.style.top = (event.clientY - rect.top - 12) + 'px';
        marker.style.opacity = '1';
      });
    </script>`);
  const pointerFallbackPath = path.join(temporaryDirectory, 'pointer-fallback.json');
  await writeFile(pointerFallbackPath, JSON.stringify({
    serveRoot: './fixture',
    url: '/pointer-fallback.html',
    captureSelector: '#visual',
    readySelector: '#visual',
    states: [{ name: 'browser-pointer', timeMs: 500, pointer: { atMs: 200, x: 0.75, y: 0.25 } }]
  }));
  const pointerFallbackOutput = path.join(temporaryDirectory, 'pointer-fallback-output');
  run([pointerFallbackPath, '--output', pointerFallbackOutput]);
  const pointerFallback = JSON.parse(await readFile(path.join(pointerFallbackOutput, 'results.json'), 'utf8'));
  assert.equal(pointerFallback.states[0].pointer[0].active, true);

  console.log('Visual QA V3 self-test passed: schemas, runtime capabilities, lifecycle, atomic managed output replacement, derived evidence, contact sheets, and repeatable frames.');
} finally {
  if (process.env.SIGNATURE_VISUAL_KEEP_TEST_OUTPUT === '1') {
    console.log(`Kept visual QA self-test artifacts at ${temporaryDirectory}`);
  } else {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
