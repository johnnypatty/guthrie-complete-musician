(function (root) {
  'use strict';

  if (!root.ProgressSchema || !root.IndexedDbAdapter) throw new Error('ProgressSchema and IndexedDbAdapter must load before ProgressRepository.');

  const COLLECTIONS = root.ProgressSchema.COLLECTIONS;
  const METADATA_STORES = Object.freeze(['meta', ...COLLECTIONS, 'gearProfile']);
  const META_ID = 'progress';
  const GEAR_ID = 'profile';

  function copy(value) {
    return structuredClone(value);
  }

  function isPlainObject(value) {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
    if (!isPlainObject(value)) return JSON.stringify(value);
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }

  function legacyId(collection, record) {
    const text = `${collection}:${stableJson(record)}`;
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `legacy:${collection}:${(hash >>> 0).toString(36)}`;
  }

  function recordFor(collection, value) {
    if (!isPlainObject(value)) throw new Error(`Invalid ${collection} record.`);
    const record = copy(value);
    if (record.id != null && typeof record.id !== 'string') throw new Error(`Invalid ${collection} record id.`);
    if (typeof record.id !== 'string' || !record.id.trim()) {
      delete record.id;
      record.id = legacyId(collection, record);
    }
    return record;
  }

  function recordsFor(collection, values) {
    const records = values.map((value) => recordFor(collection, value));
    const ids = new Set();
    for (const record of records) {
      if (ids.has(record.id)) throw new Error(`Duplicate ${collection} id: ${record.id}`);
      ids.add(record.id);
    }
    return records;
  }

  function splitSnapshot(value) {
    const snapshot = root.ProgressSchema.projectPortable(value);
    const records = Object.fromEntries(COLLECTIONS.map((collection) => [collection, recordsFor(collection, snapshot[collection])]));
    const meta = { ...snapshot, id: META_ID };
    for (const collection of COLLECTIONS) delete meta[collection];
    delete meta.gearProfile;
    return { snapshot: { ...snapshot, ...records }, meta, records };
  }

  function fallback(reason) {
    const unavailable = async () => { throw new Error(reason); };
    return Object.freeze({ status: 'storage-unavailable', reason, snapshot: unavailable, replaceMetadata: unavailable, mergeMetadata: unavailable });
  }

  function storageUnavailable() {
    return { status: 'storage-unavailable' };
  }

  async function open(options) {
    let database;
    try {
      database = await root.IndexedDbAdapter.open(options);
    } catch (error) {
      return fallback(error.message === 'IndexedDB is unavailable.' ? error.message : 'IndexedDB is unavailable.');
    }

    async function runStorage(operation) {
      try {
        return await operation();
      } catch (_error) {
        return storageUnavailable();
      }
    }

    async function readSnapshot() {
      const [meta, gear, ...collections] = await database.transaction(METADATA_STORES, 'readonly', (tx) => Promise.all([
        tx.get('meta', META_ID),
        tx.get('gearProfile', GEAR_ID),
        ...COLLECTIONS.map((collection) => tx.getAll(collection))
      ]));
      const result = { ...(meta || {}), gearProfile: gear?.value || {} };
      delete result.id;
      COLLECTIONS.forEach((collection, index) => { result[collection] = collections[index]; });
      return root.ProgressSchema.projectPortable(result);
    }

    function snapshot() {
      return runStorage(readSnapshot);
    }

    async function replaceMetadata(value) {
      const { snapshot: normalized, meta, records } = splitSnapshot(value);
      return runStorage(async () => {
        await database.transaction(METADATA_STORES, 'readwrite', async (tx) => {
          for (const store of METADATA_STORES) await tx.clear(store);
          await tx.put('meta', meta);
          await tx.put('gearProfile', { id: GEAR_ID, value: copy(normalized.gearProfile) });
          for (const collection of COLLECTIONS) {
            for (const item of records[collection]) await tx.put(collection, item);
          }
        });
        return readSnapshot();
      });
    }

    async function mergeMetadata(value) {
      const { snapshot: normalized, meta, records } = splitSnapshot(value);
      return runStorage(async () => {
        await database.transaction(METADATA_STORES, 'readwrite', async (tx) => {
          const currentMeta = await tx.get('meta', META_ID);
          const currentGear = await tx.get('gearProfile', GEAR_ID);
          await tx.put('meta', { ...(currentMeta || {}), ...meta, id: META_ID });
          await tx.put('gearProfile', { id: GEAR_ID, value: { ...(currentGear?.value || {}), ...copy(normalized.gearProfile) } });
          for (const collection of COLLECTIONS) {
            for (const item of records[collection]) await tx.put(collection, item);
          }
        });
        return readSnapshot();
      });
    }

    async function saveRecording(value) {
      const recording = recordFor('recordings', value);
      return runStorage(async () => {
        await database.transaction(['recordings'], 'readwrite', (tx) => tx.put('recordings', recording));
        return copy(recording);
      });
    }

    function getRecording(id) {
      return runStorage(() => database.get('recordings', id));
    }

    function listRecordings() {
      return runStorage(() => database.getAll('recordings'));
    }

    function deleteRecording(id) {
      return runStorage(() => database.transaction(['recordings'], 'readwrite', (tx) => tx.delete('recordings', id)).then(() => true));
    }

    return Object.freeze({ status: 'ready', snapshot, replaceMetadata, mergeMetadata, saveRecording, getRecording, listRecordings, deleteRecording });
  }

  root.ProgressRepository = Object.freeze({ COLLECTIONS, METADATA_STORES, legacyId, open });
})(typeof globalThis !== 'undefined' ? globalThis : this);
