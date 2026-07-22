# WebGL Shader Fields

Use raw WebGL when a continuous material or field evaluated per pixel is the visual subject: light transport, diffusion, pressure, interference, erosion, scanning, reaction patterns, or GPU simulation.

## Treat the shader as a visual function

Design deterministic inputs:

```glsl
color = visual(
  normalizedPosition,
  aspect,
  time,
  progress,
  semanticPointer,
  seed,
  projectParameters
);
```

At a fixed input state, the frame must repeat. Keep random texture generation seeded or load stable data.

## Spatial hierarchy before noise

Construct the frame in this order:

1. primary silhouette, boundary, horizon, aperture, or topology mask;
2. one large-scale field that shapes density and direction;
3. one supporting frequency that gives material character;
4. sparse detail or grain at the appropriate scale;
5. palette roles and tonal hierarchy;
6. state-driven signal or exception.

Domain warping is a transformation tool. Give it a boundary and a semantic role. Full-frame multi-octave noise with a bright palette often reads as a shader demo.

## Coordinates

Keep semantic coordinates aspect-correct:

```glsl
vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy)
        / min(uResolution.x, uResolution.y);
```

Map pointer and project masks through the same transform. Keep a second 0–1 coordinate when screen-fixed texture or UI alignment needs it.

## Field building blocks

- signed distance fields for controlled geometry, masks, and edge distance;
- value/gradient noise for large-scale variation;
- fBM with a restrained octave count for material complexity;
- curl or gradient sampling for directional flow;
- reaction/diffusion or feedback buffers for evolving structure;
- interference and phase functions for signal relationships;
- advection for transport and history;
- palette ramps tied to material and semantic thresholds.

Combine blocks through the signature rule. Limit general-purpose layers that lack a named contribution.

## Material and color

Simulate the chosen substance through edge, falloff, scattering cue, texture attachment, and decay. Assign uniform colors by roles: ground, body, signal, exception, annotation.

Keep emission scarce. Tone-map or clamp high-energy states so they preserve content contrast. Screen-fixed grain can bind the render to a display or print artifact; material grain should move with the field.

## Interaction

Pass normalized semantic state instead of raw pointer alone:

```text
probe position + pressure
source and sink positions
alignment or fault progress
reveal aperture and phase
data field or mask texture
```

Smooth input outside the shader or with explicit time constants. Define pointer exit and capture it as a recovered state.

## Compatibility and fallback

- check context creation before compiling;
- report shader compile and link logs during development;
- keep loops statically bounded and precision-aware;
- handle `webglcontextlost` and recreate when appropriate;
- provide a poster, Canvas alternative, or stable CSS/SVG composition on failure;
- render one authored state for reduced motion.

## Performance

- cap DPR by fill cost, often lower than geometry scenes;
- minimize texture reads and dependent branches in large surfaces;
- size feedback targets below display resolution when material permits;
- use half/byte formats only after capability checks;
- pause offscreen and avoid running multiple gallery shaders simultaneously;
- test integrated page cost, especially on mobile GPUs.

## Deterministic controller

Expose `seek({ time, progress })`, semantic pointer/data setters, `render()`, and `dispose()`. Render exactly once after state updates during capture. Feedback simulations require resettable seed buffers or saved checkpoints.

## Failure signatures

- plasma familiarity: add a strong spatial mask and reduce palette movement;
- rainbow field: assign colors semantic roles and reserve an exception;
- muddy focus: create one threshold, silhouette, or tonal event;
- pointer lens demo: map input to the subject's field rule;
- black failure surface: implement creation/context-loss fallback;
- reduced-motion dead frame: select a composed phase and keep material detail visible.

## Runtime shell

Use [webgl-shader-field.js](../starters/webgl-shader-field.js) for context setup, uniforms, visibility, and cleanup. Replace the fragment program, spatial hierarchy, palette, material model, and state score.
