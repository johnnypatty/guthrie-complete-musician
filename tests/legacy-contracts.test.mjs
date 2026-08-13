import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

import { buildSite } from '../scripts/build.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const APP_SCRIPTS = [
  'course-data.js', 'lesson-index.js', 'progress-schema.js', 'local-state-store.js', 'progress-store.js', 'lesson-search.js',
  'music-theory.js', 'recommendation-engine.js', 'skill-model.js', 'progress-controller.js', 'gear-profile.js', 'session-planner.js', 'practice-engine.js', 'session-runner.js', 'session-controller.js', 'audio-runtime.js', 'pitch-detector.js', 'signal-features.js', 'performance-analyser.js', 'input-manager.js', 'analysis-controller.js', 'guitar-input-view.js', 'indexed-db-adapter.js', 'progress-repository.js', 'recording-store.js', 'recording-controller.js', 'recording-view.js', 'fretboard-engine.js', 'review-scheduler.js', 'fretboard-view.js', 'ear-training-engine.js', 'ear-training-view.js', 'player-timeline.js', 'progression-engine.js', 'voicing-engine.js', 'bass-arranger.js', 'groove-patterns.js', 'groove-engine.js', 'synth-voices.js', 'audio-engine.js', 'backing-lab-view.js', 'ui-components.js', 'hash-router.js',
  'today-view.js', 'session-view.js', 'studio-view.js', 'progress-view.js', 'roadmap-view.js', 'app-shell.js', 'app.js'
];

async function buildContractSite() {
  const outDir = await mkdtemp(join(tmpdir(), 'gcm-legacy-contract-'));
  await buildSite({ projectRoot, contentRoot: join(projectRoot, 'content'), outDir });
  return outDir;
}

async function loadBuiltProgressStore() {
  const outDir = await buildContractSite();
  const progressSchema = await readFile(join(outDir, 'js', 'progress-schema.js'), 'utf8');
  const progressStore = await readFile(join(outDir, 'js', 'progress-store.js'), 'utf8');
  const context = { globalThis: {} };
  vm.runInNewContext(progressSchema, context, { filename: 'progress-schema.js' });
  vm.runInNewContext(progressStore, context, { filename: 'progress-store.js' });
  return context.globalThis.ProgressStore;
}

function element() {
  const listeners = new Map();
  return {
    value: '', textContent: '', innerHTML: '', hidden: false, checked: false, dataset: {}, style: {}, options: [],
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(name, callback) { listeners.set(name, callback); },
    dispatch(name, event = { target: this }) { listeners.get(name)?.(event); },
    click() {}, querySelector() { return element(); }, querySelectorAll() { return []; }
  };
}

test('generated dashboard retains the legacy Backing Lab, roadmap, and library anchors', async () => {
  const outDir = await buildContractSite();
  const index = await readFile(join(outDir, 'index.html'), 'utf8');

  for (const anchor of ['#backing-lab', '#roadmap', '#library']) {
    assert.match(index, new RegExp(`href="${anchor}"`));
    assert.match(index, new RegExp(`id="${anchor.slice(1)}"`));
  }
});

test('schema-3 progress exports every public field with current defaults', async () => {
  const ProgressStore = await loadBuiltProgressStore();
  const state = JSON.parse(JSON.stringify(ProgressStore.normalize(null)));
  assert.deepEqual(Object.keys(state).sort(), ['activeSession', 'attempts', 'completed', 'countInBars', 'customProgressions', 'gearProfile', 'lessons', 'levels', 'loop', 'minutes', 'recommendations', 'reviewItems', 'schemaVersion', 'sessions', 'skillObservations', 'tempo', 'trackId', 'week']);
  assert.deepEqual(state, {
    schemaVersion: 3, week: 1, minutes: 90, completed: {}, lessons: {}, trackId: 'emotional-d-minor',
    tempo: 74, loop: 'full', countInBars: 1, levels: { pad: 72, bass: 72, drums: 62, master: 80 },
    activeSession: null, sessions: [], attempts: [], skillObservations: [], reviewItems: [], customProgressions: [], recommendations: [], gearProfile: {}
  });
});

test('schema-1 progress migrates to schema 3 without losing supported settings', async () => {
  const ProgressStore = await loadBuiltProgressStore();
  const legacyFixture = {
    week: 8,
    minutes: 120,
    completed: { 'w8-120-technique': true },
    lessons: { 'motif-development': true },
    trackId: 'fusion-one',
    tempo: 132,
    loop: '8-16',
    countInBars: 2,
    levels: { pad: 71, bass: 65, drums: 59, master: 83 }
  };

  const state = JSON.parse(JSON.stringify(ProgressStore.normalize(legacyFixture)));
  assert.deepEqual(state, {
    ...legacyFixture, schemaVersion: 3,
    activeSession: null, sessions: [], attempts: [], skillObservations: [], reviewItems: [], customProgressions: [], recommendations: [], gearProfile: {}
  });
});

test('schema-2 progress imports into canonical schema 3 without losing persisted settings', async () => {
  const ProgressStore = await loadBuiltProgressStore();
  const schema2Fixture = {
    schemaVersion: 2,
    week: 19,
    minutes: 90,
    completed: { 'w19-90-ear': true },
    lessons: { 'target-notes-and-chord-changes': true },
    trackId: 'fusion-two',
    tempo: 108,
    loop: '16-32',
    countInBars: 0,
    levels: { pad: 48, bass: 55, drums: 61, master: 76 }
  };

  const state = JSON.parse(JSON.stringify(ProgressStore.importJson(JSON.stringify(schema2Fixture))));
  assert.deepEqual(state, {
    ...schema2Fixture, schemaVersion: 3,
    activeSession: null, sessions: [], attempts: [], skillObservations: [], reviewItems: [], customProgressions: [], recommendations: [], gearProfile: {}
  });
});

test('mounting the generated dashboard does not request microphone or other media permission', async () => {
  const outDir = await buildContractSite();
  const elements = new Map();
  const domReady = [];
  let mediaRequests = 0;
  const document = {
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, element());
      return elements.get(selector);
    },
    querySelectorAll() { return []; },
    addEventListener(name, callback) { if (name === 'DOMContentLoaded') domReady.push(callback); },
    createElement() { return element(); },
    documentElement: { scrollHeight: 0 }
  };
  const context = {
    document,
    navigator: { mediaDevices: { getUserMedia() { mediaRequests += 1; return Promise.resolve({}); } } },
    location: { protocol: 'file:', reload() {} },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    addEventListener() {}, requestAnimationFrame(callback) { callback(); }, setInterval() { return 1; }, clearInterval() {},
    setTimeout() { return 1; }, clearTimeout() {}, confirm() { return false; }, Blob, URL, console,
    globalThis: null
  };
  context.globalThis = context;

  for (const script of APP_SCRIPTS) {
    vm.runInNewContext(await readFile(join(outDir, 'js', script), 'utf8'), context, { filename: script });
  }
  domReady.forEach((callback) => callback());

  assert.equal(mediaRequests, 0);
});

test('dashboard reset writes default v3 progress without deleting rollback keys', async () => {
  const outDir = await buildContractSite();
  const elements = new Map();
  const domReady = [];
  const legacyV2 = JSON.stringify({ schemaVersion: 2, week: 8, minutes: 120, completed: { 'w8-120-technique': true } });
  const legacyV1 = JSON.stringify({ week: 4, minutes: 90, lessons: { 'motif-development': true } });
  const values = new Map([
    ['gcm-progress-v3', JSON.stringify({ schemaVersion: 3, week: 12, minutes: 90, completed: { 'w12-90-ear': true }, lessons: {}, trackId: 'fusion-one', tempo: 120, loop: 'full', countInBars: 1, levels: { pad: 72, bass: 72, drums: 62, master: 80 }, activeSession: null, sessions: [], attempts: [], skillObservations: [], reviewItems: [], customProgressions: [], recommendations: [], gearProfile: {} })],
    ['gcm-progress-v2', legacyV2],
    ['gcm-progress-v1', legacyV1]
  ]);
  let reloads = 0;
  const document = {
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, element());
      return elements.get(selector);
    },
    querySelectorAll() { return []; },
    addEventListener(name, callback) { if (name === 'DOMContentLoaded') domReady.push(callback); },
    createElement() { return element(); },
    documentElement: { scrollHeight: 0 }
  };
  const context = {
    document,
    navigator: {},
    location: { protocol: 'file:', reload() { reloads += 1; } },
    localStorage: { getItem(key) { return values.get(key) || null; }, setItem(key, value) { values.set(key, String(value)); }, removeItem(key) { values.delete(key); } },
    addEventListener() {}, requestAnimationFrame(callback) { callback(); }, setInterval() { return 1; }, clearInterval() {},
    setTimeout() { return 1; }, clearTimeout() {}, confirm() { return true; }, Blob, URL, console,
    globalThis: null
  };
  context.globalThis = context;

  for (const script of APP_SCRIPTS) {
    vm.runInNewContext(await readFile(join(outDir, 'js', script), 'utf8'), context, { filename: script });
  }
  domReady.forEach((callback) => callback());
  elements.get('#reset-progress').dispatch('click');

  assert.equal(values.get('gcm-progress-v2'), legacyV2);
  assert.equal(values.get('gcm-progress-v1'), legacyV1);
  assert.deepEqual(JSON.parse(values.get('gcm-progress-v3')), {
    schemaVersion: 3, week: 1, minutes: 90, completed: {}, lessons: {}, trackId: 'emotional-d-minor', tempo: 74, loop: 'full', countInBars: 1,
    levels: { pad: 72, bass: 72, drums: 62, master: 80 }, activeSession: null, sessions: [], attempts: [], skillObservations: [], reviewItems: [], customProgressions: [], recommendations: [], gearProfile: {}
  });
  assert.equal(reloads, 1);
});
