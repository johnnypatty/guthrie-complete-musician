(function (root) {
  'use strict';

  if (!root.ProgressSchema) throw new Error('ProgressSchema must load before ProgressStore.');

  function normalize(value) {
    return root.ProgressSchema.migrate(value);
  }

  function exportJson(state) {
    return `${JSON.stringify(root.ProgressSchema.projectPortable(state), null, 2)}\n`;
  }

  function importJson(text) {
    return root.ProgressSchema.parsePortable(text);
  }

  function readingPercent(scrollY, scrollHeight, viewportHeight) {
    const available = Math.max(0, Number(scrollHeight) - Number(viewportHeight));
    if (!Number.isFinite(available) || available <= 0) return 100;
    const position = Math.min(available, Math.max(0, Number(scrollY) || 0));
    return Math.round((position / available) * 100);
  }

  root.ProgressStore = Object.freeze({
    SCHEMA_VERSION: root.ProgressSchema.SCHEMA_VERSION,
    DEFAULTS: root.ProgressSchema.DEFAULTS,
    normalize,
    exportJson,
    importJson,
    readingPercent
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
