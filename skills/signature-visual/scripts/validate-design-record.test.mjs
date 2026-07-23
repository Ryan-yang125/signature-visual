#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createCreativeCohort, createCreativeOffset } from "./creative-offset.mjs";
import { validateDesignRecord } from "./validate-design-record.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "validate-design-record.mjs");

function validLandmark() {
  const seed = "design-record-validator";
  return {
    schemaVersion: 3,
    tier: "landmark",
    surface: { owner: "#hero" },
    thesis: "A local decision leaves inspectable consequences.",
    directions: [
      { id: "held-trace", name: "Held trace", origin: "anti-literal" },
      { id: "agency-seam", name: "Agency seam", origin: "offset-taxonomy-external" },
      { id: "audit-field", name: "Audit field", origin: "evidence-derived" }
    ],
    distanceMatrix: [
      {
        pair: "held-trace ↔ agency-seam",
        axes: { silhouette: "far", spatial: "far", material: "far", temporal: "far", interaction: "near", type: "near" }
      },
      {
        pair: "held-trace ↔ audit-field",
        axes: { silhouette: "far", spatial: "far", material: "near", temporal: "far", interaction: "far", type: "same" }
      },
      {
        pair: "agency-seam ↔ audit-field",
        axes: { silhouette: "far", spatial: "near", material: "far", temporal: "far", interaction: "far", type: "unknown" }
      }
    ],
    selection: {
      selectedDirection: "agency-seam",
      evidence: ["The seam makes delegated agency visible."],
      counterEvidence: ["The held frame needs a strong crop."],
      sourceDistance: { verdict: "far" },
      outputDistance: { verdict: "far" },
      convergenceForecast: {
        artifact: "node network",
        renderer: "Canvas",
        materialCausality: "Connections glow with activity.",
        temporalArchetype: "Ambient pulse.",
        interactionMeaning: "Pointer reveals nodes."
      },
      clusterBreakAxes: ["materialCausality", "interactionMeaning"],
      forecastDisposition: "outside-forecast-cluster",
      noveltyGuard: {
        obviousAttractors: ["node network"],
        shadowBaseline: "A glowing device graph.",
        creativeOffset: createCreativeOffset(seed),
        winnerChallenge: {
          selectionChallengeEvidence: "The causal seam remains legible without product nouns.",
          breakEvidence: [
            {
              axis: "materialCausality",
              forecast: "Connections glow.",
              winner: "Ownership relocates a persistent seam.",
              visibleEvidence: "Transferred regions retain their former attachment."
            },
            {
              axis: "interactionMeaning",
              forecast: "Pointer reveals nodes.",
              winner: "Input delegates a bounded region.",
              visibleEvidence: "The governing relation changes after delegation."
            }
          ]
        }
      }
    },
    signatureRule: "Agency relocates one persistent seam.",
    renderer: { lead: "svg" },
    states: ["desktop:held", "mobile:held"],
    runtimeCapabilities: {
      responsive: true,
      reducedMotion: true,
      deterministic: true,
      visibilityPause: true,
      teardown: true
    },
    revision: "First verified pass."
  };
}

function clone(value) {
  return structuredClone(value);
}

function expectFailure(record, pattern) {
  const result = validateDesignRecord(record);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), pattern);
}

assert.deepEqual(validateDesignRecord(validLandmark()), { valid: true, errors: [] });

const cohortLandmark = validLandmark();
const cohort = createCreativeCohort(4, "validator-cohort");
cohortLandmark.selection.noveltyGuard.creativeOffset = cohort.offsets[2];
cohortLandmark.selection.noveltyGuard.cohort = {
  baseSeed: cohort.baseSeed,
  index: 2,
  size: cohort.count
};
assert.deepEqual(validateDesignRecord(cohortLandmark), { valid: true, errors: [] });

const tamperedCohortBaseSeed = clone(cohortLandmark);
tamperedCohortBaseSeed.selection.noveltyGuard.cohort.baseSeed = "changed-cohort";
expectFailure(tamperedCohortBaseSeed, /must exactly match the regenerated cohort offset/);

const tamperedCohortIndex = clone(cohortLandmark);
tamperedCohortIndex.selection.noveltyGuard.cohort.index = 1;
expectFailure(tamperedCohortIndex, /must exactly match the regenerated cohort offset/);

const tamperedCohortSize = clone(cohortLandmark);
tamperedCohortSize.selection.noveltyGuard.cohort.size = 3;
expectFailure(tamperedCohortSize, /must exactly match the regenerated cohort offset/);

const tamperedCohortOffset = clone(cohortLandmark);
tamperedCohortOffset.selection.noveltyGuard.creativeOffset = createCreativeOffset("standalone-substitution");
expectFailure(tamperedCohortOffset, /must exactly match the regenerated cohort offset/);

const invalidCohortIndex = clone(cohortLandmark);
invalidCohortIndex.selection.noveltyGuard.cohort.index = 4;
expectFailure(invalidCohortIndex, /expected a value below cohort size 4/);

const expandedCohortMetadata = clone(cohortLandmark);
expandedCohortMetadata.selection.noveltyGuard.cohort.seed = cohort.offsets[2].seed;
expectFailure(expandedCohortMetadata, /unexpected fields "seed"/);

const mismatchedOffset = validLandmark();
mismatchedOffset.selection.noveltyGuard.creativeOffset.causalRoute = "Changed route.";
expectFailure(mismatchedOffset, /does not exactly reproduce createCreativeOffset/);

const missingOrigins = validLandmark();
missingOrigins.directions[0].origin = "evidence-derived";
missingOrigins.directions[1].origin = "refinement";
expectFailure(missingOrigins, /require origin "anti-literal"[\s\S]*require origin "offset-taxonomy-external"/);

const incompleteMatrix = validLandmark();
incompleteMatrix.distanceMatrix.pop();
expectFailure(incompleteMatrix, /missing candidate pair "agency-seam ↔ audit-field"/);

const weakMatrix = validLandmark();
weakMatrix.distanceMatrix[0].axes.temporal = "near";
expectFailure(weakMatrix, /needs at least four far ratings; found 3/);

const oneBreakAxis = validLandmark();
oneBreakAxis.selection.clusterBreakAxes = ["materialCausality"];
oneBreakAxis.selection.noveltyGuard.winnerChallenge.breakEvidence = [
  clone(oneBreakAxis.selection.noveltyGuard.winnerChallenge.breakEvidence[0])
];
expectFailure(oneBreakAxis, /expected at least two unique break axes; found 1/);

const missingBreakEvidence = validLandmark();
missingBreakEvidence.selection.noveltyGuard.winnerChallenge.breakEvidence.pop();
expectFailure(missingBreakEvidence, /missing evidence for interactionMeaning/);

const adaptiveSection = validLandmark();
adaptiveSection.tier = "section";
delete adaptiveSection.selection.convergenceForecast;
delete adaptiveSection.selection.clusterBreakAxes;
delete adaptiveSection.selection.forecastDisposition;
delete adaptiveSection.selection.noveltyGuard;
adaptiveSection.directions = [adaptiveSection.directions[0]];
adaptiveSection.distanceMatrix = [];
assert.equal(validateDesignRecord(adaptiveSection).valid, true, "Section records keep adaptive search depth.");

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "signature-visual-record-"));
try {
  const validPath = path.join(tempDirectory, "valid.json");
  const invalidPath = path.join(tempDirectory, "invalid.json");
  fs.writeFileSync(validPath, JSON.stringify(validLandmark()));
  fs.writeFileSync(invalidPath, JSON.stringify(missingBreakEvidence));

  const validRun = spawnSync(process.execPath, [cli, validPath], { encoding: "utf8" });
  assert.equal(validRun.status, 0, validRun.stderr);
  assert.match(validRun.stdout, /valid design record/);

  const mixedRun = spawnSync(process.execPath, [cli, validPath, invalidPath], { encoding: "utf8" });
  assert.equal(mixedRun.status, 1);
  assert.match(mixedRun.stdout, /valid design record/);
  assert.match(mixedRun.stderr, /invalid design record[\s\S]*missing evidence for interactionMeaning/);

  const noPathRun = spawnSync(process.execPath, [cli], { encoding: "utf8" });
  assert.equal(noPathRun.status, 1);
  assert.match(noPathRun.stderr, /provide at least one JSON record path/);
} finally {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
}

process.stdout.write("Design record validator self-test passed: landmark gates, ordinary and cohort replay, tamper detection, adaptive tiers, and CLI exit codes.\n");
