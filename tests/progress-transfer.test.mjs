import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryIndexedDB } from './support/memory-indexeddb.mjs';

await import('../src/js/progress-schema.js');
await import('../src/js/indexed-db-adapter.js');
await import('../src/js/progress-repository.js');
await import('../src/js/progress-transfer.js');
const ProgressRepository = globalThis.ProgressRepository;
const ProgressTransfer = globalThis.ProgressTransfer;

async function repository(name, indexedDB = createMemoryIndexedDB()) {
  return ProgressRepository.open({ indexedDB, name, version: 9 });
}

const portable = {
  schemaVersion: 3,
  week: 9,
  minutes: 60,
  completed: { 'w9-60-time': true },
  lessons: {},
  trackId: 'fusion-one',
  tempo: 108,
  loop: 'full',
  countInBars: 1,
  levels: { pad: 72, bass: 72, drums: 62, master: 80 },
  activeSession: null,
  sessions: [{ id: 'imported-session', minutes: 60 }],
  attempts: [{ id: 'imported-attempt', recordingRef: 'missing-take' }],
  skillObservations: [],
  reviewItems: [],
  customProgressions: [],
  recommendations: [],
  gearProfile: { amp: 'clean' }
};

async function recordingBytes(progress, id) {
  const recording = await progress.getRecording(id);
  return [...new Uint8Array(await recording.blob.arrayBuffer())];
}

test('rejects an invalid portable section before opening a metadata write transaction', async () => {
  const progress = await repository('transfer-invalid');
  await progress.replaceMetadata({ schemaVersion: 3, week: 3, sessions: [{ id: 'local-session' }] });
  const before = await progress.snapshot();

  await assert.rejects(
    ProgressTransfer.importSnapshot(progress, JSON.stringify({ ...portable, attempts: { nope: true } }), { mode: 'merge' }),
    /attempts/i
  );

  assert.deepEqual(await progress.snapshot(), before);
});

test('exports only allowlisted portable metadata and never recording bytes', async () => {
  const progress = await repository('transfer-export');
  await progress.replaceMetadata(portable);
  await progress.saveRecording({ id: 'local-take', blob: new Blob([new Uint8Array([9, 8, 7])]), mimeType: 'audio/webm' });

  const text = await ProgressTransfer.exportSnapshot(progress);
  const exported = JSON.parse(text);

  assert.equal(exported.schemaVersion, 3);
  assert.equal('recordings' in exported, false);
  assert.doesNotMatch(text, /blob|base64|byte/i);
});

test('strips binary and encoded-audio fields that are accidentally attached to metadata', async () => {
  const progress = await repository('transfer-binary-fields');
  await progress.replaceMetadata({
    ...portable,
    attempts: [{
      id: 'metadata-only',
      recordingRef: 'local-take',
      encodedBlob: 'base64:AAECAw==',
      rawBytes: [0, 1, 2, 3],
      blob: new Blob([new Uint8Array([0, 1, 2, 3])])
    }]
  });

  const exported = JSON.parse(await ProgressTransfer.exportSnapshot(progress));

  assert.deepEqual(exported.attempts, [{ id: 'metadata-only', recordingRef: 'local-take' }]);
});

test('uses positive record allowlists so misleading audio and payload fields cannot export', async () => {
  const progress = await repository('transfer-hostile-export');
  await progress.replaceMetadata({
    ...portable,
    attempts: [{ id: 'metadata-only', recordingRef: 'local-take', audio: 'AAECAw==', payload: [0, 1, 2, 3] }]
  });

  const exported = JSON.parse(await ProgressTransfer.exportSnapshot(progress));
  assert.deepEqual(exported.attempts, [{ id: 'metadata-only', recordingRef: 'local-take' }]);
});

test('rejects invalid scalars, malformed collection entries, duplicate IDs, and unallowlisted fields before writes', async () => {
  const indexedDB = createMemoryIndexedDB();
  const progress = await repository('transfer-invalid-records', indexedDB);
  await progress.replaceMetadata({ schemaVersion: 3, week: 3, sessions: [{ id: 'local-session' }] });
  const before = await progress.snapshot();
  const invalidImports = [
    { ...portable, week: 25 },
    { ...portable, completed: { lesson: 'yes' } },
    { ...portable, levels: { ...portable.levels, master: 101 } },
    { ...portable, attempts: [42] },
    { ...portable, sessions: [{ id: 'duplicate' }, { id: 'duplicate' }] },
    { ...portable, attempts: [{ id: 'attempt', audio: 'AAECAw==', payload: [0, 1, 2, 3] }] },
    { ...portable, attempts: [{ id: 'attempt', note: 'x'.repeat(4097) }] },
    { ...portable, attempts: [{ id: 'attempt', tempo: 10000 }] }
  ];

  for (const invalid of invalidImports) {
    indexedDB.resetAccessLog();
    await assert.rejects(ProgressTransfer.importSnapshot(progress, JSON.stringify(invalid), { mode: 'merge' }), /invalid|duplicate|allowed/i);
    assert.equal(indexedDB.accessLog().some(({ mode }) => mode === 'readwrite'), false);
    assert.deepEqual(await progress.snapshot(), before);
  }
});

test('rejects duplicate explicit IDs independently in every collection', async () => {
  const progress = await repository('transfer-duplicates');
  for (const collection of ProgressRepository.COLLECTIONS) {
    await assert.rejects(
      ProgressTransfer.importSnapshot(progress, JSON.stringify({ ...portable, [collection]: [{ id: 'same' }, { id: 'same' }] }), { mode: 'merge' }),
      new RegExp(`duplicate.*${collection}`, 'i')
    );
  }
});

test('assigns deterministic IDs only after a missing-ID record passes validation', async () => {
  const indexedDB = createMemoryIndexedDB();
  const progress = await repository('transfer-missing-id', indexedDB);
  const valid = { ...portable, sessions: [{ date: '2026-08-12', minutes: 30 }] };

  await ProgressTransfer.importSnapshot(progress, JSON.stringify(valid), { mode: 'replace-metadata' });
  const first = await progress.snapshot();
  await ProgressTransfer.importSnapshot(progress, JSON.stringify(valid), { mode: 'replace-metadata' });
  assert.match(first.sessions[0].id, /^legacy:sessions:/);
  assert.deepEqual((await progress.snapshot()).sessions, first.sessions);

  indexedDB.resetAccessLog();
  await assert.rejects(
    ProgressTransfer.importSnapshot(progress, JSON.stringify({ ...portable, sessions: [{ date: ['not-a-string'] }] }), { mode: 'replace-metadata' }),
    /invalid.*sessions/i
  );
  assert.equal(indexedDB.accessLog().some(({ mode }) => mode === 'readwrite'), false);
});

test('marks imported missing recording references unavailable and leaves recording bytes untouched', async () => {
  const progress = await repository('transfer-recording-boundary');
  await progress.saveRecording({ id: 'local-take', blob: new Blob([new Uint8Array([2, 7, 1, 8])]), mimeType: 'audio/webm' });

  await ProgressTransfer.importSnapshot(progress, JSON.stringify(portable), { mode: 'replace-metadata' });

  const snapshot = await progress.snapshot();
  assert.deepEqual(snapshot.attempts, [{ id: 'imported-attempt', recordingRef: 'missing-take', audioUnavailable: true }]);
  assert.deepEqual(await recordingBytes(progress, 'local-take'), [2, 7, 1, 8]);
});

test('makes zero recordings-store accesses during import and marks every recording reference unavailable', async () => {
  const indexedDB = createMemoryIndexedDB();
  const progress = await repository('transfer-zero-recording-access', indexedDB);
  await progress.saveRecording({ id: 'local-take', blob: new Blob([new Uint8Array([4, 2])]), mimeType: 'audio/webm' });
  indexedDB.resetAccessLog();

  await ProgressTransfer.importSnapshot(progress, JSON.stringify({ ...portable, attempts: [{ id: 'has-local-ref', recordingRef: 'local-take' }] }), { mode: 'replace-metadata' });

  assert.deepEqual((await progress.snapshot()).attempts, [{ id: 'has-local-ref', recordingRef: 'local-take', audioUnavailable: true }]);
  assert.equal(indexedDB.accessLog().some((access) => access.store === 'recordings'), false);
});

test('merges imported IDs while replace-metadata clears absent local metadata without touching recordings', async () => {
  const progress = await repository('transfer-modes');
  await progress.replaceMetadata({ schemaVersion: 3, sessions: [{ id: 'local-only' }, { id: 'shared', notes: 'before' }] });
  await progress.saveRecording({ id: 'keep-audio', blob: new Blob([new Uint8Array([6, 2, 6])]), mimeType: 'audio/webm' });
  const imported = { ...portable, sessions: [{ id: 'shared', notes: 'imported' }] };

  await ProgressTransfer.importSnapshot(progress, JSON.stringify(imported), { mode: 'merge' });
  assert.deepEqual((await progress.snapshot()).sessions, [{ id: 'local-only' }, { id: 'shared', notes: 'imported' }]);

  await ProgressTransfer.importSnapshot(progress, JSON.stringify(imported), { mode: 'replace-metadata' });
  assert.deepEqual((await progress.snapshot()).sessions, [{ id: 'shared', notes: 'imported' }]);
  assert.deepEqual(await recordingBytes(progress, 'keep-audio'), [6, 2, 6]);
});

test('returns storage-unavailable status at the transfer boundary', async () => {
  const unavailable = await ProgressRepository.open({ indexedDB: null, name: 'no-storage', version: 9 });
  assert.deepEqual(await ProgressTransfer.exportSnapshot(unavailable), { status: 'storage-unavailable' });
});

test('returns storage-unavailable when an opened repository fails at runtime', async () => {
  const indexedDB = createMemoryIndexedDB();
  const progress = await repository('transfer-runtime-failure', indexedDB);
  indexedDB.failNextRequest(Object.assign(new Error('quota exceeded'), { name: 'QuotaExceededError' }));

  assert.deepEqual(await ProgressTransfer.exportSnapshot(progress), { status: 'storage-unavailable' });
});

test('returns storage-unavailable when import hits a write-time quota failure', async () => {
  const indexedDB = createMemoryIndexedDB();
  const progress = await repository('transfer-import-runtime-failure', indexedDB);
  indexedDB.failNextRequest(Object.assign(new Error('quota exceeded'), { name: 'QuotaExceededError' }));

  assert.deepEqual(
    await ProgressTransfer.importSnapshot(progress, JSON.stringify(portable), { mode: 'replace-metadata' }),
    { status: 'storage-unavailable' }
  );
});
