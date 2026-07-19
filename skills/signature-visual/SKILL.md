---
name: signature-visual
description: Add a memorable computational visual to an existing website and integrate it into the project's real layout and stack. Use whenever a user wants a page, hero, background, product section, data surface, or transition to feel more special, alive, immersive, technical, atmospheric, experimental, or visually distinctive. Also use for vague requests such as “the hero feels empty,” “add something interactive,” “make this feel more futuristic,” or “give the site a memorable moment,” plus explicit requests involving particles, generative graphics, 3D forms, shaders, technical diagrams, Canvas, Three.js, WebGL, or SVG. Translate creative intent into a fitting visual recipe, choose the rendering technology internally, implement it, and verify content legibility, responsiveness, performance, accessibility, and cleanup.
---

# Signature Visual

Create one memorable visual moment that belongs to the website around it. Read the page before choosing an effect. Let the product idea, brand language, layout, and desired emotional response determine the form, motion, interaction, and renderer.

## Default behavior

Treat an unqualified request as an `add` task:

1. Inspect the target project and named page.
2. Identify one high-leverage placement.
3. Translate the user's language into a visual brief.
4. Select a recipe or synthesize a new one from the visual grammar.
5. Choose Canvas 2D, Three.js, raw WebGL shader, SVG, or a restrained combination.
6. Implement inside the project's existing conventions.
7. Verify the result in a real browser at desktop and mobile sizes.

Keep the scope centered on one signature visual system. It may fill a hero, live behind a section, illustrate a product concept, behave like an instrument, or form a transition. Preserve the surrounding information architecture and component ownership.

## Explicit tasks

- `study <HTML | screenshot | URL>`: Extract portable visual DNA: role, form, motion, interaction, composition, renderer, variation axes, and production constraints. Read [study.md](references/verbs/study.md).
- `refine <target>`: Improve an existing computational visual while preserving its concept. Diagnose integration, visual hierarchy, motion, performance, mobile behavior, and lifecycle cleanup.
- `add <target>`: Run the default workflow and implement a new signature visual.

Infer these tasks from natural language. Explicit command syntax is optional.

## Progressive loading

Load only the references needed for the current job:

- Read [routing.md](references/routing.md) for every new visual or when the renderer is unclear.
- Read [placements.md](references/placements.md) when choosing where and how the visual occupies the page.
- Read [recipes.md](references/recipes.md) when selecting, varying, or combining a visual recipe.
- Read [interaction.md](references/interaction.md) when pointer, scroll, click, idle, or data response is involved.
- Read the relevant renderer guide after routing:
  - [canvas-fields.md](references/families/canvas-fields.md)
  - [three-living-forms.md](references/families/three-living-forms.md)
  - [webgl-shader-fields.md](references/families/webgl-shader-fields.md)
  - [svg-technical-systems.md](references/families/svg-technical-systems.md)
- Read [integration.md](references/integration.md) before editing a real project.
- Read [quality-gates.md](references/quality-gates.md) before handoff.

## Step 0 — Preflight the project

Inspect the actual page, framework, styling method, tokens, fonts, content hierarchy, breakpoints, and existing motion. Locate the component that should own the visual and identify the smallest safe file set.

For an existing project:

- Reuse its framework, build system, component conventions, and tokens.
- Keep DOM ownership and route boundaries stable.
- State the files you expect to create or modify before editing.
- Treat the visual as part of the content composition, with a defined layer, container, and text-safe zone.

For a greenfield prototype, create the smallest runnable surface that demonstrates the intended placement and behavior.

## Step 1 — Write the internal visual brief

Resolve five decisions from the page and prompt:

```text
ROLE         hero focal / ambient field / section artifact / technical surface / transition
INTENT       alive / fluid / precise / energetic / spatial / mysterious / playful
BEHAVIOR     breathe / flow / grow / orbit / scan / connect / reveal / disperse
RESPONSE     ambient / pointer / scroll / click / data
CONSTRAINTS  text-safe zone / palette / size / performance / mobile / reduced motion
```

Prefer inference from the live project. Ask one concise question only when a missing answer would change the creative direction materially.

## Step 2 — Route by experience

Use technology as an implementation choice:

| Experience requirement | Strong default |
| --- | --- |
| Many lightweight particles, trails, networks, or flow lines | Canvas 2D |
| Depth, camera, lighting, geometry, or a focal 3D object | Three.js |
| A custom material, light field, displacement field, or full-surface effect | Raw WebGL shader |
| Crisp geometry, labels, paths, diagrams, or instrument-like precision | SVG |

Combine renderers when each layer has a clear role. Keep a single visual thesis across the layers.

## Step 3 — Compose a recipe

A recipe is a reusable visual grammar with variable outcomes. Define:

- **Form:** primitives, silhouette, topology, density, depth.
- **Composition:** placement, scale, crop, text-safe zone, focal hierarchy.
- **Motion:** base rhythm, secondary motion, phase offsets, entry and exit.
- **Interaction:** input, mapping, range, easing, recovery behavior.
- **Material:** color relationships, opacity, blending, texture, light response.
- **Variation axes:** parameters that make the result project-specific.
- **Fallback:** reduced-motion and low-capability presentation.

Start from [recipes.md](references/recipes.md) when it fits. Create a new recipe when the subject suggests a stronger metaphor. Blend two recipes by naming the contribution of each, then simplify until the visual reads as one idea.

## Step 4 — Implement the visual system

Use the starters in `references/starters/` as lifecycle-aware foundations:

- `canvas-field.js` — Canvas particle fields and pointer forces.
- `three-living-form.js` — Three.js focal objects with shader deformation.
- `webgl-shader-field.js` — Raw WebGL fullscreen shader fields.
- `svg-technical-system.js` — Programmatic SVG diagrams and instruments.

Copy the relevant starter into the target project and adapt it. Keep public options semantic: `energy`, `density`, `calm`, `accent`, `response`, and `textSafeSide` communicate design intent more clearly than exposing every implementation constant.

Every implementation needs:

- an explicit owner element;
- responsive sizing through `ResizeObserver` or equivalent;
- a capped device-pixel ratio;
- animation pause when hidden or outside the viewport;
- a reduced-motion presentation;
- teardown for animation frames, observers, listeners, geometries, materials, textures, buffers, and contexts;
- a static or simplified mobile fallback when the full effect exceeds the budget.

## Step 5 — Integrate with the page

Treat integration as design work:

- Preserve a deliberate text-safe zone.
- Derive colors from existing tokens and verify contrast in every visual state.
- Match the page's corner, border, type, spacing, and motion language.
- Give interaction a bounded range and a calm recovery state.
- Keep decorative layers out of pointer and accessibility flow.
- Expose meaningful diagrams to assistive technology with a title, description, and stable labels.
- Let the visual communicate a product idea whenever the brief supports one.

Read [integration.md](references/integration.md) for framework and lifecycle details.

## Step 6 — Verify in a browser

Open the implemented page and test:

1. Desktop at the project's primary width.
2. Mobile at 390 × 844.
3. Pointer movement and pointer exit.
4. Scroll entry, exit, and back-navigation.
5. Reduced motion.
6. Resize and device rotation.
7. Route unmount or component teardown.
8. Console and page errors.

Complete the visual review in [quality-gates.md](references/quality-gates.md), then use the target project's normal lint, typecheck, build, and browser-test commands.

## Quality floor

Revise before handoff when any answer is weak:

- Does the visual express something specific about this product?
- Does the page retain a clear reading order?
- Is there one dominant visual thesis?
- Does the interaction feel intentional at rest, during input, and after input?
- Does the result differ structurally from the starter and source references?
- Does mobile feel composed?
- Does reduced motion preserve the idea?
- Does teardown release every owned resource?

## Handoff

Return:

- the one-sentence visual concept;
- the selected recipe and renderer with a short reason;
- the files changed;
- the browser sizes and interaction states verified;
- any remaining production dependency or performance caveat.

Keep the explanation compact. The working visual is the primary artifact.
