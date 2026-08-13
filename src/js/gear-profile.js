(function (root) {
  'use strict';
  const LIMITS = Object.freeze({ guitar: 120, bridge: 80, strings: 40, tuning: 40, notes: 500 });
  function normalize(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const output = {};
    Object.entries(LIMITS).forEach(([field, limit]) => {
      if (source[field] == null || source[field] === '') return;
      const text = String(source[field]).trim(); if (text.length > limit) throw new Error(`${field} must be ${limit} characters or fewer`); if (text) output[field] = text;
    });
    return output;
  }
  root.GearProfile = Object.freeze({ LIMITS, normalize });
})(typeof globalThis !== 'undefined' ? globalThis : this);
