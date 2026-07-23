#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const evidenceMoves = [
  "Use only verbs and relationships from the brief; quarantine every concrete product noun.",
  "Start from who grants, loses, contests, or inherits control.",
  "Promote the least visible lifecycle state into the primary evidence.",
  "Let one operational constraint determine the visual geometry.",
  "Treat missing, revoked, stale, or deleted data as generative material.",
  "Translate a disagreement before translating the successful state.",
  "Use the product's unit of accountability in place of its object inventory.",
  "Start from a consequence that persists after the primary action.",
  "Make one hidden dependency perceptible through its failure condition.",
  "Use real language fragments as measured material inside the visual.",
  "Reverse which participant owns foreground and background.",
  "Express the scale gap between one local action and its shared outcome."
];

const spatialPressures = [
  "Give negative space a causal role that changes under the governing rule.",
  "Keep the source outside the crop and show only its bounded consequences.",
  "Let content reallocate the page composition instead of occupying a visual container.",
  "Use one migrating boundary whose ownership changes visibly.",
  "Build the silhouette from unequal obligations rather than equal modules.",
  "Make a missing element determine the position of every visible element.",
  "Put the decisive relation at the edge and reserve the center as evidence.",
  "Use nested scales so one local state changes an architectural frame.",
  "Let typography carry topology while marks provide only consequence.",
  "Organize the frame around a useful obstruction or withheld region.",
  "Split the surface by agency, then allow the primary action to renegotiate the split.",
  "Keep one stable object while its surrounding coordinate system changes."
];

const counterfactuals = [
  "Assume every supplied brand color disappears; identity must survive in structure.",
  "Assume pointer input is unavailable; the held frame and primary action carry the thesis.",
  "Assume motion is unavailable; causality must remain visible in one state.",
  "Assume the headline is masked; the visual still has to identify the product behavior.",
  "Assume only the malformed or disputed data state is available.",
  "Assume the 390px composition is designed first and desktop expands from it.",
  "Assume the primary action is irreversible and must leave inspectable evidence.",
  "Assume the system needs a second structural variation for another product section.",
  "Assume all familiar nodes, routes, spheres, waves, and cards are unavailable.",
  "Assume the visitor sees only a 160px silhouette before deciding whether to inspect."
];

const selectionChallenges = [
  "The winner must stay product-specific after removing every noun repeated in the product name.",
  "The winner must defeat the natural baseline on silhouette and interaction meaning.",
  "The winner must explain a product consequence that the obvious metaphor cannot show.",
  "The winner must support a second non-cosmetic variation without changing renderer.",
  "The winner must remain legible in blur while its nearest familiar demo becomes unrecognizable.",
  "The winner must turn the primary action into a structural state change.",
  "The winner must preserve meaning in a held mobile frame and a reduced-motion state.",
  "The winner must survive an independent attempt to relabel it for an unrelated product."
];

const causalRouteBundles = [
  {
    routeId: "accrued-obligation",
    causalRoute: "Let each accepted action add an obligation that changes what later states must carry.",
    substancePressure: "Material coherence increases where obligations agree and retains strain where they conflict.",
    temporalPressure: "Use cumulative time: each event alters the conditions of the next and leaves a readable remainder.",
    interactionPressure: "Input accepts, transfers, or contests an obligation; its aftermath must remain inspectable."
  },
  {
    routeId: "renegotiated-boundary",
    causalRoute: "Let changes in agency relocate the boundary between held, shared, and excluded states.",
    substancePressure: "Continuity follows current ownership, while transferred regions preserve evidence of their earlier attachment.",
    temporalPressure: "Use finite-state negotiation with a held state before transfer and a settled state after it.",
    interactionPressure: "Input claims, releases, or delegates a bounded region and visibly changes its governing relation."
  },
  {
    routeId: "confidence-decay",
    causalRoute: "Let declining confidence remove structural support in proportion to unresolved evidence.",
    substancePressure: "Substance loses cohesion at unsupported relations while verified relations retain their load-bearing role.",
    temporalPressure: "Use paced decay with explicit refresh events that restore only the evidence they actually verify.",
    interactionPressure: "Inspection reveals the cause of decay and can request verification without cosmetically restoring confidence."
  },
  {
    routeId: "reserved-capacity",
    causalRoute: "Let withheld capacity govern how every active element allocates space and effort.",
    substancePressure: "Absence behaves as a load-bearing condition; occupied matter compresses or redirects around the reserve.",
    temporalPressure: "Use thresholded release: capacity stays withheld until a named condition makes it available.",
    interactionPressure: "Input commits, cancels, or reallocates capacity and exposes the downstream constraint it changes."
  },
  {
    routeId: "propagated-consequence",
    causalRoute: "Let one local decision change the allowable states of distant dependents.",
    substancePressure: "Stress, continuity, or fracture follows dependency strength and persists at every affected relation.",
    temporalPressure: "Use event-response propagation with latency derived from dependency depth and a stable aftermath.",
    interactionPressure: "Input initiates one local decision; remote changes reveal reach, delay, and responsibility."
  },
  {
    routeId: "reconciled-disagreement",
    causalRoute: "Let incompatible accounts create a visible condition that only evidence can reconcile.",
    substancePressure: "Agreement joins substance; unresolved claims produce durable seams whose prominence follows consequence.",
    temporalPressure: "Use compare, contest, and settle states while preserving the trace of what was reconciled.",
    interactionPressure: "Input admits, rejects, or weighs evidence and changes only the relations that evidence supports."
  },
  {
    routeId: "inherited-history",
    causalRoute: "Let the present state inherit constraints and privileges from prior actions.",
    substancePressure: "Current matter compresses, layers, or weakens according to accumulated history rather than display order.",
    temporalPressure: "Use accretion with recoverable checkpoints so age and consequence remain distinct.",
    interactionPressure: "Input inspects or amends one historical cause and exposes every present dependency it influences."
  },
  {
    routeId: "closing-window",
    causalRoute: "Let a reversible decision become durable when its declared window closes.",
    substancePressure: "Substance remains re-formable during the open interval and registers the commitment once it settles.",
    temporalPressure: "Use a reversible interval followed by an irreversible event and an inspectable committed state.",
    interactionPressure: "Input proposes, withdraws, or confirms within the window; every action changes remaining possibility."
  },
  {
    routeId: "allocated-attention",
    causalRoute: "Let limited attention redistribute clarity and resolution according to current relevance.",
    substancePressure: "Detail consolidates around supported relevance while unattended regions retain enough structure to show their status.",
    temporalPressure: "Use data-paced reprioritization with bounded transitions and a complete held frame between updates.",
    interactionPressure: "Input assigns attention as a scarce resource and reveals the opportunity cost across the whole system."
  },
  {
    routeId: "authority-distance",
    causalRoute: "Let distance from legitimate authority determine which relations can bind, loosen, or dissolve.",
    substancePressure: "Cohesion follows permission strength; revoked authority leaves a legible discontinuity at former bonds.",
    temporalPressure: "Use grant, exercise, expire, and revoke states with consequences that survive the transition.",
    interactionPressure: "Input grants, exercises, or revokes authority and exposes the exact scope of the resulting change."
  },
  {
    routeId: "retained-possibility",
    causalRoute: "Let several possible outcomes remain structurally present until evidence resolves the branch.",
    substancePressure: "Shared causes keep branches materially related while divergent consequences produce distinct states of cohesion.",
    temporalPressure: "Use bifurcation with a held decision point and preserve rejected paths as historical evidence after resolution.",
    interactionPressure: "Input supplies the deciding evidence; it resolves one branch while keeping the basis of choice inspectable."
  },
  {
    routeId: "coordination-memory",
    causalRoute: "Let repeated coordination build shared capacity and missed coordination diminish it.",
    substancePressure: "Substance gains continuity through aligned events and retains local weakness where cadence repeatedly breaks.",
    temporalPressure: "Use recurrence with memory: timing differences accumulate into capability rather than resetting each cycle.",
    interactionPressure: "Input joins, delays, or interrupts a coordinated event and reveals how timing changes collective capacity."
  }
];

const representationModeBundles = [
  {
    representationId: "active-negative-space",
    representationPressure: "Make an unoccupied region carry the decisive state and force every visible element to register its changing influence.",
    representationQuarantine: "Exclude parallel strands, evenly spaced strokes, and bundled flow as the dominant spatial grammar."
  },
  {
    representationId: "typographic-topology",
    representationPressure: "Let language adjacency, scale, interruption, and reading order define the topology while auxiliary marks stay subordinate.",
    representationQuarantine: "Exclude connector bundles, fiber fields, and repeated paths that carry the structure independently of the type."
  },
  {
    representationId: "unequal-fragments",
    representationPressure: "Divide the field into nonuniform regions whose size, separation, and alignment follow unequal consequence or responsibility.",
    representationQuarantine: "Exclude equal modules, repeated slivers, and parallel fragments that can collapse into a uniform strand family."
  },
  {
    representationId: "migrating-boundary",
    representationPressure: "Use one consequential boundary whose relocation changes adjacency, ownership, and available space across the whole frame.",
    representationQuarantine: "Exclude stacked contours, multiple streamlines, and parallel edges that dilute the authority of the single boundary."
  },
  {
    representationId: "layered-strata",
    representationPressure: "Assign distinct causes to a small set of layers and make cross-layer displacement or exposure carry the primary evidence.",
    representationQuarantine: "Exclude evenly spaced bands, decorative contour repetition, and filament stacks with interchangeable layers."
  },
  {
    representationId: "scalar-density-field",
    representationPressure: "Encode the governing value through occupied area, porosity, or local concentration so aggregate density remains legible without directional tracing.",
    representationQuarantine: "Exclude streamlines, hairlike strokes, and parallel flow cues as substitutes for scalar density."
  },
  {
    representationId: "volumetric-occlusion",
    representationPressure: "Make depth legible through obstruction, overlap, and partial evidence, with hidden regions changing the interpretation of visible ones.",
    representationQuarantine: "Exclude parallel filaments, evenly sampled point lattices, and line accumulation as the source of apparent volume."
  },
  {
    representationId: "page-frame-reallocation",
    representationPressure: "Let the governing state redistribute margins, text territory, crop, and visual occupancy across the full page frame.",
    representationQuarantine: "Exclude a centered self-contained field, decorative sidecar, or fiber-filled rectangle that leaves the page allocation unchanged."
  },
  {
    representationId: "topological-cut",
    representationPressure: "Make one severed adjacency reorganize reachability, grouping, and negative space while the cut remains the dominant fact.",
    representationQuarantine: "Exclude braided connectors, parallel routes, and repeated tears that turn the cut into a line-family texture."
  },
  {
    representationId: "serial-composition",
    representationPressure: "Distribute meaning across a short ordered sequence of spatial states whose differences reveal one cumulative causal progression.",
    representationQuarantine: "Exclude repeated panels with cosmetic parameter shifts and recurring line bundles that leave each state structurally interchangeable."
  },
  {
    representationId: "isolated-specimen",
    representationPressure: "Concentrate the evidence in one bounded subject and let scale, placement, and surrounding absence expose its condition.",
    representationQuarantine: "Exclude swarms, strand ensembles, and repeated units that disperse attention across a family of equivalent marks."
  },
  {
    representationId: "single-event-trace",
    representationPressure: "Let one consequential event leave a singular displacement, discontinuity, or residue that can be read in a held frame.",
    representationQuarantine: "Exclude repeated trajectories, parallel traces, and ambient fibers that turn the event into continuous background motion."
  }
];

const MAX_COHORT_SIZE = Math.min(causalRouteBundles.length, representationModeBundles.length);

function indexFor(seed, namespace, length) {
  const digest = createHash("sha256").update(`${namespace}:${seed}`).digest();
  return digest.readUInt32BE(0) % length;
}

export function createCreativeOffset(inputSeed) {
  const seed = inputSeed === undefined ? randomBytes(12).toString("hex") : inputSeed;
  assert.equal(typeof seed, "string", "Creative offset seed must be a string.");
  assert.ok(seed.trim().length > 0, "Creative offset seed cannot be empty.");
  const normalizedSeed = seed.trim();
  const route = causalRouteBundles[indexFor(normalizedSeed, "route", causalRouteBundles.length)];
  const representation = representationModeBundles[indexFor(normalizedSeed, "representation", representationModeBundles.length)];
  return {
    schemaVersion: 3,
    seed: normalizedSeed,
    quarantine: [
      "literal product-name objects or rooms",
      "category-standard icons, dashboards, networks, and device inventories",
      "Pattern Language names, starter compositions, and recent-output fingerprints"
    ],
    routeId: route.routeId,
    causalRoute: route.causalRoute,
    substancePressure: route.substancePressure,
    temporalPressure: route.temporalPressure,
    interactionPressure: route.interactionPressure,
    representationId: representation.representationId,
    representationPressure: representation.representationPressure,
    representationQuarantine: representation.representationQuarantine,
    evidenceMove: evidenceMoves[indexFor(normalizedSeed, "evidence", evidenceMoves.length)],
    spatialPressure: spatialPressures[indexFor(normalizedSeed, "spatial", spatialPressures.length)],
    counterfactual: counterfactuals[indexFor(normalizedSeed, "counterfactual", counterfactuals.length)],
    selectionChallenge: selectionChallenges[indexFor(normalizedSeed, "selection", selectionChallenges.length)]
  };
}

function deriveCohortSeed(baseSeed, count, index, attempt) {
  return createHash("sha256")
    .update(`creative-cohort:${baseSeed}:${count}:${index}:${attempt}`)
    .digest("hex")
    .slice(0, 24);
}

export function createCreativeCohort(count, inputBaseSeed) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_COHORT_SIZE) {
    throw new RangeError(`Creative cohort count must be an integer from 1 to ${MAX_COHORT_SIZE}.`);
  }
  const baseSeed = inputBaseSeed === undefined ? randomBytes(12).toString("hex") : inputBaseSeed;
  assert.equal(typeof baseSeed, "string", "Creative cohort base seed must be a string.");
  assert.ok(baseSeed.trim().length > 0, "Creative cohort base seed cannot be empty.");
  const normalizedBaseSeed = baseSeed.trim();
  const routeIds = new Set();
  const representationIds = new Set();
  const offsets = [];

  for (let index = 0; index < count; index += 1) {
    let attempt = 0;
    while (true) {
      const seed = deriveCohortSeed(normalizedBaseSeed, count, index, attempt);
      const offset = createCreativeOffset(seed);
      if (!routeIds.has(offset.routeId) && !representationIds.has(offset.representationId)) {
        offsets.push(offset);
        routeIds.add(offset.routeId);
        representationIds.add(offset.representationId);
        break;
      }
      attempt += 1;
    }
  }

  return {
    schemaVersion: 3,
    baseSeed: normalizedBaseSeed,
    count,
    offsets
  };
}

function readArguments(argumentsList) {
  let seed;
  let cohort;
  let compact = false;
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--seed") {
      seed = argumentsList[index + 1];
      if (!seed || seed.startsWith("--")) throw new Error("--seed requires a value");
      index += 1;
    } else if (argument === "--cohort") {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--cohort requires a value");
      cohort = Number(value);
      index += 1;
    } else if (argument === "--compact") {
      compact = true;
    } else if (argument === "--help" || argument === "-h") {
      return { help: true };
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return { seed, cohort, compact, help: false };
}

function printHelp() {
  process.stdout.write(`Usage: node creative-offset.mjs [--seed value] [--cohort N] [--compact]\n\nCreates one renderer-, artifact-, and palette-neutral landmark search offset. Use --cohort N for a coordinated roster of 1-${MAX_COHORT_SIZE} independent offsets.\n`);
}

const isCommandLine = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) {
  try {
    const options = readArguments(process.argv.slice(2));
    if (options.help) printHelp();
    else {
      const output = options.cohort === undefined
        ? createCreativeOffset(options.seed)
        : createCreativeCohort(options.cohort, options.seed);
      process.stdout.write(`${JSON.stringify(output, null, options.compact ? 0 : 2)}\n`);
    }
  } catch (error) {
    process.stderr.write(`Creative offset error: ${error.message}\n`);
    process.exitCode = 1;
  }
}
