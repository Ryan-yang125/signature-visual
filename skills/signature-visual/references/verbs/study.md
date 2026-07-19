# Study a visual reference

Use `study` to extract portable visual DNA from an HTML file, screenshot, or URL.

## Study sequence

1. Render or inspect the reference at its intended viewport.
2. Identify the visual’s role in the page.
3. Separate form, composition, motion, interaction, material, and renderer.
4. Inspect the code when available to understand implementation mechanics.
5. Name the design decisions that create the feeling.
6. Define at least five variation axes.
7. Record production constraints and fallback behavior.
8. Emit a Visual DNA Card.

## Visual DNA Card

```yaml
name: portable-recipe-name
thesis: one sentence describing the visual idea
intent: [three, descriptive, qualities]
roles: [hero-focal, section-artifact]
form:
  primitives: []
  silhouette: ""
  topology: ""
composition:
  placement: ""
  focal_hierarchy: ""
  text_safe_zone: ""
motion:
  base: ""
  secondary: ""
  rhythm: ""
interaction:
  input: ""
  mapping: ""
  recovery: ""
material:
  palette_relationship: ""
  opacity_and_blend: ""
renderer:
  preferred: ""
  alternatives: []
variation_axes: []
production:
  performance: ""
  mobile: ""
  reduced_motion: ""
  cleanup: ""
```

## Extraction standard

Describe relationships and mechanisms. Keep page copy, brand identifiers, proprietary assets, and whole-page structure out of the portable recipe. Preserve a source note privately when provenance matters. Confirm the redistribution rights of any code or asset before placing it in a public package.
