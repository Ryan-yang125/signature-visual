# Direction Case Study: Local Evidence, Regional Confidence

This worked example shows the V2 design process before implementation. The brief asks for a memorable evidence-section visual on a climate intelligence site with warm paper, dark green type, and restrained red annotations.

## Project reading

```text
PAGE JOB      explain how local observations support a regional conclusion
CONTENT AXIS  evidence remains primary; visual supports credibility
BRAND SIGNAL  field-journal paper, botanical green, editorial annotation
CONSTRAINTS   inline section, readable labels, real data states, reduced motion
OPPORTUNITY   make accumulation and uncertainty spatially visible
```

## Visual thesis

> Local observations settle like mineral traces into a regional cross-section, so evidence feels cumulative, inspectable, and earned.

Core verbs: `deposit / resolve`.

Signature rule: every conclusion retains visible strata from its contributing observations.

## Three Direction Cards

### Evidence Delta

```text
PROMISE       scattered field marks settle into a legible regional cross-section
SPATIAL IDEA  wide threshold; observations enter from several edges and form strata
MATERIAL      dry ink, translucent sediment, one red exception mark
MOTION        clean ground → deposit → compress → resolve → retain history
INTERACTION   focus probes a layer and exposes its local observations
RENDER        Canvas deposition + semantic SVG labels
FINGERPRINT   threshold / landscape / graded / paper+mineral / staged / probe
RISK          contour-map familiarity
```

### Confidence Press

```text
PROMISE       evidence passes through a calibrated instrument and leaves a printed conclusion
SPATIAL IDEA  centered plate with sampling aperture, scale, and output strip
MATERIAL      enamel housing, glass aperture, thermal paper, safety-red lock signal
MOTION        idle → sample → calibrate → lock → hold result
INTERACTION   drag changes the sampled region within a bounded map
RENDER        SVG instrument + Canvas sample texture
FINGERPRINT   plate / human / focal / enamel+paper / pulsed / tool
RISK          decorative instrumentation
```

### Witness Canopy

```text
PROMISE       local observations grow into one regional silhouette while uncertainty remains porous
SPATIAL IDEA  sparse miniature colony surrounded by extreme paper space
MATERIAL      pressed botanical tissue with graphite labels
MOTION        seed → sprout → branch → canopy → dormancy
INTERACTION   selection reveals which branch each observation supports
RENDER        Canvas or Three.js with HTML annotation
FINGERPRINT   monument / miniature / sparse / tissue+graphite / organic / focus
RISK          generic generative flower
```

## Selection

| Direction | Specificity | Composition | Distinctness | System fit | Feasibility | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Evidence Delta | 5 | 5 | 4 | 5 | 4 | 23 |
| Confidence Press | 4 | 4 | 5 | 4 | 4 | 21 |
| Witness Canopy | 4 | 5 | 4 | 5 | 3 | 21 |

Evidence Delta carries the clearest relationship between observations and conclusions while extending the existing field-journal material.

## Authored systems

### Composition

- A horizontal geological threshold occupies the lower 58% of the section.
- Evidence labels remain on a quiet upper paper field.
- One diagonal compression seam supplies tension.
- Mobile rotates the story into a vertical core sample with a bottom annotation rail.

### Material

- Ground: warm uncoated paper with screen-fixed fine grain.
- Body: dark green and umber translucent deposits with dry edges.
- Signal: graphite focus outline.
- Exception: red appears only on conflicting or low-confidence observations.
- Decay: deposits persist; active highlights dry back into the stratum.

### Motion score

| Phase | Visible event |
| --- | --- |
| Rest | a faint resolved cross-section and quiet observation marks |
| Wake | new observations acquire pigment and drift toward the section |
| Develop | deposits bend around terrain and begin forming layers |
| Peak | compression aligns the strata; the regional conclusion becomes legible |
| Recover | active color dries down while the new layer remains |

### Interaction

Pointer or keyboard focus acts as a field probe. A narrow layer gains contrast, its contributing observations connect through graphite hairlines, and a confidence annotation appears. Release recovers over 700 ms while the deposited history remains unchanged.

## Renderer route

Canvas leads because deposition, many marks, and persistent history form the main visual program. SVG owns accessible labels and focus routes. Both layers use one normalized progress and focus state.

## Deterministic capture plan

- desktop timeline: rest / acquire / deposit / compress / resolve;
- desktop focus: rest / approach / engaged / released / recovered;
- data: empty / typical / peak / conflicting;
- mobile: core-sample rest / deposit / resolved;
- reduced motion: fully resolved cross-section with keyboard-selectable layers.

## Example critique and revision

First contact sheet observation: deposit, compress, and resolve shared almost the same silhouette. Motion changed opacity and speed while the geological structure stayed fixed.

Revision: compression creates one visible fault and resolves it into a thicker decision stratum. The next sheet contains distinct mid and peak silhouettes while preserving label positions and the signature rule.
