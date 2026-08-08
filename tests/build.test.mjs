import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { buildSite } from '../scripts/build.mjs';

const projectRoot = resolve(import.meta.dirname, '..');

test('buildSite generates the complete static lesson site', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'gcm-build-'));
  const result = await buildSite({
    projectRoot,
    contentRoot: join(projectRoot, 'content'),
    outDir
  });

  assert.equal(result.lessonCount, 47);
  const lessonFiles = (await readdir(join(outDir, 'lessons'))).filter((name) => name.endsWith('.html'));
  assert.equal(lessonFiles.length, 47);

  const index = await readFile(join(outDir, 'index.html'), 'utf8');
  const firstLesson = await readFile(join(outDir, 'lessons', lessonFiles[0]), 'utf8');
  const notFound = await readFile(join(outDir, '404.html'), 'utf8');
  const lessonIndex = JSON.parse(await readFile(join(outDir, 'data', 'lessons.json'), 'utf8'));
  const lessonIndexScript = await readFile(join(outDir, 'js', 'lesson-index.js'), 'utf8');

  assert.match(index, /<main id="main-content">/);
  assert.match(index, /Guthrie Complete Musician/);
  assert.match(index, /<script src="js\/lesson-index\.js"><\/script>/);
  assert.match(index, /class="mobile-nav"/);
  assert.match(firstLesson, /aria-label="Breadcrumb"/);
  assert.match(firstLesson, /class="lesson-nav"/);
  assert.match(firstLesson, /class="mobile-nav"/);
  assert.match(firstLesson, /<script src="\.\.\/js\/progress-store\.js"><\/script>/);
  assert.match(firstLesson, /<script src="\.\.\/js\/lesson-page\.js"><\/script>/);
  assert.match(firstLesson, /github\.com\/johnnypatty\/guthrie-complete-musician\/blob\/main\/content\//);
  assert.match(notFound, /Page not found/);
  assert.equal(lessonIndex.length, 47);
  assert.match(lessonIndexScript, /globalThis\.GcmLessonIndex/);
  assert.deepEqual(Object.keys(lessonIndex[0]).sort(), ['category', 'difficulty', 'phase', 'slug', 'summary', 'tags', 'title'].sort());

  await stat(join(outDir, '.nojekyll'));
  await stat(join(outDir, 'downloads', 'Practice Log.csv'));
  await stat(join(outDir, 'downloads', 'Repertoire Tracker.csv'));

  for (const html of [index, firstLesson, notFound]) {
    assert.doesNotMatch(html, /\{\{[A-Z0-9_]+\}\}/);
  }
});
