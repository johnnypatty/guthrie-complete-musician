(function (root, factory) {
  const data = typeof module === 'object' && module.exports ? require('./course-data.js') : root.CourseData;
  const planner = typeof module === 'object' && module.exports ? require('./session-planner.js') : root.SessionPlanner;
  const api = factory(data, planner);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PracticeEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (CourseData, SessionPlanner) {
  'use strict';

  function validateWeek(week) {
    const value = Number(week);
    if (!Number.isInteger(value) || value < 1 || value > 24) throw new Error('Week must be an integer from 1 to 24');
    return value;
  }

  function getPhase(week) {
    const value = validateWeek(week);
    return CourseData.phases.find((phase) => value >= phase.start && value <= phase.end);
  }

  function buildSession(minutes, week) {
    const value = validateWeek(week);
    return SessionPlanner.plan({ durationMinutes: minutes, week: value, candidates: SessionPlanner.DEFAULT_CANDIDATES, seed: `week-${value}` }).blocks.map((block) => ({
      ...block,
      instanceId: block.id,
      ...(block.type === 'practice' ? { id: block.candidateId } : {})
    }));
  }

  function hashSeed(seed) {
    const text = String(seed);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function pickPrompt(seed) {
    if (!CourseData.prompts.length) throw new Error('No improvisation prompts available');
    const index = hashSeed(seed) % CourseData.prompts.length;
    return { index, text: CourseData.prompts[index] };
  }

  function getWeekFocus(week) {
    const value = validateWeek(week);
    const phase = getPhase(value);
    const cycle = ['Establish', 'Connect and vary', 'Apply in music', 'Test and lighten'][(value - 1) % 4];
    return { week: value, phase: phase.name, focus: phase.focus, cycle };
  }

  return { getPhase, buildSession, pickPrompt, getWeekFocus };
});
