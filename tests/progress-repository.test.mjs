import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryIndexedDB } from './support/memory-indexeddb.mjs';

await import('../src/js/progress-schema.js');
await import('../src/js/indexed-db-adapter.js');
await import('../src/js/progress-repository.js');
const ProgressRepository = globalThis.ProgressRepository;

async function repository(name, indexedDB = createMemoryIndexedDB()) {
  return ProgressRepository.open({ indexedDB, name, version: 11 });
}

test('stores metadata in separate repositories and reads a canonical snapshot', async () => {
  const progress = await repository('repository-snapshot');
  await progress.replaceMetadata({
    schemaVersion: 3,
    week: 8,
    minutes: 60,
    completed: { 'w8-60-time': true },
    lessons: {},
    trackId: 'fusion-one',
    tempo: 108,
    loop: 'full',
    countInBars: 1,
    levels: { pad: 72, bass: 72, drums: 62, master: 80 },
    activeSession: { id: 'current' },
    sessions: [{ id: 'session-8', date: '2026-08-12' }],
    attempts: [{ id: 'attempt-8', sessionId: 'session-8' }],
    skillObservations: [{ id: 'skill-8', skill: 'time' }],
    reviewItems: [{ id: 'review-8', due: '2026-08-13' }],
    customProgressions: [{ id: 'prog-8', chords: ['Dm7', 'G7'] }],
    recommendations: [{ id: 'rec-8', title: 'Sing first' }],
    gearProfile: { guitar: 'Strat' }
  });

  const snapshot = await progress.snapshot();
  assert.equal(snapshot.schemaVersion, 3);
  assert.equal(snapshot.week, 8);
  assert.deepEqual(snapshot.sessions, [{ id: 'session-8', date: '2026-08-12' }]);
  assert.deepEqual(snapshot.gearProfile, { guitar: 'Strat' });
});

test('gives legacy array records stable IDs and upserts them idempotently', async () => {
  const progress = await repository('repository-legacy-id');
  const source = { schemaVersion: 3, sessions: [{ date: '2026-08-12', minutes: 30 }] };

  await progress.replaceMetadata(source);
  const first = await progress.snapshot();
  await progress.mergeMetadata(source);
  const second = await progress.snapshot();

  assert.equal(first.sessions.length, 1);
  assert.match(first.sessions[0].id, /^legacy:sessions:/);
  assert.deepEqual(second.sessions, first.sessions);
});

test('reports an unavailable storage backend without preventing a caller from using the course shell', async () => {
  const progress = await ProgressRepository.open({ indexedDB: null, name: 'unavailable', version: 11 });
  assert.equal(progress.status, 'storage-unavailable');
  assert.equal(progress.reason, 'IndexedDB is unavailable.');
});

test('stores recordings separately from progress metadata', async () => {
  const progress = await repository('repository-recordings');
  const original = new Blob([new Uint8Array([3, 1, 4, 1, 5])], { type: 'audio/webm' });

  await progress.saveRecording({ id: 'take-1', blob: original, mimeType: 'audio/webm' });
  await progress.replaceMetadata({ schemaVersion: 3, week: 4 });

  const stored = await progress.getRecording('take-1');
  assert.deepEqual([...new Uint8Array(await stored.blob.arrayBuffer())], [3, 1, 4, 1, 5]);
  assert.equal((await progress.snapshot()).week, 4);
});

test('returns storage-unavailable after a quota failure occurs following a successful open', async () => {
  const indexedDB = createMemoryIndexedDB();
  const progress = await ProgressRepository.open({ indexedDB, name: 'repository-runtime-failure', version: 11 });
  indexedDB.failNextRequest(Object.assign(new Error('quota exceeded'), { name: 'QuotaExceededError' }));

  assert.deepEqual(await progress.snapshot(), { status: 'storage-unavailable' });
});

test('returns storage-unavailable for transaction creation and closed-database failures after open', async () => {
  const transactionFailure = createMemoryIndexedDB();
  const first = await repository('repository-transaction-failure', transactionFailure);
  transactionFailure.failNextTransaction(Object.assign(new Error('database unavailable'), { name: 'InvalidStateError' }));
  assert.deepEqual(await first.replaceMetadata({ schemaVersion: 3, week: 8 }), { status: 'storage-unavailable' });

  const closed = createMemoryIndexedDB();
  const second = await repository('repository-closed', closed);
  closed.closeDatabase('repository-closed');
  assert.deepEqual(await second.snapshot(), { status: 'storage-unavailable' });
});

test('rejects malformed collection records and duplicate explicit IDs before a write transaction', async () => {
  const indexedDB = createMemoryIndexedDB();
  const progress = await repository('repository-preflight', indexedDB);

  for (const sessions of [[42], [{ id: 'same' }, { id: 'same' }]]) {
    indexedDB.resetAccessLog();
    await assert.rejects(progress.replaceMetadata({ schemaVersion: 3, sessions }), /invalid|duplicate/i);
    assert.equal(indexedDB.accessLog().some(({ mode }) => mode === 'readwrite'), false);
  }
});
