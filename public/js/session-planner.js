(function (root) {
  'use strict';

  const DURATIONS = Object.freeze([30, 60, 90, 120]);
  const RESTS = Object.freeze({ 30: 0, 60: 5, 90: 10, 120: 15 });
  const DEFAULT_CANDIDATES = Object.freeze([
    { id: 'prepare', title: 'Prepare', skill: 'preparation', instruction: 'Tune, check body tension, and write today’s exact goals.' },
    { id: 'technique', title: 'Clean technique', skill: 'technique', instruction: 'Train one mechanic, then place it in a musical phrase.' },
    { id: 'rhythm', title: 'Rhythm and groove', skill: 'rhythm', instruction: 'Clap/count first; use a displaced or sparse click.' },
    { id: 'ear', title: 'Ear and transcription', skill: 'ear', instruction: 'Sing, then map only 1–4 seconds with no tab.' },
    { id: 'harmony', title: 'Fretboard and harmony', skill: 'harmony', instruction: 'Spell, hear, locate, and apply one concept.' },
    { id: 'improv', title: 'Constrained improvisation', skill: 'improv', instruction: 'Record explore, develop, and performance takes.' },
    { id: 'repertoire', title: 'Repertoire', skill: 'repertoire', instruction: 'Recall, repair one transition, then perform the known section.' },
    { id: 'phrase-lab', title: 'Phrase laboratory', skill: 'improv', instruction: 'Analyze one idea and create rhythmic, melodic, and contextual variations.' },
    { id: 'review', title: 'Listen and log', skill: 'review', instruction: 'Write one win and one exact next action.' }
  ]);

  function goalsFor(goals) {
    const selected = Array.isArray(goals) ? [...new Set(goals.filter((goal) => typeof goal === 'string' && goal.trim()))] : [];
    if (selected.length > 2) throw new Error('Choose at most two goals.');
    return selected;
  }

  function hashSeed(seed) {
    const text = String(seed == null ? '' : seed);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619); }
    return hash >>> 0;
  }

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
    return value;
  }

  function candidateBlock(candidate, minutes, instanceIndex) {
    return { id: `plan-${instanceIndex + 1}`, candidateId: candidate.id, type: 'practice', title: candidate.title, skill: candidate.skill, instruction: candidate.instruction || `Work on ${candidate.title}.`, minutes,
      ...(Number.isFinite(Number(candidate.tempo)) ? { tempo: Number(candidate.tempo) } : {}),
      ...(candidate.backing && typeof candidate.backing === 'object' ? { backing: clone(candidate.backing) } : {}) };
  }

  function plan({ durationMinutes, week, goals, candidates, seed } = {}) {
    const duration = Number(durationMinutes);
    if (!DURATIONS.includes(duration)) throw new Error('Duration must be 30, 60, 90, or 120 minutes.');
    const courseWeek = Number(week);
    if (!Number.isInteger(courseWeek) || courseWeek < 1 || courseWeek > 24) throw new Error('Week must be an integer from 1 to 24.');
    const selectedGoals = goalsFor(goals);
    const source = Array.isArray(candidates) && candidates.length ? candidates : DEFAULT_CANDIDATES;
    const offset = hashSeed(seed) % source.length;
    const ordered = source.slice(offset).concat(source.slice(0, offset));
    const restMinutes = RESTS[duration];
    const practiceMinutes = duration - restMinutes;
    const segmentCount = Math.ceil(practiceMinutes / 30);
    const practiceBlockCount = Math.max(segmentCount, Math.min(source.length, practiceMinutes));
    const baseMinutes = Math.floor(practiceMinutes / practiceBlockCount);
    const extraMinutes = practiceMinutes % practiceBlockCount;
    const allocations = Array.from({ length: practiceBlockCount }, (_value, index) => baseMinutes + (index < extraMinutes ? 1 : 0));
    const segmentMinutes = Array.from({ length: segmentCount }, (_value, index) => {
      const base = Math.floor(practiceMinutes / segmentCount);
      return base + (index < practiceMinutes % segmentCount ? 1 : 0);
    });
    const restAllocations = Array.from({ length: segmentCount - 1 }, (_value, index) => {
      const base = Math.floor(restMinutes / (segmentCount - 1));
      return base + (index < restMinutes % (segmentCount - 1) ? 1 : 0);
    });
    const blocks = [];
    let allocationIndex = 0;
    let blockIndex = 0;
    for (let segmentIndex = 0; segmentIndex < segmentMinutes.length; segmentIndex += 1) {
      let remainingSegment = segmentMinutes[segmentIndex];
      while (remainingSegment > 0) {
        const allocation = allocations[allocationIndex];
        const minutes = Math.min(allocation, remainingSegment);
        const candidate = ordered[blockIndex % ordered.length];
        blocks.push(candidateBlock(candidate, minutes, blocks.length));
        remainingSegment -= minutes;
        if (minutes === allocation) {
          allocationIndex += 1;
          blockIndex += 1;
        } else {
          allocations[allocationIndex] -= minutes;
        }
      }
      if (segmentIndex < restAllocations.length) {
        blocks.push({ id: `plan-${blocks.length + 1}`, type: 'rest', title: 'Rest', instruction: 'Relax your hands, ears, and posture before the next block.', minutes: restAllocations[segmentIndex] });
      }
    }
    return { durationMinutes: duration, week: courseWeek, goals: selectedGoals, seed: String(seed == null ? '' : seed), blocks };
  }

  root.SessionPlanner = Object.freeze({ DURATIONS, RESTS, DEFAULT_CANDIDATES, plan });
})(globalThis);
