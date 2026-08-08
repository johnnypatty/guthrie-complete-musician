import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/progress-store.js');
const ProgressStore = globalThis.ProgressStore;

test('normalizes an empty value to schema 2 defaults', () => {
  const state = ProgressStore.normalize(null);
  assert.equal(state.schemaVersion, 2);
  assert.equal(state.week, 1);
  assert.equal(state.minutes, 90);
  assert.deepEqual(state.completed, {});
  assert.deepEqual(state.lessons, {});
  assert.equal(state.trackId, 'emotional-d-minor');
  assert.equal(state.levels.master, 80);
});

test('migrates schema 1 progress and clamps unsafe values', () => {
  const state = ProgressStore.normalize({
    week: 99,
    minutes: 120,
    completed: { 'w1-90-technique': true },
    trackId: 'fusion-one',
    tempo: 500,
    loop: 'full',
    levels: { pad: 71, bass: -3, drums: 101 }
  });

  assert.equal(state.schemaVersion, 2);
  assert.equal(state.week, 1);
  assert.equal(state.minutes, 120);
  assert.equal(state.completed['w1-90-technique'], true);
  assert.equal(state.trackId, 'fusion-one');
  assert.equal(state.tempo, 74);
  assert.deepEqual(state.levels, { pad: 71, bass: 72, drums: 62, master: 80 });
});

test('rejects unknown schema versions', () => {
  assert.throws(() => ProgressStore.normalize({ schemaVersion: 9 }), /unsupported progress schema/i);
});

test('exports stable JSON and imports it without changing the input object', () => {
  const original = ProgressStore.normalize({
    schemaVersion: 2,
    week: 8,
    lessons: { 'motif-development': true }
  });
  const before = structuredClone(original);
  const exported = ProgressStore.exportJson(original);
  const imported = ProgressStore.importJson(exported);

  assert.deepEqual(original, before);
  assert.deepEqual(imported, original);
  assert.match(exported, /"schemaVersion": 2/);
});

test('invalid import does not mutate the current state', () => {
  const current = ProgressStore.normalize({ schemaVersion: 2, week: 5 });
  const before = structuredClone(current);
  assert.throws(() => ProgressStore.importJson('{broken'), /valid progress JSON/i);
  assert.deepEqual(current, before);
});

test('readingPercent handles empty, beginning, middle and end positions', () => {
  assert.equal(ProgressStore.readingPercent(0, 500, 500), 100);
  assert.equal(ProgressStore.readingPercent(0, 1000, 500), 0);
  assert.equal(ProgressStore.readingPercent(250, 1000, 500), 50);
  assert.equal(ProgressStore.readingPercent(800, 1000, 500), 100);
});
