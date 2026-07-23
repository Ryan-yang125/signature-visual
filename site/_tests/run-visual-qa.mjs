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

const replayRoot = await mkdtemp(path.join(os.tmpdir(), 'signature-visual-case-replay-'));

function stableReplayPair(primary, replay, gpuSupported) {
  const stablePrimary = structuredClone(primary);
  const stableReplay = structuredClone(replay);
  if (gpuSupported) {
    for (let index = 0; index < Math.min(stablePrimary.states.length, stableReplay.states.length); index += 1) {
      if (stablePrimary.states[index].sha256 === stableReplay.states[index].sha256) continue;
      stablePrimary.states[index].sha256 = '<same-host-gpu-pixels-compared-separately>';
      stableReplay.states[index].sha256 = '<same-host-gpu-pixels-compared-separately>';
    }
  }
  return [stablePrimary, stableReplay];
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

    const [stablePrimary, stableReplay] = stableReplayPair(primary, replay, gpuSupported);
    assert.deepEqual(
      stableReplay,
      stablePrimary,
      `${manifest} changed stable state descriptions, complete runtime evidence, or result metadata during deterministic replay`
    );

    if (gpuSupported) {
      for (let index = 0; index < primary.states.length; index += 1) {
        const primaryState = primary.states[index];
        const replayState = replay.states[index];
        if (primaryState.sha256 === replayState.sha256) continue;
        const comparison = comparePngBuffers(
          await readFile(path.join(primaryDirectory, primaryState.file)),
          await readFile(path.join(replayDirectory, replayState.file))
        );
        assert.ok(
          comparison.meanDifference < 0.02
            && comparison.changedRatio < 0.0002
            && comparison.maximumDifference <= 32,
          `${manifest} state ${primaryState.name} exceeded the same-host GPU replay tolerance: ${JSON.stringify(comparison)}`
        );
      }
    }

    const [primarySheet, replaySheet] = await Promise.all([
      readFile(path.join(primaryDirectory, 'contact-sheet.png')),
      readFile(path.join(replayDirectory, 'contact-sheet.png'))
    ]);
    const digest = value => createHash('sha256').update(value).digest('hex');
    if (gpuSupported && digest(replaySheet) !== digest(primarySheet)) {
      const comparison = comparePngBuffers(primarySheet, replaySheet);
      assert.ok(
        comparison.meanDifference < 0.02
          && comparison.changedRatio < 0.0002
          && comparison.maximumDifference <= 32,
        `${manifest} contact sheet exceeded the same-host GPU replay tolerance: ${JSON.stringify(comparison)}`
      );
    } else {
      assert.equal(digest(replaySheet), digest(primarySheet), `${manifest} changed its contact sheet during deterministic replay`);
    }
    console.log(`Replay ${manifest} → ${gpuSupported ? 'GPU-stable' : 'exact'} (${primary.states.length} states, ${primary.runtime.scenarios.length} scenarios)`);
  }
} finally {
  await rm(replayRoot, { recursive: true, force: true });
}
