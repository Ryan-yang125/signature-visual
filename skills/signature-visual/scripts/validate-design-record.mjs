#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import { createCreativeCohort, createCreativeOffset } from "./creative-offset.mjs";

const CORE_FIELDS = [
  "schemaVersion",
  "tier",
  "surface",
  "thesis",
  "directions",
  "distanceMatrix",
  "selection",
  "signatureRule",
  "renderer",
  "states",
  "runtimeCapabilities",
  "revision"
];
const SELECTION_FIELDS = ["selectedDirection", "evidence", "counterEvidence", "sourceDistance", "outputDistance"];
const RUNTIME_FIELDS = ["responsive", "reducedMotion", "deterministic", "visibilityPause", "teardown"];
const DISTANCE_AXES = ["silhouette", "spatial", "material", "temporal", "interaction", "type"];
const DISTANCE_RATINGS = new Set(["same", "near", "far", "unknown"]);
const FORECAST_FIELDS = ["artifact", "renderer", "materialCausality", "temporalArchetype", "interactionMeaning"];
const BREAK_AXES = new Set(["materialCausality", "temporalArchetype", "interactionMeaning"]);
const FORECAST_DISPOSITIONS = new Set(["outside-forecast-cluster", "rebranched-outside-forecast-cluster"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isOpenValue(value) {
  return typeof value === "string" || Array.isArray(value) || isObject(value);
}

function pairKey(left, right) {
  return [left, right].sort().join("\u0000");
}

function parsePair(value) {
  if (Array.isArray(value) && value.length === 2 && value.every(isNonEmptyString)) {
    return value.map(item => item.trim());
  }
  if (typeof value === "string") {
    const parts = value.split("↔").map(item => item.trim());
    if (parts.length === 2 && parts.every(isNonEmptyString)) return parts;
  }
  return null;
}

function validateCohortMetadata(metadata, offset, errors) {
  const base = "record.selection.noveltyGuard.cohort";
  if (!isObject(metadata)) {
    errors.push(`${base}: expected an object with baseSeed, index, and size`);
    return;
  }
  const unexpectedFields = Object.keys(metadata).filter(field => !["baseSeed", "index", "size"].includes(field));
  if (unexpectedFields.length > 0) {
    errors.push(`${base}: unexpected fields ${unexpectedFields.map(field => `"${field}"`).join(", ")}`);
  }

  let canReplay = true;
  if (!isNonEmptyString(metadata.baseSeed)) {
    errors.push(`${base}.baseSeed: expected a non-empty string`);
    canReplay = false;
  }
  if (!Number.isInteger(metadata.index) || metadata.index < 0) {
    errors.push(`${base}.index: expected a zero-based non-negative integer`);
    canReplay = false;
  }
  if (!Number.isInteger(metadata.size) || metadata.size < 1 || metadata.size > 12) {
    errors.push(`${base}.size: expected an integer from 1 to 12`);
    canReplay = false;
  }
  if (Number.isInteger(metadata.index) && Number.isInteger(metadata.size) && metadata.index >= metadata.size) {
    errors.push(`${base}.index: expected a value below cohort size ${metadata.size}`);
    canReplay = false;
  }
  if (!canReplay) return;

  const cohort = createCreativeCohort(metadata.size, metadata.baseSeed);
  if (metadata.baseSeed !== cohort.baseSeed) {
    errors.push(`${base}.baseSeed: expected the exact normalized cohort base seed "${cohort.baseSeed}"`);
  }
  const expectedOffset = cohort.offsets[metadata.index];
  if (!isObject(offset)) return;
  if (offset.seed !== expectedOffset.seed) {
    errors.push(`record.selection.noveltyGuard.creativeOffset.seed: expected cohort seed "${expectedOffset.seed}" at index ${metadata.index}`);
  }
  if (!isDeepStrictEqual(offset, expectedOffset)) {
    errors.push("record.selection.noveltyGuard.creativeOffset: value must exactly match the regenerated cohort offset for baseSeed, index, and size");
  }
}

function validateCore(record, errors) {
  if (!isObject(record)) {
    errors.push("record: expected a JSON object");
    return false;
  }

  for (const field of CORE_FIELDS) {
    if (!hasOwn(record, field)) errors.push(`record.${field}: required core field is missing`);
  }
  if (record.schemaVersion !== 3) errors.push("record.schemaVersion: expected 3");
  if (!["landmark", "section", "refine"].includes(record.tier)) {
    errors.push('record.tier: expected "landmark", "section", or "refine"');
  }
  if (!(isNonEmptyString(record.surface) || isObject(record.surface))) {
    errors.push("record.surface: expected a non-empty string or an object");
  }
  const thesisIsStringArray = Array.isArray(record.thesis)
    && record.thesis.length > 0
    && record.thesis.every(item => typeof item === "string");
  if (!(isNonEmptyString(record.thesis) || thesisIsStringArray || isObject(record.thesis))) {
    errors.push("record.thesis: expected a non-empty string, a non-empty string array, or an object");
  }
  if (!Array.isArray(record.directions) || record.directions.length === 0) {
    errors.push("record.directions: expected a non-empty array");
  } else {
    record.directions.forEach((direction, index) => {
      if (!isObject(direction)) errors.push(`record.directions[${index}]: expected an object`);
      else if (!isNonEmptyString(direction.name)) errors.push(`record.directions[${index}].name: expected a non-empty string`);
    });
  }
  if (!Array.isArray(record.distanceMatrix)) errors.push("record.distanceMatrix: expected an array");
  else {
    record.distanceMatrix.forEach((comparison, index) => {
      if (!isOpenValue(comparison)) errors.push(`record.distanceMatrix[${index}]: expected a string, array, or object`);
    });
  }
  if (!isObject(record.selection)) {
    errors.push("record.selection: expected an object");
  } else {
    for (const field of SELECTION_FIELDS) {
      if (!hasOwn(record.selection, field)) errors.push(`record.selection.${field}: required selection field is missing`);
    }
    if (!isNonEmptyString(record.selection.selectedDirection)) {
      errors.push("record.selection.selectedDirection: expected a non-empty string");
    }
    if (!Array.isArray(record.selection.evidence)) errors.push("record.selection.evidence: expected an array");
    if (!Array.isArray(record.selection.counterEvidence) || record.selection.counterEvidence.length === 0) {
      errors.push("record.selection.counterEvidence: expected a non-empty array");
    }
    for (const field of ["sourceDistance", "outputDistance"]) {
      const value = record.selection[field];
      if (!(isNonEmptyString(value) || isObject(value))) {
        errors.push(`record.selection.${field}: expected a non-empty string or an object`);
      }
    }
  }
  if (!isOpenValue(record.signatureRule)) errors.push("record.signatureRule: expected a string, array, or object");
  if (!isOpenValue(record.renderer)) errors.push("record.renderer: expected a string, array, or object");
  if (!Array.isArray(record.states) || record.states.length === 0) errors.push("record.states: expected a non-empty array");
  else {
    record.states.forEach((state, index) => {
      if (!(typeof state === "string" || isObject(state))) errors.push(`record.states[${index}]: expected a string or object`);
    });
  }
  if (!isObject(record.runtimeCapabilities)) {
    errors.push("record.runtimeCapabilities: expected an object");
  } else {
    for (const field of RUNTIME_FIELDS) {
      if (!hasOwn(record.runtimeCapabilities, field)) {
        errors.push(`record.runtimeCapabilities.${field}: required runtime capability is missing`);
      } else {
        const value = record.runtimeCapabilities[field];
        if (!(typeof value === "boolean" || typeof value === "string" || isObject(value))) {
          errors.push(`record.runtimeCapabilities.${field}: expected a boolean, string, or object`);
        }
      }
    }
  }
  if (!isOpenValue(record.revision)) errors.push("record.revision: expected a string, array, or object");
  return true;
}

function buildDirectionIndex(directions, errors) {
  const aliases = new Map();
  const identities = [];
  directions.forEach((direction, index) => {
    if (!isObject(direction) || !isNonEmptyString(direction.name)) return;
    const identity = isNonEmptyString(direction.id) ? direction.id.trim() : direction.name.trim();
    identities.push(identity);
    for (const alias of [direction.id, direction.name].filter(isNonEmptyString).map(value => value.trim())) {
      if (aliases.has(alias) && aliases.get(alias) !== identity) {
        errors.push(`record.directions[${index}]: alias "${alias}" is shared by multiple directions`);
      } else {
        aliases.set(alias, identity);
      }
    }
  });
  if (new Set(identities).size !== identities.length) errors.push("record.directions: direction ids or fallback names must be unique");
  return { aliases, identities };
}

function validateLandmarkMatrix(record, aliases, identities, errors) {
  const expectedPairs = new Set();
  for (let left = 0; left < identities.length; left += 1) {
    for (let right = left + 1; right < identities.length; right += 1) {
      expectedPairs.add(pairKey(identities[left], identities[right]));
    }
  }

  const seenPairs = new Set();
  record.distanceMatrix.forEach((comparison, index) => {
    const base = `record.distanceMatrix[${index}]`;
    if (!isObject(comparison)) {
      errors.push(`${base}: landmark comparisons must be objects`);
      return;
    }
    const parsed = parsePair(comparison.pair);
    if (!parsed) {
      errors.push(`${base}.pair: expected two direction ids or names joined by "↔"`);
      return;
    }
    const resolved = parsed.map(alias => aliases.get(alias));
    if (resolved.some(identity => identity === undefined)) {
      const unknown = parsed.filter((alias, pairIndex) => resolved[pairIndex] === undefined);
      errors.push(`${base}.pair: unknown direction ${unknown.map(value => `"${value}"`).join(", ")}`);
      return;
    }
    if (resolved[0] === resolved[1]) {
      errors.push(`${base}.pair: a direction cannot be compared with itself`);
      return;
    }
    const key = pairKey(resolved[0], resolved[1]);
    if (!expectedPairs.has(key)) {
      errors.push(`${base}.pair: pair is outside the landmark candidate set`);
      return;
    }
    if (seenPairs.has(key)) errors.push(`${base}.pair: duplicate candidate pair`);
    seenPairs.add(key);

    if (!isObject(comparison.axes)) {
      errors.push(`${base}.axes: expected an object with all six structural axes`);
      return;
    }
    let farCount = 0;
    for (const axis of DISTANCE_AXES) {
      const rating = comparison.axes[axis];
      if (!DISTANCE_RATINGS.has(rating)) {
        errors.push(`${base}.axes.${axis}: expected same, near, far, or unknown`);
      }
      if (rating === "far") farCount += 1;
    }
    if (farCount < 4) errors.push(`${base}.axes: landmark pair needs at least four far ratings; found ${farCount}`);
  });

  for (const key of expectedPairs) {
    if (!seenPairs.has(key)) {
      const [left, right] = key.split("\u0000");
      errors.push(`record.distanceMatrix: missing candidate pair "${left} ↔ ${right}"`);
    }
  }
  if (record.distanceMatrix.length !== expectedPairs.size) {
    errors.push(`record.distanceMatrix: expected exactly ${expectedPairs.size} candidate pairs; found ${record.distanceMatrix.length}`);
  }
}

function validateLandmark(record, errors) {
  if (!Array.isArray(record.directions) || !Array.isArray(record.distanceMatrix) || !isObject(record.selection)) return;
  const origins = new Set(record.directions.filter(isObject).map(direction => direction.origin));
  for (const origin of ["anti-literal", "offset-taxonomy-external"]) {
    if (!origins.has(origin)) errors.push(`record.directions: landmark directions require origin "${origin}"`);
  }

  const { aliases, identities } = buildDirectionIndex(record.directions, errors);
  validateLandmarkMatrix(record, aliases, identities, errors);

  const selected = record.selection.selectedDirection;
  if (isNonEmptyString(selected) && !aliases.has(selected.trim())) {
    errors.push(`record.selection.selectedDirection: "${selected}" does not match a direction id or name`);
  }

  const forecast = record.selection.convergenceForecast;
  if (!isObject(forecast)) {
    errors.push("record.selection.convergenceForecast: landmark selection requires an object");
  } else {
    for (const field of FORECAST_FIELDS) {
      if (!isNonEmptyString(forecast[field])) {
        errors.push(`record.selection.convergenceForecast.${field}: expected a non-empty string`);
      }
    }
  }

  const axes = record.selection.clusterBreakAxes;
  const uniqueAxes = Array.isArray(axes) ? new Set(axes) : new Set();
  if (!Array.isArray(axes)) {
    errors.push("record.selection.clusterBreakAxes: landmark selection requires an array");
  } else {
    axes.forEach((axis, index) => {
      if (!BREAK_AXES.has(axis)) errors.push(`record.selection.clusterBreakAxes[${index}]: unsupported break axis "${axis}"`);
    });
    if (uniqueAxes.size !== axes.length) errors.push("record.selection.clusterBreakAxes: break axes must be unique");
    if (uniqueAxes.size < 2) errors.push(`record.selection.clusterBreakAxes: expected at least two unique break axes; found ${uniqueAxes.size}`);
  }

  const disposition = record.selection.forecastDisposition;
  if (!FORECAST_DISPOSITIONS.has(disposition)) {
    errors.push('record.selection.forecastDisposition: expected "outside-forecast-cluster" or "rebranched-outside-forecast-cluster"');
  }
  if (disposition === "rebranched-outside-forecast-cluster" && !isNonEmptyString(record.selection.rebranchEvidence)) {
    errors.push("record.selection.rebranchEvidence: required for a rebranched forecast disposition");
  }

  const noveltyGuard = record.selection.noveltyGuard;
  if (!isObject(noveltyGuard)) {
    errors.push("record.selection.noveltyGuard: landmark selection requires an object");
    return;
  }
  for (const field of ["obviousAttractors", "shadowBaseline", "creativeOffset", "winnerChallenge"]) {
    if (!hasOwn(noveltyGuard, field)) errors.push(`record.selection.noveltyGuard.${field}: required landmark field is missing`);
  }
  if (!Array.isArray(noveltyGuard.obviousAttractors) || noveltyGuard.obviousAttractors.length === 0
    || !noveltyGuard.obviousAttractors.every(isNonEmptyString)) {
    errors.push("record.selection.noveltyGuard.obviousAttractors: expected a non-empty array of non-empty strings");
  }
  if (!(isNonEmptyString(noveltyGuard.shadowBaseline) || isObject(noveltyGuard.shadowBaseline))) {
    errors.push("record.selection.noveltyGuard.shadowBaseline: expected a non-empty string or an object");
  }

  const offset = noveltyGuard.creativeOffset;
  if (!isObject(offset)) {
    errors.push("record.selection.noveltyGuard.creativeOffset: expected an object copied from createCreativeOffset(seed)");
  } else if (!isNonEmptyString(offset.seed)) {
    errors.push("record.selection.noveltyGuard.creativeOffset.seed: expected a non-empty string");
  } else {
    const expectedOffset = createCreativeOffset(offset.seed);
    if (!isDeepStrictEqual(offset, expectedOffset)) {
      errors.push("record.selection.noveltyGuard.creativeOffset: value does not exactly reproduce createCreativeOffset(seed), including schemaVersion 3 causal-route and representation fields");
    }
  }

  if (hasOwn(noveltyGuard, "cohort")) {
    validateCohortMetadata(noveltyGuard.cohort, offset, errors);
  }

  const winnerChallenge = noveltyGuard.winnerChallenge;
  if (!isObject(winnerChallenge)) {
    errors.push("record.selection.noveltyGuard.winnerChallenge: expected an object");
    return;
  }
  if (!isNonEmptyString(winnerChallenge.selectionChallengeEvidence)) {
    errors.push("record.selection.noveltyGuard.winnerChallenge.selectionChallengeEvidence: expected a non-empty string");
  }
  const breakEvidence = winnerChallenge.breakEvidence;
  if (!Array.isArray(breakEvidence)) {
    errors.push("record.selection.noveltyGuard.winnerChallenge.breakEvidence: expected an array matching clusterBreakAxes");
    return;
  }
  const evidenceAxes = [];
  breakEvidence.forEach((evidence, index) => {
    const base = `record.selection.noveltyGuard.winnerChallenge.breakEvidence[${index}]`;
    if (!isObject(evidence)) {
      errors.push(`${base}: expected an object`);
      return;
    }
    if (!BREAK_AXES.has(evidence.axis)) errors.push(`${base}.axis: unsupported break axis "${evidence.axis}"`);
    else evidenceAxes.push(evidence.axis);
    for (const field of ["forecast", "winner", "visibleEvidence"]) {
      if (!isNonEmptyString(evidence[field])) errors.push(`${base}.${field}: expected a non-empty string`);
    }
  });
  const evidenceSet = new Set(evidenceAxes);
  if (evidenceSet.size !== evidenceAxes.length) {
    errors.push("record.selection.noveltyGuard.winnerChallenge.breakEvidence: each break axis must appear exactly once");
  }
  const missingEvidence = [...uniqueAxes].filter(axis => BREAK_AXES.has(axis) && !evidenceSet.has(axis));
  const extraEvidence = [...evidenceSet].filter(axis => !uniqueAxes.has(axis));
  if (missingEvidence.length > 0) {
    errors.push(`record.selection.noveltyGuard.winnerChallenge.breakEvidence: missing evidence for ${missingEvidence.join(", ")}`);
  }
  if (extraEvidence.length > 0) {
    errors.push(`record.selection.noveltyGuard.winnerChallenge.breakEvidence: evidence axes absent from clusterBreakAxes: ${extraEvidence.join(", ")}`);
  }
}

export function validateDesignRecord(record) {
  const errors = [];
  if (!validateCore(record, errors)) return { valid: false, errors };
  if (record.tier === "landmark") validateLandmark(record, errors);
  return { valid: errors.length === 0, errors };
}

function printHelp() {
  process.stdout.write("Usage: node validate-design-record.mjs <record.json> [record.json ...]\n");
}

function runCli(argumentsList) {
  if (argumentsList.includes("--help") || argumentsList.includes("-h")) {
    printHelp();
    return 0;
  }
  if (argumentsList.length === 0) {
    process.stderr.write("Design record validation error: provide at least one JSON record path\n");
    printHelp();
    return 1;
  }

  let failed = false;
  for (const inputPath of argumentsList) {
    const recordPath = path.resolve(inputPath);
    let record;
    try {
      record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
    } catch (error) {
      failed = true;
      process.stderr.write(`${inputPath}: unable to read valid JSON: ${error.message}\n`);
      continue;
    }
    const result = validateDesignRecord(record);
    if (result.valid) {
      process.stdout.write(`${inputPath}: valid design record\n`);
    } else {
      failed = true;
      process.stderr.write(`${inputPath}: invalid design record\n`);
      result.errors.forEach(error => process.stderr.write(`  - ${error}\n`));
    }
  }
  return failed ? 1 : 0;
}

const isCommandLine = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) process.exitCode = runCli(process.argv.slice(2));
