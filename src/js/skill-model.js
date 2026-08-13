(function (root) {
  'use strict';
  const SKILLS = Object.freeze(['technique', 'rhythm', 'ear', 'harmony', 'improvisation', 'repertoire', 'performance']);
  const WEIGHTS = Object.freeze({ self: .5, assessment: .3, signal: .2 });
  function valid(observation) { return observation && SKILLS.includes(observation.skill) && Object.hasOwn(WEIGHTS, observation.type) && Number.isFinite(Number(observation.value)) && (observation.type !== 'signal' || observation.valid === true) && Number.isFinite(Date.parse(observation.at)); }
  function summarize(observations, options = {}) {
    const now = Number(options.now || Date.now()); const cutoff = now - 28 * 86400000; const source = Array.isArray(observations) ? observations.filter(valid).filter((item) => Date.parse(item.at) <= now) : [];
    return Object.fromEntries(SKILLS.map((skill) => {
      const all = source.filter((item) => item.skill === skill).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      const recent = all.filter((item) => Date.parse(item.at) >= cutoff); const groups = {};
      recent.forEach((item) => { (groups[item.type] ||= []).push(Number(item.value)); });
      let numerator = 0; let denominator = 0;
      Object.entries(groups).forEach(([type, values]) => { const weight = WEIGHTS[type]; numerator += values.reduce((sum, value) => sum + value, 0) / values.length * weight; denominator += weight; });
      const score = denominator ? Math.round(numerator / denominator) : null;
      const confidence = recent.length >= 6 && Object.keys(groups).length >= 2 ? 'established' : recent.length >= 2 ? 'developing' : 'low';
      const trends = {}; recent.filter((item) => item.metric).forEach((item) => { (trends[item.metric] ||= []).push(Number(item.value)); });
      return [skill, { skill, score, evidenceCount: recent.length, confidence, baseline: all[0]?.value ?? null, latest: all.at(-1)?.value ?? null, latestAt: all.at(-1)?.at || null, rollup28Days: recent.map((item) => ({ at: item.at, value: Number(item.value), type: item.type })), trends }];
    }));
  }
  root.SkillModel = Object.freeze({ SKILLS, WEIGHTS, summarize });
})(typeof globalThis !== 'undefined' ? globalThis : this);
