# Visual routing

Use this reference to translate user language into a visual family. Start with the desired experience and page role. Choose the renderer after those decisions.

## Routing sequence

1. Identify the page role.
2. Name the emotional and semantic intent.
3. Choose a dominant behavior.
4. Decide how input affects the behavior.
5. Select the simplest renderer that carries the idea with enough fidelity.

## Natural-language signals

| User language | Likely role | Likely grammar | Renderer candidates |
| --- | --- | --- | --- |
| “The hero feels empty” | Hero focal or ambient | One bold object, field, or diagram | Three.js, Canvas, WebGL |
| “Make it feel alive” | Hero focal or section artifact | Breathing, growth, flocking, deformation | Three.js, Canvas |
| “Add atmosphere” | Ambient field | Drift, flow, haze, parallax, restrained response | Canvas, WebGL |
| “More futuristic” | Depends on product | Energy field, instrument, spatial object | WebGL, SVG, Three.js |
| “Scientific / precise” | Technical surface | Grid, labels, topology, measurement, scan | SVG, Canvas |
| “Show connection / collaboration” | Section artifact | Network, lineage, orbit, signal transfer | Canvas, SVG |
| “React to the cursor” | Any | Attraction, parallax, reveal, lens, wave | Any |
| “Come alive on scroll” | Transition or section artifact | Emergence, assembly, phase change | SVG, Three.js, WebGL |

## Family selection

### Canvas fields

Choose Canvas when the visual contains many similar lightweight marks whose positions change every frame. It excels at particles, trails, vector fields, spring networks, cellular systems, and generative paint.

### Three.js living forms

Choose Three.js when the visual needs a camera, depth, lighting, geometry, post-processing, or a hero object that can be understood spatially.

### WebGL shader fields

Choose raw WebGL when the visual idea is a continuous field or material computed per pixel: radiance, liquid distortion, reaction-diffusion, scanning, interference, volumetric-looking haze, or energy.

### SVG technical systems

Choose SVG when crisp paths, readable labels, precise geometry, topology, and accessibility matter. It excels at technical drawings, diagrams, instruments, maps, and schematic motion.

## Combination rules

- Canvas + SVG: use Canvas for a living field and SVG for semantic labels or crisp overlays.
- Three.js + SVG: use Three.js for the spatial artifact and SVG/HTML for annotations.
- WebGL + HTML: use WebGL as a material layer and keep content in normal document flow.
- WebGL + SVG: use WebGL for atmosphere and SVG for instrumentation.

Assign one renderer as the visual lead. Give supporting layers narrower responsibilities.

## Tie-breakers

When two renderers can carry the idea:

1. Prefer the renderer already present in the project.
2. Prefer the option with a graceful static fallback.
3. Prefer the option that keeps meaningful text and controls in the DOM.
4. Prefer Canvas or SVG for small embedded visuals.
5. Reserve a new 3D dependency for a spatial concept strong enough to justify it.
