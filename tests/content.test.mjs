import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  loadLessons,
  parseFrontMatter,
  renderMarkdown,
  slugify
} from '../scripts/lib/content.mjs';

const validSource = `---
title: "Picking and Synchronization"
category: "Technique"
phase: "Weeks 1-24"
difficulty: "Progressive"
tags: ["technique", "picking"]
summary: "Build relaxed two-hand synchronization."
---

## Accuracy first

Play slowly.`;

test('parseFrontMatter returns validated metadata and body', () => {
  const parsed = parseFrontMatter(validSource, 'picking.md');
  assert.equal(parsed.attributes.title, 'Picking and Synchronization');
  assert.deepEqual(parsed.attributes.tags, ['technique', 'picking']);
  assert.match(parsed.body, /Accuracy first/);
});

test('parseFrontMatter names the path and missing field', () => {
  assert.throws(
    () => parseFrontMatter('---\ntitle: "Picking"\n---\nBody', 'content/picking.md'),
    /content\/picking\.md.*category/i
  );
});

test('slugify creates stable URL-safe slugs', () => {
  assert.equal(slugify('Bending, Vibrato & Dynamics!'), 'bending-vibrato-dynamics');
  assert.equal(slugify('  RG8570  '), 'rg8570');
});

test('renderMarkdown renders lesson structures and escapes raw HTML', () => {
  const html = renderMarkdown(`# Title

- [x] Relax
- [ ] Record

| A | B |
|---|---|
| 1 | 2 |

> Hear first.

Use **strong**, *emphasis*, \`code\`, and [Open Music Theory](https://viva.pressbooks.pub/openmusictheory/).

\`\`\`text
<unsafe>
\`\`\`

<script>alert(1)</script>`);

  assert.match(html, /<h1 id="title">Title<\/h1>/);
  assert.match(html, /type="checkbox" checked disabled/);
  assert.match(html, /<table>/);
  assert.match(html, /<blockquote>/);
  assert.match(html, /<strong>strong<\/strong>/);
  assert.match(html, /target="_blank" rel="noreferrer noopener"/);
  assert.match(html, /&lt;unsafe&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('loadLessons rejects duplicate slugs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gcm-lessons-'));
  await mkdir(join(root, 'a'));
  await mkdir(join(root, 'b'));
  await writeFile(join(root, 'a', 'same.md'), validSource);
  await writeFile(join(root, 'b', 'same.md'), validSource.replace('Picking and Synchronization', 'Another Lesson'));

  await assert.rejects(() => loadLessons(root), /duplicate slug.*same/i);
});

test('loadLessons excludes template files and sorts by category path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gcm-lessons-'));
  await mkdir(join(root, '02-technique'));
  await mkdir(join(root, '01-practice'));
  await mkdir(join(root, 'templates'));
  await writeFile(join(root, '02-technique', 'b.md'), validSource.replace('Picking and Synchronization', 'B Lesson'));
  await writeFile(join(root, '01-practice', 'a.md'), validSource.replace('Picking and Synchronization', 'A Lesson'));
  await writeFile(join(root, 'templates', 'ignored.md'), validSource);

  const lessons = await loadLessons(root);

  assert.deepEqual(lessons.map((lesson) => lesson.title), ['A Lesson', 'B Lesson']);
  assert.deepEqual(lessons.map((lesson) => lesson.slug), ['a', 'b']);
});

test('ships six generic Gear and Setup guides without transaction details', async () => {
  const directory = join(process.cwd(), 'content', '12-gear-and-setup');
  const files = (await readdir(directory)).filter((name) => name.endsWith('.md'));
  assert.equal(files.length, 6);
  const text = (await Promise.all(files.map((name) => readFile(join(directory, name), 'utf8')))).join('\n');
  assert.match(text, /floating tremolo/i); assert.match(text, /ground/i); assert.doesNotMatch(text, /pickup price|message from seller/i);
});
