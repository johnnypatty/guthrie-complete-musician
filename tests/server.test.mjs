import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtemp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { buildSite } from '../scripts/build.mjs';
import { createStaticServer } from '../scripts/serve.mjs';

const projectRoot = resolve(import.meta.dirname, '..');

function rawRequest(port, path) {
  return new Promise((resolveRequest, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolveRequest({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8')
      }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('local server serves the course, MIME types, 404 and rejects traversal', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'gcm-server-'));
  await buildSite({ projectRoot, contentRoot: join(projectRoot, 'content'), outDir: root });
  const server = createStaticServer({ root });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  t.after(() => new Promise((resolveClose) => server.close(resolveClose)));
  const { port } = server.address();

  const home = await rawRequest(port, '/');
  assert.equal(home.status, 200);
  assert.match(home.body, /Guthrie Complete Musician/);

  const lesson = await rawRequest(port, '/lessons/90-minute-core.html');
  assert.equal(lesson.status, 200);
  assert.match(lesson.headers['content-type'], /^text\/html/);

  const manifest = await rawRequest(port, '/manifest.webmanifest');
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers['content-type'], /^application\/manifest\+json/);

  const missing = await rawRequest(port, '/missing-phrase');
  assert.equal(missing.status, 404);
  assert.match(missing.body, /Page not found/);

  const traversal = await rawRequest(port, '/%2e%2e/package.json');
  assert.equal(traversal.status, 400);
  assert.doesNotMatch(traversal.body, /"scripts"/);
});
