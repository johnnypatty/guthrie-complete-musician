import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { buildSite, cacheDigest } from '../scripts/build.mjs';
import { packageOffline } from '../scripts/package-offline.mjs';

const projectRoot = resolve(import.meta.dirname, '..');

test('service-worker cache fingerprint is order-stable and content-sensitive', () => {
  const original = [
    { path: './index.html', data: Buffer.from('one') },
    { path: './assets/style.css', data: Buffer.from('two') }
  ];
  assert.equal(cacheDigest(original), cacheDigest([...original].reverse()));
  assert.notEqual(cacheDigest(original), cacheDigest([{ ...original[0], data: Buffer.from('changed') }, original[1]]));
});

test('build creates a standalone manifest and complete service-worker lesson cache', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'gcm-offline-build-'));
  await buildSite({ projectRoot, contentRoot: join(projectRoot, 'content'), outDir });
  const manifest = JSON.parse(await readFile(join(outDir, 'manifest.webmanifest'), 'utf8'));
  const worker = await readFile(join(outDir, 'sw.js'), 'utf8');
  const lessons = (await readdir(join(outDir, 'lessons'))).filter((name) => name.endsWith('.html'));
  const scripts = (await readdir(join(projectRoot, 'src', 'js'))).filter((name) => name.endsWith('.js'));

  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.match(worker, /gcm-static-/);
  assert.match(worker, /\.\/index\.html/);
  for (const lesson of lessons) assert.match(worker, new RegExp(`\\.\\/lessons/${lesson.replaceAll('.', '\\.')}`));
  for (const script of scripts) assert.match(worker, new RegExp(`\\.\\/js/${script.replaceAll('.', '\\.')}"`));
  assert.doesNotMatch(worker, /cache\.put\s*\(|blob:|recordings|localStorage|indexedDB/i);
});

test('offline ZIP package has a safe launcher and excludes private and recursive files', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'gcm-package-'));
  const outDir = join(tempRoot, 'public');
  const zipPath = join(tempRoot, 'course.zip');
  await buildSite({ projectRoot, contentRoot: join(projectRoot, 'content'), outDir });
  const result = await packageOffline({ projectRoot, publicDir: outDir, zipPath });

  assert.ok(result.entries.includes('START HERE.html'));
  assert.ok(result.entries.includes('index.html'));
  assert.ok(result.entries.some((name) => name.startsWith('content/') && name.endsWith('.md')));
  assert.ok(result.entries.some((name) => name.startsWith('lessons/') && name.endsWith('.html')));
  assert.equal(result.entries.some((name) => /(?:^|\/)\.git(?:\/|$)|Private Notes|guthrie-complete-musician-offline\.zip/i.test(name)), false);
  const launcher = result.entryData.get('START HERE.html').toString('utf8');
  assert.match(launcher, /href="index\.html"/);
  assert.match(launcher, /Open the offline course/);
  assert.match(launcher, /double-click <strong>index\.html<\/strong>/);
});
