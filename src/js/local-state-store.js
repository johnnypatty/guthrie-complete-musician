(function (root) {
  'use strict';

  if (!root.ProgressSchema) throw new Error('ProgressSchema must load before LocalStateStore.');

  const PORTABLE_KEYS = new Set([
    'schemaVersion', 'week', 'minutes', 'completed', 'lessons', 'trackId', 'tempo', 'loop', 'countInBars', 'levels',
    'activeSession', 'sessions', 'attempts', 'skillObservations', 'reviewItems', 'customProgressions', 'recommendations', 'gearProfile'
  ]);

  function isPlainObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
  }

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readJson(storage, key) {
    const raw = storage.getItem(key);
    if (!raw) return null;
    try {
      const value = JSON.parse(raw);
      if (!isPlainObject(value)) throw new Error('Stored progress must be an object.');
      return value;
    } catch (_error) {
      return null;
    }
  }

  function legacyKeysFor(key) {
    return key === 'gcm-progress-v3' ? ['gcm-progress-v2', 'gcm-progress-v1'] : [];
  }

  function snapshotFor(value) {
    const normalized = root.ProgressSchema.migrate(value);
    const input = isPlainObject(value) ? value : {};
    return { ...input, ...normalized };
  }

  function create(storage, key) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') throw new Error('A Storage-compatible object is required.');
    if (typeof key !== 'string' || !key) throw new Error('A local-state key is required.');
    let current = null;

    function write(value) {
      current = snapshotFor(value);
      storage.setItem(key, JSON.stringify(current));
      return copy(current);
    }

    function load() {
      if (current) return copy(current);

      const primary = readJson(storage, key);
      if (primary) {
        try {
          if (Number(primary.schemaVersion) !== root.ProgressSchema.SCHEMA_VERSION) return write(primary);
          current = snapshotFor(primary);
          return copy(current);
        } catch (_error) {
          // An invalid v3 record is not trusted; attempt a legacy rollback record.
        }
      }

      for (const legacyKey of legacyKeysFor(key)) {
        const legacy = readJson(storage, legacyKey);
        if (!legacy) continue;
        try {
          return write(root.ProgressSchema.migrate(legacy));
        } catch (_error) {
          // Continue through the rollback records without changing either one.
        }
      }

      current = snapshotFor(null);
      return copy(current);
    }

    function save(value) {
      return write(value);
    }

    function patch(changes) {
      if (!isPlainObject(changes)) throw new Error('Local-state patch must be an object.');
      const previous = load();
      for (const section of ['levels', 'completed', 'lessons']) {
        if (changes[section] != null && !isPlainObject(changes[section])) throw new Error(`Invalid ${section} patch.`);
      }
      const next = {
        ...previous,
        ...changes,
        levels: changes.levels == null ? previous.levels : { ...previous.levels, ...changes.levels },
        completed: changes.completed == null ? previous.completed : { ...previous.completed, ...changes.completed },
        lessons: changes.lessons == null ? previous.lessons : { ...previous.lessons, ...changes.lessons }
      };
      root.ProgressSchema.migrate(next);
      return write(next);
    }

    return Object.freeze({ load, save, patch });
  }

  root.LocalStateStore = Object.freeze({ create, PORTABLE_KEYS });
})(typeof globalThis !== 'undefined' ? globalThis : this);
