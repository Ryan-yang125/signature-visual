# SVG Systems

Use SVG when paths, topology, type, labels, semantic nodes, and precise geometry carry the direction. It is strong for documents, instruments, maps, scores, lineage, and responsive technical artifacts.

## Author an information hierarchy

Define the meaning of every visual class:

```text
GROUND       page, plate, or instrument surface
SCAFFOLD     axes, grid, bounds, calibration, grouping
ROUTES       primary and secondary relationships
NODES        entities, ports, samples, decisions
SIGNALS      current activity, focus, anomaly, completion
LABELS       names, values, evidence, annotations
HISTORY      previous routes, strata, residues
```

Line weight, color, dash, opacity, and spacing should encode this hierarchy. A grid or coordinate label needs an informational or artifact role.

## Spatial grammars

- route topology with one dominant causal path;
- technical plate with multiple comparable views;
- calibrated instrument around one measured phenomenon;
- exploded assembly with numbered relations;
- lineage or decision trace with persistent evidence;
- typographic contour where text is the geometry;
- map or field with meaningful annotation anchors.

Use a stable `viewBox`. Recompose groups and labels for mobile through alternate transforms, paths, or markup when the desktop topology will not fit.

## Path orchestration

Useful native mechanisms:

- `stroke-dasharray`/`stroke-dashoffset` for route acquisition;
- `getTotalLength()` and `getPointAtLength()` for deterministic signals;
- path interpolation when source and target share compatible point topology;
- motion paths for elements that genuinely travel along a route;
- masks and clip paths for reveals and cross-sections;
- transforms for assembly, calibration, and focus.

Coordinate all paths through one semantic state model. This can be continuous progress, accumulated history, a branch, a held inspection state, or discrete transitions. Revealing every line at once usually hides hierarchy.

## Morphing

Morph when a change in shape communicates a change in state or classification. Normalize path direction, start point, closure, and point count before interpolation. For unrelated shapes, design intermediate topology or crossfade/assemble through meaningful parts.

Keep important labels stable through deformation, or move them through explicitly authored anchor positions.

## Instrument behavior

An instrument needs a measurable model:

- define input domain and units;
- map values to geometry consistently;
- separate acquisition, lock, warning, and result states;
- ensure ticks and labels agree with the model;
- give controls real effects with bounded ranges;
- use display texture and latency consistently.

## Interaction and accessibility

- use focusable semantic groups for meaningful nodes;
- provide `<title>` and `<desc>` plus accessible names for controls;
- mirror hover with focus and touch selection;
- keep labels legible and avoid collisions at every authored state;
- use DOM order that follows the reading or causal order;
- provide a textual summary when the diagram carries essential information.

Pure decoration can be `aria-hidden="true"` and excluded from focus.

## Performance

- limit complex filters across large areas;
- reuse definitions and symbols for repeated structures;
- avoid updating large numbers of attributes when a group transform suffices;
- cache path lengths and coordinate samples;
- prefer CSS variables and classes for coordinated state changes;
- pause JS-driven signals offscreen.

## Deterministic controller

Drive every animated property from explicit semantic state. Use normalized progress only when the chosen temporal archetype calls for it. Expose `seek`, focus/data setters, `render`, and `dispose`. Every captured state must contain a valid hierarchy.

## Failure signatures

- generic node graph: derive routes and groupings from the subject;
- decorative HUD: remove labels and ticks that do not encode state;
- line-drawing demo: reveal relations in causal order;
- label collision: provide explicit anchors and mobile layout;
- moving-dot network: make signal timing change another visible state;
- inaccessible diagram: add semantic order, focus parity, description, and summary.

## Runtime shell

Use [svg-technical-system.js](../starters/svg-technical-system.js) for path sampling, state orchestration, observers, and disposal. Replace its topology, vocabulary, geometry, labels, artifact stance, and temporal structure.
