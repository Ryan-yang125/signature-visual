# WebGL shader fields

Use raw WebGL when the visual’s subject is a continuous field or material computed per pixel: radiance, liquid distortion, interference, scanning, energy, reaction patterns, or atmospheric depth.

## Visual grammar

- Build one dominant field with two supporting frequencies.
- Use color ramps that come from the project’s palette.
- Reserve the brightest values for a controlled focal region.
- Keep pointer influence local and eased.
- Compose readable still frames at any time value.

## Coordinate system

Normalize fragment coordinates and correct aspect ratio before building the field.

```glsl
vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
```

Use the same transform for pointer coordinates so interaction stays aligned across aspect ratios.

## Field construction

- Layer value noise or gradient noise at 3–5 octaves.
- Advect the domain slowly for fluid movement.
- Use signed distance fields for controlled shapes and masks.
- Use interference waves for signal and resonance metaphors.
- Use smoothstep bands for contours, scans, and technical surfaces.

## Color

Build a palette from 2–4 uniform colors. Mix colors through field values and reserve direct emissive additions for a small region.

## Compatibility

- Keep loops statically bounded.
- Use `highp` when available and preserve a `mediump`-safe path.
- Check shader compile and link logs.
- Handle context loss and recreate when the host application requires it.
- Provide a static or low-frequency frame for reduced motion.

## Starter

Copy and adapt [webgl-shader-field.js](../starters/webgl-shader-field.js). Replace the fragment field and palette mapping while retaining the lifecycle shell.
