import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/recording-store.js');
const RecordingStore = globalThis.RecordingStore;

function repository() {
  const records = new Map();
  return {
    status: 'ready', records,
    async saveRecording(value) { records.set(value.id, structuredClone(value)); return value; },
    async getRecording(id) { return records.get(id); },
    async listRecordings() { return [...records.values()]; },
    async deleteRecording(id) { records.delete(id); return true; }
  };
}

test('keeps audio bytes separate and returns portable recording-reference metadata', async () => {
  const repo = repository();
  const store = RecordingStore.create(repo, { estimate: async () => ({ usage: 10, quota: 1000 }) });
  const blob = new Blob(['local audio'], { type: 'audio/webm' });
  const saved = await store.save({ id: 'take-1', blob, metadata: { exerciseId: 'bend-100', tempo: 90, note: 'Relaxed.' } });
  assert.equal((await repo.getRecording('take-1')).blob.size, blob.size);
  assert.equal(saved.reference.recordingRef, 'take-1');
  assert.equal(saved.reference.blob, undefined);
  assert.deepEqual(saved.reference, { recordingRef: 'take-1', mimeType: 'audio/webm', durationSeconds: 0, exerciseId: 'bend-100', tempo: 90, note: 'Relaxed.' });
});

test('warns at 80 percent usage or below 50 MB remaining', async () => {
  const repo = repository();
  const percent = RecordingStore.create(repo, { estimate: async () => ({ usage: 800, quota: 1000 }) });
  assert.equal((await percent.pressure()).warning, true);
  const remaining = RecordingStore.create(repo, { estimate: async () => ({ usage: 60 * 1024 ** 2, quota: 100 * 1024 ** 2 }) });
  assert.equal((await remaining.pressure()).warning, true);
  const safe = RecordingStore.create(repo, { estimate: async () => ({ usage: 10 * 1024 ** 2, quota: 100 * 1024 ** 2 }) });
  assert.equal((await safe.pressure()).warning, false);
});

test('reports quota failure and confirmed deletion is mandatory', async () => {
  const quotaRepo = repository();
  quotaRepo.saveRecording = async () => { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); };
  const quotaStore = RecordingStore.create(quotaRepo, { estimate: async () => ({ usage: 1, quota: 1 }) });
  assert.deepEqual(await quotaStore.save({ id: 'x', blob: new Blob(['x']), metadata: {} }), { status: 'storage-full' });

  const repo = repository();
  const store = RecordingStore.create(repo, { estimate: async () => ({ usage: 0, quota: 100 }) });
  await store.save({ id: 'take', blob: new Blob(['x']), metadata: {} });
  await assert.rejects(store.delete('take'), /confirm/i);
  await store.delete('take', { confirmed: true });
  assert.equal(await repo.getRecording('take'), undefined);
});
