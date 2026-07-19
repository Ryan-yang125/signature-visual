# Integration contract

Use this contract when adding a computational visual to a real project.

## Ownership

- Mount the renderer inside one explicit owner element.
- Keep content and controls in normal HTML flow.
- Let the owning component create, resize, pause, and dispose the visual.
- Return a teardown function from framework-neutral starters.

## Layout and layering

- Define the visual container’s aspect ratio or minimum block size.
- Set a deliberate stacking context.
- Keep decorative canvases and SVG overlays `pointer-events: none` unless they own interaction.
- Use container-relative pointer coordinates.
- Clip at the visual owner when the composition requires a crop.
- Test overflow at mobile widths.

## Framework mapping

### React

- Create the visual inside an effect after the container ref exists.
- Return the visual’s disposer from the effect.
- Keep option objects stable or recreate intentionally.
- Avoid storing per-frame values in React state.

### Vue

- Mount in `onMounted` and dispose in `onBeforeUnmount`.
- Keep the renderer instance outside reactive state.
- Watch only semantic options that should trigger a rebuild.

### Svelte

- Use an action or `onMount` callback that returns teardown.
- Keep frame data in local variables.
- Rebuild when semantic props change materially.

### Vanilla

- Initialize after the owner exists.
- Store the returned disposer and call it before replacing content or navigating in an SPA.

## Sizing

- Use `ResizeObserver` on the owner element.
- Cap device pixel ratio, commonly at 1.5–2.
- Set the backing buffer from CSS pixels × capped DPR.
- Recompute camera aspect, projection, SVG viewBox, and interaction transforms after resize.

## Performance

- Scale particle or instance count by visible area with a ceiling.
- Reuse typed arrays, geometries, materials, and vectors inside frame loops.
- Keep shader loops statically bounded.
- Pause when `document.hidden` or when the owner leaves the viewport.
- Measure the real page with DevTools or browser tracing when the effect is substantial.
- Offer a simplified mobile path based on capability and composition.

## Cleanup

Release every resource the visual owns:

- animation frame IDs;
- event listeners;
- `ResizeObserver` and `IntersectionObserver` instances;
- WebGL buffers, programs, shaders, textures, framebuffers, and contexts when practical;
- Three.js geometries, materials, textures, render targets, controls, and renderer;
- temporary DOM nodes and SVG defs.

## Accessibility

- Mark purely decorative visuals `aria-hidden="true"`.
- Give meaningful SVG diagrams a `<title>`, `<desc>`, stable labels, and keyboard-reachable interactive nodes.
- Preserve focus indicators and control hit areas above visual layers.
- Implement a reduced-motion presentation.

## Fallbacks

Use a fallback that preserves the visual thesis:

- a static SVG composition;
- a captured poster image;
- a lower-density Canvas system;
- a simplified Three.js material;
- a stable shader frame rendered once.
