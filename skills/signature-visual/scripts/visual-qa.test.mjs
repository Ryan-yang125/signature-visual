#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(scriptDirectory, 'visual-qa.mjs');
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'signature-visual-qa-'));
const fixtureDirectory = path.join(temporaryDirectory, 'fixture');

function run(argumentsList, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [cliPath, ...argumentsList], {
    cwd: temporaryDirectory,
    encoding: 'utf8',
    env: process.env,
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
    </div>
    <script>
      const field = document.querySelector('#field');
      const orb = document.querySelector('#orb');
      const pointer = document.querySelector('#pointer');
      const label = document.querySelector('#label');
      const visual = document.querySelector('#visual');
      let sample = Math.random();
      let progress = 0;
      let timeMs = 0;
      let pointerState = { x: 0.5, y: 0.5, active: false };

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

      visual.addEventListener('pointermove', event => {
        const rect = visual.getBoundingClientRect();
        pointerState = {
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height,
          active: true
        };
        draw();
      });
      visual.addEventListener('pointerleave', () => {
        pointerState.active = false;
        draw();
      });

      function animate(now) {
        timeMs = now;
        draw();
        requestAnimationFrame(animate);
      }

      window.__signatureVisual = {
        ready: Promise.resolve(true),
        setSeed(value) {
          sample = [...String(value)].reduce((total, character) => (total * 33 + character.charCodeAt(0)) % 1000000, 5381) / 1000000;
          draw();
        },
        seek(state) {
          if (state.progress !== undefined) progress = state.progress;
          timeMs = state.timeMs;
          draw();
        },
        setPointer(state) {
          pointerState = { x: state.x, y: state.y, active: state.active };
          draw();
        },
        render() {
          draw();
        },
        describe() {
          return { progress, timeMs, pointerActive: pointerState.active };
        }
      };
      draw();
      requestAnimationFrame(animate);
    </script>
  </body>
</html>
`);

  const manifest = {
    name: 'Visual QA self test',
    serveRoot: './fixture',
    url: '/',
    viewport: { width: 800, height: 500, deviceScaleFactor: 1 },
    captureSelector: '#visual',
    readySelector: '#visual svg',
    seed: 'repeatable-fixture-seed',
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

  const example = run(['--print-example']);
  const parsedExample = JSON.parse(example.stdout);
  assert.ok(Array.isArray(parsedExample.states));
  assert.ok(parsedExample.states.some(state => state.progress !== undefined));
  assert.ok(parsedExample.states.some(state => state.pointer));

  const firstRun = path.join(temporaryDirectory, 'run-one');
  const secondRun = path.join(temporaryDirectory, 'run-two');
  run([manifestPath, '--output', firstRun]);
  run([manifestPath, '--output', secondRun]);

  const firstResults = JSON.parse(await readFile(path.join(firstRun, 'results.json'), 'utf8'));
  const secondResults = JSON.parse(await readFile(path.join(secondRun, 'results.json'), 'utf8'));
  assert.equal(firstResults.states.length, manifest.states.length);
  assert.deepEqual(firstResults.states[1].description, { progress: 0.5, timeMs: 0, pointerActive: false });
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
  }
  assert.ok(new Set(firstResults.states.map(state => state.sha256)).size >= 4, 'The fixture states should create visibly distinct captures.');

  const contactSheet = await readFile(path.join(firstRun, 'contact-sheet.html'), 'utf8');
  assert.equal((contactSheet.match(/<figure>/g) ?? []).length, manifest.states.length);
  assert.doesNotMatch(contactSheet, /<script/);
  for (const state of firstResults.states) assert.match(contactSheet, new RegExp(state.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const invalidPath = path.join(temporaryDirectory, 'invalid.json');
  await writeFile(invalidPath, JSON.stringify({ url: 'https://example.com', states: [{ name: 'bad', progress: 2 }] }));
  const invalid = run([invalidPath], 1);
  assert.match(invalid.stderr, /progress must be between 0 and 1/);

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

  console.log('Visual QA self-test passed: help, validation, timeline progress, ambient time, pointer scripts, contact sheet, and repeatable frames.');
} finally {
  if (process.env.SIGNATURE_VISUAL_KEEP_TEST_OUTPUT === '1') {
    console.log(`Kept visual QA self-test artifacts at ${temporaryDirectory}`);
  } else {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
