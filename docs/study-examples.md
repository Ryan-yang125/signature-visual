# Study example: Living Orb

This card demonstrates the portable output of `signature-visual study`.

```yaml
name: living-orb
thesis: A responsive membrane gives an intelligent system a calm physical presence.
intent: [alive, intelligent, premium]
roles: [hero-focal, product-concept]
form:
  primitives: [icosahedron, membrane, wire-shell, orbital-dust]
  silhouette: large asymmetric sphere with a controlled crop
  topology: continuous surface with a secondary wireframe shell
composition:
  placement: right-weighted focal object
  focal_hierarchy: headline, membrane, sparse instrumentation
  text_safe_zone: left 42 percent
motion:
  base: slow breathing and rotation
  secondary: multi-frequency normal deformation
  rhythm: calm, continuous, organic
interaction:
  input: pointer position
  mapping: bounded orientation and subtle parallax
  recovery: eased return to the idle orientation
material:
  palette_relationship: one cool body color and one warm field accent
  opacity_and_blend: opaque membrane, faint additive wire shell
renderer:
  preferred: Three.js with a custom shader material
  alternatives: raw WebGL raymarched field, Canvas metaball field
variation_axes:
  - silhouette asymmetry
  - deformation frequencies
  - material response
  - crop and camera
  - shell topology
  - palette relationship
production:
  performance: capped DPR and bounded geometry detail
  mobile: smaller geometry and a lower-right composed crop
  reduced_motion: stable shader frame with direct pointer response disabled
  cleanup: dispose geometry, materials, particles, renderer, frames, and observers
```
