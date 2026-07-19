# Recipe catalog

Recipes describe visual grammar. Vary their parameters, composition, and semantic mapping for each project.

## 1. Particle current

- **Intent:** alive, collaborative, fluid, responsive
- **Roles:** ambient field, hero background, transition
- **Form:** short particles traveling through a vector field
- **Motion:** coherent flow with local turbulence and gradual respawn
- **Interaction:** pointer bends the field or creates a calm repulsion zone
- **Renderer:** Canvas 2D
- **Variation axes:** field equation, trail length, density, palette, attraction mode, safe-zone mask
- **Production note:** cap density by rendered area and device class

## 2. Resonance matrix

- **Intent:** intelligence, coordination, signal, computation
- **Roles:** section artifact, data surface, hero background
- **Form:** ordered cells or particles connected by propagating waves
- **Motion:** phase offsets, pulses, interference, local amplification
- **Interaction:** pointer emits a wave; data can seed amplitude and frequency
- **Renderer:** Canvas 2D or SVG + Canvas
- **Variation axes:** topology, spacing, wave speed, connection threshold, pulse source
- **Production note:** preserve enough order that the wave remains legible

## 3. Watercolor drift

- **Intent:** calm, crafted, atmospheric, expressive
- **Roles:** ambient field, editorial transition
- **Form:** translucent deposits, fibers, bloom edges, granulation
- **Motion:** very slow diffusion and pigment drift
- **Interaction:** pointer introduces water or gently clears pigment
- **Renderer:** Canvas 2D or WebGL
- **Variation axes:** pigment model, bloom radius, paper texture, palette, drying speed
- **Production note:** use a mostly static resting frame for reduced motion

## 4. Living orb

- **Intent:** organic intelligence, premium technology, presence
- **Roles:** hero focal, product concept artifact
- **Form:** deformed sphere, membrane, tendrils, or cellular shell
- **Motion:** breathing plus multi-frequency surface deformation
- **Interaction:** pointer parallax, local pulse, slow orientation
- **Renderer:** Three.js with a shader material
- **Variation axes:** silhouette, deformation scale, material, lighting, wireframe layer, asymmetry
- **Production note:** keep deformation slower than camera response

## 5. Voxel bloom

- **Intent:** construction, emergence, modular intelligence, space
- **Roles:** hero focal, scroll artifact
- **Form:** points, cubes, or voxels assembling into a larger silhouette
- **Motion:** phase-based assembly, drift, orbit, selective dissolution
- **Interaction:** scroll controls assembly; pointer changes camera or local density
- **Renderer:** Three.js
- **Variation axes:** source volume, target shape, voxel size, assembly order, material
- **Production note:** use instancing and a simplified mobile count

## 6. Radiance field

- **Intent:** energy, scale, mystery, advanced computation
- **Roles:** ambient field, hero material, transition
- **Form:** continuous luminous field with folds, interference, or displacement
- **Motion:** layered noise, wave interference, slow advection
- **Interaction:** pointer changes the field origin, lens, or turbulence
- **Renderer:** raw WebGL shader
- **Variation axes:** noise basis, color ramp, frequency, distortion, edge treatment, blend mode
- **Production note:** keep shader loops bounded and precision compatible with mobile GPUs

## 7. Meteorological scan

- **Intent:** observation, precision, simulation, active monitoring
- **Roles:** technical surface, product demo, data artifact
- **Form:** radial sweep, contour field, vectors, measurement marks
- **Motion:** scan rotation, sampled pulses, slow field drift
- **Interaction:** pointer selects a region or changes the sampled layer
- **Renderer:** WebGL + SVG or Canvas + SVG
- **Variation axes:** instrument geometry, data vocabulary, scan behavior, label density
- **Production note:** labels should describe real product concepts or neutral placeholders

## 8. Spatial lineage

- **Intent:** systems thinking, provenance, connection, infrastructure
- **Roles:** technical surface, section artifact
- **Form:** paths, nodes, clusters, annotations, routes
- **Motion:** path drawing, signal travel, focus expansion
- **Interaction:** hover or focus reveals one lineage; scroll can reveal stages
- **Renderer:** SVG
- **Variation axes:** topology, routing style, node archetype, label placement, reveal order
- **Production note:** expose meaningful nodes and connections to assistive technology

## Synthesis method

Combine recipes by assigning one to each layer of the visual sentence:

```text
SUBJECT      what the visitor recognizes
ATMOSPHERE   what gives it emotional tone
RESPONSE     how it acknowledges input
ANNOTATION   how the page explains it
```

Example: a living orb as the subject, a radiance field as atmosphere, resonance pulses as response, and a restrained spatial-lineage overlay as annotation.

Keep the final composition coherent by sharing one palette, one rhythm, one focal hierarchy, and one interaction model.
