# Visual QA

Visual QA turns a moving, interactive system into comparable evidence. Capture deterministic states, review them together, make one targeted revision, and repeat until every category reaches the quality floor.

## 1. Choose the state protocol

Select the protocol that reveals the visual's real behavior.

### Timeline or scroll

Capture progress `0 / 0.25 / 0.5 / 0.75 / 1`.

Name each state by its motion score, such as rest / acquire / route / lock / resolve. Every progress value needs a composed frame, including endpoints.

### Ambient or simulated system

Fix the seed and capture five authored times. Pick times that show materially different system states. Record the fixed integration step when simulation state depends on previous frames.

### Pointer or tool interaction

Capture:

1. rest;
2. approach or first acknowledgment;
3. engaged consequence;
4. immediate release;
5. fully recovered state.

Record normalized pointer positions and wait/recovery durations.

### Data-driven system

Capture empty, typical, peak, and edge/malformed states. Add a selected/focused state when interaction reveals detail.

## 2. Capture modes

Every new system needs:

- primary desktop viewport;
- mobile at 390 × 844;
- reduced-motion presentation;
- at least one maximum-energy state at both desktop and mobile;
- a fallback/poster when GPU or capability failure is relevant.

Keep viewport, DPR, seed, time/progress, pointer, data fixture, color scheme, and motion preference in the capture manifest.

## 3. Development contract

Prefer a page bridge:

```js
window.__signatureVisual = {
  ready: true,
  setSeed(seed) {},
  seek({ time, progress }) {},
  setPointer({ x, y, active }) {},
  render() {},
  describe() { return { phase, seed, time, progress }; }
};
```

The capture runner waits for readiness, applies state, calls render, then captures without relying on arbitrary animation timing. It also records console errors, page errors, and failed network requests.

When a target cannot expose a bridge, freeze time through a query parameter or test-specific controller and document the limitation.

## 4. Contact sheet layout

Place states in chronological or causal order. Label each tile with:

```text
phase · progress/time · viewport · seed · pointer/data state
```

Use the same crop and display scale across one row. Add mobile and reduced-motion as separate rows. Keep a previous revision beside the candidate when evaluating a targeted change.

PNG hashes identify individual artifacts and quickly flag changed captures. GPU rasterization and compositor filters can introduce byte-level differences between visually equivalent frames, so approve those changes through the contact sheet, the named-state description, and a direct visual comparison.

## 5. Review passes

### Pass A — thumbnail and blur

- does each state retain a dominant silhouette or density event?
- does attention follow the page's content axis?
- do phases look meaningfully different at small size?
- does any frame collapse into uniform texture?

### Pass B — full frame

- are edges, texture scales, opacity, and color roles coherent?
- does text contrast survive the highest-energy state?
- do labels collide, clip, or lose hierarchy?
- do mobile crops feel authored?

### Pass C — sequence

- can the core verb pair be inferred from the states?
- does change build toward one peak?
- is recovery visible and materially plausible?
- does the loop seam or scroll endpoint create a flash or jump?

### Pass D — source distance

- does the fingerprint differ on at least three axes?
- has the result inherited a recognizable combination of silhouette, palette, and motion?
- can a second structural variation be described without changing only color or counts?

## 6. Score with evidence

Score 1–5 and attach one observation to each:

| Category | 4 means |
| --- | --- |
| Thesis | the subject and phenomenon are visible without a long explanation |
| Frame | every key state has hierarchy, negative space, and readable content |
| Material | surface, light, edge, texture, and decay obey one model |
| Motion | phases create anticipation, consequence, peak, and recovery |
| Response | input is semantic, bounded, and stable after release |
| Originality | fingerprint is project-specific and structurally distant from sources |
| Resilience | mobile, reduced motion, fallback, performance, and lifecycle hold |

Revise every score below 4. Avoid averaging away a weak category.

## 7. Targeted revision loop

Choose the lowest category and make the smallest structural change that can raise it:

```text
OBSERVATION   “25%, 50%, and 75% share the same silhouette.”
CAUSE         Motion changes color and turbulence while topology stays fixed.
REVISION      At develop, split the primary route; at peak, join it at the decision node.
EVIDENCE      New five-state sheet shows three distinct silhouettes and stable text.
```

Capture again after the revision. Keep both sheets until the new result clearly improves the identified category.

## 8. Runtime verification

After visual approval, verify:

- resize, rotation, and zero-size recovery;
- pointer enter/exit, touch cancel, keyboard focus, and rapid input;
- forward/back navigation and route unmount;
- document hidden and offscreen pause;
- reduced-motion changes during the session;
- WebGL/context failure and poster path when applicable;
- console, page, and network errors;
- cleanup under repeated mount/dispose;
- project lint, typecheck, tests, and production build.

Use the package scripts in `scripts/` to automate deterministic capture and contact sheets where the environment supports browser automation.
