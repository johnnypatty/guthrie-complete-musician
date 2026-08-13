function inactiveError() {
  const error = new Error('Transaction is finished.');
  error.name = 'TransactionInactiveError';
  return error;
}

function readonlyError() {
  const error = new Error('Cannot write in a readonly transaction.');
  error.name = 'ReadOnlyError';
  return error;
}

function constraintError(key) {
  const error = new Error(`Key already exists: ${key}`);
  error.name = 'ConstraintError';
  return error;
}

class MemoryObjectStore {
  constructor(transaction, name) {
    this.transaction = transaction;
    this.name = name;
  }

  #values() {
    return this.transaction.working.get(this.name);
  }

  #request(work, write = false) {
    return this.transaction.request(work, write);
  }

  get(key) { return this.#request(() => structuredClone(this.#values().get(key))); }
  getAll() { return this.#request(() => [...this.#values().values()].map((value) => structuredClone(value))); }
  add(value) {
    return this.#request(() => {
      const key = value?.id;
      if (key == null || this.#values().has(key)) throw constraintError(key);
      this.#values().set(key, structuredClone(value));
      return key;
    }, true);
  }
  put(value) {
    return this.#request(() => {
      const key = value?.id;
      if (key == null) throw new Error('A key is required.');
      this.#values().set(key, structuredClone(value));
      return key;
    }, true);
  }
  delete(key) { return this.#request(() => this.#values().delete(key), true); }
  clear() { return this.#request(() => this.#values().clear(), true); }
}

class MemoryTransaction {
  constructor(database, names, mode) {
    this.database = database;
    this.names = names;
    this.mode = mode;
    this.working = new Map(names.map((name) => [name, new Map(database.stores.get(name))]));
    this.oncomplete = null;
    this.onerror = null;
    this.onabort = null;
    this.error = null;
    this.finished = false;
    this.pending = 0;
    this.autoCompleteTimer = null;
    this.scheduleAutoComplete();
  }

  objectStore(name) {
    if (!this.working.has(name)) throw new Error(`Store ${name} is not part of this transaction.`);
    this.database.accesses.push({ store: name, mode: this.mode });
    return new MemoryObjectStore(this, name);
  }

  request(work, write) {
    if (this.finished) throw inactiveError();
    if (write && this.mode !== 'readwrite') throw readonlyError();
    this.pending += 1;
    const result = { result: undefined, error: null, onsuccess: null, onerror: null };
    queueMicrotask(() => {
      if (this.finished) {
        result.error = inactiveError();
        result.onerror?.({ target: result });
        return;
      }
      try {
        const failure = this.database.takeFailure();
        if (failure) throw failure;
        result.result = work();
        result.onsuccess?.({ target: result });
      } catch (error) {
        result.error = error;
        result.onerror?.({ target: result });
      } finally {
        this.pending -= 1;
        this.scheduleAutoComplete();
      }
    });
    return result;
  }

  scheduleAutoComplete() {
    if (this.finished || this.pending || this.autoCompleteTimer) return;
    this.autoCompleteTimer = setTimeout(() => {
      this.autoCompleteTimer = null;
      if (!this.finished && this.pending === 0) this.commit();
    }, 0);
  }

  commit() {
    if (this.finished) return;
    this.finished = true;
    if (this.autoCompleteTimer) clearTimeout(this.autoCompleteTimer);
    if (this.mode === 'readwrite') {
      for (const [name, values] of this.working) this.database.stores.set(name, values);
    }
    queueMicrotask(() => this.oncomplete?.({ target: this }));
  }

  abort() {
    if (this.finished) return;
    this.finished = true;
    if (this.autoCompleteTimer) clearTimeout(this.autoCompleteTimer);
    this.error = new Error('Transaction aborted.');
    this.error.name = 'AbortError';
    queueMicrotask(() => this.onabort?.({ target: this }));
  }
}

class MemoryDatabase {
  constructor(name, version, control) {
    this.name = name;
    this.version = version;
    this.control = control;
    this.closed = false;
    this.stores = new Map();
    this.objectStoreNames = { contains: (name) => this.stores.has(name) };
  }
  get accesses() { return this.control.accesses; }
  takeFailure() { const failure = this.control.nextFailure; this.control.nextFailure = null; return failure; }
  createObjectStore(name) {
    if (this.stores.has(name)) throw new Error(`Store ${name} already exists.`);
    this.stores.set(name, new Map());
    return {};
  }
  transaction(names, mode) {
    if (this.closed) throw inactiveError();
    const failure = this.control.nextTransactionFailure;
    this.control.nextTransactionFailure = null;
    if (failure) throw failure;
    return new MemoryTransaction(this, Array.isArray(names) ? names : [names], mode);
  }
  close() { this.closed = true; }
}

export function createMemoryIndexedDB() {
  const databases = new Map();
  const control = { accesses: [], nextFailure: null, nextTransactionFailure: null };
  return {
    open(name, version) {
      const result = { result: undefined, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
      queueMicrotask(() => {
        try {
          const previous = databases.get(name);
          if (previous && version < previous.version) throw new Error('VersionError');
          const database = previous || new MemoryDatabase(name, version, control);
          const oldVersion = previous ? previous.version : 0;
          database.version = version;
          databases.set(name, database);
          result.result = database;
          if (version > oldVersion) result.onupgradeneeded?.({ target: result, oldVersion, newVersion: version });
          result.onsuccess?.({ target: result });
        } catch (error) {
          result.error = error;
          result.onerror?.({ target: result });
        }
      });
      return result;
    },
    accessLog: () => control.accesses.slice(),
    resetAccessLog: () => { control.accesses.length = 0; },
    failNextRequest: (error) => { control.nextFailure = error; },
    failNextTransaction: (error) => { control.nextTransactionFailure = error; },
    closeDatabase: (name) => databases.get(name)?.close()
  };
}
