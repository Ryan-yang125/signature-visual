# Visual QA

Visual QA turns a moving system into comparable evidence. Author representative states, run declared behavior scenarios, review several visual reductions, make one targeted revision, and capture again.

## Contents

1. [Author the state protocol](#1-author-the-state-protocol)
2. [Use the V3 manifest contract](#2-use-the-v3-manifest-contract)
3. [Expose a deterministic bridge](#3-expose-a-deterministic-bridge)
4. [Write runtime scenarios](#4-write-runtime-scenarios)
5. [Read the output as evidence](#5-read-the-output-as-evidence)
6. [Score with evidence](#6-score-with-evidence)
7. [Run a targeted revision loop](#7-run-a-targeted-revision-loop)
8. [Run the verifier](#8-run-the-verifier)

## 1. Author the state protocol

Choose states that expose the visual's governing rule and selected temporal archetype.

- **Held/static:** capture the authored desktop, mobile, reduced-motion, and meaningful data or content variants.
- **Continuous timeline or scroll:** capture `0 / 0.25 / 0.5 / 0.75 / 1` when continuous progress is truly the state model. Give every point a semantic name.
- **Ambient or simulated:** fix the seed and capture times that show materially different structures. Record the integration step when history affects state.
- **Accumulation or irreversible event:** capture the initial condition, event evidence, committed aftermath, and any meaningful later history.
- **Bifurcation or state machine:** capture every stable branch or state plus the decisive transition evidence.
- **Pointer or tool:** capture the held frame, acknowledgment, consequence, cancellation, and authored aftermath. Include recovery only when the system returns by design.
- **Data-driven:** capture empty, typical, extreme, malformed, and selected/focused states.

Every state must hold as a deliberate still frame. Include the highest-risk semantic state on desktop and mobile, the reduced-motion direction, and an authored fallback when the renderer can fail.

## 2. Use the V3 manifest contract

The runner accepts legacy capture manifests and emits V3 results. New work should declare `schemaVersion: 3` and use:

- [`../schemas/visual-qa-manifest-v3.schema.json`](../schemas/visual-qa-manifest-v3.schema.json)
- [`../schemas/visual-qa-results-v3.schema.json`](../schemas/visual-qa-results-v3.schema.json)
- [`../schemas/design-record.schema.json`](../schemas/design-record.schema.json) for direction and revision evidence

Tiers define the required runtime declarations:

| Tier | Required capability declarations |
| --- | --- |
| `capture` | capture states only; declared capabilities still require scenarios |
| `interaction` | pointer, keyboard, and primary action |
| `production` | all nine runtime capabilities |

Declare each applicable capability as `true` or `{ "supported": true }`. Declare a conditional exclusion as `{ "supported": false, "reason": "..." }`. Every supported capability needs at least one runtime scenario that names it in `requires`.

The capability vocabulary is fixed:

| Capability | Evidence expected |
| --- | --- |
| `resize` | renderer and semantic coordinates update after owner/viewport resize |
| `zeroSize` | zero-width or zero-height pauses work and later recovers |
| `pointer` | enter/move plus leave, cancel, and lost capture clear active input |
| `windowFocus` | blur pauses or neutralizes response; focus resumes safely |
| `keyboard` | meaningful states are reachable through keyboard input |
| `reducedMotion` | a preference change during the session updates presentation |
| `lifecycle` | dispose is idempotent and remount creates one clean instance |
| `gpu` | creation failure/context loss shows an authored fallback and can recover |
| `primaryAction` | pointer and keyboard trigger the same semantic action |

Minimal production excerpt:

```json
{
  "$schema": "./skills/signature-visual/schemas/visual-qa-manifest-v3.schema.json",
  "schemaVersion": 3,
  "tier": "production",
  "serveRoot": "./public",
  "url": "/hero/",
  "captureSelector": "[data-signature-visual]",
  "seed": "route-field-a",
  "derivedImages": { "thumbnailWidth": 160, "blurRadius": 14, "silhouette": true },
  "states": [
    { "name": "unassigned", "progress": 0 },
    { "name": "split-proposed", "progress": 0.5 },
    { "name": "policy-committed", "progress": 1 }
  ],
  "capabilities": {
    "resize": true,
    "zeroSize": true,
    "pointer": { "supported": false, "reason": "This held SVG direction has no pointer response." },
    "windowFocus": { "supported": false, "reason": "This held SVG direction has no animation loop or transient input." },
    "keyboard": { "supported": false, "reason": "The visual is explanatory and has no visual control." },
    "reducedMotion": { "supported": false, "reason": "The authored presentation is already still." },
    "lifecycle": true,
    "gpu": { "supported": false, "reason": "This SVG direction has no GPU surface." },
    "primaryAction": { "supported": false, "reason": "The page has no action that changes visual state." }
  },
  "runtimeScenarios": [
    {
      "name": "zero-size pause and recovery",
      "requires": ["resize", "zeroSize"],
      "steps": [
        { "action": "setOwnerSize", "width": 0, "height": 0 },
        { "action": "assertHook", "path": "pauseReasons", "includes": "zero-size" },
        { "action": "setOwnerSize", "width": 720, "height": 420 },
        { "action": "assertHook", "path": "paused", "equals": false }
      ]
    },
    {
      "name": "idempotent dispose and clean remount",
      "requires": ["lifecycle"],
      "steps": [
        { "action": "dispose" },
        { "action": "assertHook", "path": "disposed", "equals": true },
        { "action": "dispose" },
        { "action": "assertHook", "path": "disposed", "equals": true },
        { "action": "remount" },
        { "action": "assertHook", "path": "disposed", "equals": false },
        { "action": "assertHook", "path": "ready", "equals": true }
      ]
    }
  ]
}
```

This excerpt is intentionally still and non-interactive, so its inapplicable capabilities carry specific reasons. A direction that supports pointer, keyboard, reduced motion, focus pause, GPU recovery, or a state-changing primary action declares each one supported and adds a scenario that names it in `requires`.

## 3. Expose a deterministic bridge

The runner looks for `window.__signatureVisual` by default:

```js
window.__signatureVisual = {
  ready: true,
  setSeed(seed) {},
  seek({ time, timeMs, progress }) {},
  setPointer({ x, y, active }) {},
  render() {},
  describe() {
    return {
      ready: true,
      disposed: false,
      paused: false,
      pauseReasons: [],
      renderer: 'svg',
      fallback: false,
      progress: 0,
      pointer: { x: 0.5, y: 0.5, active: false, strength: 0 }
    };
  },
  dispose() {},
  remount() {}
};
```

`ready` may be a boolean, promise, or function. `seek()` must commit an exact frame. `describe()` supplies machine-readable evidence for runtime assertions. GPU systems may also expose `loseContext()` and `restoreContext()`.

## 4. Write runtime scenarios

Each scenario runs in a fresh browser context. It must declare one or more supported capabilities and include at least one assertion. After the final step, the runner seeks to the exact elapsed virtual time, then calls `render()` and `describe()` in one browser turn so the stored semantic description has a deterministic commit boundary; step-level assertions retain the observed state at each tested moment.

Available steps:

- **Environment:** `wait`, `setViewport`, `setOwnerSize`, `setReducedMotion`
- **Input:** `pointerEvent`, `windowBlur`, `windowFocus`, `keyboard`, `activate`
- **Lifecycle/GPU:** `dispose`, `remount`, `gpuContext`, `callHook`
- **Assertions:** `assertHook`, `assertSelector`, `assertFocus`, `assertNoErrors`

Use `assertHook` against stable semantic fields from `describe()`. Prefer `pauseReasons` over inferred frame counts, `fallback` over pixel color checks, and an action counter/state identifier over DOM event implementation details.

Full cancellation sequence:

```json
{
  "name": "pointer cancellation",
  "requires": ["pointer", "windowFocus"],
  "steps": [
    { "action": "pointerEvent", "event": "pointermove", "x": 0.3, "y": 0.4 },
    { "action": "assertHook", "path": "pointer.active", "equals": true },
    { "action": "pointerEvent", "event": "pointercancel" },
    { "action": "assertHook", "path": "pointer.active", "equals": false },
    { "action": "pointerEvent", "event": "lostpointercapture" },
    { "action": "windowBlur" },
    { "action": "assertHook", "path": "pauseReasons", "includes": "window-blur" },
    { "action": "windowFocus" },
    { "action": "assertHook", "path": "pauseReasons", "equals": [] }
  ]
}
```

`pointer.active` is the immediate semantic boolean used by runtime assertions. A visual that eases response intensity exposes the numeric 0–1 value separately as `pointer.strength`.

## 5. Read the output as evidence

The runner writes:

```text
captures/*.png                 authored full-size states
derived/thumbnails/*.png       160px composition checks
derived/blur/*.png             12–16px blur hierarchy checks
derived/silhouette/*.png       black/white mass and negative-space checks
contact-sheet.png              side-by-side thumbnail strip
contact-sheet.html             full and derived comparison interface
results.json                   states, capabilities, runtime assertions, diagnostics, hashes
```

Each successful run stages the complete managed artifact set and promotes its managed paths through a rollback transaction. A dedicated output directory receives a `.signature-visual-qa` ownership marker; a pre-existing directory without that marker is accepted only when it contains managed artifacts from an earlier runner. Retired states cannot leave stale captures or derived images behind, while reviewer notes in an owned directory stay untouched. A failed run restores the last successful evidence set. An incomplete rollback retains its recovery directory and reports the exact path. The CLI resolves symbolic links before rejecting filesystem roots, the home directory, the working directory, the manifest directory, and unrelated unowned directories as output targets.

SHA-256 hashes answer one question: did deterministic output change? They do not grade beauty or visual correctness. GPU rasterization and compositor filters can create byte changes across machines, so approve through named-state evidence and direct comparison.

For automated same-host replay, compare decoded pixels whenever PNG bytes differ so encoder metadata cannot create a false failure. CPU-rendered cases may use a documented near-zero raster tolerance for isolated anti-aliasing variance; keep the changed-channel ratio at or below one millionth. GPU cases may use a separately documented, narrow pixel tolerance after state names, semantic descriptions, runtime results, viewport, seed, and clock all match. Limit mean channel difference, changed-channel ratio, and maximum channel difference independently.

Review in four passes:

1. **Thumbnail:** dominant event, hierarchy, density, and semantic-state distance.
2. **Blur:** mass, contrast path, copy safety, and focal competition.
3. **Silhouette:** project-specific structure, negative space, and mobile crop.
4. **Full sequence:** material coherence, causality, branch or history logic, authored aftermath, and seams.

## 6. Score with evidence

Use the six canonical criteria in [evaluation.md](evaluation.md): tier/target truth, creative search/distance, composition/material, temporal/interaction fit, originality, and production integrity. Attach visible evidence and counterevidence to every score. A score of 5 uses the design record's optional `evaluation` packet with `artifactEvidence`, `strongestCounterEvidence`, and `independentReview`.

Record two distinct distances:

- `selection.sourceDistance`: separation from references, source templates, and inherited fingerprints;
- `selection.outputDistance`: structural separation among the proposed directions and final variants.

Treat uncertain observations explicitly. A useful record contains the claim, screenshot/state, confidence, competing explanation, and next discriminating check.

Revise every category below 4. For a score of 4 or 5, preserve the strongest counter-evidence so later iterations cannot hide a regression.

## 7. Run a targeted revision loop

Change the smallest structural cause that can raise the weakest category:

```text
OBSERVATION       Proposed and committed states share one silhouette.
CAUSE             Color and turbulence change while topology stays fixed.
REVISION          Split the route at proposal; lock its chosen branch at commitment.
EVIDENCE          New state sheet shows distinct decision silhouettes with stable copy contrast.
COUNTER-EVIDENCE  The committed mobile branch still crowds the heading safe area.
NEXT CHECK        Recompose the mobile crop and recapture proposal, cancellation, and commitment.
```

Keep the previous and candidate sheets together until the identified category clearly improves.

## 8. Run the verifier

```bash
node skills/signature-visual/scripts/visual-qa.mjs path/to/manifest.json
node skills/signature-visual/scripts/visual-qa.test.mjs
```

The self-test exercises validation, deterministic states, runtime capability scenarios, lifecycle, generated evidence images, contact sheets, and legacy capture compatibility.
