(function (root) {
  'use strict';

  if (!root.ProgressSchema) throw new Error('ProgressSchema must load before ProgressTransfer.');

  const MAX_TEXT = 4096;
  const MAX_SHORT_TEXT = 256;
  const MAX_COLLECTION = 10000;
  const TOP_LEVEL_FIELDS = new Set(Object.keys(root.ProgressSchema.DEFAULTS));
  const ANALYSIS_FIELDS = Object.freeze({
    detectedNote: 'shortText', tuningCents: 'number', sustainDeviationCents: 'number', bendErrorCents: 'number',
    bendOvershootCents: 'number', settlingTimeMs: 'number', vibratoRateHz: 'number', vibratoWidthCents: 'number',
    vibratoConsistency: 'score', timingErrorMs: 'number', timingDirection: 'shortText', noiseFloor: 'number',
    stringNoiseIndicator: 'number', confidence: 'score', valid: 'boolean', reason: 'text', note: 'text'
  });
  const RECORD_SCHEMAS = Object.freeze({
    sessions: Object.freeze({
      id: 'id', date: 'shortText', timestamp: 'shortText', startedAt: 'shortText', endedAt: 'shortText', title: 'shortText',
      focus: 'text', status: 'shortText', note: 'text', notes: 'text', trackId: 'shortText', key: 'shortText', rating: 'shortText',
      minutes: 'minutes', plannedMinutes: 'minutes', completedMinutes: 'minutes', tempo: 'tempo', clean: 'boolean', tension: 'boolean', pain: 'boolean'
    }),
    attempts: Object.freeze({
      id: 'id', timestamp: 'shortText', date: 'shortText', sessionId: 'id', exerciseId: 'id', blockId: 'id', lessonId: 'id',
      recordingRef: 'id', trackId: 'shortText', key: 'shortText', mimeType: 'shortText', selfRating: 'shortText', rating: 'shortText',
      skill: 'shortText', note: 'text', duration: 'duration', durationSeconds: 'duration', tempo: 'tempo', audioUnavailable: 'boolean',
      valid: 'boolean', confidence: 'score', tension: 'boolean', pain: 'boolean', analysisSummary: 'analysis'
    }),
    skillObservations: Object.freeze({
      id: 'id', timestamp: 'shortText', date: 'shortText', sessionId: 'id', attemptId: 'id', skill: 'shortText', source: 'shortText',
      rating: 'shortText', confidence: 'shortText', note: 'text', value: 'score', score: 'score', evidenceCount: 'count', valid: 'boolean'
    }),
    reviewItems: Object.freeze({
      id: 'id', due: 'shortText', dueAt: 'shortText', createdAt: 'shortText', updatedAt: 'shortText', sourceId: 'id', skill: 'shortText',
      type: 'shortText', prompt: 'text', answer: 'text', status: 'shortText', note: 'text', title: 'shortText',
      intervalDays: 'count', repetitions: 'count', correct: 'boolean'
    }),
    customProgressions: Object.freeze({
      id: 'id', name: 'shortText', title: 'shortText', key: 'shortText', meter: 'shortText', groove: 'shortText', section: 'shortText',
      notes: 'text', tempo: 'tempo', loopStart: 'count', loopEnd: 'count', chords: 'chords', bars: 'chords'
    }),
    recommendations: Object.freeze({
      id: 'id', createdAt: 'shortText', updatedAt: 'shortText', dueAt: 'shortText', skill: 'shortText', title: 'shortText',
      reason: 'text', action: 'shortText', status: 'shortText', exerciseId: 'id', lessonId: 'id', sessionId: 'id', note: 'text',
      score: 'score', minutes: 'minutes', tempo: 'tempo', evidence: 'stringList', componentScores: 'scoreMap'
    })
  });
  const GEAR_SCHEMA = Object.freeze({
    guitar: 'shortText', tuning: 'shortText', interface: 'shortText', input: 'shortText', gp200Preset: 'shortText', amp: 'shortText',
    notes: 'text', sampleRate: 'count', latencyMs: 'number'
  });
  const CHORD_SCHEMA = Object.freeze({ chord: 'shortText', name: 'shortText', beats: 'positiveNumber', section: 'shortText' });

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

  function validText(value, max, nonempty = false) {
    return typeof value === 'string' && value.length <= max && (!nonempty || Boolean(value.trim()));
  }

  function validKind(value, kind) {
    if (kind === 'id') return validText(value, 128, true);
    if (kind === 'shortText') return validText(value, MAX_SHORT_TEXT);
    if (kind === 'text') return validText(value, MAX_TEXT);
    if (kind === 'boolean') return typeof value === 'boolean';
    if (kind === 'number') return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1000000;
    if (kind === 'positiveNumber') return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1000000;
    if (kind === 'score') return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
    if (kind === 'count') return Number.isInteger(value) && value >= 0 && value <= 100000;
    if (kind === 'minutes') return Number.isInteger(value) && value >= 0 && value <= 1440;
    if (kind === 'duration') return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 7200;
    if (kind === 'tempo') return Number.isInteger(value) && value >= 40 && value <= 240;
    if (kind === 'stringList') return Array.isArray(value) && value.length <= 256 && value.every((item) => validText(item, MAX_SHORT_TEXT));
    if (kind === 'scoreMap') return isPlainObject(value) && Object.keys(value).length <= 64
      && Object.entries(value).every(([key, score]) => validText(key, 64, true) && validKind(score, 'score'));
    if (kind === 'analysis') return validFields(value, ANALYSIS_FIELDS, true) != null;
    if (kind === 'chords') return Array.isArray(value) && value.length > 0 && value.length <= 256 && value.every((item) => (
      validText(item, MAX_SHORT_TEXT, true) || validFields(item, CHORD_SCHEMA, true) != null
    ));
    return false;
  }

  function validFields(value, schema, strict) {
    if (!isPlainObject(value)) return null;
    const output = {};
    for (const [key, fieldValue] of Object.entries(value)) {
      const kind = schema[key];
      if (!kind) {
        if (strict) return null;
        continue;
      }
      if (!validKind(fieldValue, kind)) {
        if (strict) return null;
        continue;
      }
      output[key] = structuredClone(fieldValue);
    }
    return output;
  }

  function projectRecord(collection, value, strict) {
    if (!isPlainObject(value)) {
      if (strict) throw new Error(`Invalid ${collection} record.`);
      return null;
    }
    for (const key of Object.keys(value)) {
      if (!(key in RECORD_SCHEMAS[collection]) && strict) throw new Error(`Field ${key} is not allowed in ${collection}.`);
    }
    const record = validFields(value, RECORD_SCHEMAS[collection], strict);
    if (!record) throw new Error(`Invalid ${collection} record.`);
    if (value.id != null && value.id !== '' && !validKind(value.id, 'id')) throw new Error(`Invalid ${collection} record id.`);
    if (!record.id) {
      delete record.id;
      record.id = legacyId(collection, record);
    }
    return record;
  }

  function projectCollection(collection, values, strict) {
    if (!Array.isArray(values) || values.length > MAX_COLLECTION) throw new Error(`Invalid ${collection} section.`);
    const explicitIds = new Set();
    for (const value of values) {
      if (!isPlainObject(value)) {
        if (strict) throw new Error(`Invalid ${collection} record.`);
        continue;
      }
      if (typeof value.id === 'string' && value.id.trim()) {
        if (explicitIds.has(value.id)) throw new Error(`Duplicate ${collection} id: ${value.id}`);
        explicitIds.add(value.id);
      }
    }
    return values.map((value) => projectRecord(collection, value, strict)).filter(Boolean);
  }

  function validateBooleanMap(value, section) {
    if (!isPlainObject(value) || Object.keys(value).length > 5000
      || Object.entries(value).some(([key, enabled]) => !validText(key, MAX_SHORT_TEXT, true) || typeof enabled !== 'boolean')) {
      throw new Error(`Invalid ${section} section.`);
    }
  }

  function validateTopLevel(value) {
    if (!isPlainObject(value)) throw new Error('Progress data must be an object.');
    for (const key of Object.keys(value)) {
      if (!TOP_LEVEL_FIELDS.has(key)) throw new Error(`Field ${key} is not allowed in portable progress.`);
    }
    if (value.schemaVersion != null && ![1, 2, 3].includes(value.schemaVersion)) throw new Error('Invalid schemaVersion field.');
    if (value.week != null && (!Number.isInteger(value.week) || value.week < 1 || value.week > 24)) throw new Error('Invalid week field.');
    if (value.minutes != null && !root.ProgressSchema.DURATIONS.includes(value.minutes)) throw new Error('Invalid minutes field.');
    if (value.tempo != null && (!Number.isInteger(value.tempo) || value.tempo < 50 || value.tempo > 220)) throw new Error('Invalid tempo field.');
    if (value.countInBars != null && (!Number.isInteger(value.countInBars) || value.countInBars < 0 || value.countInBars > 2)) throw new Error('Invalid countInBars field.');
    for (const field of ['trackId', 'loop']) {
      if (value[field] != null && !validText(value[field], MAX_SHORT_TEXT, true)) throw new Error(`Invalid ${field} field.`);
    }
    for (const section of ['completed', 'lessons']) {
      if (value[section] != null) validateBooleanMap(value[section], section);
    }
    if (value.levels != null) {
      const levelKeys = ['pad', 'bass', 'drums', 'master'];
      if (!isPlainObject(value.levels) || Object.keys(value.levels).some((key) => !levelKeys.includes(key))
        || Object.values(value.levels).some((level) => !Number.isInteger(level) || level < 0 || level > 100)) {
        throw new Error('Invalid levels section.');
      }
    }
    if (value.activeSession != null && !validFields(value.activeSession, RECORD_SCHEMAS.sessions, true)) throw new Error('Invalid activeSession section.');
    if (value.gearProfile != null && !validFields(value.gearProfile, GEAR_SCHEMA, true)) throw new Error('Invalid gearProfile section.');
    for (const collection of root.ProgressSchema.COLLECTIONS) {
      if (value[collection] != null && !Array.isArray(value[collection])) throw new Error(`Invalid ${collection} section.`);
    }
  }

  function parseImport(text) {
    let parsed;
    try {
      parsed = JSON.parse(String(text));
    } catch (_error) {
      throw new Error('Choose a valid progress JSON file.');
    }
    validateTopLevel(parsed);
    const normalized = root.ProgressSchema.projectPortable(parsed);
    for (const collection of root.ProgressSchema.COLLECTIONS) {
      normalized[collection] = projectCollection(collection, normalized[collection], true);
    }
    normalized.activeSession = normalized.activeSession == null ? null : validFields(normalized.activeSession, RECORD_SCHEMAS.sessions, true);
    normalized.gearProfile = validFields(normalized.gearProfile, GEAR_SCHEMA, true);
    normalized.attempts = normalized.attempts.map((attempt) => (
      attempt.recordingRef ? { ...attempt, audioUnavailable: true } : attempt
    ));
    return normalized;
  }

  function projectExport(snapshot) {
    const normalized = root.ProgressSchema.projectPortable(snapshot);
    for (const collection of root.ProgressSchema.COLLECTIONS) {
      normalized[collection] = projectCollection(collection, normalized[collection], false);
    }
    normalized.activeSession = normalized.activeSession == null ? null : validFields(normalized.activeSession, RECORD_SCHEMAS.sessions, false);
    normalized.gearProfile = validFields(normalized.gearProfile, GEAR_SCHEMA, false) || {};
    return normalized;
  }

  function unavailable(repository) {
    return !repository || repository.status !== 'ready';
  }

  function status() {
    return { status: 'storage-unavailable' };
  }

  async function exportSnapshot(repository) {
    if (unavailable(repository)) return status();
    try {
      const snapshot = await repository.snapshot();
      if (snapshot?.status === 'storage-unavailable') return status();
      return JSON.stringify(projectExport(snapshot));
    } catch (_error) {
      return status();
    }
  }

  async function importSnapshot(repository, text, { mode } = {}) {
    if (unavailable(repository)) return status();
    if (!['merge', 'replace-metadata'].includes(mode)) throw new Error('Import mode must be merge or replace-metadata.');

    // Validate and normalize the complete portable snapshot before any repository transaction.
    const metadata = parseImport(text);
    try {
      const result = mode === 'merge' ? await repository.mergeMetadata(metadata) : await repository.replaceMetadata(metadata);
      return result?.status === 'storage-unavailable' ? status() : result;
    } catch (_error) {
      return status();
    }
  }

  root.ProgressTransfer = Object.freeze({ exportSnapshot, importSnapshot });
})(typeof globalThis !== 'undefined' ? globalThis : this);
