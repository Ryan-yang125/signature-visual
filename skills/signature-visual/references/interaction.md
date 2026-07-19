# Interaction grammar

Interaction should reveal the system’s character. Give every input a bounded mapping, a recovery state, and a reason to exist.

## Ambient motion

- Establish a complete resting composition.
- Use one slow primary rhythm and one subtler secondary rhythm.
- Randomize phase and amplitude within controlled ranges.
- Pause outside the viewport and when the document is hidden.

## Pointer attraction and repulsion

- Map pointer coordinates into the visual’s local coordinate system.
- Ease the input before applying it.
- Limit the radius and maximum force.
- Restore equilibrium gradually after pointer exit.
- Reinterpret the effect for touch as a tap pulse or ambient motion.

## Pointer parallax

- Separate object response from camera response.
- Keep translation and rotation ranges small enough to preserve composition.
- Ease toward the pointer and ease back to rest.
- Respect the text-safe zone throughout the range.

## Scroll progress

- Use scroll when the visual has meaningful ordered states.
- Calculate progress from the owning section.
- Make endpoints stable and reversible.
- Clamp all derived values.
- Keep normal document scrolling and history behavior intact.

## Click or tap pulse

- Use a brief pulse for local acknowledgement, signal emission, bloom, or aggregation.
- Let repeated input accumulate only within a safe ceiling.
- Make the visual recover without requiring another input.

## Data response

- Map real data to a small set of perceptually distinct variables.
- Preserve a readable baseline when data is missing.
- Use labels or a legend when the mapping carries meaning.
- Avoid decorative precision that implies unavailable measurements.

## Motion budget

Use a hierarchy:

1. Primary motion communicates the concept.
2. Secondary motion adds life.
3. Input response acknowledges the visitor.
4. Entry and exit support page rhythm.

Remove lower-priority motion when the result becomes noisy or expensive.

## Reduced motion

Preserve the concept with one of these treatments:

- a stable rendered frame;
- a very slow low-amplitude loop;
- direct state changes with fades under 150 ms;
- an SVG or image fallback carrying the same composition.
