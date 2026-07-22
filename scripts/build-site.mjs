import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = path.join(projectDirectory, 'site');
const outputDirectory = path.join(projectDirectory, '.site-dist');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(sourceDirectory, outputDirectory, {
  recursive: true,
  filter(source) {
    const relative = path.relative(sourceDirectory, source);
    return relative !== '_tests' && !relative.startsWith(`_tests${path.sep}`);
  }
});

console.log(`Production site built at ${outputDirectory}`);
