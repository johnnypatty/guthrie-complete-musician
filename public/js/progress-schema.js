(function (root) {
  'use strict';

  const SCHEMA_VERSION = 3;
  const DURATIONS = Object.freeze([30, 60, 90, 120]);
  const COLLECTIONS = Object.freeze(['sessions', 'attempts', 'skillObservations', 'reviewItems', 'customProgressions', 'recommendations']);
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
    levels: Object.freeze({ pad: 72, bass: 72, drums: 62, master: 80 }),
    activeSession: null,
    sessions: Object.freeze([]),
    attempts: Object.freeze([]),
    skillObservations: Object.freeze([]),
    reviewItems: Object.freeze([]),
    customProgressions: Object.freeze([]),
    recommendations: Object.freeze([]),
    gearProfile: Object.freeze({})
  });

  function isPlainObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
  }

  function safeInteger(value, fallback, min, max) {
    const number = Number(value);
    return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
  }

  function booleanMap(value, section, strict) {
    if (value == null) return {};
    if (!isPlainObject(value)) {
      if (strict) throw new Error(`Invalid ${section} section.`);
      return {};
    }
    const entries = Object.entries(value);
    if (strict && entries.some(([, enabled]) => typeof enabled !== 'boolean')) throw new Error(`Invalid ${section} section.`);
    return Object.fromEntries(entries.filter(([, enabled]) => typeof enabled === 'boolean'));
  }

  function levels(value, strict) {
    if (value == null) return { ...DEFAULTS.levels };
    if (!isPlainObject(value)) {
      if (strict) throw new Error('Invalid levels section.');
      return { ...DEFAULTS.levels };
    }
    return {
      pad: safeInteger(value.pad, DEFAULTS.levels.pad, 0, 100),
      bass: safeInteger(value.bass, DEFAULTS.levels.bass, 0, 100),
      drums: safeInteger(value.drums, DEFAULTS.levels.drums, 0, 100),
      master: safeInteger(value.master, DEFAULTS.levels.master, 0, 100)
    };
  }

  function arraySection(value, section, strict) {
    if (value == null) return [];
    if (!Array.isArray(value)) {
      if (strict) throw new Error(`Invalid ${section} section.`);
      return [];
    }
    return value.slice();
  }

  function activeSession(value, strict) {
    if (value == null) return null;
    if (!isPlainObject(value)) {
      if (strict) throw new Error('Invalid activeSession section.');
      return null;
    }
    return { ...value };
  }

  function gearProfile(value, strict) {
    if (value == null) return {};
    if (!isPlainObject(value)) {
      if (strict) throw new Error('Invalid gearProfile section.');
      return {};
    }
    return { ...value };
  }

  function migrate(value) {
    const input = value == null ? {} : value;
    if (!isPlainObject(input)) throw new Error('Progress data must be an object.');
    const version = input.schemaVersion == null ? 1 : Number(input.schemaVersion);
    if (![1, 2, SCHEMA_VERSION].includes(version)) throw new Error(`Unsupported progress schema version: ${input.schemaVersion}`);
    const strict = version === SCHEMA_VERSION;

    return {
      schemaVersion: SCHEMA_VERSION,
      week: safeInteger(input.week, DEFAULTS.week, 1, 24),
      minutes: DURATIONS.includes(Number(input.minutes)) ? Number(input.minutes) : DEFAULTS.minutes,
      completed: booleanMap(input.completed, 'completed', strict),
      lessons: booleanMap(input.lessons, 'lessons', strict),
      trackId: typeof input.trackId === 'string' && input.trackId.trim() ? input.trackId : DEFAULTS.trackId,
      tempo: safeInteger(input.tempo, DEFAULTS.tempo, 50, 220),
      loop: typeof input.loop === 'string' && input.loop.trim() ? input.loop : DEFAULTS.loop,
      countInBars: safeInteger(input.countInBars, DEFAULTS.countInBars, 0, 2),
      levels: levels(input.levels, strict),
      activeSession: activeSession(input.activeSession, strict),
      sessions: arraySection(input.sessions, 'sessions', strict),
      attempts: arraySection(input.attempts, 'attempts', strict),
      skillObservations: arraySection(input.skillObservations, 'skillObservations', strict),
      reviewItems: arraySection(input.reviewItems, 'reviewItems', strict),
      customProgressions: arraySection(input.customProgressions, 'customProgressions', strict),
      recommendations: arraySection(input.recommendations, 'recommendations', strict),
      gearProfile: gearProfile(input.gearProfile, strict)
    };
  }

  function projectPortable(snapshot) {
    return migrate(snapshot);
  }

  function parsePortable(text) {
    let parsed;
    try {
      parsed = JSON.parse(String(text));
    } catch (_error) {
      throw new Error('Choose a valid progress JSON file.');
    }
    return projectPortable(parsed);
  }

  root.ProgressSchema = Object.freeze({ SCHEMA_VERSION, DEFAULTS, DURATIONS, COLLECTIONS, migrate, projectPortable, parsePortable });
})(typeof globalThis !== 'undefined' ? globalThis : this);
