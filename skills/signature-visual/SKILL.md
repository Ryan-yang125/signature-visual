---
name: signature-visual
description: Direct and build a distinctive computational visual for a website. Use when a user wants a hero, section, background, transition, data surface, or product moment to feel memorable, alive, spatial, atmospheric, technical, organic, or experimental—even when they never name Canvas, Three.js, WebGL, shaders, or SVG. Also use to study an HTML, screenshot, or URL; redesign an existing effect that feels generic or template-like; or add particles, generative graphics, 3D forms, shader materials, and animated diagrams. Develop a product-specific visual thesis, explore three divergent directions, define composition/material/motion, choose the renderer internally, implement in the existing stack, and validate the result through deterministic visual states, responsive behavior, accessibility, performance, and cleanup.
---

# Signature Visual

Act as the visual director and computational design engineer for one high-memory moment. Let the product meaning shape the spatial structure, material, motion, and interaction. Choose the renderer after the visual direction is clear.

The skill is self-contained. Use the guidance, pattern cards, runtime shells, and QA scripts in this package. Existing project libraries may be used when they are already present or clearly serve the selected direction. Do not require another skill to complete the work.

## Outcomes

A successful result has four qualities:

1. **Belonging** — the idea could plausibly exist only for this product, story, or dataset.
2. **Presence** — the visual has a strong resting composition before any interaction.
3. **Range** — its design system can produce related variations without collapsing into one demo.
4. **Production integrity** — it works across viewport, input, motion preference, lifecycle, and performance constraints.

## Tasks

Infer the task from natural language:

- `direct` — create and implement a new signature visual. This is the default.
- `study` — inspect HTML, screenshots, video, or a URL and extract portable principles. Read [reference-study.md](references/reference-study.md).
- `refine` — diagnose and redesign an existing computational visual while retaining the useful concept or implementation.
- `systemize` — turn several related visual moments into one coherent motion and material language.

Keep the scope centered on one visual system unless the user explicitly requests a broader system.

## Mandatory workflow

For every new direction, complete Stages 0–8 in order. Keep Stages 1–4 concise and internal unless sharing them helps the user decide. A small refinement may reuse a confirmed thesis, yet it still needs a visual fingerprint and capture plan.

### Stage 0 — Read the real surface

Inspect the target page, content hierarchy, framework, components, tokens, fonts, breakpoints, imagery, existing motion, and runtime behavior. Locate the owner element and the smallest safe file set.

Record:

```text
PAGE JOB      what this section must help a visitor understand or feel
CONTENT AXIS  the copy, object, or data that must remain primary
BRAND SIGNAL  one existing trait worth amplifying
CONSTRAINTS   text-safe area, viewport, stack, budget, accessibility
OPPORTUNITY   one place where a computational visual adds meaning
```

For a greenfield prototype, define these from the prompt and build the smallest real surface that can prove the direction.

### Stage 1 — Write a visual thesis

Complete one sentence:

> The visual makes **[subject]** feel like **[specific physical or spatial phenomenon]**, so the visitor senses **[human response]**.

Then name a **core motion verb** and a **counter-verb**. Examples: gather / shed, inhale / settle, trace / erase, align / rupture. The pair creates an arc and prevents perpetual ambient drift.

Reject a thesis that could be pasted onto three unrelated products unchanged. Read [visual-direction.md](references/visual-direction.md) for metaphor tests and product-to-form translation.

### Stage 2 — Create three divergent Direction Cards

Create three project-specific directions before selecting one. Give them names derived from the subject. Avoid fixed tiers such as safe, bold, and experimental.

Each card contains:

```text
NAME             a memorable, subject-specific title
PROMISE          what the visitor will perceive in one sentence
SPATIAL IDEA     silhouette, scale, crop, depth, density, text relationship
MATERIAL IDEA    surface, light, color behavior, texture, edge character
TYPE ROLE        absent / content / annotation / frame / texture / subject
MOTION SCORE     rest → wake → develop → peak → recover
INTERACTION      input, mapping, bound, recovery
RENDER OPTIONS   one or two plausible engines, still provisional
FINGERPRINT      artifact / archetype / scale / density / material / tempo / response / type role
RISK             the most likely way this direction becomes cheap or generic
```

The cards must differ structurally on at least four fingerprint axes. Palette swaps, particle-count changes, and alternate easing curves count as tuning inside one direction.

Use [pattern-language.md](references/pattern-language.md) to expand the search space. Pattern cards supply transformation rules and failure signatures; they do not prescribe finished compositions.

### Stage 3 — Select with evidence

Score each direction from 1–5:

| Criterion | Question |
| --- | --- |
| Product specificity | Does the idea encode the subject, behavior, or data? |
| Compositional strength | Does the resting frame have hierarchy and tension? |
| Distinctness | Does its fingerprint differ from familiar portfolio effects? |
| System fit | Does it extend the page's typography, color, and interaction language? |
| Feasibility | Can it reach the quality bar inside the runtime budget? |

Select the strongest total with no score below 3. Revise the winner until specificity, composition, and distinctness each reach 4 or higher. Preserve one useful trait from either unselected card when it strengthens the single thesis.

### Stage 4 — Author the design specification

Define four connected systems:

- **Composition:** frame, anchor, crop, depth layers, negative space, text-safe relationship, mobile re-composition. Read [composition.md](references/composition.md).
- **Material:** palette roles, light model, edge behavior, texture scale, opacity/blend rules, background relationship. Read [material-language.md](references/material-language.md).
- **Motion:** named phases, duration or tempo, energy curve, secondary motion, synchronization, recovery. Read [motion-direction.md](references/motion-direction.md).
- **Interaction:** semantic input mapping, bounds, latency, exit/recovery, keyboard/touch/data behavior. Read [interaction.md](references/interaction.md).

Declare one `signature rule` that must survive every breakpoint and motion preference. Example: “Every route converges on the same quiet aperture.”

### Stage 5 — Route to an engine

Choose technology by the selected experience. Read [routing.md](references/routing.md), then the relevant family guide:

- [Canvas fields](references/families/canvas-fields.md) for high-count marks, trails, deposition, and field simulation.
- [Three.js forms](references/families/three-living-forms.md) for depth, camera, geometry, light, and spatial objects.
- [WebGL shader fields](references/families/webgl-shader-fields.md) for continuous materials, displacement, light fields, and GPU simulation.
- [SVG systems](references/families/svg-technical-systems.md) for crisp paths, topology, type, diagrams, and instrument precision.

Combine engines only when each owns a clear layer and the same visual thesis governs both. Renderer novelty never compensates for an unresolved direction.

### Stage 6 — Implement from a neutral runtime shell

Read [integration.md](references/integration.md). Use the neutral [Canvas](references/starters/canvas-field.js), [Three.js](references/starters/three-living-form.js), [WebGL](references/starters/webgl-shader-field.js), or [SVG](references/starters/svg-technical-system.js) runtime shell for lifecycle and resource-management patterns. Carry over ownership, sizing, pause/resume, reduced motion, deterministic hooks, and teardown. Replace the visual program—geometry, equations, composition, material, timing, and semantics—with the authored specification.

Public options should express design intent such as `energy`, `tension`, `porosity`, `cohesion`, `tempo`, and `response`. Keep raw implementation constants private or group them into the chosen material/motion system.

Every implementation needs:

- an explicit owner element and stable layout bounds;
- responsive sizing and an authored mobile composition;
- capped device-pixel ratio and density tied to visible area;
- pause while hidden or outside the viewport;
- a meaningful reduced-motion state;
- deterministic time, seed, and interaction hooks for visual QA;
- teardown for frames, observers, listeners, GPU resources, and contexts.

### Stage 7 — Capture the designed states

Choose a capture protocol from [visual-qa.md](references/visual-qa.md):

- timeline or scroll: `0 / 25 / 50 / 75 / 100%`;
- ambient system: fixed seed at five meaningful times;
- pointer system: rest / approach / engaged / released / recovered;
- data system: empty / typical / peak / edge;
- every system: desktop / mobile / reduced motion.

Use the scripts in `scripts/` when the project permits browser automation. A contact sheet exposes weak composition, dead phases, accidental flashes, and repetitive states faster than watching the loop repeatedly.

### Stage 8 — Critique, revise, verify

Review the contact sheet and live interaction using [failure-signatures.md](references/failure-signatures.md). Score 1–5:

```text
THESIS       the phenomenon communicates the intended idea
FRAME        each key state has hierarchy, balance, and readable content
MATERIAL     surface, color, light, texture, and edges feel authored
MOTION       phases create anticipation, change, peak, and recovery
RESPONSE     input mapping feels semantic, bounded, and calm after exit
ORIGINALITY  the result has its own fingerprint and avoids source mimicry
RESILIENCE   mobile, reduced motion, performance, and teardown hold up
```

Revise any category below 4. Run project lint, typecheck, tests, and build. Verify desktop, 390 × 844 mobile, pointer exit, resize/rotation, reduced motion, route unmount, and console errors in a real browser.

## Originality contract

When studying a reference, separate underlying principles from surface identity. Preserve insights such as “density collapses toward a semantic node” or “the quiet frame carries most of the tension.” Re-author the combined composition, palette, typography, material, motion, and interaction for the target project.

Before handoff, compare the result with every direct source and packaged example:

- change at least three fingerprint axes;
- avoid carrying the same dominant silhouette, palette relationship, and motion arc together;
- ensure the static frame still feels project-specific;
- ensure a second variation can be described without replacing only colors or counts.

If the output still reads like a known demo, return to Stage 2 and branch structurally.

## Handoff

Return:

- the one-sentence visual thesis;
- the selected direction and signature rule;
- the renderer and files changed;
- the contact-sheet states and viewport/motion modes verified;
- any remaining production caveat.

Keep the explanation compact. The working visual and its verified states are the primary artifacts.
