(function (root) {
  'use strict';

  function normalized(value) {
    return String(value || '').trim().toLocaleLowerCase('en');
  }

  function filter(lessons, filters = {}) {
    const queryTokens = normalized(filters.query).split(/\s+/).filter(Boolean);
    const category = normalized(filters.category);
    const phase = normalized(filters.phase);

    return (Array.isArray(lessons) ? lessons : []).filter((lesson) => {
      if (category && category !== 'all' && normalized(lesson.category) !== category) return false;
      if (phase && phase !== 'all' && normalized(lesson.phase) !== phase) return false;
      const haystack = normalized([
        lesson.title,
        lesson.summary,
        lesson.category,
        lesson.phase,
        ...(Array.isArray(lesson.tags) ? lesson.tags : [])
      ].join(' '));
      return queryTokens.every((token) => haystack.includes(token));
    });
  }

  function options(lessons, field) {
    return [...new Set((Array.isArray(lessons) ? lessons : [])
      .map((lesson) => lesson[field])
      .filter((value) => typeof value === 'string' && value.trim()))]
      .sort((a, b) => a.localeCompare(b, 'en'));
  }

  root.LessonSearch = Object.freeze({ filter, options });
})(typeof globalThis !== 'undefined' ? globalThis : this);
