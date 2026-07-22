import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCapture } from '../../skills/signature-visual/scripts/visual-qa.mjs';

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

for (const manifest of manifests) {
  console.log(`\nVisual QA · ${manifest}`);
  await runCapture({ manifest: path.join(manifestDirectory, manifest), headed: false });
}
