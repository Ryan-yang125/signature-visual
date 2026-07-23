import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { comparePngBuffers, runCapture } from '../../skills/signature-visual/scripts/visual-qa.mjs';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const manifestDirectory = path.join(testDirectory, 'visual-qa');
const manifests = [
  'memory-loom.json',
  'memory-loom-mobile.json',
  'memory-loom-reduced.json',
  'permeable-intelligence.json',
  'permeable-intelligence-mobile.json',
  'permeable-intelligence-reduced.json',
  'signal-weather.json',
  'signal-weather-mobile.json',
  'signal-weather-reduced.json',
  'decision-plate.json',
  'decision-plate-mobile.json',
  'decision-plate-reduced.json'
];

const CPU_REPLAY_TOLERANCE = Object.freeze({
  meanDifference: 0.00002,
  changedRatio: 0.000001,
  maximumDifference: 40
});
const GPU_REPLAY_TOLERANCE = Object.freeze({
  meanDifference: 0.02,
  changedRatio: 0.0002,
  maximumDifference: 32
});

const replayRoot = await mkdtemp(path.join(os.tmpdir(), 'signature-visual-case-replay-'));

function stableReplayPair(primary, replay) {
  const stablePrimary = structuredClone(primary);
  const stableReplay = structuredClone(replay);
  for (let index = 0; index < Math.min(stablePrimary.states.length, stableReplay.states.length); index += 1) {
    if (stablePrimary.states[index].sha256 === stableReplay.states[index].sha256) continue;
    stablePrimary.states[index].sha256 = '<same-host-decoded-pixels-compared-separately>';
    stableReplay.states[index].sha256 = '<same-host-decoded-pixels-compared-separately>';
  }
  return [stablePrimary, stableReplay];
}

function assertReplayPixels(comparison, gpuSupported, label) {
  const tolerance = gpuSupported ? GPU_REPLAY_TOLERANCE : CPU_REPLAY_TOLERANCE;
  assert.ok(
    comparison.meanDifference <= tolerance.meanDifference
      && comparison.changedRatio <= tolerance.changedRatio
      && comparison.maximumDifference <= tolerance.maximumDifference,
    `${label} exceeded the same-host ${gpuSupported ? 'GPU' : 'CPU'} replay tolerance: ${JSON.stringify(comparison)}`
  );
}

try {
  for (const manifest of manifests) {
    console.log(`\nVisual QA · ${manifest}`);
    const manifestPath = path.join(manifestDirectory, manifest);
    const rawManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const primary = await runCapture({ manifest: manifestPath, headed: false });
    const replayDirectory = path.join(replayRoot, path.basename(manifest, '.json'));
    const replay = await runCapture({ manifest: manifestPath, output: replayDirectory, headed: false });
    const primaryDirectory = path.resolve(manifestDirectory, rawManifest.outputDir);
    const gpuDeclaration = rawManifest.capabilities?.gpu;
    const gpuSupported = gpuDeclaration === true || gpuDeclaration?.supported === true;

    const [stablePrimary, stableReplay] = stableReplayPair(primary, replay);
    assert.deepEqual(
      stableReplay,
      stablePrimary,
      `${manifest} changed stable state descriptions, complete runtime evidence, or result metadata during deterministic replay`
    );

    let decodedPixelComparisonUsed = false;
    let cpuRasterToleranceUsed = false;
    for (let index = 0; index < primary.states.length; index += 1) {
      const primaryState = primary.states[index];
      const replayState = replay.states[index];
      if (primaryState.sha256 === replayState.sha256) continue;
      decodedPixelComparisonUsed = true;
      const comparison = comparePngBuffers(
        await readFile(path.join(primaryDirectory, primaryState.file)),
        await readFile(path.join(replayDirectory, replayState.file))
      );
      assertReplayPixels(comparison, gpuSupported, `${manifest} state ${primaryState.name}`);
      if (!gpuSupported && comparison.maximumDifference > 0) cpuRasterToleranceUsed = true;
    }

    const [primarySheet, replaySheet] = await Promise.all([
      readFile(path.join(primaryDirectory, 'contact-sheet.png')),
      readFile(path.join(replayDirectory, 'contact-sheet.png'))
    ]);
    const digest = value => createHash('sha256').update(value).digest('hex');
    if (digest(replaySheet) !== digest(primarySheet)) {
      decodedPixelComparisonUsed = true;
      const comparison = comparePngBuffers(primarySheet, replaySheet);
      assertReplayPixels(comparison, gpuSupported, `${manifest} contact sheet`);
      if (!gpuSupported && comparison.maximumDifference > 0) cpuRasterToleranceUsed = true;
    }
    const replayLabel = gpuSupported
      ? 'GPU-stable'
      : cpuRasterToleranceUsed ? 'CPU-stable'
        : decodedPixelComparisonUsed ? 'pixel-exact' : 'byte-exact';
    console.log(`Replay ${manifest} → ${replayLabel} (${primary.states.length} states, ${primary.runtime.scenarios.length} scenarios)`);
  }
} finally {
  await rm(replayRoot, { recursive: true, force: true });
}
