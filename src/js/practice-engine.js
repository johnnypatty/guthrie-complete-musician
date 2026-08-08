(function (root, factory) {
  const data = typeof module === 'object' && module.exports ? require('./course-data.js') : root.CourseData;
  const api = factory(data);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PracticeEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (CourseData) {
  'use strict';

  const core = [
    { id: 'prepare', title: 'Prepare', minutes: 5, instruction: 'Tune, check body tension, and write today’s exact goals.' },
    { id: 'technique', title: 'Clean technique', minutes: 20, instruction: 'Train one mechanic, then place it in a musical phrase.' },
    { id: 'rhythm', title: 'Rhythm and groove', minutes: 15, instruction: 'Clap/count first; use a displaced or sparse click.' },
    { id: 'ear', title: 'Ear and transcription', minutes: 15, instruction: 'Sing, then map only 1–4 seconds with no tab.' },
    { id: 'harmony', title: 'Fretboard and harmony', minutes: 15, instruction: 'Spell, hear, locate, and apply one concept.' },
    { id: 'improv', title: 'Constrained improvisation', minutes: 15, instruction: 'Record explore, develop, and performance takes.' },
    { id: 'review', title: 'Listen and log', minutes: 5, instruction: 'Write one win and one exact next action.' }
  ];

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
    const duration = Number(minutes);
    validateWeek(week);
    if (![90, 120].includes(duration)) throw new Error('Minutes must be 90 or 120');
    const session = core.map((block) => ({ ...block }));
    if (duration === 120) {
      session.splice(session.length - 1, 0,
        { id: 'repertoire', title: 'Repertoire', minutes: 15, instruction: 'Recall, repair one transition, then perform the known section.' },
        { id: 'phrase-lab', title: 'Phrase laboratory', minutes: 15, instruction: 'Analyze one idea and create rhythmic, melodic, and contextual variations.' }
      );
    }
    return session;
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
