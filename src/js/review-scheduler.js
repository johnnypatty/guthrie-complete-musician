(function (root) {
  'use strict';
  const INTERVAL_DAYS = Object.freeze([1, 3, 7, 14, 30]);
  const DAY_MS = 86400000;
  function hash(text, seed) { let value = Number(seed) || 1; for (const char of String(text)) value = (Math.imul(value ^ char.charCodeAt(0), 16777619)) >>> 0; return value; }
  function create(options = {}) {
    const now = options.now || Date.now;
    const seed = options.seed || 1;
    function due(items) {
      const time = now();
      return (items || []).filter((item) => !item.dueAt || new Date(item.dueAt).getTime() <= time).sort((a, b) => {
        const date = String(a.dueAt || '').localeCompare(String(b.dueAt || ''));
        return date || hash(a.id, seed) - hash(b.id, seed) || String(a.id).localeCompare(String(b.id));
      });
    }
    function answer(item, correct, response = '') {
      const previous = Number(item.repetitions) || 0;
      const repetitions = correct ? previous + 1 : 0;
      const intervalDays = correct ? INTERVAL_DAYS[Math.min(previous, INTERVAL_DAYS.length - 1)] : INTERVAL_DAYS[0];
      return { ...structuredClone(item), correct: Boolean(correct), repetitions, intervalDays, dueAt: new Date(now() + intervalDays * DAY_MS).toISOString(), updatedAt: new Date(now()).toISOString(), feedback: correct ? `Correct — ${item.answer || response}. Review in ${intervalDays} day${intervalDays === 1 ? '' : 's'}.` : `Not yet. The answer is ${item.answer}. It returns tomorrow.` };
    }
    return Object.freeze({ due, answer });
  }
  root.ReviewScheduler = Object.freeze({ create, INTERVAL_DAYS });
})(typeof globalThis !== 'undefined' ? globalThis : this);
