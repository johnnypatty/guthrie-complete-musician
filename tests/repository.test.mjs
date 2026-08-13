import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { buildSite } from '../scripts/build.mjs';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFile(join(root, path), 'utf8');

test('public documentation states privacy, content policy, project status and dual licenses', async () => {
  const [readme, contributing, security, codeLicense, contentLicense] = await Promise.all([
    read('README.md'), read('CONTRIBUTING.md'), read('SECURITY.md'), read('LICENSE-CODE'), read('LICENSE-CONTENT')
  ]);
  assert.match(readme, /unofficial.*not (?:affiliated|endorsed)/is);
  assert.match(readme, /progress.*browser.*local/is);
  assert.match(readme, /no copyrighted (?:backing tracks|music|tabs)/i);
  assert.match(readme, /MIT.*CC BY-NC-SA 4\.0/is);
  assert.match(contributing, /privacy scan/i);
  assert.match(security, /security vulnerability/i);
  assert.match(codeLicense, /MIT License/);
  assert.match(contentLicense, /Creative Commons Attribution-NonCommercial-ShareAlike 4\.0 International/);
});

test('repository scripts and validation workflow run the complete publication gate', async () => {
  const packageJson = JSON.parse(await read('package.json'));
  const testWorkflow = await read('.github/workflows/test.yml');
  assert.equal(packageJson.scripts.test, 'node --test tests/*.test.mjs');
  assert.equal(packageJson.scripts.build, 'node scripts/build.mjs');
  assert.equal(packageJson.scripts['package:offline'], 'node scripts/package-offline.mjs');
  assert.equal(packageJson.scripts.verify, 'node scripts/verify.mjs');
  for (const command of ['npm ci', 'npm test', 'npm run build', 'npm run package:offline', 'npm run verify']) {
    assert.match(testWorkflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(testWorkflow, /permissions:\s*\n\s*contents: read/);
});

test('Pages workflow grants deploy permissions only to the deploy job', async () => {
  const pages = await read('.github/workflows/pages.yml');
  const buildSection = pages.split(/^  deploy:/m)[0];
  const deploySection = pages.split(/^  deploy:/m)[1];
  assert.doesNotMatch(buildSection, /pages: write|id-token: write/);
  assert.match(deploySection, /pages: write/);
  assert.match(deploySection, /id-token: write/);
  assert.match(pages, /actions\/checkout@v6/);
  assert.match(pages, /actions\/upload-pages-artifact@v4/);
  assert.match(pages, /actions\/deploy-pages@v4/);
  assert.match(pages, /path: public/);
});

test('the generated public page loads its application scripts from the same static site', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'gcm-public-contract-'));
  await buildSite({ projectRoot: root, contentRoot: join(root, 'content'), outDir });
  const index = await readFile(join(outDir, 'index.html'), 'utf8');
  const scripts = [...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map((match) => match[1]);

  assert.deepEqual(scripts, [
    'js/course-data.js', 'js/lesson-index.js', 'js/progress-schema.js', 'js/local-state-store.js', 'js/progress-store.js', 'js/lesson-search.js',
    'js/music-theory.js', 'js/recommendation-engine.js', 'js/skill-model.js', 'js/progress-controller.js', 'js/gear-profile.js', 'js/session-planner.js', 'js/practice-engine.js', 'js/session-runner.js', 'js/session-controller.js', 'js/audio-runtime.js', 'js/pitch-detector.js', 'js/signal-features.js', 'js/performance-analyser.js', 'js/input-manager.js', 'js/analysis-controller.js', 'js/guitar-input-view.js', 'js/indexed-db-adapter.js', 'js/progress-repository.js', 'js/recording-store.js', 'js/recording-controller.js', 'js/recording-view.js', 'js/fretboard-engine.js', 'js/review-scheduler.js', 'js/fretboard-view.js', 'js/ear-training-engine.js', 'js/ear-training-view.js', 'js/player-timeline.js', 'js/progression-engine.js', 'js/voicing-engine.js', 'js/bass-arranger.js', 'js/groove-patterns.js', 'js/groove-engine.js', 'js/synth-voices.js', 'js/audio-engine.js', 'js/backing-lab-view.js', 'js/ui-components.js', 'js/hash-router.js',
    'js/today-view.js', 'js/session-view.js', 'js/studio-view.js', 'js/progress-view.js', 'js/roadmap-view.js', 'js/app-shell.js', 'js/app.js'
  ]);
});
