import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { buildSite } from '../scripts/build.mjs';

const projectRoot = resolve(import.meta.dirname, '..');

const PUBLIC_LESSON_URLS = [
  'lessons/2-hour-session.html', 'lessons/90-minute-core.html', 'lessons/long-day-blocks.html', 'lessons/rest-and-injury-prevention.html', 'lessons/weekly-schedule.html',
  'lessons/bending-vibrato-dynamics-and-harmonics.html', 'lessons/clean-speed-system.html', 'lessons/legato-and-tapping.html', 'lessons/picking-and-synchronization.html', 'lessons/sweeping-string-skipping-and-muting.html',
  'lessons/funk-and-muted-articulation.html', 'lessons/odd-meter-and-rhythmic-displacement.html', 'lessons/time-subdivisions-and-metronome.html', 'lessons/famous-short-melodies-and-riffs.html', 'lessons/hearing-chords-and-bass-lines.html',
  'lessons/the-no-tabs-method.html', 'lessons/transcription-ladder.html', 'lessons/fretboard-freedom.html', 'lessons/how-chords-are-built.html', 'lessons/how-scales-are-built.html',
  'lessons/modes-harmony-and-playing-through-changes.html', 'lessons/seventh-chords-extensions-and-alterations.html', 'lessons/triads-inversions-and-voice-leading.html', 'lessons/build-your-own-vocabulary.html', 'lessons/motif-development.html',
  'lessons/target-notes-and-chord-changes.html', 'lessons/tension-release-and-outside-playing.html', 'lessons/the-musical-sentence.html', 'lessons/arrangement-and-performance-checklist.html', 'lessons/cover-rules-no-tabs.html',
  'lessons/guthrie-study-map.html', 'lessons/personal-cover-ladder.html', 'lessons/develop-your-own-voice.html', 'lessons/natural-stage-banter.html', 'lessons/storytelling-timing-and-callbacks.html',
  'lessons/24-week-final-performance.html', 'lessons/baseline-test.html', 'lessons/monthly-tests.html', 'lessons/weekly-review.html', 'lessons/recording-review-checklist.html',
  'lessons/solo-analysis-worksheet.html', 'lessons/transcription-worksheet.html', 'lessons/resource-guide.html', 'lessons/source-notes.html', 'lessons/action-relief-intonation.html', 'lessons/floating-tremolo-setup.html',
  'lessons/maintenance-and-storage.html', 'lessons/signal-noise-and-grounding.html', 'lessons/string-gauge-changes.html', 'lessons/used-guitar-inspection.html', 'lessons/future-stainless-refret-notes.html',
  'lessons/in-person-inspection-checklist.html', 'lessons/rg8570-long-term-evaluation.html'
];

test('buildSite generates the complete static lesson site', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'gcm-build-'));
  const result = await buildSite({
    projectRoot,
    contentRoot: join(projectRoot, 'content'),
    outDir
  });

  assert.equal(result.lessonCount, 53);
  const lessonFiles = (await readdir(join(outDir, 'lessons'))).filter((name) => name.endsWith('.html'));
  assert.equal(lessonFiles.length, 53);

  const index = await readFile(join(outDir, 'index.html'), 'utf8');
  const firstLesson = await readFile(join(outDir, 'lessons', lessonFiles[0]), 'utf8');
  const notFound = await readFile(join(outDir, '404.html'), 'utf8');
  const lessonIndex = JSON.parse(await readFile(join(outDir, 'data', 'lessons.json'), 'utf8'));
  const lessonIndexScript = await readFile(join(outDir, 'js', 'lesson-index.js'), 'utf8');
  const styles = await readFile(join(outDir, 'assets', 'style.css'), 'utf8');
  const shellStyles = await readFile(join(outDir, 'assets', 'app-shell.css'), 'utf8');
  const componentStyles = await readFile(join(outDir, 'assets', 'components.css'), 'utf8');
  const viewStyles = await readFile(join(outDir, 'assets', 'views.css'), 'utf8');

  assert.match(index, /<main id="main-content">/);
  assert.match(index, /<body class="app-page">/);
  assert.match(index, /Guthrie Complete Musician/);
  for (const route of ['today', 'session', 'studio', 'progress', 'roadmap']) {
    assert.match(index, new RegExp(`data-route-view="${route}"`));
    assert.match(index, new RegExp(`href="#/${route}"`));
  }
  assert.equal((index.match(/data-route-link=/g) || []).length, 5);
  assert.equal((index.match(/<h1[ >]/g) || []).length, 5);
  assert.match(index, /data-route-view="today"[^>]*>[^]*?<h1[^>]*>[^<]+<\/h1>/);
  assert.match(index, /class="app-navigation"/);
  assert.match(index, /class="desktop-rail"/);
  assert.match(index, /<script src="js\/lesson-index\.js"><\/script>/);
  assert.doesNotMatch(index, /class="mobile-nav"/);
  assert.match(index, /id="count-in-select"/);
  assert.match(index, /id="master-level"/);
  assert.match(index, /id="transport-position"/);
  assert.match(index, /id="transport-progress"/);
  assert.match(index, /id="target-tones"/);
  const studioDestinations = {
    input: ['#/studio/input', 'studio-input'],
    recording: ['#/studio/recording', 'studio-recording'],
    backing: ['#backing-lab', 'backing-lab'],
    fretboard: ['#/studio/fretboard', 'studio-fretboard'],
    chords: ['#chord-lab', 'chord-lab']
  };
  for (const [subroute, [href, id]] of Object.entries(studioDestinations)) {
    assert.match(index, new RegExp(`href="${href}"[^>]*data-route-section-link="${subroute}"`));
    assert.match(index, new RegExp(`id="${id}"[^>]*data-route-section="${subroute}"`));
  }
  assert.match(firstLesson, /aria-label="Breadcrumb"/);
  assert.match(firstLesson, /class="lesson-nav"/);
  assert.match(firstLesson, /class="mobile-nav"/);
  assert.match(firstLesson, /<script src="\.\.\/js\/progress-schema\.js"><\/script>/);
  assert.match(firstLesson, /<script src="\.\.\/js\/local-state-store\.js"><\/script>/);
  assert.match(firstLesson, /<script src="\.\.\/js\/progress-store\.js"><\/script>/);
  assert.match(firstLesson, /<script src="\.\.\/js\/lesson-page\.js"><\/script>/);
  assert.match(firstLesson, /github\.com\/johnnypatty\/guthrie-complete-musician\/blob\/main\/content\//);
  assert.match(notFound, /Page not found/);
  assert.equal(lessonIndex.length, 53);
  assert.deepEqual(lessonIndex.map((lesson) => `lessons/${lesson.slug}.html`), PUBLIC_LESSON_URLS);
  assert.deepEqual(lessonFiles.map((file) => `lessons/${file}`).sort(), [...PUBLIC_LESSON_URLS].sort());
  assert.match(lessonIndexScript, /globalThis\.GcmLessonIndex/);
  assert.match(styles, /\.player-grid\s*>\s*\*\s*\{\s*min-width:\s*0/);
  assert.match(shellStyles, /position:\s*fixed/);
  assert.match(shellStyles, /env\(safe-area-inset-bottom/);
  assert.match(shellStyles, /min-width:\s*1024px/);
  assert.match(shellStyles, /\.app-page \.brand/);
  assert.doesNotMatch(shellStyles, /^\.brand/m);
  assert.match(componentStyles, /\.app-page \.button/);
  assert.match(viewStyles, /\.app-page \.view-heading/);
  assert.match(styles, /\.lesson-page \.button\.ghost/);
  assert.match(styles, /\.lesson-page \.mobile-nav summary/);
  assert.match(styles, /--lesson-header-offset:/);
  assert.match(styles, /\.reading-progress[^}]*top:\s*var\(--lesson-header-offset\)/s);
  assert.deepEqual(Object.keys(lessonIndex[0]).sort(), ['category', 'difficulty', 'phase', 'slug', 'summary', 'tags', 'title'].sort());

  await stat(join(outDir, '.nojekyll'));
  await stat(join(outDir, 'downloads', 'Practice Log.csv'));
  await stat(join(outDir, 'downloads', 'Repertoire Tracker.csv'));

  for (const html of [index, firstLesson, notFound]) {
    assert.doesNotMatch(html, /\{\{[A-Z0-9_]+\}\}/);
  }
});
