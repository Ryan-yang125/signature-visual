import { cp, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = path.join(projectDirectory, 'site');
const outputDirectory = path.join(projectDirectory, '.site-dist');
const schemaDirectory = path.join(projectDirectory, 'skills', 'signature-visual', 'schemas');
const publicSchemaNames = [
  'design-record.schema.json',
  'visual-qa-manifest-v3.schema.json',
  'visual-qa-results-v3.schema.json'
];

const requiredPaths = [
  'index.html',
  'css/tokens.css',
  'css/base.css',
  'css/sections.css',
  'js/main.js',
  'examples/particle-current/index.html',
  'examples/living-orb/index.html',
  'examples/radiance-field/index.html',
  'examples/spatial-lineage/index.html'
];

await Promise.all(requiredPaths.map(relativePath => stat(path.join(sourceDirectory, relativePath))));
await Promise.all(publicSchemaNames.map(name => stat(path.join(schemaDirectory, name))));

const homepage = await readFile(path.join(sourceDirectory, 'index.html'), 'utf8');
const editionContract = [
  'Edition 03',
  'Creative search entropy',
  'Quarantine the obvious answer',
  'Cohort 03',
  'Adversarial selection',
  'Forecast convergence',
  'Break the causal cluster',
  'Temporal archetype',
  'Deterministic runtime QA'
];

for (const fragment of editionContract) {
  if (!homepage.includes(fragment)) throw new Error(`Edition 03 homepage is missing: ${fragment}`);
}

if (homepage.includes('TODO')) throw new Error('Production homepage contains a TODO.');
if (/[—–]/u.test(homepage)) throw new Error('Production homepage contains a forbidden dash character.');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(sourceDirectory, outputDirectory, {
  recursive: true,
  filter(source) {
    const relative = path.relative(sourceDirectory, source);
    return relative !== '_tests' && !relative.startsWith(`_tests${path.sep}`);
  }
});
await mkdir(path.join(outputDirectory, 'schemas'), { recursive: true });
await Promise.all(publicSchemaNames.map(name => cp(
  path.join(schemaDirectory, name),
  path.join(outputDirectory, 'schemas', name)
)));

const outputEntries = await readdir(outputDirectory);
if (outputEntries.includes('_tests')) throw new Error('Production build contains site/_tests.');
await Promise.all(publicSchemaNames.map(name => stat(path.join(outputDirectory, 'schemas', name))));

console.log(`Production site built at ${outputDirectory}`);
