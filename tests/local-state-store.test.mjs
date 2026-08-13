import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/progress-schema.js');
await import('../src/js/local-state-store.js');
const LocalStateStore = globalThis.LocalStateStore;

function storageWith(entries) {
  const values = new Map(Object.entries(entries));
  const reads = [];
  return {
    getItem(key) { reads.push(key); return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    readKeys() { return reads.slice(); },
    value(key) { return values.get(key); }
  };
}

const backing = {
  trackId: 'fusion-one', tempo: 120, loop: '8-16', countInBars: 2,
  levels: { pad: 71, bass: 65, drums: 59, master: 83 }
};

test('patches home and lesson state without replacing maps or unknown v3 sections', () => {
  const storage = storageWith({
    'gcm-progress-v3': JSON.stringify({
      schemaVersion: 3, week: 8, minutes: 60, completed: { 'w8-60-technique': true }, lessons: {}, ...backing,
      activeSession: null, sessions: [], attempts: [], skillObservations: [], reviewItems: [], customProgressions: [], recommendations: [], gearProfile: {},
      futureSection: { keep: true }
    })
  });
  const store = LocalStateStore.create(storage, 'gcm-progress-v3');

  store.load();
  store.patch({ completed: { 'w8-60-ear': true }, levels: { pad: 55 } });
  const state = store.patch({ lessons: { 'motif-development': true } });

  assert.deepEqual(state.completed, { 'w8-60-technique': true, 'w8-60-ear': true });
  assert.deepEqual(state.lessons, { 'motif-development': true });
  assert.deepEqual(state.levels, { pad: 55, bass: 65, drums: 59, master: 83 });
  assert.deepEqual(JSON.parse(storage.value('gcm-progress-v3')).futureSection, { keep: true });
});

test('promotes valid v2 state once and never reads legacy keys after valid v3 exists', () => {
  const storage = storageWith({
    'gcm-progress-v2': JSON.stringify({ schemaVersion: 2, week: 4, minutes: 30, completed: {}, lessons: {}, ...backing }),
    'gcm-progress-v1': JSON.stringify({ week: 9, minutes: 120, completed: {}, lessons: {}, ...backing })
  });
  const store = LocalStateStore.create(storage, 'gcm-progress-v3');

  const migrated = store.load();
  assert.equal(migrated.schemaVersion, 3);
  assert.equal(migrated.week, 4);
  assert.equal(JSON.parse(storage.value('gcm-progress-v3')).schemaVersion, 3);

  const readsBeforeReload = storage.readKeys().length;
  LocalStateStore.create(storage, 'gcm-progress-v3').load();
  assert.deepEqual(storage.readKeys().slice(readsBeforeReload), ['gcm-progress-v3']);
});

test('promotes a legacy-shaped record stored under the v3 key before returning it', () => {
  const storage = storageWith({
    'gcm-progress-v3': JSON.stringify({ schemaVersion: 2, week: 7, minutes: 60, completed: {}, lessons: {}, ...backing })
  });

  const state = LocalStateStore.create(storage, 'gcm-progress-v3').load();

  assert.equal(state.schemaVersion, 3);
  assert.equal(state.week, 7);
  assert.equal(JSON.parse(storage.value('gcm-progress-v3')).schemaVersion, 3);
});
