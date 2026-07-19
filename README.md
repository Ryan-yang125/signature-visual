# Signature Visual

**A computational visual design skill for Claude Code, Cursor, and Codex. Give any website one unforgettable visual moment.**

[Live website →](https://signature-visual.pages.dev) &nbsp;·&nbsp; Canvas 2D &nbsp;·&nbsp; Three.js &nbsp;·&nbsp; WebGL shaders &nbsp;·&nbsp; SVG

<p align="center">
  <a href="https://signature-visual.pages.dev">
    <img src="site/screenshots/og-signature-visual.png" alt="Signature Visual website hero with a live generative particle field" />
  </a>
</p>

People rarely ask for a renderer. They say “the hero feels empty,” “make this feel alive,” or “give this section something memorable.” Signature Visual turns that language into a visual brief, selects a fitting recipe and renderer, implements it in the existing project, and checks the result in a real browser.

The skill focuses on one high-leverage visual system:

- a hero object with presence;
- a responsive atmospheric field;
- a technical diagram that teaches;
- a product concept made spatial;
- a transition with a meaningful state change.

## Install

```bash
npx skills add Ryan-yang125/signature-visual
```

Re-run the command to update. Manual installation works by copying [`SKILL.md`](skills/signature-visual/SKILL.md) and [`references/`](skills/signature-visual/references/) into your agent's skill directory:

- **Claude Code:** `~/.claude/skills/signature-visual/`
- **Cursor:** add the `SKILL.md` body as a project rule and keep `references/` beside it
- **Codex:** `~/.codex/skills/signature-visual/` or `.codex/skills/signature-visual/`

## Four live cases

Each case starts from a different user intention and resolves to a different visual grammar.

<table>
  <tr>
    <td width="50%"><a href="https://signature-visual.pages.dev/examples/particle-current/"><img src="site/screenshots/particle-current.png" alt="Particle Current Canvas example for a multi-agent system" /></a></td>
    <td width="50%"><a href="https://signature-visual.pages.dev/examples/living-orb/"><img src="site/screenshots/living-orb.png" alt="Living Orb Three.js example for a synthetic biology interface" /></a></td>
  </tr>
  <tr>
    <td><b>Particle Current</b><br/><sub>Canvas 2D · flow field · pointer force</sub></td>
    <td><b>Living Orb</b><br/><sub>Three.js · shader deformation · calm parallax</sub></td>
  </tr>
  <tr>
    <td><a href="https://signature-visual.pages.dev/examples/radiance-field/"><img src="site/screenshots/radiance-field.png" alt="Radiance Field raw WebGL shader example for distributed infrastructure" /></a></td>
    <td><a href="https://signature-visual.pages.dev/examples/spatial-lineage/"><img src="site/screenshots/spatial-lineage.png" alt="Spatial Lineage SVG technical diagram example for provenance" /></a></td>
  </tr>
  <tr>
    <td><b>Radiance Field</b><br/><sub>Raw WebGL · domain warp · responsive lens</sub></td>
    <td><b>Spatial Lineage</b><br/><sub>SVG · topology · semantic path signals</sub></td>
  </tr>
</table>

Open the [live website](https://signature-visual.pages.dev) to interact with all four.

## How it works

```text
vague creative direction
        ↓
page role + emotional intent + behavior + response + constraints
        ↓
visual recipe or recipe synthesis
        ↓
Canvas 2D / Three.js / raw WebGL / SVG
        ↓
integration + browser verification + lifecycle cleanup
```

The renderer stays inside the implementation layer. Users can stay in the language of product, brand, feeling, and interaction.

## Visual families

| Family | Strong fit | Typical recipes |
| --- | --- | --- |
| Canvas fields | Many lightweight particles, trails, networks, generative paint | Particle Current, Resonance Matrix, Watercolor Drift |
| Three.js living forms | Depth, camera, geometry, lighting, focal objects | Living Orb, Voxel Bloom |
| WebGL shader fields | Continuous materials, radiance, interference, distortion | Radiance Field, Meteorological Scan |
| SVG technical systems | Crisp paths, labels, topology, diagrams, instruments | Spatial Lineage, Orbital Instrument |

## Skill architecture

Signature Visual uses the progressive-disclosure pattern popularized by [Hallmark](https://github.com/Nutlope/hallmark). `SKILL.md` contains the router and core workflow. The agent loads the relevant placement, recipe, renderer, interaction, and production references for the current request.

```text
skills/signature-visual/
├── SKILL.md
└── references/
    ├── routing.md
    ├── placements.md
    ├── recipes.md
    ├── interaction.md
    ├── integration.md
    ├── quality-gates.md
    ├── families/
    │   ├── canvas-fields.md
    │   ├── three-living-forms.md
    │   ├── webgl-shader-fields.md
    │   └── svg-technical-systems.md
    ├── starters/
    │   ├── canvas-field.js
    │   ├── three-living-form.js
    │   ├── webgl-shader-field.js
    │   └── svg-technical-system.js
    └── verbs/
        └── study.md
```

The starters carry production lifecycle patterns: responsive sizing, capped DPR, viewport and document pausing, reduced motion, pointer recovery, and teardown. Agents reshape their field equations, topology, materials, composition, and semantics for each project.

## Default workflow

1. Inspect the real project, target page, tokens, content hierarchy, and existing motion.
2. Choose one high-leverage placement.
3. Resolve a visual brief: role, intent, behavior, response, and constraints.
4. Select or synthesize a recipe.
5. Select the renderer internally.
6. Implement inside the project's existing conventions.
7. Test desktop, mobile, pointer exit, reduced motion, resize, and unmount.
8. Score specificity, composition, motion, craft, resilience, and variety.

## Example prompts

```text
The hero feels empty. Add something with a living, intelligent presence that reacts gently to the pointer. Keep the copy readable and use our existing React stack.
```

```text
This infrastructure section feels generic. Give it one technical visual that communicates routing and resilience. It should become more active as the section enters the viewport.
```

```text
Study this HTML reference and extract its visual DNA. Then use the form and motion principles to create a fresh hero visual for our climate-data product.
```

## Quality floor

Every result is reviewed for:

- product-specific visual meaning;
- content hierarchy and text-safe composition;
- a complete resting frame;
- intentional input and recovery behavior;
- authored mobile composition;
- reduced-motion continuity;
- capped rendering cost;
- complete teardown of frames, observers, listeners, and GPU resources;
- structural variation from recipes and references.

## Repository structure

```text
.
├── skills/signature-visual/   # installable universal skill
├── site/                      # static website and live examples
├── docs/                      # worked recipes and study examples
├── package.json               # skill metadata and local scripts
├── README.md
└── LICENSE
```

## Develop

```bash
npm run serve
npm run check
npm run screenshots
```

The website is plain HTML, CSS, JavaScript, Canvas, SVG, and WebGL. The Living Orb example imports a pinned Three.js ES module.

## License

MIT. Use it, adapt it, and ship something memorable.
