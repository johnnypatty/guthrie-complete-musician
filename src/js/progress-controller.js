(function (root) {
  'use strict';
  function create(options = {}) {
    const state = options.state || {}; const now = Number(options.now || Date.now());
    function project() {
      const skills = root.SkillModel.summarize(state.skillObservations || [], { now });
      return {
        skills,
        chartRows: Object.values(skills).map((item) => ({ skill: item.skill, score: item.score, confidence: item.confidence, evidence: item.evidenceCount })),
        dueReviews: (state.reviewItems || []).filter((item) => Number.isFinite(Date.parse(item.dueAt)) && Date.parse(item.dueAt) <= now),
        unfinishedRepertoire: (state.attempts || []).filter((item) => item.complete !== true && (item.skill === 'repertoire' || item.title)),
        recommendations: state.recommendations || []
      };
    }
    function decide(decision = {}) {
      if (!['accept', 'edit', 'postpone', 'reject'].includes(decision.action)) throw new Error('Unknown recommendation decision');
      const entry = { id: String(decision.id || 'recommendation'), action: decision.action, reason: String(decision.reason || '').slice(0, 280), at: new Date(now).toISOString() };
      state.recommendations = [...(state.recommendations || []), entry]; return entry;
    }
    return Object.freeze({ project, decide });
  }
  root.ProgressController = Object.freeze({ create });
})(typeof globalThis !== 'undefined' ? globalThis : this);
