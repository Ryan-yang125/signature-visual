# Canvas Fields

Use Canvas 2D for planar systems made from many marks: fields, fibers, trails, deposition, springs, cellular behavior, generative paint, and responsive data surfaces.

## Start with a state model

Define each agent or mark through semantic state:

```text
POSITION     current and previous coordinates
VELOCITY     movement with material-specific drag
IDENTITY     role, group, age, or source
ENERGY       capacity to respond or emit
HISTORY      trail, deposit, scar, or path memory
TEMPORAL     held state, accumulated history, branch, reveal, or authored progress
```

Typed arrays suit high counts. Objects suit smaller systems with diverse behavior. Keep rendering state separate from the page framework.

## Compose forces with meaning

Useful force families:

- advection through an analytic or sampled field;
- attraction/repulsion around semantic anchors;
- spring alignment and neighbor cohesion;
- boundary pressure, mask avoidance, or channel flow;
- resource gradients for growth and decay;
- curl derived from a scalar field for coherent circulation;
- data-driven vector or density fields.

Use one global rule, one local consequence, and any containment or aftermath required by the selected temporal archetype. Tune in normalized page coordinates so the behavior survives resizing.

Semi-implicit integration is stable for many web systems:

```js
vx += ax * dt;
vy += ay * dt;
vx *= Math.exp(-drag * dt);
vy *= Math.exp(-drag * dt);
x += vx * dt;
y += vy * dt;
```

Cap `dt` in production. Use a fixed step during deterministic capture.

## Seeded variation

Use a small deterministic random generator for initial conditions and mutations. A seed should reproduce emitter placement, agent identity, and any stochastic state changes. Keep time-based entropy outside capture mode.

```js
function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

## Rendering as material

Choose mark and decay together:

- hairline segments + long fade become fibers or long exposure;
- opaque dry marks + persistent buffer become graphite or plotter ink;
- translucent soft stamps + diffusion become pigment or vapor;
- short crisp dashes + sampled cadence become an instrument trace;
- variable-width ribbons + directional blur become flow or weaving.

Use `source-over` for physical layering. Reserve additive compositing for a sparse signal or high-energy state. Shadow blur across hundreds of marks is costly; render a small secondary glow pass when the direction truly needs emission.

## Spatial hierarchy

- design emitters as lines, contours, regions, or actual data positions;
- create a primary density event and a meaningful void;
- mask text-safe shapes with soft force boundaries when the field is integrated with copy;
- keep mark scale varied enough to show depth or identity;
- let trails reveal causality, with decay tied to material.

## Scaling and neighbors

Derive count from visible CSS area and cap it. Use a uniform spatial grid for neighbor queries once pairwise checks become significant. Rebuild grid buckets each fixed step and search adjacent cells only.

Mobile may use fewer agents, larger marks, a stronger silhouette, and shorter history. Preserve the signature rule.

## Deterministic controller

Support the relevant subset:

```js
setSeed(seed)        // rebuild repeatable initial state
seek({ time })       // reset and fixed-step to a state, or evaluate analytically
setPointer(state)    // normalized x/y/active
render()             // draw without scheduling a new frame
dispose()
```

For long simulations, store a few checkpoints or make state analytically evaluable to keep capture fast.

## Failure signatures

- uniform field: design emitters and density gradients;
- brown/random drift: strengthen the global equation and reduce force count;
- sparkle soup: reduce additive blend and assign signal color a state;
- indistinguishable states: change topology, density, history, or ownership across the temporal program;
- frozen reduced-motion frame: choose an authored composition and render full-length marks;
- resize reset flash: preserve normalized state or crossfade into rebuilt state.

## Runtime shell

Use [canvas-field.js](../starters/canvas-field.js) for ownership and lifecycle patterns. Replace its visual program fully: agent state, field equations, emitters, mark material, composition, and temporal program.
