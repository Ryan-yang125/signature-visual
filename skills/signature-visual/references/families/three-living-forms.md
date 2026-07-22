# Three.js Spatial Forms

Use Three.js when depth, occlusion, camera, geometry, light, or spatial assembly carries the direction.

## Build from silhouette outward

Choose a recognizable spatial subject before selecting geometry classes:

- membrane, shell, folded sheet, organ, root, or colony;
- exploded assembly, stack, voxel body, or modular instrument;
- terrain, cross-section, corridor, aperture, or nested volume;
- routed tube, braid, orbit, or connected scaffold;
- actual product or data-derived geometry.

Test the object as a flat black silhouette at desktop and mobile crops. Shader detail cannot rescue an anonymous outline.

## Geometry systems

- custom `BufferGeometry` for project-specific contours and data forms;
- instanced geometry for modules, cells, particles, or repeated marks;
- tube/curve geometry for causal routes, growth, and braids;
- displaced planes for terrain, tissue, cloth, or thresholds;
- signed-distance/raymarched material when the surface itself is the subject;
- primitive geometry only when the primitive has semantic meaning or is transformed structurally.

Deformation needs spatial logic: boundary pressure, resource field, attachment points, local signal propagation, or data. Combine a large-scale structural mode with restrained surface detail.

## Material model

Define surface, illumination, and finish separately:

```text
SURFACE       roughness, transmission, thickness, metalness, opacity, micro-normal
ILLUMINATION  key direction, fill level, rim purpose, environment, shadow
FINISH        color grade, grain, depth cue, bloom, vignette
```

Material archetypes:

- **tissue:** transmission/subsurface cue, local thickness, soft roughness, internal pulse;
- **mineral:** high roughness variation, crystalline facets, grazing light;
- **ceramic:** controlled specular, smooth body, micro-imperfections, clear silhouette;
- **film:** thin transmission, iridescence tied to view angle, restrained edge response;
- **machined:** precise bevels, coherent environment reflection, limited wear;
- **emissive body:** dark support material with emission reserved for semantic state.

Use one primary material and one structural counterpoint. Generic Fresnel emission and wireframe shells quickly dominate identity.

## Lighting

Use light to reveal the selected silhouette:

- key establishes form and dominant edge;
- fill preserves readable shadow structure;
- rim separates one critical boundary;
- environment contributes material context;
- embedded or emissive light communicates state.

Rotate the object or light only when the motion score calls for a phase change. A permanently orbiting camera often weakens the resting composition.

## Motion and interaction

Animate semantic controls: pressure, permeability, assembly, adhesion, growth, fold, signal, or exposure. Let local response propagate through geometry or material over time.

Keep camera response slower and smaller than object response. Set strict parallax bounds and recover with critical or material-appropriate damping.

## Post-processing budget

Choose one primary finish and optionally one subtle support:

- selective bloom for a rare emissive state;
- depth of field for a specimen or macro scale with a stable focal subject;
- fine grain to bind layers to a photographic or printed material;
- restrained color grade for tonal unity.

Chromatic aberration, glitch, bloom, vignette, and heavy grain together produce a familiar demo finish. Spend processing budget on the effect that advances the material thesis.

## Performance

- use the lowest subdivision that preserves silhouette and deformation;
- instance repeated geometry and batch materials;
- cap DPR according to shader and post cost;
- minimize transparent overdraw;
- avoid per-frame allocations and unnecessary matrix updates;
- pause offscreen and dispose every owned resource;
- simplify passes, geometry, and transparency on mobile before changing the concept.

## Deterministic controller

Derive uniforms, animation mixers, camera, and object state from one time/progress source. Expose `seek`, semantic pointer state, `render`, and `dispose`. Update matrices and render once after seeking.

## Failure signatures

- blob familiarity: replace primitive silhouette and uniform noise with a product-specific boundary condition;
- material lottery: return to one substance and one counterpoint;
- unreadable depth: strengthen overlap, lighting, and scale hierarchy;
- camera sickness: reduce amplitude, remove continuous orbit, author a stable rest;
- mobile thumbnail: recompose camera, crop, and layer count for the narrow frame;
- expensive polish: remove passes that do not alter the chosen material or hierarchy.

## Runtime shell

Use [three-living-form.js](../starters/three-living-form.js) for renderer ownership, sizing, pause, and disposal. Replace its geometry, shader/material, lighting, camera composition, and phase behavior.
