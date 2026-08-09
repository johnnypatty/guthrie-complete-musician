import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, parse, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadLessons } from './lib/content.mjs';
import { scanTree } from './lib/privacy.mjs';

const DEFAULT_REPOSITORY = 'johnnypatty/guthrie-complete-musician';

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function fillTemplate(template, values, templatePath) {
  let output = template;
  for (const [key, value] of Object.entries(values)) {
    output = output.split(`{{${key}}}`).join(String(value));
  }
  const unresolved = [...output.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((match) => match[1]);
  if (unresolved.length) throw new Error(`${templatePath}: unresolved template tokens: ${[...new Set(unresolved)].join(', ')}`);
  return output;
}

function repositoryDetails() {
  const repository = process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY;
  const [owner, name] = repository.split('/');
  if (!owner || !name) throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);
  return {
    repository,
    sourceBase: `https://github.com/${owner}/${name}/blob/main/`,
    canonicalBase: `https://${owner}.github.io/${name}/`
  };
}

function assertSafeOutput(projectRoot, contentRoot, outDir) {
  const output = resolve(outDir);
  const forbidden = new Set([resolve(projectRoot), resolve(contentRoot), parse(output).root]);
  if (forbidden.has(output) || !dirname(output)) throw new Error(`Unsafe output directory: ${output}`);
  return output;
}

function lessonCards(lessons) {
  return lessons.map((lesson) => `<a class="library-link" href="lessons/${lesson.slug}.html" data-category="${escapeHtml(lesson.category)}" data-phase="${escapeHtml(lesson.phase)}" data-search="${escapeHtml([lesson.title, lesson.summary, ...lesson.tags].join(' ').toLowerCase())}">
  <small>${escapeHtml(lesson.category)}</small>
  <strong>${escapeHtml(lesson.title)}</strong>
  <span>${escapeHtml(lesson.summary)}</span>
</a>`).join('\n');
}

function lessonLink(lesson, direction) {
  if (!lesson) return '<span aria-hidden="true"></span>';
  const label = direction === 'previous' ? 'Previous lesson' : 'Next lesson';
  const arrow = direction === 'previous' ? '←' : '→';
  return `<a href="${lesson.slug}.html" rel="${direction === 'previous' ? 'prev' : 'next'}"><small>${label}</small><br><strong>${direction === 'previous' ? `${arrow} ` : ''}${escapeHtml(lesson.title)}${direction === 'next' ? ` ${arrow}` : ''}</strong></a>`;
}

export function cacheDigest(entries) {
  const hash = createHash('sha256');
  for (const entry of [...entries].sort((left, right) => left.path.localeCompare(right.path, 'en'))) {
    hash.update(String(entry.path));
    hash.update('\0');
    hash.update(entry.data);
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 12);
}

async function listFiles(root) {
  const files = [];
  async function visit(directory) {
    const items = await readdir(directory, { withFileTypes: true });
    items.sort((left, right) => left.name.localeCompare(right.name, 'en'));
    for (const item of items) {
      const absolute = join(directory, item.name);
      if (item.isDirectory()) await visit(absolute);
      else if (item.isFile()) files.push(absolute);
    }
  }
  await visit(root);
  return files;
}

export async function buildSite(options = {}) {
  const projectRoot = resolve(options.projectRoot || process.cwd());
  const contentRoot = resolve(options.contentRoot || join(projectRoot, 'content'));
  const outDir = assertSafeOutput(projectRoot, contentRoot, options.outDir || join(projectRoot, 'public'));
  const templatesDir = join(projectRoot, 'src', 'templates');
  const { canonicalBase, sourceBase } = repositoryDetails();

  const privacyFindings = await scanTree(contentRoot);
  if (privacyFindings.length) throw new Error(`Privacy scan failed: ${JSON.stringify(privacyFindings)}`);

  const lessons = await loadLessons(contentRoot);
  if (!lessons.length) throw new Error('No lessons found');

  await rm(outDir, { recursive: true, force: true });
  await mkdir(join(outDir, 'lessons'), { recursive: true });
  await mkdir(join(outDir, 'data'), { recursive: true });
  await mkdir(join(outDir, 'downloads'), { recursive: true });
  await cp(join(projectRoot, 'src', 'assets'), join(outDir, 'assets'), { recursive: true });
  await cp(join(projectRoot, 'src', 'js'), join(outDir, 'js'), { recursive: true });
  await cp(join(projectRoot, 'src', 'manifest.webmanifest'), join(outDir, 'manifest.webmanifest'));
  await cp(join(contentRoot, 'templates', 'Practice Log.csv'), join(outDir, 'downloads', 'Practice Log.csv'));
  await cp(join(contentRoot, 'templates', 'Repertoire Tracker.csv'), join(outDir, 'downloads', 'Repertoire Tracker.csv'));

  const [indexTemplate, lessonTemplate, notFoundTemplate] = await Promise.all([
    readFile(join(templatesDir, 'index.html'), 'utf8'),
    readFile(join(templatesDir, 'lesson.html'), 'utf8'),
    readFile(join(templatesDir, '404.html'), 'utf8')
  ]);

  const indexHtml = fillTemplate(indexTemplate, {
    CANONICAL_URL: canonicalBase,
    SOCIAL_IMAGE: `${canonicalBase}assets/social-preview.svg`,
    LESSON_COUNT: lessons.length,
    LESSON_CARDS: lessonCards(lessons)
  }, 'src/templates/index.html');
  await writeFile(join(outDir, 'index.html'), indexHtml, 'utf8');

  for (let index = 0; index < lessons.length; index += 1) {
    const lesson = lessons[index];
    const lessonHtml = fillTemplate(lessonTemplate, {
      TITLE: escapeHtml(lesson.title),
      SUMMARY: escapeHtml(lesson.summary),
      CATEGORY: escapeHtml(lesson.category),
      PHASE: escapeHtml(lesson.phase),
      DIFFICULTY: escapeHtml(lesson.difficulty),
      TAGS: escapeHtml(lesson.tags.join(' • ')),
      SLUG: escapeHtml(lesson.slug),
      CONTENT: lesson.html,
      CANONICAL_URL: `${canonicalBase}lessons/${lesson.slug}.html`,
      SOURCE_URL: `${sourceBase}content/${lesson.sourcePath}`,
      PREVIOUS_LINK: lessonLink(lessons[index - 1], 'previous'),
      NEXT_LINK: lessonLink(lessons[index + 1], 'next')
    }, 'src/templates/lesson.html');
    await writeFile(join(outDir, 'lessons', `${lesson.slug}.html`), lessonHtml, 'utf8');
  }

  const publicLessonIndex = lessons.map(({ title, category, phase, difficulty, tags, summary, slug }) => ({
    title, category, phase, difficulty, tags, summary, slug
  }));
  await writeFile(join(outDir, 'data', 'lessons.json'), `${JSON.stringify(publicLessonIndex, null, 2)}\n`, 'utf8');
  await writeFile(join(outDir, 'js', 'lesson-index.js'), `globalThis.GcmLessonIndex = ${JSON.stringify(publicLessonIndex)};\n`, 'utf8');
  await writeFile(join(outDir, '404.html'), notFoundTemplate, 'utf8');
  await writeFile(join(outDir, '.nojekyll'), '', 'utf8');

  const precacheFiles = (await listFiles(outDir)).filter((absolute) => relative(outDir, absolute) !== '.nojekyll');
  const precacheEntries = await Promise.all(precacheFiles.map(async (absolute) => ({
    path: `./${relative(outDir, absolute).split(sep).join('/')}`,
    data: await readFile(absolute)
  })));
  const precacheUrls = precacheEntries.map(({ path }) => path).sort();
  const cacheHash = cacheDigest(precacheEntries);
  const serviceWorkerTemplate = await readFile(join(templatesDir, 'sw.js'), 'utf8');
  const serviceWorker = fillTemplate(serviceWorkerTemplate, {
    CACHE_NAME: JSON.stringify(`gcm-static-${cacheHash}`),
    PRECACHE_URLS: JSON.stringify(precacheUrls, null, 2)
  }, 'src/templates/sw.js');
  await writeFile(join(outDir, 'sw.js'), serviceWorker, 'utf8');

  return { outDir, lessonCount: lessons.length };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) {
  buildSite()
    .then(({ outDir, lessonCount }) => console.log(`Built ${lessonCount} lessons in ${outDir}`))
    .catch((error) => {
      console.error(error.stack || error.message);
      process.exitCode = 1;
    });
}
