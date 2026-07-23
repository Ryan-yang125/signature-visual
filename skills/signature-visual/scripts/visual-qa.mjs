#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const scriptPath = fileURLToPath(import.meta.url);
const DEFAULT_EPOCH = '2024-01-01T00:00:00.000Z';
const DEFAULT_HOOK = '__signatureVisual';
const DEFAULT_SEED = 'signature-visual-v3';
const CLOCK_INSTALL_LEAD_MS = 1000;
const MANIFEST_SCHEMA_VERSION = 3;
const RUNTIME_CAPABILITIES = [
  'resize',
  'zeroSize',
  'pointer',
  'windowFocus',
  'keyboard',
  'reducedMotion',
  'lifecycle',
  'gpu',
  'primaryAction'
];
const TIER_CAPABILITIES = {
  capture: [],
  interaction: ['pointer', 'keyboard', 'primaryAction'],
  production: RUNTIME_CAPABILITIES
};
const MANAGED_OUTPUT_NAMES = new Set([
  'captures',
  'derived',
  'contact-sheet.png',
  'contact-sheet.html',
  'results.json'
]);
const OUTPUT_SENTINEL = '.signature-visual-qa';
const RUNTIME_ACTIONS = new Set([
  'wait',
  'setViewport',
  'setOwnerSize',
  'pointerEvent',
  'windowBlur',
  'windowFocus',
  'setReducedMotion',
  'keyboard',
  'activate',
  'dispose',
  'remount',
  'gpuContext',
  'callHook',
  'assertHook',
  'assertSelector',
  'assertFocus',
  'assertNoErrors'
]);

const exampleManifest = {
  $schema: './skills/signature-visual/schemas/visual-qa-manifest-v3.schema.json',
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  name: 'Hero visual review',
  tier: 'capture',
  serveRoot: './public',
  url: '/hero/',
  outputDir: './visual-qa-output',
  viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  captureSelector: 'main',
  readySelector: 'canvas',
  hook: DEFAULT_HOOK,
  seed: 'hero-direction-a',
  derivedImages: { thumbnailWidth: 160, blurRadius: 14, silhouette: true },
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

V3 runtime fields:
  tier               capture, interaction, or production.
  capabilities       Each relevant capability is supported or N/A with a reason.
  runtimeScenarios   Declarative actions and assertions for lifecycle and input behavior.
  derivedImages      160px thumbnails, 12-16px blur views, and silhouettes.

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
  derived/*/*.png      Thumbnail, blur, and black/white silhouette evidence.
  contact-sheet.png    Side-by-side thumbnail sheet.
  contact-sheet.html   Dependency-free visual comparison grid.
  results.json         Stable state metadata and SHA-256 image hashes.
  .signature-visual-qa Ownership marker that protects unrelated directories.

Hashes are determinism signals. Visual approval comes from the authored states and review artifacts.

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

function assertKnownKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    requireCondition(allowed.has(key), `${label} contains unknown field "${key}".`);
  }
}

function normalizeCapability(value, name) {
  if (value === true) return { supported: true };
  requireCondition(value && typeof value === 'object' && !Array.isArray(value), `Capability "${name}" requires true or an object.`);
  requireCondition(typeof value.supported === 'boolean', `Capability "${name}" requires a boolean supported field.`);
  if (!value.supported) {
    requireCondition(typeof value.reason === 'string' && value.reason.trim().length > 0, `Capability "${name}" marked N/A requires a reason.`);
    return { supported: false, reason: value.reason.trim() };
  }
  const normalized = { supported: true };
  if (typeof value.note === 'string' && value.note.trim()) normalized.note = value.note.trim();
  if (typeof value.target === 'string' && value.target.trim()) normalized.target = value.target.trim();
  return normalized;
}

function normalizeRuntimeScenarios(rawScenarios, capabilities) {
  const scenarios = rawScenarios ?? [];
  requireCondition(Array.isArray(scenarios), 'runtimeScenarios requires an array.');
  const names = new Set();
  return scenarios.map((scenario, index) => {
    requireCondition(scenario && typeof scenario === 'object' && !Array.isArray(scenario), `Runtime scenario ${index + 1} requires an object.`);
    const name = typeof scenario.name === 'string' ? scenario.name.trim() : '';
    requireCondition(name, `Runtime scenario ${index + 1} requires a non-empty name.`);
    requireCondition(!names.has(name), `Runtime scenario name "${name}" is duplicated.`);
    names.add(name);
    requireCondition(Array.isArray(scenario.requires) && scenario.requires.length > 0, `Runtime scenario "${name}" requires at least one capability.`);
    const requires = [...new Set(scenario.requires)];
    for (const capability of requires) {
      requireCondition(RUNTIME_CAPABILITIES.includes(capability), `Runtime scenario "${name}" references unknown capability "${capability}".`);
      requireCondition(capabilities[capability]?.supported === true, `Runtime scenario "${name}" requires capability "${capability}" that is missing or marked N/A.`);
    }
    requireCondition(Array.isArray(scenario.steps) && scenario.steps.length > 0, `Runtime scenario "${name}" requires at least one step.`);
    const steps = scenario.steps.map((step, stepIndex) => {
      requireCondition(step && typeof step === 'object' && !Array.isArray(step), `Runtime scenario "${name}" step ${stepIndex + 1} requires an object.`);
      requireCondition(typeof step.action === 'string' && RUNTIME_ACTIONS.has(step.action), `Runtime scenario "${name}" step ${stepIndex + 1} has unsupported action "${step.action}".`);
      return structuredClone(step);
    });
    requireCondition(steps.some(step => step.action.startsWith('assert')), `Runtime scenario "${name}" requires at least one assertion step.`);
    return { name, requires, steps };
  });
}

function validateCapabilityCoverage(tier, capabilities, scenarios) {
  for (const capability of TIER_CAPABILITIES[tier]) {
    requireCondition(capabilities[capability], `Tier "${tier}" requires capability "${capability}" to be declared as supported or N/A with a reason.`);
  }
  for (const [name, capability] of Object.entries(capabilities)) {
    if (!capability.supported) continue;
    requireCondition(
      scenarios.some(scenario => scenario.requires.includes(name)),
      `Supported capability "${name}" requires coverage in runtimeScenarios.`
    );
  }
}

function validateCapabilityEvidence(capabilities, scenarios) {
  const stepsFor = capability => scenarios
    .filter(scenario => scenario.requires.includes(capability))
    .flatMap(scenario => scenario.steps);
  const supported = capability => capabilities[capability]?.supported === true;
  const hasAction = (steps, action, predicate = () => true) => steps.some(step => step.action === action && predicate(step));
  const hasHookAssertion = (steps, predicate) => steps.some(step => step.action === 'assertHook' && predicate(step));

  if (supported('resize')) {
    const steps = stepsFor('resize');
    requireCondition(
      hasAction(steps, 'setViewport') || hasAction(steps, 'setOwnerSize', step => step.width > 0 && step.height > 0),
      'Capability "resize" requires a viewport or non-zero owner resize action.'
    );
    requireCondition(hasHookAssertion(steps, () => true), 'Capability "resize" requires a post-resize hook assertion.');
  }
  if (supported('zeroSize')) {
    const steps = stepsFor('zeroSize');
    requireCondition(
      hasAction(steps, 'setOwnerSize', step => step.width === 0 || step.height === 0),
      'Capability "zeroSize" requires a zero-width or zero-height owner action.'
    );
    requireCondition(
      hasHookAssertion(steps, step => step.path === 'pauseReasons' && step.includes === 'zero-size'),
      'Capability "zeroSize" requires a pauseReasons assertion for "zero-size".'
    );
    requireCondition(
      hasAction(steps, 'setOwnerSize', step => step.width > 0 && step.height > 0),
      'Capability "zeroSize" requires a non-zero recovery action.'
    );
  }
  if (supported('pointer')) {
    const steps = stepsFor('pointer');
    requireCondition(
      hasAction(steps, 'pointerEvent', step => ['pointermove', 'pointerenter'].includes(step.event ?? 'pointermove')),
      'Capability "pointer" requires a pointermove or pointerenter action.'
    );
    requireCondition(
      hasAction(steps, 'pointerEvent', step => ['pointerleave', 'pointercancel', 'lostpointercapture'].includes(step.event)),
      'Capability "pointer" requires leave, cancel, or lost-capture evidence.'
    );
    requireCondition(
      hasHookAssertion(steps, step => step.path === 'pointer.active' && step.equals === false),
      'Capability "pointer" requires a semantic pointer.active=false assertion after cancellation.'
    );
  }
  if (supported('windowFocus')) {
    const steps = stepsFor('windowFocus');
    requireCondition(hasAction(steps, 'windowBlur') && hasAction(steps, 'windowFocus'), 'Capability "windowFocus" requires blur and focus actions.');
    requireCondition(
      hasHookAssertion(steps, step => step.path === 'pauseReasons' && step.includes === 'window-blur'),
      'Capability "windowFocus" requires a window-blur pause assertion.'
    );
  }
  if (supported('keyboard')) {
    const steps = stepsFor('keyboard');
    requireCondition(
      hasAction(steps, 'keyboard') || hasAction(steps, 'activate', step => step.via === 'keyboard'),
      'Capability "keyboard" requires a keyboard action.'
    );
    requireCondition(
      steps.some(step => ['assertHook', 'assertSelector', 'assertFocus'].includes(step.action)),
      'Capability "keyboard" requires a semantic or focus assertion.'
    );
  }
  if (supported('reducedMotion')) {
    const steps = stepsFor('reducedMotion');
    requireCondition(
      hasAction(steps, 'setReducedMotion', step => step.value === 'reduce')
        && hasAction(steps, 'setReducedMotion', step => step.value === 'no-preference'),
      'Capability "reducedMotion" requires runtime changes to reduce and no-preference.'
    );
    requireCondition(
      hasHookAssertion(steps, step => step.path === 'reducedMotion' && (step.equals === true || step.equals === false)),
      'Capability "reducedMotion" requires a reducedMotion state assertion.'
    );
  }
  if (supported('lifecycle')) {
    const steps = stepsFor('lifecycle');
    requireCondition(hasAction(steps, 'dispose') && hasAction(steps, 'remount'), 'Capability "lifecycle" requires dispose and remount actions.');
    requireCondition(
      hasHookAssertion(steps, step => ['disposed', 'ready', 'mountCount', 'resources.listeners', 'resources.observers'].includes(step.path)),
      'Capability "lifecycle" requires a lifecycle-state or resource assertion.'
    );
  }
  if (supported('gpu')) {
    const steps = stepsFor('gpu');
    requireCondition(
      hasAction(steps, 'gpuContext', step => step.state === 'lost')
        && hasAction(steps, 'gpuContext', step => step.state === 'restored'),
      'Capability "gpu" requires lost and restored context actions.'
    );
    requireCondition(
      hasHookAssertion(steps, step => ['fallback', 'fallback.active'].includes(step.path) && (step.equals === true || step.equals === false)),
      'Capability "gpu" requires authored fallback assertions.'
    );
  }
  if (supported('primaryAction')) {
    const steps = stepsFor('primaryAction');
    requireCondition(
      hasAction(steps, 'activate', step => (step.via ?? 'pointer') === 'pointer')
        && hasAction(steps, 'activate', step => step.via === 'keyboard'),
      'Capability "primaryAction" requires pointer and keyboard activation through the same semantic control.'
    );
    requireCondition(
      hasHookAssertion(steps, step => /(?:action|activation|phase|state)/i.test(step.path ?? '')),
      'Capability "primaryAction" requires an observable action, activation, phase, or state assertion.'
    );
  }
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
  const schemaVersion = raw.schemaVersion ?? 1;
  requireCondition(schemaVersion === 1 || schemaVersion === MANIFEST_SCHEMA_VERSION, `schemaVersion must be 3. Omit it only for legacy manifests.`);
  if (schemaVersion === MANIFEST_SCHEMA_VERSION) {
    assertKnownKeys(raw, new Set([
      '$schema', 'schemaVersion', 'name', 'tier', 'serveRoot', 'url', 'outputDir', 'viewport',
      'captureSelector', 'readySelector', 'hook', 'seed', 'epoch', 'locale', 'timezoneId',
      'reducedMotion', 'colorScheme', 'fullPage', 'failOnConsoleError', 'failOnNetworkError',
      'timeoutMs', 'derivedImages', 'states', 'capabilities', 'runtimeScenarios'
    ]), 'Manifest');
  }
  requireCondition(typeof raw.url === 'string' && raw.url.length > 0, 'Manifest url requires a non-empty string.');
  requireCondition(Array.isArray(raw.states) && raw.states.length > 0, 'Manifest states requires at least one capture state.');

  const tier = raw.tier ?? 'capture';
  requireCondition(Object.hasOwn(TIER_CAPABILITIES, tier), 'tier must be "capture", "interaction", or "production".');

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
    if (schemaVersion === MANIFEST_SCHEMA_VERSION) {
      assertKnownKeys(state, new Set(['name', 'progress', 'timeMs', 'settleMs', 'pointer']), `State ${index + 1}`);
    }
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
  const unsafeOutputDirectories = new Set([
    path.parse(outputDirectory).root,
    path.resolve(os.homedir()),
    path.resolve(process.cwd()),
    path.resolve(manifestDirectory)
  ]);
  requireCondition(
    !unsafeOutputDirectories.has(outputDirectory),
    'outputDir must resolve to a dedicated subdirectory, away from the filesystem root, home, working directory, and manifest directory.'
  );

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

  const derivedInput = raw.derivedImages ?? {};
  requireCondition(derivedInput && typeof derivedInput === 'object' && !Array.isArray(derivedInput), 'derivedImages requires an object.');
  const thumbnailWidth = derivedInput.thumbnailWidth ?? 160;
  const blurRadius = derivedInput.blurRadius ?? 14;
  requireCondition(Number.isInteger(thumbnailWidth) && thumbnailWidth >= 80 && thumbnailWidth <= 640, 'derivedImages.thumbnailWidth requires an integer from 80 through 640.');
  requireCondition(Number.isInteger(blurRadius) && blurRadius >= 12 && blurRadius <= 16, 'derivedImages.blurRadius requires an integer from 12 through 16.');
  const derivedImages = { thumbnailWidth, blurRadius, silhouette: derivedInput.silhouette !== false };

  const capabilityInput = raw.capabilities ?? {};
  requireCondition(capabilityInput && typeof capabilityInput === 'object' && !Array.isArray(capabilityInput), 'capabilities requires an object.');
  const capabilities = {};
  for (const [name, value] of Object.entries(capabilityInput)) {
    requireCondition(RUNTIME_CAPABILITIES.includes(name), `Unknown capability "${name}".`);
    capabilities[name] = normalizeCapability(value, name);
  }
  const runtimeScenarios = normalizeRuntimeScenarios(raw.runtimeScenarios, capabilities);
  validateCapabilityCoverage(tier, capabilities, runtimeScenarios);
  validateCapabilityEvidence(capabilities, runtimeScenarios);

  return {
    schemaVersion,
    tier,
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
    derivedImages,
    capabilities,
    runtimeScenarios,
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

function valueAtPath(value, pathExpression) {
  if (!pathExpression) return value;
  return String(pathExpression).split('.').reduce((current, key) => current?.[key], value);
}

function valuesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function hookDescription(page, manifest) {
  const description = await callHook(page, manifest.hook, 'describe', undefined);
  return description.called ? description.output : null;
}

async function commitAndDescribeHook(page, manifest, epochMs) {
  return page.evaluate(async ({ hookName, fixedEpochMs }) => {
    const names = [hookName, '__signatureVisual', '__signatureVisualQA']
      .filter((name, index, candidates) => name && candidates.indexOf(name) === index);
    const name = names.find(candidate => window[candidate]);
    const api = name ? window[name] : undefined;
    if (!api) return null;
    const timeMs = Math.max(0, Date.now() - fixedEpochMs);
    if (typeof api.seek === 'function') await api.seek({ time: timeMs / 1000, timeMs });
    else if (typeof api.renderAt === 'function') await api.renderAt(timeMs);
    if (typeof api.render === 'function') await api.render();
    return typeof api.describe === 'function' ? await api.describe() : null;
  }, { hookName: manifest.hook, fixedEpochMs: epochMs });
}

async function dispatchPointerEvent(page, manifest, step) {
  const selector = step.selector ?? manifest.captureSelector ?? 'body';
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'attached', timeout: manifest.timeoutMs });
  const box = await locator.boundingBox();
  const x = box ? box.x + box.width * Number(step.x ?? 0.5) : 0;
  const y = box ? box.y + box.height * Number(step.y ?? 0.5) : 0;
  const eventType = step.event ?? 'pointermove';
  requireCondition(['pointerenter', 'pointermove', 'pointerleave', 'pointercancel', 'pointerdown', 'pointerup', 'lostpointercapture'].includes(eventType), `pointerEvent received unsupported event "${eventType}".`);
  await locator.dispatchEvent(eventType, {
    pointerId: Number(step.pointerId ?? 1),
    pointerType: step.pointerType ?? 'mouse',
    clientX: x,
    clientY: y,
    buttons: Number(step.buttons ?? (eventType === 'pointerdown' ? 1 : 0)),
    bubbles: true
  });
}

async function executeRuntimeStep(page, manifest, step, diagnostics) {
  const selector = step.selector ?? manifest.captureSelector ?? 'body';
  if (step.action === 'wait') {
    const milliseconds = Number(step.ms ?? 0);
    requireCondition(finiteNumber(milliseconds) && milliseconds >= 0, 'wait requires a non-negative ms value.');
    await page.clock.runFor(milliseconds);
    return { waitedMs: milliseconds };
  }
  if (step.action === 'setViewport') {
    requireCondition(positiveInteger(step.width) && positiveInteger(step.height), 'setViewport requires positive integer width and height.');
    await page.setViewportSize({ width: step.width, height: step.height });
    await page.clock.runFor(Number(step.settleMs ?? 32));
    return { width: step.width, height: step.height };
  }
  if (step.action === 'setOwnerSize') {
    requireCondition(finiteNumber(step.width) && step.width >= 0 && finiteNumber(step.height) && step.height >= 0, 'setOwnerSize requires non-negative width and height.');
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: 'attached', timeout: manifest.timeoutMs });
    await locator.evaluate((element, size) => {
      element.style.width = `${size.width}px`;
      element.style.height = `${size.height}px`;
    }, { width: step.width, height: step.height });
    await page.clock.runFor(Number(step.settleMs ?? 32));
    return { selector, width: step.width, height: step.height };
  }
  if (step.action === 'pointerEvent') {
    await dispatchPointerEvent(page, manifest, step);
    await page.clock.runFor(Number(step.settleMs ?? 0));
    return { selector, event: step.event ?? 'pointermove' };
  }
  if (step.action === 'windowBlur' || step.action === 'windowFocus') {
    const type = step.action === 'windowBlur' ? 'blur' : 'focus';
    await page.evaluate(eventType => window.dispatchEvent(new Event(eventType)), type);
    await page.clock.runFor(Number(step.settleMs ?? 0));
    return { event: type };
  }
  if (step.action === 'setReducedMotion') {
    requireCondition(step.value === 'reduce' || step.value === 'no-preference', 'setReducedMotion value must be "reduce" or "no-preference".');
    await page.emulateMedia({ reducedMotion: step.value });
    await page.clock.runFor(Number(step.settleMs ?? 32));
    return { reducedMotion: step.value };
  }
  if (step.action === 'keyboard') {
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: 'visible', timeout: manifest.timeoutMs });
    await locator.focus();
    await locator.press(step.key ?? 'Enter');
    await page.clock.runFor(Number(step.settleMs ?? 0));
    return { selector, key: step.key ?? 'Enter' };
  }
  if (step.action === 'activate') {
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: 'visible', timeout: manifest.timeoutMs });
    if ((step.via ?? 'pointer') === 'keyboard') {
      await locator.focus();
      await locator.press(step.key ?? 'Enter');
    } else {
      await locator.click();
    }
    await page.clock.runFor(Number(step.settleMs ?? 0));
    return { selector, via: step.via ?? 'pointer' };
  }
  if (step.action === 'dispose' || step.action === 'remount') {
    const method = step.action === 'dispose' ? 'dispose' : 'remount';
    const call = await callHook(page, manifest.hook, method, step.argument, true);
    await page.clock.runFor(Number(step.settleMs ?? 0));
    return { method, hook: call.hook };
  }
  if (step.action === 'gpuContext') {
    requireCondition(step.state === 'lost' || step.state === 'restored', 'gpuContext state must be "lost" or "restored".');
    const method = step.state === 'lost' ? 'loseContext' : 'restoreContext';
    const hookCall = await callHook(page, manifest.hook, method, undefined);
    if (!hookCall.called) {
      const result = await page.locator(step.selector ?? 'canvas').first().evaluate((canvas, state) => {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        const extension = gl?.getExtension('WEBGL_lose_context');
        if (!extension) return false;
        if (state === 'lost') extension.loseContext();
        else extension.restoreContext();
        return true;
      }, step.state);
      requireCondition(result, 'gpuContext requires a WEBGL_lose_context extension or hook method.');
    }
    await page.clock.runFor(Number(step.settleMs ?? 80));
    return { state: step.state, viaHook: hookCall.called };
  }
  if (step.action === 'callHook') {
    requireCondition(typeof step.method === 'string' && step.method, 'callHook requires a method.');
    const result = await callHook(page, manifest.hook, step.method, step.argument, step.required !== false);
    await page.clock.runFor(Number(step.settleMs ?? 0));
    return { method: step.method, output: result.output };
  }
  if (step.action === 'assertHook') {
    const description = await hookDescription(page, manifest);
    requireCondition(description !== null, 'assertHook requires describe() on the runtime bridge.');
    const actual = valueAtPath(description, step.path);
    if (Object.hasOwn(step, 'equals')) requireCondition(valuesEqual(actual, step.equals), `assertHook ${step.path ?? '<root>'} expected ${JSON.stringify(step.equals)}, received ${JSON.stringify(actual)}.`);
    if (Object.hasOwn(step, 'includes')) requireCondition(Array.isArray(actual) || typeof actual === 'string', `assertHook ${step.path} includes requires an array or string.`);
    if (Object.hasOwn(step, 'includes')) requireCondition(actual.includes(step.includes), `assertHook ${step.path} expected to include ${JSON.stringify(step.includes)}, received ${JSON.stringify(actual)}.`);
    if (step.truthy === true) requireCondition(Boolean(actual), `assertHook ${step.path} expected a truthy value, received ${JSON.stringify(actual)}.`);
    if (step.truthy === false) requireCondition(!actual, `assertHook ${step.path} expected a falsy value, received ${JSON.stringify(actual)}.`);
    return { path: step.path ?? null, actual };
  }
  if (step.action === 'assertSelector') {
    const locator = page.locator(selector);
    const count = await locator.count();
    if (Object.hasOwn(step, 'count')) requireCondition(count === step.count, `assertSelector ${selector} expected count ${step.count}, received ${count}.`);
    if (step.visible !== undefined) {
      const visible = count > 0 && await locator.first().isVisible();
      requireCondition(visible === step.visible, `assertSelector ${selector} expected visible=${step.visible}, received ${visible}.`);
    }
    if (step.attribute) {
      const actual = count > 0 ? await locator.first().getAttribute(step.attribute) : null;
      requireCondition(valuesEqual(actual, step.equals), `assertSelector ${selector} attribute ${step.attribute} expected ${JSON.stringify(step.equals)}, received ${JSON.stringify(actual)}.`);
    }
    if (step.textIncludes !== undefined) {
      const actual = count > 0 ? await locator.first().textContent() : '';
      requireCondition(actual?.includes(step.textIncludes), `assertSelector ${selector} text expected to include ${JSON.stringify(step.textIncludes)}, received ${JSON.stringify(actual)}.`);
    }
    return { selector, count };
  }
  if (step.action === 'assertFocus') {
    const matches = await page.evaluate(targetSelector => document.activeElement?.matches?.(targetSelector) ?? false, selector);
    requireCondition(matches, `assertFocus expected ${selector} to own focus.`);
    return { selector, focused: true };
  }
  if (step.action === 'assertNoErrors') {
    requireCondition(diagnostics.consoleErrors.length === 0, `assertNoErrors received console errors: ${diagnostics.consoleErrors.join(' | ')}`);
    requireCondition(diagnostics.pageErrors.length === 0, `assertNoErrors received page errors: ${diagnostics.pageErrors.join(' | ')}`);
    requireCondition(diagnostics.networkErrors.length === 0, `assertNoErrors received network errors: ${diagnostics.networkErrors.join(' | ')}`);
    return { passed: true };
  }
  throw new CliError(`Unsupported runtime action "${step.action}".`);
}

async function runRuntimeScenario(browser, manifest, pageUrl, scenario) {
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
  const diagnostics = { consoleErrors: [], pageErrors: [], networkErrors: [] };
  page.on('console', message => {
    if (message.type() === 'error') diagnostics.consoleErrors.push(message.text());
  });
  page.on('pageerror', error => diagnostics.pageErrors.push(error.message));
  page.on('requestfailed', request => diagnostics.networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'request failed'}`));
  page.on('response', response => {
    if (response.status() >= 400) diagnostics.networkErrors.push(`${response.request().method()} ${response.url()}: HTTP ${response.status()}`);
  });
  try {
    const epochMs = typeof manifest.epoch === 'number' ? manifest.epoch : Date.parse(manifest.epoch);
    await page.clock.install({ time: epochMs - CLOCK_INSTALL_LEAD_MS });
    await page.clock.pauseAt(epochMs);
    await page.addInitScript(seedRandom, { seed: manifest.seed });
    const response = await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: manifest.timeoutMs });
    if (!response?.ok()) throw new CliError(`Page returned HTTP ${response?.status() ?? 'unknown'} for ${pageUrl}.`);
    await settlePage(page, manifest, false);
    await callHook(page, manifest.hook, 'setSeed', manifest.seed);
    const steps = [];
    let assertionCount = 0;
    for (const step of scenario.steps) {
      const detail = await executeRuntimeStep(page, manifest, step, diagnostics);
      if (step.action.startsWith('assert')) assertionCount += 1;
      steps.push({ action: step.action, passed: true, detail });
    }
    if (manifest.failOnConsoleError) {
      requireCondition(diagnostics.consoleErrors.length === 0 && diagnostics.pageErrors.length === 0, `Runtime scenario "${scenario.name}" emitted browser errors.`);
    }
    if (manifest.failOnNetworkError) requireCondition(diagnostics.networkErrors.length === 0, `Runtime scenario "${scenario.name}" emitted network errors.`);
    return {
      name: scenario.name,
      passed: true,
      requires: scenario.requires,
      assertionCount,
      steps,
      description: await commitAndDescribeHook(page, manifest, epochMs),
      diagnostics
    };
  } catch (error) {
    throw new CliError(`Runtime scenario "${scenario.name}" failed: ${error.message}`);
  } finally {
    await context.close();
  }
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

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
let crcTable;

function crc32(buffer) {
  if (!crcTable) {
    crcTable = Array.from({ length: 256 }, (_, index) => {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      return value >>> 0;
    });
  }
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function paethPredictor(left, above, upperLeft) {
  const value = left + above - upperLeft;
  const leftDistance = Math.abs(value - left);
  const aboveDistance = Math.abs(value - above);
  const upperLeftDistance = Math.abs(value - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function decodePng(buffer) {
  requireCondition(buffer.subarray(0, 8).equals(PNG_SIGNATURE), 'Derived-image input requires a PNG screenshot.');
  let offset = 8;
  let width;
  let height;
  let colorType;
  let bitDepth;
  let interlace;
  const compressed = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') compressed.push(data);
    else if (type === 'IEND') break;
    offset += length + 12;
  }
  requireCondition(width && height && compressed.length, 'PNG screenshot is missing required chunks.');
  requireCondition(bitDepth === 8 && interlace === 0, 'Derived-image processing supports 8-bit, non-interlaced PNG screenshots.');
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 0 ? 1 : 0;
  requireCondition(channels > 0, `Derived-image processing does not support PNG color type ${colorType}.`);
  const stride = width * channels;
  const source = inflateSync(Buffer.concat(compressed));
  const raw = Buffer.alloc(width * height * channels);
  for (let row = 0; row < height; row += 1) {
    const filter = source[row * (stride + 1)];
    const sourceOffset = row * (stride + 1) + 1;
    const rowOffset = row * stride;
    const previousOffset = rowOffset - stride;
    for (let column = 0; column < stride; column += 1) {
      const byte = source[sourceOffset + column];
      const left = column >= channels ? raw[rowOffset + column - channels] : 0;
      const above = row > 0 ? raw[previousOffset + column] : 0;
      const upperLeft = row > 0 && column >= channels ? raw[previousOffset + column - channels] : 0;
      let value;
      if (filter === 0) value = byte;
      else if (filter === 1) value = byte + left;
      else if (filter === 2) value = byte + above;
      else if (filter === 3) value = byte + Math.floor((left + above) / 2);
      else if (filter === 4) value = byte + paethPredictor(left, above, upperLeft);
      else throw new CliError(`Derived-image processing received unsupported PNG filter ${filter}.`);
      raw[rowOffset + column] = value & 0xff;
    }
  }
  const pixels = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const input = pixel * channels;
    const output = pixel * 4;
    if (colorType === 6) {
      pixels[output] = raw[input];
      pixels[output + 1] = raw[input + 1];
      pixels[output + 2] = raw[input + 2];
      pixels[output + 3] = raw[input + 3];
    } else if (colorType === 2) {
      pixels[output] = raw[input];
      pixels[output + 1] = raw[input + 1];
      pixels[output + 2] = raw[input + 2];
      pixels[output + 3] = 255;
    } else {
      const gray = raw[input];
      pixels[output] = gray;
      pixels[output + 1] = gray;
      pixels[output + 2] = gray;
      pixels[output + 3] = colorType === 4 ? raw[input + 1] : 255;
    }
  }
  return { width, height, pixels };
}

function comparePngBuffers(leftBuffer, rightBuffer, { channelTolerance = 2 } = {}) {
  const left = decodePng(leftBuffer);
  const right = decodePng(rightBuffer);
  requireCondition(left.width === right.width && left.height === right.height, 'PNG comparison requires matching dimensions.');
  let totalDifference = 0;
  let changedChannels = 0;
  let maximumDifference = 0;
  for (let index = 0; index < left.pixels.length; index += 1) {
    const difference = Math.abs(left.pixels[index] - right.pixels[index]);
    totalDifference += difference;
    if (difference > channelTolerance) changedChannels += 1;
    if (difference > maximumDifference) maximumDifference = difference;
  }
  return {
    width: left.width,
    height: left.height,
    meanDifference: totalDifference / left.pixels.length,
    changedRatio: changedChannels / left.pixels.length,
    maximumDifference
  };
}

function encodePng(image) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = image.width * 4;
  const raw = Buffer.alloc((stride + 1) * image.height);
  for (let row = 0; row < image.height; row += 1) {
    const output = row * (stride + 1);
    raw[output] = 0;
    Buffer.from(image.pixels.buffer, image.pixels.byteOffset + row * stride, stride).copy(raw, output + 1);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function resizeImage(image, targetWidth) {
  const width = Math.max(1, Math.round(targetWidth));
  const height = Math.max(1, Math.round(image.height * width / image.width));
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor((y + 0.5) * image.height / height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor((x + 0.5) * image.width / width));
      const source = (sourceY * image.width + sourceX) * 4;
      const output = (y * width + x) * 4;
      pixels[output] = image.pixels[source];
      pixels[output + 1] = image.pixels[source + 1];
      pixels[output + 2] = image.pixels[source + 2];
      pixels[output + 3] = image.pixels[source + 3];
    }
  }
  return { width, height, pixels };
}

function blurPass(source, width, height, radius, horizontal) {
  const output = new Uint8Array(source.length);
  const length = horizontal ? width : height;
  const lines = horizontal ? height : width;
  const windowSize = radius * 2 + 1;
  const indexOf = (line, position, channel) => horizontal
    ? (line * width + position) * 4 + channel
    : (position * width + line) * 4 + channel;
  for (let line = 0; line < lines; line += 1) {
    const sums = [0, 0, 0, 0];
    for (let sample = -radius; sample <= radius; sample += 1) {
      const position = Math.max(0, Math.min(length - 1, sample));
      for (let channel = 0; channel < 4; channel += 1) sums[channel] += source[indexOf(line, position, channel)];
    }
    for (let position = 0; position < length; position += 1) {
      for (let channel = 0; channel < 4; channel += 1) output[indexOf(line, position, channel)] = Math.round(sums[channel] / windowSize);
      const remove = Math.max(0, position - radius);
      const add = Math.min(length - 1, position + radius + 1);
      for (let channel = 0; channel < 4; channel += 1) {
        sums[channel] += source[indexOf(line, add, channel)] - source[indexOf(line, remove, channel)];
      }
    }
  }
  return output;
}

function blurImage(image, radius) {
  const horizontal = blurPass(image.pixels, image.width, image.height, radius, true);
  const vertical = blurPass(horizontal, image.width, image.height, radius, false);
  return { width: image.width, height: image.height, pixels: vertical };
}

function silhouetteImage(image) {
  const histogram = new Uint32Array(256);
  const luminances = new Uint8Array(image.width * image.height);
  for (let pixel = 0; pixel < luminances.length; pixel += 1) {
    const offset = pixel * 4;
    const alpha = image.pixels[offset + 3] / 255;
    const red = image.pixels[offset] * alpha + 255 * (1 - alpha);
    const green = image.pixels[offset + 1] * alpha + 255 * (1 - alpha);
    const blue = image.pixels[offset + 2] * alpha + 255 * (1 - alpha);
    const luminance = Math.max(0, Math.min(255, Math.round(red * 0.2126 + green * 0.7152 + blue * 0.0722)));
    luminances[pixel] = luminance;
    histogram[luminance] += 1;
  }
  let totalWeighted = 0;
  for (let value = 0; value < 256; value += 1) totalWeighted += value * histogram[value];
  let backgroundWeight = 0;
  let backgroundWeighted = 0;
  let bestVariance = -1;
  let threshold = 127;
  for (let value = 0; value < 256; value += 1) {
    backgroundWeight += histogram[value];
    if (backgroundWeight === 0) continue;
    const foregroundWeight = luminances.length - backgroundWeight;
    if (foregroundWeight === 0) break;
    backgroundWeighted += value * histogram[value];
    const backgroundMean = backgroundWeighted / backgroundWeight;
    const foregroundMean = (totalWeighted - backgroundWeighted) / foregroundWeight;
    const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      threshold = value;
    }
  }
  const pixels = new Uint8Array(image.width * image.height * 4);
  for (let pixel = 0; pixel < luminances.length; pixel += 1) {
    const value = luminances[pixel] <= threshold ? 0 : 255;
    const offset = pixel * 4;
    pixels[offset] = value;
    pixels[offset + 1] = value;
    pixels[offset + 2] = value;
    pixels[offset + 3] = 255;
  }
  return { width: image.width, height: image.height, pixels };
}

function composeContactSheet(images, gap = 8) {
  const width = images.reduce((sum, image) => sum + image.width, 0) + gap * Math.max(0, images.length - 1);
  const height = Math.max(...images.map(image => image.height));
  const pixels = new Uint8Array(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 17;
    pixels[index + 1] = 20;
    pixels[index + 2] = 28;
    pixels[index + 3] = 255;
  }
  let offsetX = 0;
  for (const image of images) {
    const offsetY = Math.floor((height - image.height) / 2);
    for (let y = 0; y < image.height; y += 1) {
      const sourceStart = y * image.width * 4;
      const outputStart = ((offsetY + y) * width + offsetX) * 4;
      pixels.set(image.pixels.subarray(sourceStart, sourceStart + image.width * 4), outputStart);
    }
    offsetX += image.width + gap;
  }
  return { width, height, pixels };
}

async function createDerivedArtifacts(buffer, directories, prefix, config) {
  const source = decodePng(buffer);
  const thumbnail = resizeImage(source, config.thumbnailWidth);
  const blurred = blurImage(source, config.blurRadius);
  const silhouette = config.silhouette ? silhouetteImage(source) : null;
  const thumbnailName = `${prefix}.png`;
  const blurName = `${prefix}.png`;
  const silhouetteName = `${prefix}.png`;
  await Promise.all([
    writeFile(path.join(directories.thumbnail, thumbnailName), encodePng(thumbnail)),
    writeFile(path.join(directories.blur, blurName), encodePng(blurred)),
    silhouette ? writeFile(path.join(directories.silhouette, silhouetteName), encodePng(silhouette)) : Promise.resolve()
  ]);
  return {
    thumbnail: path.posix.join('derived', 'thumbnails', thumbnailName),
    blur: path.posix.join('derived', 'blur', blurName),
    silhouette: silhouette ? path.posix.join('derived', 'silhouette', silhouetteName) : null
  };
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

function createContactSheet(manifest, pageUrl, results, runtimeResults) {
  const cards = results.map(result => `
      <figure>
        <img src="./${escapeHtml(result.file)}" alt="${escapeHtml(result.name)} capture" />
        <div class="derived">
          <a href="./${escapeHtml(result.derived.thumbnail)}">thumbnail</a>
          <a href="./${escapeHtml(result.derived.blur)}">blur ${manifest.derivedImages.blurRadius}px</a>
          ${result.derived.silhouette ? `<a href="./${escapeHtml(result.derived.silhouette)}">silhouette</a>` : ''}
        </div>
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
      .derived { display: flex; gap: 12px; padding: 10px 17px 0; font-size: 11px; }
      .derived a { color: #aeb7ca; text-underline-offset: 3px; }
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
      <p>${manifest.viewport.width} × ${manifest.viewport.height} @ ${manifest.viewport.deviceScaleFactor}x · seed ${escapeHtml(manifest.seed)} · tier ${escapeHtml(manifest.tier)}</p>
      <p><a href="./contact-sheet.png">Open side-by-side PNG</a> · ${runtimeResults.length} runtime scenario${runtimeResults.length === 1 ? '' : 's'} passed</p>
    </header>
    <main>${cards}
    </main>
  </body>
</html>
`;
}

async function captureState(browser, manifest, pageUrl, state, index, captureDirectory, derivedDirectories) {
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
    const epochMs = typeof manifest.epoch === 'number' ? manifest.epoch : Date.parse(manifest.epoch);
    await page.clock.install({ time: epochMs - CLOCK_INSTALL_LEAD_MS });
    await page.clock.pauseAt(epochMs);
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
    const derived = await createDerivedArtifacts(buffer, derivedDirectories, `${prefix}-${safeFilePart(state.name)}`, manifest.derivedImages);
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
      derived,
      description,
      diagnostics: { consoleErrors, pageErrors, networkErrors }
    };
  } finally {
    await context.close();
  }
}

async function prepareOwnedOutputDirectory(outputDirectory, manifestPath) {
  await mkdir(outputDirectory, { recursive: true });
  const realOutputDirectory = await realpath(outputDirectory);
  const realUnsafeDirectories = new Set([
    path.parse(realOutputDirectory).root,
    await realpath(os.homedir()),
    await realpath(process.cwd()),
    await realpath(path.dirname(manifestPath))
  ]);
  requireCondition(
    !realUnsafeDirectories.has(realOutputDirectory),
    'outputDir must resolve to a dedicated subdirectory, including after symbolic-link resolution.'
  );
  const entries = await readdir(outputDirectory);
  const sentinelPath = path.join(outputDirectory, OUTPUT_SENTINEL);
  if (entries.includes(OUTPUT_SENTINEL)) {
    let sentinel;
    try {
      sentinel = JSON.parse(await readFile(sentinelPath, 'utf8'));
    } catch (error) {
      throw new CliError(`outputDir ownership marker is unreadable at ${sentinelPath}: ${error.message}`);
    }
    requireCondition(
      sentinel?.schemaVersion === 1 && sentinel?.owner === 'signature-visual-qa',
      `outputDir ownership marker is invalid at ${sentinelPath}.`
    );
    return;
  }

  const unrelatedEntries = entries.filter(name => !MANAGED_OUTPUT_NAMES.has(name));
  requireCondition(
    unrelatedEntries.length === 0,
    `outputDir contains unrelated files and has no ${OUTPUT_SENTINEL} ownership marker: ${unrelatedEntries.slice(0, 5).join(', ')}${unrelatedEntries.length > 5 ? ', …' : ''}`
  );
  try {
    await writeFile(sentinelPath, `${JSON.stringify({ schemaVersion: 1, owner: 'signature-visual-qa' }, null, 2)}\n`, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let sentinel;
    try {
      sentinel = JSON.parse(await readFile(sentinelPath, 'utf8'));
    } catch (readError) {
      throw new CliError(`outputDir ownership marker could not be verified at ${sentinelPath}: ${readError.message}`);
    }
    requireCondition(
      sentinel?.schemaVersion === 1 && sentinel?.owner === 'signature-visual-qa',
      `outputDir ownership marker is invalid at ${sentinelPath}.`
    );
  }
}

async function promoteManagedArtifacts(stagingDirectory, outputDirectory) {
  const outputParent = path.dirname(outputDirectory);
  const backupDirectory = await mkdtemp(path.join(outputParent, `.${path.basename(outputDirectory)}.backup-`));
  const backedUp = [];
  const promoted = [];
  const injectedFailureAfter = process.env.SIGNATURE_VISUAL_QA_TEST_FAIL_PROMOTION_AFTER === undefined
    ? null
    : Number(process.env.SIGNATURE_VISUAL_QA_TEST_FAIL_PROMOTION_AFTER);
  if (injectedFailureAfter !== null) {
    requireCondition(
      positiveInteger(injectedFailureAfter),
      'SIGNATURE_VISUAL_QA_TEST_FAIL_PROMOTION_AFTER requires a positive integer.'
    );
  }

  try {
    for (const name of MANAGED_OUTPUT_NAMES) {
      const target = path.join(outputDirectory, name);
      try {
        await rename(target, path.join(backupDirectory, name));
        backedUp.push(name);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    for (const name of MANAGED_OUTPUT_NAMES) {
      await rename(path.join(stagingDirectory, name), path.join(outputDirectory, name));
      promoted.push(name);
      if (injectedFailureAfter === promoted.length) {
        throw new Error(`Injected promotion failure after ${promoted.length} managed artifact${promoted.length === 1 ? '' : 's'}.`);
      }
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const name of [...promoted].reverse()) {
      try {
        await rm(path.join(outputDirectory, name), { recursive: true, force: true });
      } catch (rollbackError) {
        rollbackErrors.push(`remove ${name}: ${rollbackError.message}`);
      }
    }
    for (const name of [...backedUp].reverse()) {
      try {
        await rename(path.join(backupDirectory, name), path.join(outputDirectory, name));
      } catch (rollbackError) {
        rollbackErrors.push(`restore ${name}: ${rollbackError.message}`);
      }
    }
    if (rollbackErrors.length > 0) {
      throw new CliError(
        `Output promotion failed: ${error.message} Automatic rollback is incomplete; recovery data remains at ${backupDirectory}. ${rollbackErrors.join(' | ')}`
      );
    }
    try {
      await rm(backupDirectory, { recursive: true, force: true });
    } catch (cleanupError) {
      throw new CliError(
        `Output promotion failed: ${error.message} Previous evidence was restored; cleanup remains at ${backupDirectory}: ${cleanupError.message}`
      );
    }
    throw error;
  }

  try {
    await rm(backupDirectory, { recursive: true, force: true });
  } catch (cleanupError) {
    process.stderr.write(`Visual QA warning: current evidence is committed; previous-evidence cleanup remains at ${backupDirectory}: ${cleanupError.message}\n`);
  }
}

async function runCapture(options) {
  const { manifest, manifestPath } = await loadManifest(options.manifest, options.output);
  await prepareOwnedOutputDirectory(manifest.outputDirectory, manifestPath);
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
  let stagingDirectory;
  try {
    const { chromium } = await loadPlaywright();
    try {
      browser = await chromium.launch({ headless: !options.headed });
    } catch (error) {
      throw new CliError(`Chromium could not launch: ${error.message}\nRun \`npx playwright install chromium\` if the browser binary is absent.`);
    }
    const outputParent = path.dirname(manifest.outputDirectory);
    await mkdir(outputParent, { recursive: true });
    stagingDirectory = await mkdtemp(path.join(outputParent, `.${path.basename(manifest.outputDirectory)}.stage-`));

    const captureDirectory = path.join(stagingDirectory, 'captures');
    const derivedDirectories = {
      thumbnail: path.join(stagingDirectory, 'derived', 'thumbnails'),
      blur: path.join(stagingDirectory, 'derived', 'blur'),
      silhouette: path.join(stagingDirectory, 'derived', 'silhouette')
    };
    await Promise.all([
      mkdir(captureDirectory, { recursive: true }),
      mkdir(derivedDirectories.thumbnail, { recursive: true }),
      mkdir(derivedDirectories.blur, { recursive: true }),
      mkdir(derivedDirectories.silhouette, { recursive: true })
    ]);
    const results = [];
    for (let index = 0; index < manifest.states.length; index += 1) {
      const state = manifest.states[index];
      const result = await captureState(browser, manifest, pageUrl, state, index, captureDirectory, derivedDirectories);
      results.push(result);
      console.log(`Captured ${state.name} → ${result.file}`);
    }

    const runtimeResults = [];
    for (const scenario of manifest.runtimeScenarios) {
      const result = await runRuntimeScenario(browser, manifest, pageUrl, scenario);
      runtimeResults.push(result);
      console.log(`Runtime ${scenario.name} → passed (${result.assertionCount} assertions)`);
    }

    const thumbnailImages = await Promise.all(results.map(async result => decodePng(await readFile(path.join(stagingDirectory, result.derived.thumbnail)))));
    await writeFile(path.join(stagingDirectory, 'contact-sheet.png'), encodePng(composeContactSheet(thumbnailImages)));

    const stableResults = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      sourceSchemaVersion: manifest.schemaVersion,
      tier: manifest.tier,
      name: manifest.name,
      sourceManifest: path.basename(manifestPath),
      url: manifest.url,
      seed: String(manifest.seed),
      epoch: manifest.epoch,
      viewport: manifest.viewport,
      reducedMotion: manifest.reducedMotion,
      colorScheme: manifest.colorScheme ?? null,
      captureSelector: manifest.captureSelector ?? null,
      derivedImages: manifest.derivedImages,
      hashPurpose: 'determinism-only',
      states: results,
      runtime: {
        capabilities: manifest.capabilities,
        scenarios: runtimeResults
      },
      contactSheet: {
        html: 'contact-sheet.html',
        png: 'contact-sheet.png'
      }
    };
    await writeFile(path.join(stagingDirectory, 'results.json'), `${JSON.stringify(stableResults, null, 2)}\n`);
    await writeFile(path.join(stagingDirectory, 'contact-sheet.html'), createContactSheet(manifest, manifest.url, results, runtimeResults));

    await promoteManagedArtifacts(stagingDirectory, manifest.outputDirectory);

    console.log(`Contact sheet PNG → ${path.join(manifest.outputDirectory, 'contact-sheet.png')}`);
    console.log(`Contact sheet → ${path.join(manifest.outputDirectory, 'contact-sheet.html')}`);
    return stableResults;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
    if (stagingDirectory) await rm(stagingDirectory, { recursive: true, force: true });
  }
}

export { comparePngBuffers, exampleManifest, normalizeManifest, runCapture };

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
