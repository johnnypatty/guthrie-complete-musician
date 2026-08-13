(function (root) {
  'use strict';

  const LOW_BYTES = 50 * 1024 * 1024;
  function create(repository, storageManager = {}) {
    async function pressure() {
      const estimate = await storageManager.estimate?.() || {};
      const usage = Number(estimate.usage) || 0;
      const quota = Number(estimate.quota) || 0;
      const ratio = quota > 0 ? usage / quota : 0;
      const remaining = quota > 0 ? quota - usage : Infinity;
      return { usage, quota, ratio, remaining, warning: ratio >= 0.8 || remaining < LOW_BYTES };
    }
    async function save({ id, blob, metadata = {} }) {
      if (!(blob instanceof Blob) || typeof id !== 'string' || !id) throw new Error('A local recording blob and id are required.');
      const mimeType = blob.type || metadata.mimeType || 'audio/webm';
      const record = { id, blob, mimeType, createdAt: new Date().toISOString(), metadata: structuredClone(metadata) };
      try {
        const saved = await repository.saveRecording(record);
        if (saved?.status === 'storage-unavailable') return { status: 'storage-unavailable' };
        return { status: 'saved', reference: { recordingRef: id, mimeType, durationSeconds: Number(metadata.durationSeconds) || 0, ...structuredClone(metadata) } };
      } catch (error) {
        return error?.name === 'QuotaExceededError' ? { status: 'storage-full' } : { status: 'storage-unavailable' };
      }
    }
    async function get(id) { return repository.getRecording(id); }
    async function list() { return repository.listRecordings ? repository.listRecordings() : []; }
    async function deleteRecording(id, options = {}) {
      if (!options.confirmed) throw new Error('Delete requires confirmed intent.');
      return repository.deleteRecording(id);
    }
    return Object.freeze({ save, get, list, delete: deleteRecording, pressure });
  }
  root.RecordingStore = Object.freeze({ create, LOW_BYTES });
})(typeof globalThis !== 'undefined' ? globalThis : this);
