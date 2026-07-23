# Design Record

Create a small machine-readable record after direction freeze and update it after verification. It preserves the minimum evidence needed for implementation, review, and future output-distance checks without becoming a process transcript.

Use `signature-visual.design.json` near the owning component when the project permits. Validate it against [`../schemas/design-record.schema.json`](../schemas/design-record.schema.json), then run `node <signature-visual-skill>/scripts/validate-design-record.mjs <record-path>`. A project may store the same object in an existing design registry. For read-only work, include the object in the handoff.

## Minimal valid record

```json
{
  "$schema": "https://signature-visual.pages.dev/schemas/design-record.schema.json",
  "schemaVersion": 3,
  "tier": "section",
  "surface": {
    "owner": "#evidence-visual",
    "pageJob": "Show how local observations support one regional conclusion.",
    "contentAxis": "Evidence remains inspectable."
  },
  "thesis": "Local evidence remains inspectable as it resolves into one regional signal.",
  "directions": [
    {
      "id": "witness-weave",
      "name": "Witness weave",
      "origin": "evidence-derived",
      "spatialStructure": "Three source strands cross one audit point and open into a bounded conclusion.",
      "material": "Dry green ink on warm paper with sparse red correction.",
      "motion": "event-response",
      "interaction": "An inspection probe reveals source provenance.",
      "fingerprint": {
        "artifact": "research plate",
        "silhouette": "three strands opening into one lens",
        "densityEvent": "shared audit point",
        "typeRole": "annotation"
      },
      "risk": "Editorial annotation could resemble a recent report visual."
    }
  ],
  "distanceMatrix": [
    {
      "pair": "witness-weave ↔ nearest-output",
      "axes": {
        "silhouette": "far",
        "spatial": "far",
        "material": "near",
        "temporal": "far",
        "interaction": "far",
        "type": "near"
      },
      "verdict": "pass",
      "evidence": "The shared paper language remains, while topology and inspection behavior change."
    }
  ],
  "selection": {
    "selectedDirection": "witness-weave",
    "evidence": [
      "The shared audit point makes aggregation and traceability visible in one frame."
    ],
    "counterEvidence": [
      "The paper-and-annotation material is less distinctive than the topology."
    ],
    "sourceDistance": {
      "nearest": "none supplied",
      "verdict": "unavailable",
      "evidence": "No direct visual source was used."
    },
    "outputDistance": {
      "nearest": "unavailable",
      "verdict": "unavailable",
      "evidence": "No prior output registry or gallery was accessible."
    }
  },
  "signatureRule": "Every source crosses the same audit point and stays visible through the conclusion.",
  "renderer": {
    "lead": "svg",
    "reason": "Traceable paths and labels carry the visual rule."
  },
  "states": [
    "desktop:held",
    "desktop:inspection",
    "mobile:held",
    "reduced-motion:resolved"
  ],
  "runtimeCapabilities": {
    "responsive": true,
    "reducedMotion": true,
    "deterministic": true,
    "visibilityPause": true,
    "teardown": true
  },
  "revision": {
    "observation": "The first mobile frame compressed all labels.",
    "cause": "Desktop topology was scaled without recomposition.",
    "change": "Sources moved to a top rail and the lens rotated vertically.",
    "evidence": [
      "captures/mobile-held.png"
    ],
    "counterEvidence": [
      "The mobile route labels still require small text."
    ]
  }
}
```

## Field contract

- `schemaVersion` is required and fixed at `3` for this contract.
- `tier` is `landmark`, `section`, or `refine`.
- `surface` records the owner and compact page context.
- `thesis` states the target meaning in any concise, testable form.
- `directions` stores only the candidates needed by the tier: landmark candidates, a section direction plus any distance-triggered branch, or current/proposed refinement states. Each entry keeps a name and enough fingerprint evidence to compare.
- `distanceMatrix` is required and stores candidate, source, or output comparisons as `same`, `near`, `far`, or `unknown` plus visible evidence. A section with no extra branch can still record its nearest source/output comparisons here.
- `selection.selectedDirection`, `selection.evidence`, and `selection.counterEvidence` explain the freeze decision.
- `selection.sourceDistance` and `selection.outputDistance` are required structured fields. Use `unavailable` with the search performed when a neighbor cannot be inspected.
- Landmark records require `selection.convergenceForecast`, `selection.clusterBreakAxes`, `selection.forecastDisposition`, and `selection.noveltyGuard`. Forecast the likely independent-run cluster before candidate generation. The selected winner must visibly break at least two of `materialCausality`, `temporalArchetype`, and `interactionMeaning`; record one causal comparison per break in `noveltyGuard.winnerChallenge.breakEvidence`. A clustered provisional winner rebranches before renderer selection or implementation.
- `selection.noveltyGuard.creativeOffset` uses creative-offset `schemaVersion: 3`. Preserve its seed, quarantine, paired causal route, three causal pressures, representation ID, representation pressure and quarantine, evidence move, spatial pressure, counterfactual, and selection challenge exactly as emitted.
- `selection.noveltyGuard.cohort` is optional and reserved for coordinated independent alternatives or benchmark runs. It stores the roster's normalized `baseSeed`, zero-based `index`, and `size`. The validator regenerates the full roster and requires the assigned seed and offset to match exactly. Ordinary work records one creative offset and omits cohort metadata.
- `signatureRule` is the observable invariant across states and breakpoints.
- `renderer` records the late routing decision and its design reason.
- `states` names semantic captures instead of enforcing fixed percentages.
- `runtimeCapabilities` records implemented capabilities with booleans, strings, or small evidence objects.
- `revision` records the highest-value observed change. Keep it compact; an empty first-pass note can be a short string.

The schema intentionally permits project-specific fields. Keep the base record small so future runs can scan several records cheaply.

## Landmark novelty guard

Landmark work adds one compact selection field:

```json
{
  "convergenceForecast": {
    "artifact": "room-shaped device network",
    "renderer": "Canvas particles or an SVG node graph",
    "materialCausality": "Brand-tinted connections brighten as activity increases.",
    "temporalArchetype": "Ambient network pulse with a short cursor response.",
    "interactionMeaning": "Pointer proximity reveals or attracts a device node."
  },
  "clusterBreakAxes": [
    "materialCausality",
    "temporalArchetype"
  ],
  "forecastDisposition": "outside-forecast-cluster",
  "noveltyGuard": {
    "obviousAttractors": [
      "literal product-name room",
      "category-standard node network"
    ],
    "shadowBaseline": {
      "name": "Literal baseline",
      "collision": "A room-shaped network with device icons and cursor inspection."
    },
    "creativeOffset": {
      "schemaVersion": 3,
      "seed": "7d9f2e21408d9ba1f474215a",
      "quarantine": [
        "literal product-name objects or rooms",
        "category-standard icons, dashboards, networks, and device inventories",
        "Pattern Language names, starter compositions, and recent-output fingerprints"
      ],
      "routeId": "propagated-consequence",
      "causalRoute": "Let one local decision change the allowable states of distant dependents.",
      "substancePressure": "Stress, continuity, or fracture follows dependency strength and persists at every affected relation.",
      "temporalPressure": "Use event-response propagation with latency derived from dependency depth and a stable aftermath.",
      "interactionPressure": "Input initiates one local decision; remote changes reveal reach, delay, and responsibility.",
      "representationId": "single-event-trace",
      "representationPressure": "Let one consequential event leave a singular displacement, discontinuity, or residue that can be read in a held frame.",
      "representationQuarantine": "Exclude repeated trajectories, parallel traces, and ambient fibers that turn the event into continuous background motion.",
      "evidenceMove": "Make one hidden dependency perceptible through its failure condition.",
      "spatialPressure": "Split the surface by agency, then allow the primary action to renegotiate the split.",
      "counterfactual": "Assume the 390px composition is designed first and desktop expands from it.",
      "selectionChallenge": "The winner must stay product-specific after removing every noun repeated in the product name."
    },
    "winnerChallenge": {
      "selectionChallengeEvidence": "The held frame and causal sequence remain product-specific after product-name nouns are removed.",
      "breakEvidence": [
        {
          "axis": "materialCausality",
          "forecast": "Connections brighten with activity.",
          "winner": "Dependency strength produces persistent stress and fracture.",
          "visibleEvidence": "The held state retains discontinuities at affected dependencies after the initiating event."
        },
        {
          "axis": "temporalArchetype",
          "forecast": "Ambient pulse plus cursor response.",
          "winner": "One local event propagates by dependency depth into a stable aftermath.",
          "visibleEvidence": "Semantic captures show local, propagating, and aftermath states with retained consequences."
        }
      ]
    }
  }
}
```

These fields live inside `selection`. Copy the generator output exactly. Keep the forecast predictive, the selected direction absent from its wording, and the winner evidence concise. Use `rebranched-outside-forecast-cluster` plus `selection.rebranchEvidence` when the first provisional winner entered the forecast cluster.

For a coordinated roster, generate it once and assign one entry to each independent run:

```bash
node <signature-visual-skill>/scripts/creative-offset.mjs --cohort 4 --seed benchmark-round-1
```

Alongside the assigned `creativeOffset`, add:

```json
{
  "cohort": {
    "baseSeed": "benchmark-round-1",
    "index": 2,
    "size": 4
  }
}
```

The cohort object lives inside `selection.noveltyGuard`. The index addresses `offsets[index]` from the roster. Each assigned entry remains a normal `createCreativeOffset(seed)` result, so standalone seed replay and cohort replay agree.

## Optional evidence for a score of five

When any rubric criterion receives a 5, add an `evaluation` field:

```json
{
  "evaluation": {
    "criterion": "source-and-output-originality",
    "score": 5,
    "artifactEvidence": [
      "captures/mobile-held.png: the vertical topology remains legible at 390px"
    ],
    "strongestCounterEvidence": "The annotation material resembles an earlier editorial plate.",
    "independentReview": {
      "reviewer": "review-agent-id-or-person",
      "finding": "Confirmed structural distance through topology and temporal behavior."
    }
  }
}
```

The schema accepts one block or an array of blocks. Each block supports an anchored score and preserves the strongest challenge; evaluator reasoning remains the final authority.
