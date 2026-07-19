# Three.js living forms

Use Three.js for focal objects that need depth, geometry, camera behavior, lighting, or spatial assembly.

## Visual grammar

- Start from one legible silhouette.
- Deform geometry at multiple frequencies: a slow global breath and a finer surface current.
- Let material and lighting reveal the form’s topology.
- Keep camera response calmer than surface motion.
- Use secondary points, wireframes, or annotations as support layers with lower contrast.

## Geometry choices

- `IcosahedronGeometry`: even topology for organic deformation.
- Instanced boxes or points: voxel bloom and assembly effects.
- Tube or line geometry: tendrils, paths, and signal routes.
- Custom `BufferGeometry`: project-specific silhouettes and data forms.

## Shader deformation

Offset each vertex along its normal. Combine object-space position with time and a low-frequency breathing term.

```glsl
float breath = sin(uTime * 0.85) * 0.5 + 0.5;
float field =
  sin(position.x * 2.7 + uTime) *
  sin(position.y * 2.2 - uTime * 0.7) *
  sin(position.z * 3.1 + uTime * 0.45);
vec3 transformed = position + normal * (field * uEnergy + breath * 0.045);
```

Vary frequency, directional bias, and material response. Preserve enough stable topology for the visitor to recognize the object.

## Material choices

- Fresnel response communicates a membrane or energetic shell.
- Matcap-like gradients create readable volume without a lighting rig.
- Wireframe overlays communicate topology and computation.
- Additive shells create aura; keep their opacity low.

## Performance

- Cap DPR at 1.5–2.
- Use the lowest subdivision that preserves the silhouette.
- Use instancing for repeated geometry.
- Dispose geometry, material, textures, targets, and renderer.
- Replace complex post-processing with a restrained material on mobile.

## Starter

Copy and adapt [three-living-form.js](../starters/three-living-form.js). It expects the host project to provide the `three` package or an import map for the `three` specifier.
