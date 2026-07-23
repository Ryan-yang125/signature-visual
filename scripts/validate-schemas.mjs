#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { validateDesignRecord } from '../skills/signature-visual/scripts/validate-design-record.mjs';
import { normalizeManifest } from '../skills/signature-visual/scripts/visual-qa.mjs';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaDirectory = path.join(projectDirectory, 'skills', 'signature-visual', 'schemas');
const manifestDirectory = path.join(projectDirectory, 'site', '_tests', 'visual-qa');

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function assertDeepEqual(actual, expected, label) {
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(`${label} differs. Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function diagnosticsAreEmpty(diagnostics) {
  return diagnostics.consoleErrors.length === 0
    && diagnostics.pageErrors.length === 0
    && diagnostics.networkErrors.length === 0;
}

function pathIsInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative.length > 0 && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

async function resolveArtifactFile(resultsDirectory, resultsDirectoryReal, reference, label) {
  requireCondition(typeof reference === 'string' && reference.length > 0, `${label} requires a non-empty relative path`);
  requireCondition(!path.isAbsolute(reference) && !path.win32.isAbsolute(reference), `${label} must stay inside its result directory: ${reference}`);
  requireCondition(
    !reference.replaceAll('\\', '/').split('/').includes('..'),
    `${label} must not contain parent traversal: ${reference}`
  );

  const candidate = path.resolve(resultsDirectory, reference);
  requireCondition(pathIsInside(resultsDirectory, candidate), `${label} escapes its result directory: ${reference}`);

  let candidateReal;
  try {
    candidateReal = await realpath(candidate);
  } catch (error) {
    throw new Error(`${label} is missing at ${candidate}: ${error.message}`);
  }
  requireCondition(pathIsInside(resultsDirectoryReal, candidateReal), `${label} resolves outside its result directory: ${reference}`);
  const information = await stat(candidateReal);
  requireCondition(information.isFile(), `${label} must reference a file: ${reference}`);
  return candidateReal;
}

async function validateResultArtifacts(results, resultsPath) {
  const resultsDirectory = path.dirname(resultsPath);
  const resultsDirectoryReal = await realpath(resultsDirectory);
  for (const state of results.states) {
    const label = `Results ${results.sourceManifest} state "${state.name}"`;
    const capturePath = await resolveArtifactFile(resultsDirectory, resultsDirectoryReal, state.file, `${label} capture`);
    const digest = createHash('sha256').update(await readFile(capturePath)).digest('hex');
    requireCondition(digest === state.sha256, `${label} capture SHA-256 differs. Expected ${state.sha256}, received ${digest}`);
    await resolveArtifactFile(resultsDirectory, resultsDirectoryReal, state.derived.thumbnail, `${label} thumbnail`);
    await resolveArtifactFile(resultsDirectory, resultsDirectoryReal, state.derived.blur, `${label} blur`);
    if (state.derived.silhouette !== null) {
      await resolveArtifactFile(resultsDirectory, resultsDirectoryReal, state.derived.silhouette, `${label} silhouette`);
    }
  }
  await resolveArtifactFile(resultsDirectory, resultsDirectoryReal, results.contactSheet.html, `Results ${results.sourceManifest} contact-sheet HTML`);
  await resolveArtifactFile(resultsDirectory, resultsDirectoryReal, results.contactSheet.png, `Results ${results.sourceManifest} contact-sheet PNG`);
}

function validateResultCorrespondence(results, normalizedManifest, resultsPath) {
  const label = `Results ${path.relative(projectDirectory, resultsPath)}`;
  assertDeepEqual(results.sourceSchemaVersion, normalizedManifest.schemaVersion, `${label} sourceSchemaVersion`);
  assertDeepEqual(results.tier, normalizedManifest.tier, `${label} tier`);
  assertDeepEqual(results.name, normalizedManifest.name, `${label} name`);
  assertDeepEqual(results.url, normalizedManifest.url, `${label} url`);
  assertDeepEqual(results.seed, String(normalizedManifest.seed), `${label} seed`);
  assertDeepEqual(results.epoch, normalizedManifest.epoch, `${label} epoch`);
  assertDeepEqual(results.viewport, normalizedManifest.viewport, `${label} viewport`);
  assertDeepEqual(results.reducedMotion, normalizedManifest.reducedMotion, `${label} reducedMotion`);
  assertDeepEqual(results.colorScheme, normalizedManifest.colorScheme ?? null, `${label} colorScheme`);
  assertDeepEqual(results.captureSelector, normalizedManifest.captureSelector ?? null, `${label} captureSelector`);
  assertDeepEqual(results.derivedImages, normalizedManifest.derivedImages, `${label} derivedImages`);

  const stateNames = results.states.map(state => state.name);
  const expectedStateNames = normalizedManifest.states.map(state => state.name);
  assertDeepEqual(stateNames, expectedStateNames, `${label} state names and order`);
  for (let index = 0; index < results.states.length; index += 1) {
    const state = results.states[index];
    const expected = normalizedManifest.states[index];
    const stateLabel = `${label} state "${state.name}"`;
    assertDeepEqual(state.progress, expected.progress, `${stateLabel} progress`);
    assertDeepEqual(state.timeMs, expected.timeMs, `${stateLabel} timeMs`);
    assertDeepEqual(
      state.pointer,
      expected.pointer.map(event => ({
        atMs: event.atMs,
        x: event.leave ? null : event.x,
        y: event.leave ? null : event.y,
        active: event.active,
        unit: event.unit,
        target: event.target
      })),
      `${stateLabel} normalized pointer evidence`
    );
  }
  assertDeepEqual(results.runtime.capabilities, normalizedManifest.capabilities, `${label} normalized capabilities`);

  const scenarioNames = results.runtime.scenarios.map(scenario => scenario.name);
  const expectedScenarioNames = normalizedManifest.runtimeScenarios.map(scenario => scenario.name);
  assertDeepEqual(scenarioNames, expectedScenarioNames, `${label} runtime scenario names and order`);

  for (let index = 0; index < results.runtime.scenarios.length; index += 1) {
    const scenario = results.runtime.scenarios[index];
    const expected = normalizedManifest.runtimeScenarios[index];
    const scenarioLabel = `${label} runtime scenario "${scenario.name}"`;
    requireCondition(scenario.passed === true, `${scenarioLabel} must pass`);
    requireCondition(scenario.assertionCount >= 1, `${scenarioLabel} must contain at least one assertion`);
    assertDeepEqual(scenario.requires, expected.requires, `${scenarioLabel} capability requirements`);
    assertDeepEqual(
      scenario.steps.map(step => step.action),
      expected.steps.map(step => step.action),
      `${scenarioLabel} step actions and order`
    );
    requireCondition(scenario.steps.every(step => step.passed === true), `${scenarioLabel} contains a failed step`);
    const resultAssertionCount = scenario.steps.filter(step => step.action.startsWith('assert')).length;
    const manifestAssertionCount = expected.steps.filter(step => step.action.startsWith('assert')).length;
    requireCondition(
      scenario.assertionCount === resultAssertionCount && scenario.assertionCount === manifestAssertionCount,
      `${scenarioLabel} assertionCount does not match its declared and recorded assertion steps`
    );
    requireCondition(diagnosticsAreEmpty(scenario.diagnostics), `${scenarioLabel} contains diagnostics`);
  }

  for (const state of results.states) {
    requireCondition(diagnosticsAreEmpty(state.diagnostics), `${label} state "${state.name}" contains diagnostics`);
    requireCondition(
      normalizedManifest.derivedImages.silhouette
        ? typeof state.derived.silhouette === 'string'
        : state.derived.silhouette === null,
      `${label} state "${state.name}" silhouette evidence differs from the normalized manifest declaration`
    );
  }

  if (results.tier === 'production') {
    for (const state of results.states) {
      requireCondition(
        state.description && Object.keys(state.description).length > 0,
        `${label} production state "${state.name}" requires non-empty hook description evidence`
      );
    }
    for (const scenario of results.runtime.scenarios) {
      requireCondition(
        scenario.description && Object.keys(scenario.description).length > 0,
        `${label} production runtime scenario "${scenario.name}" requires non-empty hook description evidence`
      );
    }
  }
}

function parseArguments(argumentsList) {
  let resultsRoot;
  let requireResults = 0;
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--results-root') {
      resultsRoot = argumentsList[index + 1];
      if (!resultsRoot || resultsRoot.startsWith('--')) throw new Error('--results-root requires a directory');
      index += 1;
    } else if (argument === '--require-results') {
      const value = Number(argumentsList[index + 1]);
      if (!Number.isInteger(value) || value < 1) throw new Error('--require-results requires a positive integer');
      requireResults = value;
      index += 1;
    } else if (argument === '--help' || argument === '-h') {
      process.stdout.write('Usage: node scripts/validate-schemas.mjs [--results-root directory --require-results count]\n');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (requireResults > 0 && !resultsRoot) throw new Error('--require-results requires --results-root');
  return { resultsRoot, requireResults };
}

function extractJsonBlock(markdown, marker, sourceName) {
  const markerIndex = markdown.indexOf(marker);
  if (markerIndex < 0) throw new Error(`${sourceName} is missing marker: ${marker}`);
  const fenceStart = markdown.indexOf('```json', markerIndex);
  if (fenceStart < 0) throw new Error(`${sourceName} is missing a JSON fence after: ${marker}`);
  const bodyStart = markdown.indexOf('\n', fenceStart) + 1;
  const fenceEnd = markdown.indexOf('\n```', bodyStart);
  if (bodyStart === 0 || fenceEnd < 0) throw new Error(`${sourceName} has an unterminated JSON fence after: ${marker}`);
  return JSON.parse(markdown.slice(bodyStart, fenceEnd));
}

function formatAjvErrors(errors = []) {
  return errors.map(error => `${error.instancePath || '<root>'} ${error.message}`).join('; ');
}

function assertSchema(validate, value, label) {
  if (!validate(value)) throw new Error(`${label} failed JSON Schema: ${formatAjvErrors(validate.errors)}`);
}

async function findResultsFiles(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findResultsFiles(entryPath));
    else if (entry.isFile() && entry.name === 'results.json') files.push(entryPath);
  }
  return files.sort();
}

const options = parseArguments(process.argv.slice(2));
const [designSchema, manifestSchema, resultsSchema] = await Promise.all([
  readFile(path.join(schemaDirectory, 'design-record.schema.json'), 'utf8').then(JSON.parse),
  readFile(path.join(schemaDirectory, 'visual-qa-manifest-v3.schema.json'), 'utf8').then(JSON.parse),
  readFile(path.join(schemaDirectory, 'visual-qa-results-v3.schema.json'), 'utf8').then(JSON.parse)
]);

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
const validateDesignSchema = ajv.compile(designSchema);
const validateManifestSchema = ajv.compile(manifestSchema);
const validateResultsSchema = ajv.compile(resultsSchema);

const designRecordReferencePath = path.join(projectDirectory, 'skills', 'signature-visual', 'references', 'design-record.md');
const designRecordReference = await readFile(designRecordReferencePath, 'utf8');
const documentedDesignRecord = extractJsonBlock(designRecordReference, '## Minimal valid record', 'design-record.md');
assertSchema(validateDesignSchema, documentedDesignRecord, 'Documented minimal design record');
const semanticDesignResult = validateDesignRecord(documentedDesignRecord);
if (!semanticDesignResult.valid) {
  throw new Error(`Documented minimal design record failed semantic validation: ${semanticDesignResult.errors.join('; ')}`);
}

const visualQaReferencePath = path.join(projectDirectory, 'skills', 'signature-visual', 'references', 'visual-qa.md');
const visualQaReference = await readFile(visualQaReferencePath, 'utf8');
const documentedManifest = extractJsonBlock(visualQaReference, 'Minimal production excerpt:', 'visual-qa.md');
assertSchema(validateManifestSchema, documentedManifest, 'Documented production manifest');
normalizeManifest(documentedManifest, path.join(projectDirectory, 'documented-production-manifest.json'));

const manifestNames = (await readdir(manifestDirectory))
  .filter(name => name.endsWith('.json'))
  .sort();
if (manifestNames.length !== 12) throw new Error(`Expected 12 public-case manifests; found ${manifestNames.length}`);
const normalizedManifests = new Map();
for (const manifestName of manifestNames) {
  const manifestPath = path.join(manifestDirectory, manifestName);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assertSchema(validateManifestSchema, manifest, `Manifest ${manifestName}`);
  normalizedManifests.set(manifestName, normalizeManifest(manifest, manifestPath));
}

let resultsCount = 0;
if (options.resultsRoot) {
  const resultsRoot = path.resolve(projectDirectory, options.resultsRoot);
  const resultsFiles = await findResultsFiles(resultsRoot);
  resultsCount = resultsFiles.length;
  if (options.requireResults > 0 && resultsCount !== options.requireResults) {
    throw new Error(`Expected exactly ${options.requireResults} generated results files under ${resultsRoot}; found ${resultsCount}`);
  }
  const claimedManifests = new Map();
  for (const resultsPath of resultsFiles) {
    const results = JSON.parse(await readFile(resultsPath, 'utf8'));
    assertSchema(validateResultsSchema, results, `Results ${path.relative(projectDirectory, resultsPath)}`);
    const normalizedManifest = normalizedManifests.get(results.sourceManifest);
    requireCondition(
      normalizedManifest,
      `Results ${path.relative(projectDirectory, resultsPath)} references sourceManifest "${results.sourceManifest}" outside the 12 public manifests`
    );
    requireCondition(
      !claimedManifests.has(results.sourceManifest),
      `Generated results duplicate sourceManifest "${results.sourceManifest}" at ${claimedManifests.get(results.sourceManifest)} and ${resultsPath}`
    );
    claimedManifests.set(results.sourceManifest, resultsPath);
    validateResultCorrespondence(results, normalizedManifest, resultsPath);
    await validateResultArtifacts(results, resultsPath);
  }
  if (options.requireResults === manifestNames.length) {
    const missingManifests = manifestNames.filter(name => !claimedManifests.has(name));
    requireCondition(
      missingManifests.length === 0,
      `Generated results are missing public manifests: ${missingManifests.join(', ')}`
    );
  }
}

process.stdout.write(`Schema contract passed: documented design record, documented production manifest, ${manifestNames.length} case manifests${options.resultsRoot ? `, ${resultsCount} generated results` : ''}.\n`);
