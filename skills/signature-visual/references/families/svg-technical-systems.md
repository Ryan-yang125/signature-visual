# SVG technical systems

Use SVG for technical drawings, connection maps, instruments, topology, precise geometry, and semantic diagrams.

## Visual grammar

- Let line weight encode hierarchy.
- Use a small family of node archetypes with consistent meaning.
- Route paths with enough separation to remain readable.
- Use labels as information, with stable alignment and clear ownership.
- Combine one dominant system shape with sparse measurement marks.

## Structure

Group SVG content into layers:

```text
defs          gradients, markers, masks, filters
scaffold      grid, axes, measurement ticks
connections   routes and signal paths
nodes         entities, ports, anchors
signals       animated pulses or highlights
labels        titles, values, annotations
```

Keep meaningful labels as SVG text or accompanying HTML. Give meaningful diagrams a title and description.

## Motion

- Reveal routes with `stroke-dasharray` and `stroke-dashoffset`.
- Move signals along paths with `getPointAtLength` or CSS motion paths.
- Use phase offsets to create system rhythm.
- Animate one relationship at a time when the diagram teaches a sequence.

## Interaction

- Highlight one lineage on hover or focus.
- Expand node detail inside a stable layout.
- Map scroll to meaningful stages.
- Keep keyboard behavior equivalent to pointer behavior for interactive diagrams.

## Responsive behavior

- Use a stable viewBox and responsive rendered size.
- Recompose dense labels at narrow widths.
- Replace tiny labels with a summary or focus interaction on mobile.
- Keep stroke widths legible with vector effects when appropriate.

## Starter

Copy and adapt [svg-technical-system.js](../starters/svg-technical-system.js). Replace its topology, vocabulary, and visual hierarchy with concepts from the target product.
