(function (root) {
  'use strict';

  const STORE_NAMES = Object.freeze([
    'meta', 'sessions', 'attempts', 'skillObservations', 'reviewItems', 'customProgressions',
    'recommendations', 'gearProfile', 'recordings'
  ]);

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error || new Error('IndexedDB request failed.'));
    });
  }

  function transactionResult(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = (event) => reject(transaction.error || event.target?.error || new Error('IndexedDB transaction failed.'));
    });
  }

  function transactionApi(transaction, names) {
    function store(name) {
      if (!names.includes(name)) throw new Error(`Store ${name} is not part of this transaction.`);
      return transaction.objectStore(name);
    }
    return Object.freeze({
      get: (name, key) => requestResult(store(name).get(key)),
      getAll: (name) => requestResult(store(name).getAll()),
      add: (name, value) => requestResult(store(name).add(value)),
      put: (name, value) => requestResult(store(name).put(value)),
      delete: (name, key) => requestResult(store(name).delete(key)),
      clear: (name) => requestResult(store(name).clear())
    });
  }

  async function open({ indexedDB, name, version }) {
    if (!indexedDB || typeof indexedDB.open !== 'function') throw new Error('IndexedDB is unavailable.');
    if (typeof name !== 'string' || !name) throw new Error('An IndexedDB database name is required.');
    if (!Number.isInteger(version) || version < 1) throw new Error('A positive IndexedDB database version is required.');

    const request = indexedDB.open(name, version);
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      for (const store of STORE_NAMES) {
        if (!database.objectStoreNames.contains(store)) database.createObjectStore(store, { keyPath: 'id' });
      }
    };
    const database = await requestResult(request);

    async function transaction(storeNames, mode, work) {
      const names = Array.isArray(storeNames) ? storeNames.slice() : [storeNames];
      if (!names.length || names.some((store) => !STORE_NAMES.includes(store))) throw new Error('A valid IndexedDB store is required.');
      if (!['readonly', 'readwrite'].includes(mode)) throw new Error('IndexedDB transaction mode must be readonly or readwrite.');
      if (typeof work !== 'function') throw new Error('An IndexedDB transaction callback is required.');

      const nativeTransaction = database.transaction(names, mode);
      const complete = transactionResult(nativeTransaction);
      try {
        // Keep callbacks inside the native transaction lifetime: they may await
        // requests from this tx API, but arbitrary async work can auto-commit IDB.
        const result = await work(transactionApi(nativeTransaction, names));
        if (mode === 'readwrite' && typeof nativeTransaction.commit === 'function') nativeTransaction.commit();
        await complete;
        return result;
      } catch (error) {
        try { nativeTransaction.abort(); } catch (_abortError) { /* The transaction may already be complete. */ }
        try { await complete; } catch (_transactionError) { /* Preserve the original failure. */ }
        throw error;
      }
    }

    return Object.freeze({
      name: database.name,
      version: database.version,
      transaction,
      get: (store, key) => transaction([store], 'readonly', (tx) => tx.get(store, key)),
      getAll: (store) => transaction([store], 'readonly', (tx) => tx.getAll(store)),
      add: (store, value) => transaction([store], 'readwrite', (tx) => tx.add(store, value)),
      close: () => database.close()
    });
  }

  root.IndexedDbAdapter = Object.freeze({ STORE_NAMES, open });
})(typeof globalThis !== 'undefined' ? globalThis : this);
