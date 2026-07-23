# Creative Search

Use this guide after reading the real page and [visual-direction.md](visual-direction.md). Keep Pattern Language closed until the candidate set and selected direction are frozen. This preserves the target's own vocabulary before packaged operators can prime the search.

Creative search is adaptive. Production requirements stay firm; candidate count and exploration depth follow the scope and the evidence.

## Choose the scope tier

### Landmark

A landmark carries product identity: a hero, launch moment, flagship data surface, or transition visitors should remember later.

- Name the brief's obvious attractors before generating candidates: direct product-name objects, category-standard diagrams, supplied iconography, and the first noun-to-artifact metaphor.
- Keep the most natural translation as a **shadow baseline** for distance comparison. It receives no automatic place in the final set.
- Before candidate generation, forecast the cluster another independent run is most likely to produce across artifact, renderer, material causality, temporal archetype, and interaction meaning. Preserve it as `selection.convergenceForecast`; it is a collision target rather than a candidate brief.
- Run `node <signature-visual-skill>/scripts/creative-offset.mjs` once and preserve its JSON under `selection.noveltyGuard`. Resolve `<signature-visual-skill>` to the directory containing `SKILL.md`. An explicit `--seed value` makes the search coordinate replayable; the default creates fresh per-run entropy.
- Generate an **anti-literal direction** while withholding product-name nouns, category icons, and the shadow baseline's artifact.
- Generate one **taxonomy-external direction** that obeys the offset's causal route, substance, temporal, interaction, representation, evidence, and spatial pressures, both quarantines, counterfactual, and selection challenge.
- Explore further only while candidates reveal genuinely different visual worlds; three to five admitted candidates is common, with no fixed quota.
- Compare candidates pairwise before selecting.
- Compare the provisional winner with the forecast cluster. Name at least two visibly broken axes among material causality, temporal archetype, and interaction meaning; rebranch before implementation when fewer than two break.
- Spend extra search effort where the visual owns a large area, controls a narrative turn, or will become a reusable identity system.

Taxonomy-external describes the direction's origin. It begins from a product-specific relation, constraint, dataset, production method, or behavior under the recorded creative offset. Product-name literalization, category-standard artifacts, familiar interface diagrams, and obvious noun-to-object mappings belong to the shadow baseline regardless of the label attached to them. Later resemblance to a general operator is acceptable when the governing rule remains independently derived.

The bundled generator selects one coherent causal route bundle with substance, temporal, and interaction pressures plus one high-level spatial representation mode. Representation modes include active negative space, typographic topology, unequal fragments, a migrating boundary, layered strata, a scalar density field, volumetric occlusion, page-frame reallocation, a topological cut, serial composition, an isolated specimen, and a single event trace. Their quarantines block easy collapse into repeated line bundles, fibers, streamlines, or equivalent uniform families. Every mode stays renderer-, finished-artifact-, and palette-neutral. Its seed creates cross-run range while preserving replay. Reject a generated pressure only when it conflicts with a hard requirement; record the conflict and draw one replacement offset with a new seed.

### Coordinated cohorts

Ordinary landmark work uses one offset. Cohorts serve coordinated independent alternatives and benchmark runs where several workers need replayable separation:

```bash
node <signature-visual-skill>/scripts/creative-offset.mjs --cohort 4 --seed benchmark-round-1
```

The roster contains `baseSeed`, `count`, and full ordinary offsets. For sizes up to 12, causal route IDs and representation IDs remain pairwise unique. Assign one offset to each independent run and store its zero-based roster coordinates as `selection.noveltyGuard.cohort: {baseSeed,index,size}`. Preserve the assigned `creativeOffset` exactly. Candidate search within every run still starts from target evidence, keeps Pattern Language closed, and routes to a renderer after direction freeze.

### Section

A section visual helps one local idea land inside a larger page.

- Author the strongest evidence-led direction first.
- Compare it with the nearest source, packaged example, sibling visual, and recent accessible output.
- Add a branch only when that distance check fails or the direction cannot satisfy the page job.
- Change the failed structural axes in the branch. Skip ceremonial alternates once the first direction is both specific and distant.

### Refine

A refinement starts from a working concept or implementation.

- Reuse the confirmed thesis and signature rule.
- Fingerprint the current and proposed states.
- Change the smallest structural layer that resolves the observed failure.
- Reopen broad search only when the thesis no longer fits the product or the proposed result remains too close to a source or recent output.

## Build from raw evidence

Gather only what can influence the visual:

- the page job and content priority;
- target nouns, actions, relations, and data behavior;
- one brand substance or production trace worth amplifying;
- layout, input, performance, and accessibility constraints;
- available imagery, geometry, type, and existing motion;
- the human judgment the visual should help a visitor make.

Use these inputs as generative material. A direction may begin from literal data behavior, a production process, an unusual constraint, language, a physical phenomenon, a spatial relation, or a target-specific object. Treat these as optional search moves.

## Quarantine the obvious attractor

Write a compact baseline before landmark exploration:

```text
OBVIOUS CUE       product-name object, category diagram, supplied icon, or first metaphor
EXPECTED SHAPE    the silhouette most designers will reach first
EXPECTED ACTION   the default interaction or animation
EXPECTED MATERIAL the brand treatment likely to make it feel finished
WHY IT CONVERGES  the structural shortcut another independent run would repeat
```

Use it as a collision target. The direct baseline can return to consideration only through a second-order transform that preserves the useful causal rule while changing at least three of artifact, silhouette, spatial grammar, material causality, temporal archetype, interaction meaning, and type role. When prior-output history is unavailable, enforce this rule as collision insurance.

## Forecast independent convergence

Record one likely cluster before landmark candidates are authored:

```text
ARTIFACT             likely object, event, or visual stance
RENDERER             likely default implementation family
MATERIAL CAUSALITY   likely reason the surface changes or holds together
TEMPORAL ARCHETYPE   likely organization of change and held states
INTERACTION MEANING  likely meaning assigned to visitor input
```

Base the forecast on the brief's first metaphors, category conventions, supplied assets, current stack, and nearby outputs. Keep it descriptive and compact. It predicts convergence; it supplies no desired answer.

After pairwise candidate admission, compare the provisional winner against this cluster. Record `selection.clusterBreakAxes` and one visible causal comparison per axis. Eligible axes are `materialCausality`, `temporalArchetype`, and `interactionMeaning`; at least two must break. A winner with fewer than two breaks re-enters search with a new governing rule on the converged axes. Renderer routing and implementation begin after the rebranched candidate clears the gate.

## Candidate note

Record only enough to compare and build:

```text
NAME              subject-specific shorthand
ORIGIN            natural-shadow / anti-literal / offset-taxonomy-external / evidence-derived / refinement
CLAIM             what becomes perceptible
RESTING FRAME     dominant silhouette, crop, scale, and negative space
GOVERNING RULE    observable rule linking states or data
FINGERPRINT       structural axes below
RISK              strongest reason it may fail
UNKNOWN           one question implementation must answer
```

Avoid finished implementation plans while searching. Renderer choice, detailed motion phases, UI chrome, and post-processing can make weak candidates look prematurely complete.

## Fingerprint axes

Use axes that describe structural causes; record decoration separately as tuning:

- **artifact:** what kind of thing or event the visitor encounters;
- **silhouette:** dominant mass, void, topology, rhythm, or crop;
- **spatial grammar:** how parts relate, organize, and change scale;
- **density event:** where information gathers, breaks, or clears;
- **material causality:** why the surface behaves as it does;
- **temporal archetype:** how change is structured, including a held state;
- **interaction meaning:** what input represents and changes;
- **type role:** absent, content, annotation, frame, texture, or subject.

Color, count, intensity, camera angle, and easing are usually tuning axes. They can become structural only when the product meaning depends on them.

## Candidate distance matrix

For landmark work, compare every candidate pair. For section and refine work, compare the current proposal with the nearest alternative or current state when branching is triggered.

```text
PAIR    SILHOUETTE  SPATIAL  MATERIAL  TEMPORAL  INTERACTION  TYPE  EVIDENCE
A ↔ B   far         near     far       far       same         near  different thumbnail and causal rule
A ↔ C   same        same     near      far       near         same  shared skeleton; rebranch
```

Use `same`, `near`, `far`, or `unknown`. Add a short visible reason; avoid collapsing the matrix into one total score.

For landmark admission, every pair in the final candidate set needs at least four visibly evidenced `far` ratings across silhouette, spatial grammar, material causality, temporal archetype, interaction meaning, and type role. `Unknown` supplies no distance credit. When a pair falls below four, remove the weaker candidate or rebranch it on the converged axes before selection. Keep rejected or shadow candidates in the record only when their failure teaches something useful.

A distance failure exists when any of these is true:

- dominant silhouette and spatial grammar share the same skeleton;
- all differences live in tuning axes;
- one candidate can become another through palette, count, intensity, easing, or renderer substitution;
- blurred resting frames and causal sequences tell the same story;
- a supposed taxonomy-external candidate depends on a packaged artifact or operator as its premise.

A useful branch changes the generating rule on the failed axes. Large parameter changes inside the same rule remain one direction.

## Source distance and output distance

Run both checks on the selected direction:

- **Source distance:** compare with direct references, libraries, starter programs, and packaged examples.
- **Output distance:** compare with recent accessible visuals produced for the same product, by the same skill, or in the same gallery or workspace.

Compare artifact, silhouette, spatial grammar, material causality, temporal archetype, interaction meaning, and type role. Cite the nearest neighbor and the structural difference. When prior outputs are unavailable, record `unavailable`, the search performed, the shadow baseline, and the creative-offset seed; never invent a comparison history.

If distance fails, change the governing rule or dominant structure. Cosmetic separation does not resolve family resemblance.

## Freeze the direction

Freeze when the selected direction:

- encodes target evidence through an observable rule;
- has a complete resting frame or intentional held state;
- survives candidate, source, and output-distance checks appropriate to its tier;
- for landmark work, visibly breaks the independent-run forecast on at least two required causal axes;
- leaves a credible implementation path in the available stack;
- has a named risk that can be tested during implementation.

Selection can remain qualitative. Explain the decisive evidence and the strongest competing candidate or current state. Stop searching when more candidates would only restate solved ideas.

## Open Pattern Language after freeze

After freeze, read [pattern-language.md](pattern-language.md) to stress-test the chosen rule, discover transformation axes, and diagnose cheap signals. Pattern operators may expand the implementation range. They do not supply a replacement thesis, artifact, temporal script, or interaction model.

If the post-freeze audit reveals that the selected direction is a packaged pattern with target-themed styling, reopen only the failed part of the search and update the distance matrix.
