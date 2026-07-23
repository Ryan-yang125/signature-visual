import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createCreativeCohort, createCreativeOffset } from "../skills/signature-visual/scripts/creative-offset.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const scenarios = readJson("evals/scenarios.json");
invariant(scenarios.version === 3, "evals/scenarios.json must use version 3");
invariant(scenarios.skill === "signature-visual", "benchmark skill name must be signature-visual");
invariant(scenarios.global_assertions?.length >= 5, "benchmark needs at least five global assertions");
invariant(scenarios.global_assertions.some(assertion => assertion.includes("at least four") && assertion.includes("structural distance")), "benchmark must enforce landmark candidate-distance admission");
invariant(scenarios.global_assertions.some(assertion => assertion.includes("creative-offset") && assertion.includes("shadow baseline")), "benchmark must enforce landmark attractor quarantine");
invariant(scenarios.global_assertions.some(assertion => assertion.includes("schemaVersion 3") && assertion.includes("representation pressure")), "benchmark must enforce the V3 causal-offset contract");
invariant(scenarios.global_assertions.some(assertion => assertion.includes("offset cohort") && assertion.includes("pairwise distinct")), "benchmark must enforce coordinated cohort diversity");
invariant(scenarios.global_assertions.some(assertion => assertion.includes("forecasts") && assertion.includes("at least two")), "benchmark must enforce the landmark convergence-forecast gate");
invariant(scenarios.scenarios?.length >= 8, "benchmark needs at least eight scenarios");

const ids = scenarios.scenarios.map((scenario) => scenario.id);
invariant(new Set(ids).size === ids.length, "benchmark scenario ids must be unique");
for (const tier of ["landmark", "section", "refine"]) {
  invariant(scenarios.scenarios.some((scenario) => scenario.tier === tier), `benchmark must cover ${tier}`);
}
for (const scenario of scenarios.scenarios) {
  invariant(typeof scenario.prompt === "string" && scenario.prompt.length >= 80, `${scenario.id} needs a substantial prompt`);
  invariant(scenario.assertions?.length >= 5, `${scenario.id} needs at least five assertions`);
}

const requiredScenarioFamilies = [
  "review-history",
  "climate-evidence",
  "modular-audio",
  "biotech-permeability",
  "archival-search",
  "provenance-mobile",
  "static-policy",
  "output-distance",
  "common-room-attractor",
];
for (const family of requiredScenarioFamilies) {
  invariant(ids.some((id) => id.includes(family)), `benchmark family missing: ${family}`);
}

const evaluation = read("skills/signature-visual/references/evaluation.md");
for (const criterion of ["A", "B", "C", "D", "E", "F"]) {
  const start = evaluation.indexOf(`## ${criterion} —`);
  invariant(start >= 0, `evaluation criterion ${criterion} is missing`);
  const end = evaluation.indexOf("\n## ", start + 4);
  const section = evaluation.slice(start, end < 0 ? undefined : end);
  for (let score = 1; score <= 5; score += 1) {
    invariant(section.includes(`| **${score}** |`), `criterion ${criterion} needs a score-${score} anchor`);
  }
}
for (const phrase of [
  "Artifact evidence",
  "Strongest counterevidence",
  "Independent review",
  "mean is at least 4.7",
  "runtime automated checks passing at least 95%",
]) {
  invariant(evaluation.includes(phrase), `evaluation contract missing: ${phrase}`);
}

const patternLanguage = read("skills/signature-visual/references/pattern-language.md");
invariant(patternLanguage.slice(0, 500).includes("only after the candidate set and selected direction are frozen"), "Pattern Language must declare delayed access at the top");
for (const heading of ["Semantic fit", "Best for", "Industry", "Use cases"]) {
  invariant(!patternLanguage.includes(heading), `Pattern Language cannot prime candidates with ${heading}`);
}

const creativeSearch = read("skills/signature-visual/references/creative-search.md");
for (const phrase of ["taxonomy-external", "distance matrix", "convergenceForecast", "clusterBreakAxes", "Landmark", "Section", "Refine"]) {
  invariant(creativeSearch.toLowerCase().includes(phrase.toLowerCase()), `creative-search.md missing: ${phrase}`);
}

const schemaPaths = [
  "skills/signature-visual/schemas/design-record.schema.json",
  "skills/signature-visual/schemas/visual-qa-manifest-v3.schema.json",
  "skills/signature-visual/schemas/visual-qa-results-v3.schema.json",
];
const schemas = schemaPaths.map(readJson);
for (const [index, schema] of schemas.entries()) {
  invariant(schema.$schema === "https://json-schema.org/draft/2020-12/schema", `${schemaPaths[index]} must use JSON Schema 2020-12`);
  invariant(schema.$id?.startsWith("https://signature-visual.pages.dev/schemas/"), `${schemaPaths[index]} needs a public schema id`);
}

const designSchema = schemas[0];
for (const field of [
  "schemaVersion",
  "tier",
  "surface",
  "thesis",
  "directions",
  "distanceMatrix",
  "selection",
  "signatureRule",
  "renderer",
  "states",
  "runtimeCapabilities",
  "revision",
]) {
  invariant(designSchema.required.includes(field), `design record schema must require ${field}`);
}
invariant(designSchema.properties.schemaVersion.const === 3, "design record schemaVersion must be 3");
invariant(designSchema.properties.selection.properties.noveltyGuard, "design record schema needs a landmark novelty guard");
invariant(designSchema.allOf?.some(rule => rule.then?.properties?.selection?.required?.includes("noveltyGuard")), "landmark records must require noveltyGuard");
const landmarkRequired = designSchema.allOf.find(rule => rule.then?.properties?.selection?.required)?.then.properties.selection.required ?? [];
for (const field of ["convergenceForecast", "clusterBreakAxes", "forecastDisposition", "noveltyGuard"]) {
  invariant(landmarkRequired.includes(field), `landmark selection must require ${field}`);
}
invariant(designSchema.properties.selection.properties.clusterBreakAxes.minItems >= 2, "landmark selection must require at least two causal cluster breaks");
for (const field of ["schemaVersion", "seed", "quarantine", "routeId", "causalRoute", "substancePressure", "temporalPressure", "interactionPressure", "representationId", "representationPressure", "representationQuarantine", "evidenceMove", "spatialPressure", "counterfactual", "selectionChallenge"]) {
  invariant(designSchema.properties.selection.properties.noveltyGuard.properties.creativeOffset.required.includes(field), `creative offset record must require ${field}`);
}
invariant(designSchema.properties.selection.properties.noveltyGuard.properties.creativeOffset.properties.schemaVersion.const === 3, "creative offset schemaVersion must be 3");
invariant(designSchema.properties.selection.properties.noveltyGuard.properties.cohort, "novelty guard must support optional cohort metadata");

const cohort = createCreativeCohort(3, "eval-contract-cohort");
invariant(cohort.count === 3 && cohort.offsets.length === 3, "creative cohort must contain the requested offsets");
invariant(new Set(cohort.offsets.map(offset => offset.routeId)).size === 3, "creative cohort route ids must be unique");
invariant(new Set(cohort.offsets.map(offset => offset.representationId)).size === 3, "creative cohort representation ids must be unique");
for (const offset of cohort.offsets) {
  invariant(JSON.stringify(offset) === JSON.stringify(createCreativeOffset(offset.seed)), "every cohort entry must replay as an ordinary offset");
}

const recordDoc = read("skills/signature-visual/references/design-record.md");
const recordMatch = recordDoc.match(/## Minimal valid record[\s\S]*?```json\n([\s\S]*?)\n```/);
invariant(recordMatch, "design-record.md needs a minimal JSON example");
const record = JSON.parse(recordMatch[1]);
for (const field of designSchema.required) {
  invariant(Object.hasOwn(record, field), `minimal design record is missing ${field}`);
}
for (const field of designSchema.properties.selection.required) {
  invariant(Object.hasOwn(record.selection, field), `minimal selection is missing ${field}`);
}
if (record.tier === "landmark") {
  for (const field of landmarkRequired) {
    invariant(Object.hasOwn(record.selection, field), `minimal landmark selection is missing ${field}`);
  }
}
for (const field of designSchema.properties.runtimeCapabilities.required) {
  invariant(Object.hasOwn(record.runtimeCapabilities, field), `minimal runtimeCapabilities is missing ${field}`);
}

const landmarkMatch = recordDoc.match(/## Landmark novelty guard[\s\S]*?```json\n([\s\S]*?)\n```/);
invariant(landmarkMatch, "design-record.md needs a landmark novelty-guard example");
const landmarkSelection = JSON.parse(landmarkMatch[1]);
for (const field of landmarkRequired) {
  invariant(Object.hasOwn(landmarkSelection, field), `landmark novelty-guard example is missing ${field}`);
}
invariant(
  JSON.stringify(landmarkSelection.noveltyGuard.creativeOffset) === JSON.stringify(createCreativeOffset(landmarkSelection.noveltyGuard.creativeOffset.seed)),
  "landmark novelty-guard creative offset must exactly replay from its seed"
);

const skill = read("skills/signature-visual/SKILL.md");
for (const relativeLink of [
  "references/creative-search.md",
  "references/design-record.md",
  "references/evaluation.md",
  "schemas/design-record.schema.json",
  "scripts/creative-offset.mjs",
]) {
  invariant(skill.includes(relativeLink), `SKILL.md must route to ${relativeLink}`);
}

for (const scriptPath of [
  "skills/signature-visual/scripts/validate-design-record.mjs",
  "skills/signature-visual/scripts/validate-design-record.test.mjs",
]) {
  invariant(fs.existsSync(path.join(root, scriptPath)), `missing executable design-record contract: ${scriptPath}`);
}

process.stdout.write(`Signature Visual V3 benchmark contract OK (${scenarios.scenarios.length} scenarios, 6 anchored criteria, 3 schemas).\n`);
