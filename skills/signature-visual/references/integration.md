# Integration Contract

Use this contract when a computational visual enters a real product surface.

## Ownership

Mount inside one explicit owner element. The owning component creates, sizes, pauses, updates, and disposes the visual. Keep copy, controls, links, and meaningful labels in normal HTML or semantic SVG.

Expose a small controller:

```js
const visual = createVisual(owner, options);

visual.setState?.({ energy: 0.4, focus: 'route-a' });
visual.seek?.({ time: 2.4, progress: 0.5 });
visual.setPointer?.({ x: 0.72, y: 0.38, active: 1 });
visual.render?.();
visual.dispose();
```

`dispose()` is mandatory. Other methods depend on the design, though deterministic time and input controls greatly improve QA.

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

Create after the owner ref exists, return the disposer from the effect, and keep per-frame state outside React state. Rebuild only when semantic configuration changes materially.

### Vue

Create in `onMounted`, dispose in `onBeforeUnmount`, keep the renderer instance outside deep reactivity, and watch semantic inputs intentionally.

### Svelte

Use an action or `onMount` function that returns cleanup. Keep frame state local and expose semantic props through controller methods.

### Vanilla and SPA routers

Initialize after the owner exists. Call the disposer before replacing the route, reconnecting the same owner, or hot-reloading custom modules.

## One clock

Use one authoritative clock:

- ambient work: elapsed time from an owned start point;
- event work: a phase controller with named states;
- scroll work: normalized progress;
- data work: state transitions plus optional micro-time.

Feed DOM, SVG, Canvas, Three.js, and shader uniforms from the same clock when they form one visual system. Libraries already in the project may orchestrate the clock. Keep `seek()` capable of rendering a stable frame for tests.

## Deterministic development bridge

In development or `?sv-debug=1`, expose:

```js
window.__signatureVisual = {
  ready: true,
  setSeed,
  seek,
  setPointer,
  render,
  describe: () => ({ phase, seed, time, progress })
};
```

Production builds may remove the bridge. Determinism requires a seeded random source, fixed capture time/progress, and state derived from those values.

## Sizing

- Observe the owner with `ResizeObserver`.
- Cap device-pixel ratio, commonly 1.25–2 depending on fill cost.
- Recompute projection, resolution uniforms, viewBox mapping, and text-safe masks after resize.
- Avoid rebuilding large allocations on every observer callback; debounce or reuse when needed.
- Treat zero-size owners as paused.

## Visibility and lifecycle

Pause when the owner leaves the viewport or `document.hidden` becomes true. Resume from a controlled clock so long hidden intervals do not create simulation explosions.

Release:

- animation frame IDs and timers;
- listeners and media-query handlers;
- resize and intersection observers;
- worker messages and transferable buffers;
- WebGL programs, shaders, buffers, textures, framebuffers, and renderbuffers;
- Three.js geometries, materials, textures, render targets, controls, composers, and renderer;
- generated DOM/SVG nodes and definitions.

Use idempotent cleanup so route transitions and development remounts remain safe.

## Performance

- tie particle/instance count to visible area with a hard ceiling;
- reuse arrays, vectors, paths, geometries, and materials inside loops;
- keep shader loops statically bounded;
- batch or instance repeated geometry;
- limit post-processing to one primary finish and one subtle support pass;
- activate only visible GPU scenes on gallery pages;
- serve a poster or stable rendered state before lazy initialization;
- profile the real page when the effect fills a large surface.

Design mobile intentionally: reduce layers, change crop/anchor, simplify simulation, lower DPR, or select a strong still. Shrinking the desktop scene alone rarely preserves hierarchy.

## Accessibility

- mark decorative renderers `aria-hidden="true"`;
- provide `<title>`, `<desc>`, labels, and keyboard focus for meaningful SVG systems;
- keep controls at least 44 × 44 CSS pixels on touch surfaces;
- never hide essential information exclusively inside pixels;
- preserve focus indicators above visual layers;
- implement the reduced-motion direction from the design specification;
- keep flashing below hazardous thresholds and avoid rapid full-field luminance changes.

## Fallbacks

Preserve thesis and composition through one of:

- an authored SVG or image poster;
- a Canvas render with fewer marks or simpler forces;
- one stable Three.js render with simplified material;
- a shader frame rendered once;
- an HTML/SVG instrument state showing the same semantic result.

Handle WebGL creation failure and context loss without leaving an empty or black surface.
