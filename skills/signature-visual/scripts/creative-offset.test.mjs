#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createCreativeCohort, createCreativeOffset } from "./creative-offset.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "creative-offset.mjs");

const first = createCreativeOffset("common-room-a");
const repeated = createCreativeOffset("common-room-a");
const second = createCreativeOffset("common-room-b");

assert.deepEqual(first, repeated, "An explicit creative seed must reproduce the same offset.");
assert.notDeepEqual(first, second, "Different creative seeds should produce different offsets.");
assert.equal(first.schemaVersion, 3);
assert.equal(first.quarantine.length, 3);
assert.deepEqual(Object.keys(first).sort(), [
  "causalRoute",
  "counterfactual",
  "evidenceMove",
  "interactionPressure",
  "quarantine",
  "representationId",
  "representationPressure",
  "representationQuarantine",
  "routeId",
  "schemaVersion",
  "seed",
  "selectionChallenge",
  "spatialPressure",
  "substancePressure",
  "temporalPressure"
].sort(), "A single V3 offset must expose the complete stable field contract.");
for (const key of [
  "seed",
  "routeId",
  "causalRoute",
  "substancePressure",
  "temporalPressure",
  "interactionPressure",
  "representationId",
  "representationPressure",
  "representationQuarantine",
  "evidenceMove",
  "spatialPressure",
  "counterfactual",
  "selectionChallenge"
]) {
  assert.equal(typeof first[key], "string", `${key} must be a string`);
  assert.ok(first[key].length > 12, `${key} must carry a useful constraint`);
}
assert.notEqual(first.routeId, second.routeId, "Known distinct seeds must select different causal route bundles.");
for (const key of ["causalRoute", "substancePressure", "temporalPressure", "interactionPressure"]) {
  assert.notEqual(first[key], second[key], `${key} must vary with the selected route bundle`);
}

const knownRouteCorpus = new Set(
  Array.from({ length: 24 }, (_, index) => createCreativeOffset(`route-coverage-${index}`).routeId)
);
assert.equal(knownRouteCorpus.size, 12, "The known seed corpus must exercise all twelve causal route bundles.");

const trimmed = createCreativeOffset("  common-room-a  ");
assert.deepEqual(trimmed, first, "The stored normalized seed must replay the same offset.");
assert.throws(() => createCreativeOffset(""), /cannot be empty/);
assert.throws(() => createCreativeOffset(7), /must be a string/);

const randomFirst = createCreativeOffset();
const randomSecond = createCreativeOffset();
assert.match(randomFirst.seed, /^[a-f0-9]{24}$/);
assert.notEqual(randomFirst.seed, randomSecond.seed, "Default calls must draw fresh random seeds.");

const cohort = createCreativeCohort(12, "blind-convergence-replay");
const repeatedCohort = createCreativeCohort(12, "blind-convergence-replay");
assert.deepEqual(cohort, repeatedCohort, "An explicit cohort base seed must reproduce the same roster.");
assert.equal(cohort.schemaVersion, 3);
assert.equal(cohort.baseSeed, "blind-convergence-replay");
assert.equal(cohort.count, 12);
assert.equal(cohort.offsets.length, 12);
assert.equal(new Set(cohort.offsets.map(offset => offset.seed)).size, 12, "Cohort seeds must be pairwise unique.");
assert.equal(new Set(cohort.offsets.map(offset => offset.routeId)).size, 12, "Cohort causal routes must be pairwise unique.");
assert.equal(new Set(cohort.offsets.map(offset => offset.representationId)).size, 12, "Cohort representation modes must be pairwise unique.");
for (const offset of cohort.offsets) {
  assert.deepEqual(offset, createCreativeOffset(offset.seed), "Every cohort entry must replay as an ordinary creative offset.");
}

const randomCohortFirst = createCreativeCohort(3);
const randomCohortSecond = createCreativeCohort(3);
assert.match(randomCohortFirst.baseSeed, /^[a-f0-9]{24}$/);
assert.notEqual(randomCohortFirst.baseSeed, randomCohortSecond.baseSeed, "Default cohort calls must draw fresh base seeds.");
assert.throws(() => createCreativeCohort(0, "invalid"), /integer from 1 to 12/);
assert.throws(() => createCreativeCohort(13, "invalid"), /integer from 1 to 12/);
assert.throws(() => createCreativeCohort(1.5, "invalid"), /integer from 1 to 12/);
assert.throws(() => createCreativeCohort("3", "invalid"), /integer from 1 to 12/);
assert.throws(() => createCreativeCohort(3, ""), /cannot be empty/);
assert.throws(() => createCreativeCohort(3, 7), /must be a string/);

const cliRun = spawnSync(process.execPath, [cli, "--seed", "common-room-a", "--compact"], { encoding: "utf8" });
assert.equal(cliRun.status, 0, cliRun.stderr);
assert.deepEqual(JSON.parse(cliRun.stdout), first);

const randomRun = spawnSync(process.execPath, [cli, "--compact"], { encoding: "utf8" });
assert.equal(randomRun.status, 0, randomRun.stderr);
const randomOffset = JSON.parse(randomRun.stdout);
assert.match(randomOffset.seed, /^[a-f0-9]{24}$/);

const cohortRun = spawnSync(process.execPath, [cli, "--cohort", "4", "--seed", "cli-cohort", "--compact"], { encoding: "utf8" });
assert.equal(cohortRun.status, 0, cohortRun.stderr);
assert.deepEqual(JSON.parse(cohortRun.stdout), createCreativeCohort(4, "cli-cohort"));

const randomCohortRun = spawnSync(process.execPath, [cli, "--cohort", "2", "--compact"], { encoding: "utf8" });
assert.equal(randomCohortRun.status, 0, randomCohortRun.stderr);
const randomCohort = JSON.parse(randomCohortRun.stdout);
assert.match(randomCohort.baseSeed, /^[a-f0-9]{24}$/);
assert.equal(randomCohort.count, 2);

const badRun = spawnSync(process.execPath, [cli, "--unknown"], { encoding: "utf8" });
assert.notEqual(badRun.status, 0);
assert.match(badRun.stderr, /Unknown argument/);

const missingSeedRun = spawnSync(process.execPath, [cli, "--seed"], { encoding: "utf8" });
assert.notEqual(missingSeedRun.status, 0);
assert.match(missingSeedRun.stderr, /--seed requires a value/);

const missingCohortRun = spawnSync(process.execPath, [cli, "--cohort"], { encoding: "utf8" });
assert.notEqual(missingCohortRun.status, 0);
assert.match(missingCohortRun.stderr, /--cohort requires a value/);

const invalidCohortRun = spawnSync(process.execPath, [cli, "--cohort", "13"], { encoding: "utf8" });
assert.notEqual(invalidCohortRun.status, 0);
assert.match(invalidCohortRun.stderr, /integer from 1 to 12/);

process.stdout.write("Creative offset self-test passed: V3 representation fields, cohort uniqueness and replay, random defaults, CLI, and invalid arguments.\n");
