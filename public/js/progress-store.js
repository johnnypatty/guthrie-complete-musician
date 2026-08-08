(function (root) {
  'use strict';

  const SCHEMA_VERSION = 2;
  const DEFAULTS = Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    week: 1,
    minutes: 90,
    completed: Object.freeze({}),
    lessons: Object.freeze({}),
    trackId: 'emotional-d-minor',
    tempo: 74,
    loop: 'full',
    countInBars: 1,
    levels: Object.freeze({ pad: 72, bass: 72, drums: 62, master: 80 })
  });

  function safeInteger(value, fallback, min, max) {
    const number = Number(value);
    return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
  }

  function booleanMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, enabled]) => typeof enabled === 'boolean'));
  }

  function normalize(value) {
    const input = value == null ? {} : value;
    if (typeof input !== 'object' || Array.isArray(input)) throw new Error('Progress data must be an object.');
    const version = input.schemaVersion == null ? 1 : Number(input.schemaVersion);
    if (![1, SCHEMA_VERSION].includes(version)) throw new Error(`Unsupported progress schema version: ${input.schemaVersion}`);

    return {
      schemaVersion: SCHEMA_VERSION,
      week: safeInteger(input.week, DEFAULTS.week, 1, 24),
      minutes: [90, 120].includes(Number(input.minutes)) ? Number(input.minutes) : DEFAULTS.minutes,
      completed: booleanMap(input.completed),
      lessons: booleanMap(input.lessons),
      trackId: typeof input.trackId === 'string' && input.trackId.trim() ? input.trackId : DEFAULTS.trackId,
      tempo: safeInteger(input.tempo, DEFAULTS.tempo, 50, 220),
      loop: typeof input.loop === 'string' && input.loop.trim() ? input.loop : DEFAULTS.loop,
      countInBars: safeInteger(input.countInBars, DEFAULTS.countInBars, 0, 2),
      levels: {
        pad: safeInteger(input.levels?.pad, DEFAULTS.levels.pad, 0, 100),
        bass: safeInteger(input.levels?.bass, DEFAULTS.levels.bass, 0, 100),
        drums: safeInteger(input.levels?.drums, DEFAULTS.levels.drums, 0, 100),
        master: safeInteger(input.levels?.master, DEFAULTS.levels.master, 0, 100)
      }
    };
  }

  function exportJson(state) {
    return `${JSON.stringify(normalize(state), null, 2)}\n`;
  }

  function importJson(text) {
    let parsed;
    try {
      parsed = JSON.parse(String(text));
    } catch (_error) {
      throw new Error('Choose a valid progress JSON file.');
    }
    return normalize(parsed);
  }

  function readingPercent(scrollY, scrollHeight, viewportHeight) {
    const available = Math.max(0, Number(scrollHeight) - Number(viewportHeight));
    if (!Number.isFinite(available) || available <= 0) return 100;
    const position = Math.min(available, Math.max(0, Number(scrollY) || 0));
    return Math.round((position / available) * 100);
  }

  root.ProgressStore = Object.freeze({
    SCHEMA_VERSION,
    DEFAULTS,
    normalize,
    exportJson,
    importJson,
    readingPercent
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
