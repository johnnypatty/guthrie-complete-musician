import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/progress-schema.js');
const ProgressSchema = globalThis.ProgressSchema;

const emptyCollections = {
  activeSession: null,
  sessions: [],
  attempts: [],
  skillObservations: [],
  reviewItems: [],
  customProgressions: [],
  recommendations: [],
  gearProfile: {}
};

test('migrates literal schema-1 progress to canonical schema 3 without inventing completion dates', () => {
  const schema1 = {
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

  assert.deepEqual(ProgressSchema.migrate(schema1), {
    schemaVersion: 3,
    ...schema1,
    ...emptyCollections
  });
});

test('migrates schema-2 progress and accepts every supported session duration', () => {
  const schema2 = {
    schemaVersion: 2,
    week: 19,
    minutes: 30,
    completed: { 'w19-30-ear': true },
    lessons: { 'target-notes-and-chord-changes': true },
    trackId: 'fusion-two',
    tempo: 108,
    loop: '16-32',
    countInBars: 0,
    levels: { pad: 48, bass: 55, drums: 61, master: 76 }
  };

  const migrated = ProgressSchema.migrate(schema2);
  assert.equal(migrated.schemaVersion, 3);
  assert.equal(migrated.minutes, 30);
  assert.deepEqual(migrated.lessons, { 'target-notes-and-chord-changes': true });
  assert.deepEqual(migrated.levels, { pad: 48, bass: 55, drums: 61, master: 76 });
  assert.deepEqual(Object.fromEntries(Object.entries(migrated).filter(([key]) => key in emptyCollections)), emptyCollections);

  for (const minutes of [30, 60, 90, 120]) {
    assert.equal(ProgressSchema.migrate({ schemaVersion: 2, minutes }).minutes, minutes);
  }
  assert.equal(ProgressSchema.migrate({ schemaVersion: 2, minutes: 45 }).minutes, 90);
});

test('projects only portable schema fields and rejects malformed portable sections without mutation', () => {
  const snapshot = {
    schemaVersion: 3,
    week: 6,
    minutes: 60,
    completed: { 'w6-60-rhythm': true },
    lessons: {},
    trackId: 'fusion-one',
    tempo: 96,
    loop: 'full',
    countInBars: 1,
    levels: { pad: 72, bass: 72, drums: 62, master: 80 },
    activeSession: null,
    sessions: [],
    attempts: [],
    skillObservations: [],
    reviewItems: [],
    customProgressions: [],
    recommendations: [],
    gearProfile: {},
    transientUiOnly: { openPanel: 'today' }
  };
  const before = structuredClone(snapshot);

  const portable = ProgressSchema.projectPortable(snapshot);
  assert.equal('transientUiOnly' in portable, false);
  assert.deepEqual(snapshot, before);
  assert.throws(() => ProgressSchema.parsePortable(JSON.stringify({ ...portable, attempts: {} })), /attempts/i);
  assert.throws(() => ProgressSchema.migrate({ schemaVersion: 4 }), /unsupported progress schema/i);
});
