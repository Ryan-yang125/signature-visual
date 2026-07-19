# Canvas fields

Use Canvas 2D for many lightweight marks whose state changes every frame: particles, trails, connections, vector fields, generative paint, cellular systems, and responsive backgrounds.

## Visual grammar

- Give particles a shared field so the group reads as one phenomenon.
- Combine one coherent force with one local disturbance.
- Use trails to reveal motion; use points to reveal density.
- Shape empty space as deliberately as particle density.
- Mask or repel particles from the text-safe zone.

## Field models

### Trigonometric flow

Fast and expressive. Derive an angle from layered sine and cosine functions of normalized position and time.

```js
const angle =
  Math.sin(nx * scale + time * 0.22) * 1.4 +
  Math.cos(ny * scale * 0.8 - time * 0.17) * 1.1;
vx += Math.cos(angle) * force;
vy += Math.sin(angle) * force;
```

### Curl-like flow

Sample a scalar noise field at small x/y offsets and rotate its gradient. This creates locally circulating motion and avoids obvious directional bias.

### Spring network

Connect nearby particles under a maximum distance, then combine spring forces with damping. Use a spatial grid when particle counts exceed a few hundred.

## Rendering choices

- Use translucent strokes with `source-over` for clean trails.
- Use `lighter` sparingly for luminous signals.
- Fade the previous frame with `destination-out` when the canvas has a transparent background.
- Scale line width in CSS pixels after applying DPR transforms.
- Avoid shadow blur on hundreds of particles; draw a small glow pass or use compositing.

## Performance

- Derive count from owner area and cap it.
- Store particle state in typed arrays.
- Reuse paths and temporary values inside the loop.
- Use a capped DPR.
- Pause outside the viewport and on hidden documents.
- Reduce count, trail length, and connection distance on mobile.

## Starter

Copy and adapt [canvas-field.js](../starters/canvas-field.js). Change the field equation, safe-zone behavior, palette, and particle archetype so the visual belongs to the target project.
