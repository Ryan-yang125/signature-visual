# Evaluation

Use these anchors for independent review of the prompt, artifacts, captures, design record, and reasoning. Keep renderer, pattern, artifact stance, and temporal preferences out of the review prompt.

Rate every criterion from 1–5. Cite visible evidence for every rating. Averages never hide a criterion below 4.

## A — Tier discipline and target truth

| Score | Anchor |
| --- | --- |
| **1** | Tier is absent or wrong; the visual could serve an unrelated product after label changes; target content and constraints are ignored. |
| **2** | The work names a plausible tier yet applies the wrong search depth or carries mainly category-level styling; target evidence appears in copy more than structure. |
| **3** | Tier is plausible and some target nouns, data, or behaviors affect the direction; one important page job, constraint, or existing brand signal remains weakly integrated. |
| **4** | Landmark, section, or refine behavior matches the task; observable structure comes from target evidence; the page job, content hierarchy, brand signal, and boundaries remain clear. |
| **5** | The direction converts a target-specific relation, behavior, constraint, or production trace into an unusually precise governing rule that improves how a visitor understands or remembers the product. |

## B — Creative search and candidate distance

Apply the tier-specific expectation:

- Landmark: obvious-attractor shadow baseline, independent-run convergence forecast, replayable causal-route and representation offset, anti-literal and taxonomy-external directions, pairwise distance matrix, and a winner that visibly breaks the forecast on at least two required causal axes.
- Section: one strong direction first; extra branching appears only after a named distance or fit failure.
- Refine: confirmed thesis is reused; current-to-proposed distance guides the smallest effective change.

| Score | Anchor |
| --- | --- |
| **1** | Search begins from renderer, Pattern Language, trend reference, or fixed artifact category; proposals share one skeleton or no comparison exists. |
| **2** | Several candidates or revisions exist, yet differences are mainly palette, count, intensity, easing, camera, labels, or renderer; tier rules are mostly ceremonial. |
| **3** | Search follows the correct tier and includes some structural variation; the obvious-attractor baseline, convergence forecast, causal route, representation mode, matrix, taxonomy-external provenance, branch trigger, or refinement diagnosis is incomplete or weakly evidenced. |
| **4** | Search effort matches the tier; landmark work quarantines the shadow baseline and records a replayable causal-route and representation offset; comparisons name structural axes and visible evidence; every landmark pair clears the four-axis admission rule; the winner breaks at least two required forecast axes; distance failures trigger focused branching. |
| **5** | Search reveals a surprising target-derived possibility outside familiar packaged answers, the winner defeats the recorded obvious attractor, forecast cluster, and offset challenge, and the matrix makes the strongest competing world independently understandable without inflated distance labels. |

## C — Composition and material causality

| Score | Anchor |
| --- | --- |
| **1** | Frame is accidental, generic, illegible, or dependent on effects; material is a stack of fashionable treatments without cause. |
| **2** | A focal object exists, yet hierarchy, crop, density, typography, or texture remains template-like; mobile looks like a smaller desktop frame. |
| **3** | Resting frame, material, and edge hierarchy are coherent; one state, breakpoint, or content relationship loses tension or specificity. |
| **4** | Held desktop and mobile frames have authored hierarchy, negative space, silhouette, crop, and text relationship; substance, light, edges, texture, and decay follow one causal model. |
| **5** | Composition and material make the governing rule perceptible before explanation, retain authority at thumbnail and full scale, and create a reusable visual language with meaningful structural variation. |

## D — Temporal and interaction fit

A held/static direction can receive any score, including 5, when time and input would add no product meaning.

| Score | Anchor |
| --- | --- |
| **1** | Motion or interaction is decorative, destabilizing, inaccessible, or absent despite carrying essential meaning; temporal behavior has no relation to the thesis. |
| **2** | The work uses a familiar universal arc, screensaver loop, cursor chase, or uniform easing; reduced motion loses information or interaction strands the frame. |
| **3** | A plausible temporal archetype and semantic input mapping exist; causality, latency, aftermath, capture states, or a risky edge case remains generic or unresolved. |
| **4** | Held, one-shot, finite-state, event-response, branching, inspection, irreversible, scroll, ambient, accretive, live, or custom time follows the governing rule; input is meaningful and bounded when present; reduced motion preserves the thesis. |
| **5** | Time, stillness, and input are edited with exceptional restraint: every event reveals causality, history, control, or state, and the aftermath itself becomes useful product evidence. |

## E — Source and output originality

| Score | Anchor |
| --- | --- |
| **1** | A direct source, starter, familiar demo, or recent output supplies the dominant silhouette, shell, material, and temporal behavior. |
| **2** | Surface details change while the nearest source or output remains recognizable through the same structural skeleton or causal sequence. |
| **3** | Source distance is credible and some output-distance evidence exists; the nearest prior result, inaccessible history, or one shared high-salience axis is insufficiently addressed. |
| **4** | Direct sources, packaged examples, and recent accessible outputs are fingerprinted separately; nearest neighbors and structural differences are cited; unavailable history is recorded honestly. |
| **5** | The result establishes a project-owned fingerprint with strong source and output distance, while still belonging to the existing product system and supporting a second non-cosmetic variation. |

## F — Production integrity, evidence, and record

| Score | Anchor |
| --- | --- |
| **1** | Artifact is incomplete, broken, inaccessible, or unverified; lifecycle and fallback are absent. |
| **2** | Primary viewport works, while mobile, reduced motion, deterministic state, cleanup, accessibility, or error evidence is missing. |
| **3** | Core implementation is usable and most checks exist; one material risk, semantic state, lifecycle path, or design-record field lacks current evidence. |
| **4** | Renderer follows the frozen direction; responsive composition, reduced motion, deterministic semantic captures, accessibility, performance bounds, teardown, project checks, and the V3 design record are verified. |
| **5** | Verification covers the highest-risk behavior across devices and states, exposes no unexplained errors or leaks, and leaves a compact record another agent can use for accurate future output-distance comparison. |

## Evidence contract for a score of 5

Every individual 5 requires all three items:

1. **Artifact evidence** — name a file, capture, semantic state, measurement, or observed browser behavior and explain what it proves.
2. **Strongest counterevidence** — identify the most credible visible reason the criterion could deserve 4 or lower.
3. **Independent review** — a person or agent who did not author the direction inspects the relevant artifacts and confirms or disputes the 5. The reviewer receives the task and tier, without the author's intended score.

Missing any item caps that criterion at 4. Preserve reviewer disagreement in the report. Repeated praise, adjectives, and author confidence provide no rating evidence.

## Single-artifact thresholds

Normalize the six-criterion mean onto 100 with `mean / 5 × 100`.

- **Pass:** every criterion is at least 4; required production checks and source/output distance are present.
- **World-class candidate:** mean is at least 4.7 (94/100), no criterion is below 4, Originality and Production are both at least 4, and at least four criteria have independently supported 5s. A public candidate badge may use 95 only after these evidence conditions hold.
- **Blocked evidence:** record `unavailable` or `not tested` with the attempted check; lower the affected score according to the anchors.

This rating applies to one produced artifact. It does not establish that the Skill repeatedly produces diverse world-class work.

## Skill release gate

A formal cross-benchmark 95 release requires all single-artifact evidence rules plus:

- benchmark-normalized quality of at least 95 across the release set;
- multiple runs of the same brief assigned from one replayable cohort roster, with pairwise-unique causal routes and representation modes and no three structural fingerprint axes converging together across outputs;
- runtime automated checks passing at least 95% across applicable cases;
- no systematic tier, output-distance, accessibility, reduced-motion, or lifecycle failure hidden by aggregate score.

Report within-brief convergence separately from visual quality. A strong mean with repeated silhouette, spatial grammar, and temporal behavior does not pass the release gate.

Cohorts apply to coordinated independent alternatives and benchmark runs. Ordinary single-artifact evaluation uses one offset. Each cohort member still starts target-first, keeps renderer choice open through candidate search, and records `{baseSeed,index,size}` beside its exact assigned offset.

## Evaluation report shape

```text
CRITERION / SCORE
Evidence:
Strongest counterevidence:
Independent review: required for 5; otherwise n/a
Decision:
```

Finish with the lowest-scoring criterion, the earliest responsible layer, and the smallest revision likely to improve it.
