# Integration Contract

Use this contract when a computational visual enters a product surface.

## Contents

- [Ownership and controller](#ownership-and-controller)
- [Atomic mount and authored fallback](#atomic-mount-and-authored-fallback)
- [Layout and framework mapping](#layout-and-layering)
- [Clock and deterministic bridge](#one-clock)
- [Sizing and pause state](#sizing-and-zero-size-recovery)
- [Primary action binding](#primary-action-binding)
- [Cleanup, performance, and accessibility](#resource-cleanup)
- [Verification handoff](#verification-handoff)

## Ownership and controller

Mount inside one explicit owner element. The owner creates, sizes, pauses, updates, and disposes the system. Keep copy, controls, links, and meaningful labels in HTML or semantic SVG.

The starter controllers are callable disposers with methods:

```js
const visual = createVisual(owner, options);

if (visual.ready) {
  visual.setSeed?.('project-direction-a');
  visual.seek?.({ time: 2.4, progress: 0.5 });
  visual.setPointer?.({ x: 0.72, y: 0.38, active: true, strength: 1 });
  visual.render?.();
}

console.table(visual.describe());
visual.dispose(); // visual() is equivalent in the starter shells
```

`dispose()` is mandatory and idempotent. `ready` reports whether a renderer or authored fallback has mounted. `describe()` must return stable semantic state suitable for Visual QA:

```js
{
  ready: true,
  disposed: false,
  renderer: 'canvas-2d',
  fallback: false,
  fallbackReason: null,
  paused: false,
  pauseReasons: [],
  width: 960,
  height: 540,
  dpr: 1.5,
  seed: 125,
  time: 2.4,
  progress: 0.5,
  pointer: { x: 0.72, y: 0.38, active: true, strength: 1 },
  reducedMotion: false
}
```

Renderer-specific fields may extend this shape. Keep the common fields stable across Canvas, SVG, Three.js, and WebGL.
`pointer.active` is the immediate semantic boolean. `pointer.strength` carries any eased 0–1 response value.

## Atomic mount and authored fallback

Treat initialization as a transaction:

1. store every owner style that may change;
2. create renderer resources inside a guarded block;
3. append generated DOM only when cleanup ownership is established;
4. on failure, release partially created resources and restore owner styles;
5. mount the supplied fallback and return a usable controller;
6. rethrow when no fallback was authored.

Accepted fallback shapes in the starter shells:

```js
fallback: '#10131c'                         // stable background treatment
fallback: posterElement                    // authored Node
fallback: ({ target, reason }) => node      // factory
fallback: () => ({ node, dispose() {} })    // owned node plus cleanup
fallback: () => () => {}                    // cleanup-only integration
```

Fallbacks preserve the thesis, composition, and content-safe area. A blank surface, generic error panel, or accidental black canvas fails this contract.

For WebGL and Three.js, handle both creation failure and `webglcontextlost`. Keep the fallback visible during loss, attempt restoration through the owned renderer, and expose the state through `describe()`.

## Layout and layering

- Give the owner an explicit block size, aspect ratio, or content-derived minimum.
- Establish a local stacking context and intentional crop.
- Use container-relative semantic coordinates from 0–1.
- Apply DPR only when mapping to a backing buffer.
- Keep decorative layers `pointer-events: none`; attach interaction to the owner.
- Preserve content contrast through the highest-energy state.
- Recompose dense annotations and crops at narrow widths.

## Framework mapping

### React

Create after the owner ref exists, return the disposer from the effect, and keep per-frame state outside React state. Rebuild only when semantic configuration changes materially. React Strict Mode can mount and dispose twice; idempotent cleanup keeps this safe.

### Vue

Create in `onMounted`, dispose in `onBeforeUnmount`, keep the renderer outside deep reactivity, and watch semantic inputs intentionally.

### Svelte

Use an action or `onMount` function that returns cleanup. Keep frame state local and expose semantic props through controller methods.

### Vanilla and SPA routers

Initialize after the owner exists. Dispose before route replacement, owner reuse, or hot reload. Remount into a clean owner and assert one generated renderer node.

## One clock

Use one authoritative clock:

- ambient work: elapsed time from an owned start point;
- event work: a temporal controller with named semantic states;
- scroll work: normalized progress;
- data work: state transitions plus optional micro-time.

Feed DOM, SVG, Canvas, Three.js, and shader uniforms from this clock when they form one system. Keep `seek()` capable of committing a stable frame for tests.

In development or `?sv-debug=1`, expose the controller through a bridge:

```js
window.__signatureVisual = {
  get ready() { return visual.ready; },
  setSeed: value => visual.setSeed?.(value),
  seek: value => visual.seek?.(value),
  setPointer: value => visual.setPointer?.(value),
  render: () => visual.render?.(),
  describe: () => visual.describe(),
  dispose: () => visual.dispose(),
  remount: () => mountVisualAgain()
};
```

Production builds may remove the bridge. Determinism still requires seeded randomness and state derived from explicit time, progress, input, and data.

## Sizing and zero-size recovery

- Observe the owner with `ResizeObserver`.
- Read CSS width and height before applying DPR.
- Cap DPR, commonly between 1.25 and 2 depending on fill cost.
- Recompute projection, resolution uniforms, viewBox mapping, and text-safe masks after resize.
- Reuse large allocations across observer callbacks when possible.
- When either CSS dimension reaches zero, cancel the animation frame and report `zero-size` in `pauseReasons`.
- On the next positive size, update buffers/projection, render one valid frame, and resume only when every other pause reason has cleared.

A 1 × 1 backing buffer may remain allocated for API safety. It must not keep the animation loop alive.

## Pause state and cancellation

Derive scheduling from explicit reasons. Typical values are:

```text
zero-size
offscreen
document-hidden
window-blur
reduced-motion
context-lost
renderer-unavailable
disposed
```

One `syncAnimation()` function should cancel the current frame, render a stable still when appropriate, and schedule a new frame only when all blocking reasons have cleared.

Clear active pointer energy immediately on:

- `pointerleave`;
- `pointercancel`;
- `lostpointercapture`;
- window `blur`;
- route disposal.

Also pause for `document.hidden` and offscreen owners. Resume from a controlled clock so long hidden intervals cannot create simulation explosions.

## Primary action binding

Meaningful action belongs to a semantic HTML control or focusable SVG element. Bind the controller to the control's `click` event; native buttons automatically map pointer click, Enter, and Space to the same event.

When a custom control is unavoidable, implement focus, role, name, Enter, Space, pressed/selected state, and visible focus explicitly. Verify pointer and keyboard paths reach the same semantic state or action counter.

## Resource cleanup

Release every owned resource:

- animation frame IDs, timers, and timeline callbacks;
- pointer, window, document, and media-query listeners;
- resize and intersection observers;
- worker messages and transferable buffers;
- WebGL programs, shaders, buffers, textures, framebuffers, and renderbuffers;
- Three.js geometries, materials, textures, render targets, controls, composers, and renderer;
- generated DOM/SVG nodes, definitions, fallback nodes, and temporary owner styles.

Call cleanup twice during tests. Then remount and assert one renderer node, a ready controller, and zero console errors.

## Performance

- Tie particle/instance count to visible area with a hard ceiling.
- Reuse arrays, vectors, paths, geometries, and materials inside loops.
- Keep shader loops statically bounded.
- Batch or instance repeated geometry.
- Limit post-processing to one primary finish and one subtle support pass.
- Activate only visible GPU scenes on gallery pages.
- Profile the real product surface at maximum visual energy.

Design mobile as its own composition: reduce layers, change crop/anchor, simplify simulation, lower DPR, or select a strong still.

## Accessibility

- Mark decorative renderers `aria-hidden="true"`.
- Provide `<title>`, `<desc>`, labels, and keyboard focus for meaningful SVG systems.
- Keep controls at least 44 × 44 CSS pixels on touch surfaces.
- Keep essential information available outside rasterized pixels.
- Preserve focus indicators above visual layers.
- Implement the authored reduced-motion direction and respond to runtime preference changes.
- Keep flashing below hazardous thresholds and avoid rapid full-field luminance changes.

## Verification handoff

Declare capabilities and executable scenarios in a V3 manifest. Cover resize, zero-size recovery, full pointer cancellation, focus loss, keyboard equivalence, runtime reduced-motion changes, dispose/remount, GPU fallback/context behavior, and primary action binding. Mark an inapplicable capability N/A with a concrete reason.

See [visual-qa.md](visual-qa.md) for the scenario language and generated evidence.
