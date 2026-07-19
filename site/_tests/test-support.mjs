import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

async function findCachedPlaywrightPackage() {
  const cacheRoot = path.join(os.homedir(), '.npm', '_npx');
  const candidates = [];
  try {
    const entries = await readdir(cacheRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const packageJson = path.join(cacheRoot, entry.name, 'node_modules', 'playwright', 'package.json');
      try {
        const info = await stat(packageJson);
        candidates.push({ packageJson, modified: info.mtimeMs });
      } catch {
        // Ignore incomplete cache entries.
      }
    }
  } catch {
    return undefined;
  }
  candidates.sort((a, b) => b.modified - a.modified);
  return candidates[0]?.packageJson;
}

export async function loadPlaywright() {
  const direct = createRequire(import.meta.url);
  try {
    return direct('playwright');
  } catch {
    const packageJson = await findCachedPlaywrightPackage();
    if (!packageJson) throw new Error('Playwright is unavailable. Run `npx --yes playwright --version` once.');
    return createRequire(packageJson)('playwright');
  }
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

export function startStaticServer(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (!relative || relative.endsWith('/')) relative += 'index.html';
      const filePath = path.resolve(root, relative);
      if (!filePath.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const info = await stat(filePath);
      if (!info.isFile()) throw new Error('Missing file');
      response.writeHead(200, {
        'content-type': contentType(filePath),
        'content-length': info.size,
        'cache-control': 'no-store'
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve({ server, port: server.address().port });
    });
  });
}
