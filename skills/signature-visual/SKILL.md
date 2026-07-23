---
name: signature-visual
description: Direct, refine, and build a distinctive computational visual for a real website. Use whenever a hero, section, background, transition, data surface, or product moment should feel memorable, alive, spatial, atmospheric, technical, organic, or experimental—even when the user never names Canvas, Three.js, WebGL, shaders, or SVG. Also use to study a visual reference, redesign an effect that feels generic or template-like, or systemize related visual moments. Scale creative search to landmark, section, or refinement scope; keep direction evidence-led and renderer-late; then validate responsive behavior, accessibility, performance, lifecycle, and output distance.
---

# Signature Visual

Act as the visual director and computational design engineer for one high-memory moment. Let target evidence generate the spatial rule, material behavior, temporal structure, and interaction meaning. Choose the renderer after the direction freezes.

The skill is self-contained. Use its references, neutral runtime shells, and QA script. Existing project libraries may be used when they are already healthy or directly serve the selected direction.

## What success means

1. **Belonging** — the visual encodes this product, story, behavior, or dataset.
2. **Presence** — a held frame has hierarchy, tension, and a memorable silhouette before polish.
3. **Range** — the governing rule can produce meaningful variations without becoming one repeated demo.
4. **Distance** — the result is structurally distinct from direct sources, packaged examples, and recent accessible outputs.
5. **Production integrity** — viewport, input, motion preference, deterministic review, performance, accessibility, and teardown hold up.

## Separate hard requirements from adaptive search

Production integrity and evidence are hard requirements. Candidate count, metaphor, artifact stance, motion shape, interaction, and renderer remain adaptive. Search effort follows the visual's scope and actual uncertainty.

## Classify the scope

### Landmark

Use for a hero, launch moment, flagship data surface, or transition that carries product identity.

- Name the brief's obvious attractors and keep their direct translation as a shadow baseline.
- Forecast the artifact, renderer, material causality, temporal archetype, and interaction meaning that another independent run is most likely to converge on.
- Run the bundled creative-offset generator once and record its causal and representation constraints.
- Explore enough candidates to reveal genuinely different visual worlds, including an anti-literal direction and one offset taxonomy-external direction.
- Freeze the candidate set, then compare candidates pairwise with a distance matrix.
- Select only a winner that visibly breaks the forecast cluster on at least two of material causality, temporal archetype, and interaction meaning. Rebranch a clustered winner before implementation.

### Section

Use for one supporting explanation or visual moment inside a larger page.

- Author the strongest evidence-led direction first.
- Run source and output-distance checks.
- Add a structural branch only when distance or page-fit fails.

### Refine

Use when a concept or implementation already exists.

- Reuse the confirmed thesis and signature rule.
- Compare current and proposed fingerprints.
- Change the smallest structural layer responsible for the failure.
- Reopen broad search when the thesis is invalid or distance still fails.

`study` and `systemize` are modifiers: study extracts portable principles from a supplied reference; systemize carries one selected rule across several related moments. A study that leads to implementation still uses landmark, section, or refine scope.

## V3 decision flow

### 1. Read the real surface

Inspect the target page, content hierarchy, framework, components, tokens, fonts, breakpoints, imagery, data, existing motion, runtime behavior, and recent nearby visuals. Locate the owner element and smallest safe file set.

Record a compact brief:

```text
PAGE JOB       what this moment must help a visitor understand, judge, or feel
CONTENT AXIS   copy, object, relationship, or data that stays primary
TARGET EVIDENCE nouns, actions, constraints, data behavior, and production traces
BRAND SIGNAL   one existing trait worth amplifying
BOUNDARIES     layout, stack, performance, accessibility, and capability limits
OUTPUT HISTORY nearest accessible recent visual, or unavailable plus search performed
```

For greenfield work, define these from the prompt and build the smallest real surface that proves the direction.

When a direct reference is supplied, use [reference-study.md](references/reference-study.md) for source analysis: separate evidence, portable rules, recognizable surface identity, and rights boundaries. Generate target directions through [creative-search.md](references/creative-search.md) at the selected tier.

### 2. Search without taxonomy or renderer priming

Read [visual-direction.md](references/visual-direction.md) and [creative-search.md](references/creative-search.md). Keep Pattern Language, renderer guides, starter visuals, and trend galleries closed while generating candidates.

Build from the target's objects, relations, data, constraints, language, and production behavior. A thesis may be a behavior, mapping, event, composition, material rule, or metaphor; no sentence template is required.

Apply the scope tier:

- **Landmark:** name and quarantine the obvious attractors, record the likely independent-run convergence forecast, run `node <signature-visual-skill>/scripts/creative-offset.mjs`, then explore until the candidate matrix shows structurally distinct worlds. Resolve `<signature-visual-skill>` to the directory containing this file. Use the generated causal route to coordinate substance, temporal structure, and interaction meaning. Use its representation mode to force a distinct high-level spatial organization and exclude the named collapse family. Renderer, finished artifact, and palette stay open. Include an anti-literal direction and the offset taxonomy-external direction. Save the offset JSON in `selection.noveltyGuard`.
- **Section:** begin with one direction; branch on a named distance or fit failure.
- **Refine:** reuse the thesis; branch only when the diagnosis requires it.

Ordinary work uses one generated offset. Use `node <signature-visual-skill>/scripts/creative-offset.mjs --cohort N --seed <base-seed>` only when coordinating independent alternatives or running a benchmark. Assign one roster entry to each independent run, preserve its zero-based `index`, and store `{baseSeed,index,size}` as `selection.noveltyGuard.cohort`. Each run still begins from its own target evidence and delays renderer routing until direction freeze.

### 3. Measure distance and freeze

Fingerprint candidates through artifact, silhouette, spatial grammar, density event, material causality, temporal archetype, interaction meaning, and type role.

- Landmark work records a pairwise candidate distance matrix. Two candidates remain in the final set only when at least four structural axes are visibly `far`; rebranch or remove the weaker candidate when a pair collapses.
- Landmark work also compares the provisional winner with `selection.convergenceForecast`. Record `selection.clusterBreakAxes` and visible evidence for at least two breaks among material causality, temporal archetype, and interaction meaning. A provisional winner inside the forecast cluster must rebranch and clear this gate before renderer selection or implementation.
- Section work records the first direction's nearest source/output neighbor and the reason for any added branch.
- Refinement records current-to-proposed structural distance.

Run source distance and output distance separately. Name the nearest known neighbor and cite the visible or causal difference. Record unavailable history honestly. When output history is unavailable for landmark work, collision insurance applies: a direct product-name, category-object, or obvious noun-to-artifact baseline stays ineligible until a second-order transform changes at least three structural axes.

Freeze when target evidence drives the governing rule, the resting frame is complete, tier-appropriate distance passes, the main risk is testable, and implementation is credible. Stop when further search would restate solved ideas.

### 4. Expand the frozen direction

Open [pattern-language.md](references/pattern-language.md) only now. Use its transformation operators, variation axes, cheap signals, and failure signatures to stress-test or expand the selected rule. Pattern names remain internal unless useful to the handoff.

Author the connected design system:

- **Composition:** frame, anchor, silhouette, crop, density, negative space, text relationship, and mobile re-composition. Read [composition.md](references/composition.md).
- **Material:** substance, palette roles, light model, edge hierarchy, texture attachment, depth cue, and decay. Read [material-language.md](references/material-language.md).
- **Temporal:** choose or author a temporal archetype from the governing rule. Held/static, one-shot, finite-state, event-response, bifurcation/branching, inspection/reveal, irreversible event, scroll-linked, ambient, accumulation/accretion, and live/data-paced structures are all valid. Read [motion-direction.md](references/motion-direction.md).
- **Interaction:** add input only when it reveals the rule; define meaning, target, bounds, latency, cancellation, and aftermath. Read [interaction.md](references/interaction.md).

Declare one observable `signature rule` that survives responsive composition and reduced motion. Motion and interaction may be absent when the held frame carries the full idea.

Create the minimal machine-readable record from [design-record.md](references/design-record.md) after direction freeze and validate it against the [V3 schema](schemas/design-record.schema.json). Run `node <signature-visual-skill>/scripts/validate-design-record.mjs <record-path>` before implementation; the validator replays the offset, regenerates an optional cohort roster, and enforces landmark origins, pair distance, and forecast-break evidence. Store only selected decisions, forecast-break evidence, and distance evidence.

### 5. Route to an engine

Read [routing.md](references/routing.md), then only the relevant family guide:

- [Canvas fields](references/families/canvas-fields.md) for many planar marks, deposition, and field state;
- [Three.js forms](references/families/three-living-forms.md) for camera, geometry, occlusion, lighting, and spatial assembly;
- [WebGL shader fields](references/families/webgl-shader-fields.md) for continuous GPU-evaluated material or simulation;
- [SVG systems](references/families/svg-technical-systems.md) for paths, topology, type, labels, and instrument precision.

Choose the smallest engine that directly expresses the selected experience. When combining engines, give each one a clear layer, one shared semantic state, and one clock. Renderer novelty never resolves a direction or distance failure.

### 6. Implement with production integrity

Read [integration.md](references/integration.md). Reuse a neutral [Canvas](references/starters/canvas-field.js), [Three.js](references/starters/three-living-form.js), [WebGL](references/starters/webgl-shader-field.js), or [SVG](references/starters/svg-technical-system.js) shell for lifecycle patterns. Replace the visual program: geometry, emitters, equations, topology, material, temporal structure, and semantics.

Every implementation needs:

- an explicit owner and stable layout bounds;
- responsive sizing and an authored mobile composition;
- capped DPR and visible-area density where raster or GPU work applies;
- pause while hidden or outside the viewport;
- a meaningful reduced-motion presentation;
- deterministic seed, semantic state/time, data, and input hooks for QA;
- accessible labels or equivalent text when the visual carries meaning;
- teardown for frames, observers, listeners, timers, workers, GPU resources, and contexts.

Public options should express design intent such as tension, porosity, accumulation, cohesion, cadence, or response. Keep raw constants private.

### 7. Capture, critique, and verify

Read [visual-qa.md](references/visual-qa.md) for deterministic tooling and [motion-direction.md](references/motion-direction.md) for archetype-specific checkpoints. Choose semantic capture states; a universal percentage sequence is optional.

Every implemented visual verifies:

- primary desktop and 390 × 844 mobile;
- reduced motion;
- maximum-energy or highest-risk state when one exists;
- resize or rotation;
- pointer exit, touch cancellation, keyboard parity, and aftermath when interaction exists;
- empty, typical, burst, stale, malformed, or other relevant data states;
- route unmount or repeated dispose;
- console, page, network, lint, typecheck, test, and build status supported by the project.

Review the contact sheet and live behavior with [failure-signatures.md](references/failure-signatures.md). Revise the earliest failed layer.

## Evaluation contract

Read [evaluation.md](references/evaluation.md) for the complete 1–5 anchors, pass thresholds, and independent-review contract. For an ordinary handoff, report visible evidence and caveats without manufacturing a high score.

A score of 5 on any criterion requires all three:

1. artifact evidence naming a file, capture, state, or measured behavior;
2. the strongest counterevidence that could lower the score;
3. confirmation from an independent reviewer who did not author the direction.

Missing evidence caps that criterion at 4. Keep disagreements visible. Averages never hide a weak production or originality criterion.

## Originality and output-distance contract

Before handoff:

- compare the selected fingerprint with direct sources and packaged examples;
- compare it with recent accessible outputs from the same product, skill, gallery, or workspace;
- verify that structural distance comes from the governing rule; palette, count, intensity, easing, and renderer remain tuning evidence;
- ensure the static or held frame still feels target-specific;
- ensure the rule can produce a second meaningful variation.

If the nearest neighbor still shares the dominant skeleton or causal sequence, return to the tier-appropriate search response and update the design record.

## Handoff

Return:

- scope, one-sentence thesis, selected direction, and signature rule;
- the decisive candidate/source/output-distance evidence;
- renderer and files changed;
- semantic capture states, viewport/motion modes, and production checks;
- the design-record location;
- remaining caveats and any independent-review disagreement.

Keep the explanation compact. The working visual, machine-readable record, and verified states are the primary artifacts.
