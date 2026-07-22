# Renderer Routing

Route after selecting a Direction Card and authoring its composition, material, motion, and interaction. The engine must preserve the signature rule with the smallest justified complexity.

## Evidence table

| Required property | Canvas 2D | Three.js | Raw WebGL | SVG |
| --- | ---: | ---: | ---: | ---: |
| Thousands of independent marks | excellent | strong with points/instancing | strong with GPU state | limited |
| Trails and persistent deposition | excellent | possible with targets | excellent | limited |
| Camera, occlusion, real depth | limited | excellent | custom | simulated |
| Custom continuous material | limited | excellent | excellent | limited |
| Crisp paths, type, labels | adequate | weak | weak | excellent |
| Accessible semantic geometry | weak | weak | weak | excellent |
| Small embedded artifact | excellent | often excessive | possible | excellent |
| Full-surface field | strong | possible | excellent | limited |
| Existing DOM coordination | strong | adequate | adequate | excellent |
| Static fallback from same source | strong | capture/export | render once | native |

## Route by visual program

### Choose Canvas 2D when

- state belongs to many lightweight agents or marks;
- history, trails, diffusion, or deposition is central;
- the composition is primarily planar;
- fast custom drawing matters more than scene-graph semantics.

### Choose Three.js when

- camera, occlusion, spatial assembly, lighting, or a 3D silhouette carries meaning;
- the direction needs geometry and material to respond together;
- repeated objects can use instancing;
- the project can justify the dependency and GPU lifecycle.

### Choose raw WebGL when

- the visual is a continuous material or field evaluated across the surface;
- a custom fragment or simulation equation creates the central behavior;
- a scene graph adds little value;
- shader compilation and fallbacks can be owned safely.

### Choose SVG when

- paths, labels, topology, type, and precision are primary;
- elements need focus, semantics, or direct DOM styling;
- the visual behaves like a document, diagram, map, score, or instrument;
- responsive re-composition benefits from explicit geometry.

## Combination rules

Assign one lead engine and one narrow support role:

- Canvas lead + SVG annotation for a living field with stable semantic anchors.
- WebGL lead + HTML/SVG instrument for a continuous material seen through calibrated controls.
- Three.js lead + HTML/SVG annotation for a spatial specimen with accessible labels.
- SVG lead + Canvas residue for a topology whose routes deposit history.

Write ownership before coding:

```text
LEAD       owns silhouette, primary motion, and signature rule
SUPPORT    owns labels, texture, history, or controls only
CLOCK      one source of normalized time/progress
INPUT      one normalized semantic state shared by both
FALLBACK   one composition that retains the thesis without the lead engine
```

Avoid layering engines solely to increase spectacle.

## Tie-breakers

When several engines can deliver the direction:

1. prefer the engine already healthy in the project;
2. prefer the one that directly expresses the primary material or state model;
3. keep meaningful text and controls in accessible DOM/SVG;
4. prefer Canvas or SVG for small inline placements;
5. justify Three.js or a new GPU layer through spatial or material necessity;
6. choose the path with deterministic capture and a credible fallback.

## Capability budget

Record a budget before implementation:

```text
VIEWPORTS     desktop and mobile owner dimensions
DPR CAP       target and mobile cap
STATE COUNT   particles, instances, paths, textures, passes
FRAME TARGET  60 / 30 / event-driven / static
MEMORY        major buffers, textures, render targets
FALLBACK      low capability and context-loss presentation
```

Complexity should purchase an observable part of the selected direction.
