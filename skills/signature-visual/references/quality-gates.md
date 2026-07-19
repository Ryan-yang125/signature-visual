# Quality gates

Review the live page against every gate before handoff.

## Concept

- The visual can be described in one sentence tied to the product.
- The resting frame already communicates the concept.
- One visual thesis dominates.
- Recipe choices have project-specific variation.

## Composition

- The visual has an intentional owner, crop, scale, and focal point.
- Text and controls remain legible in every animated state.
- The mobile composition feels authored at 390 × 844.
- Empty space supports reading order.

## Motion and interaction

- Base motion has a clear rhythm.
- Input response stays within a bounded range.
- Pointer exit returns smoothly to rest.
- Scroll-driven states are reversible.
- Reduced motion preserves the core composition.

## Engineering

- Resize handling updates buffer and projection correctly.
- Device pixel ratio has a ceiling.
- Animation pauses when hidden or outside the viewport.
- Teardown releases frames, observers, listeners, and GPU resources.
- Console and page errors remain empty during load, interaction, resize, and unmount.

## Performance

- Particle and instance counts have area-based or device-based ceilings.
- Frame loops reuse allocations.
- Shader loops are bounded.
- Mobile uses an appropriate density or fallback.
- The visual does not delay content interaction.

## Accessibility

- Decorative layers stay outside accessibility and pointer flow.
- Meaningful diagrams expose a title, description, and labels.
- Keyboard focus remains visible.
- Contrast survives the full animation range.

## Final review score

Score each axis from 1–5:

```text
Specificity   tied to this product and placement
Composition   integrated with content and layout
Motion        intentional rhythm and response
Craft         coherent material, detail, and finish
Resilience    mobile, reduced motion, resize, teardown
Variety       structurally distinct from source recipes
```

Revise any axis below 4. Record the six scores in the implementation notes or handoff.
