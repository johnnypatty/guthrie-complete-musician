(function (root) {
  'use strict';

  function ensureGoals(goals) {
    const normalized = Array.isArray(goals) ? [...new Set(goals.filter((goal) => typeof goal === 'string' && goal.trim()))] : [];
    if (normalized.length > 2) throw new Error('Choose at most two goals.');
    return normalized;
  }

  function phaseName(week) {
    const value = Number(week);
    if (value >= 1 && value <= 4) return 'Control and baseline';
    if (value <= 8) return 'Vocabulary and articulation';
    if (value <= 12) return 'Changes and groove';
    if (value <= 16) return 'Fusion language';
    if (value <= 20) return 'Advanced technique in music';
    if (value <= 24) return 'Personal voice and performance';
    return '';
  }

  function rank(context = {}, candidates) {
    const goals = ensureGoals(context.goals);
    const currentPhase = phaseName(context.week);
    const levels = context.skillLevels && typeof context.skillLevels === 'object' ? context.skillLevels : {};
    const dueReviews = Array.isArray(context.dueReviews) ? context.dueReviews : [];
    const recentSkills = new Set(Array.isArray(context.recentSkills) ? context.recentSkills : []);

    const source = Array.isArray(candidates) ? candidates : (Array.isArray(context.candidates) ? context.candidates : []);
    return source.map((candidate, sourceIndex) => {
      const skillLevel = Number(levels[candidate.skill]);
      const weakSkill = Number.isFinite(skillLevel) ? Math.max(0, Math.min(100, 100 - skillLevel)) : 0;
      const dueReview = dueReviews.some((review) => review && (review.exerciseId === candidate.id || review.skill === candidate.skill));
      const coursePhase = Array.isArray(candidate.phases) && candidate.phases.includes(currentPhase);
      const goal = Array.isArray(candidate.goals) && candidate.goals.some((item) => goals.includes(item));
      const diversity = recentSkills.has(candidate.skill);
      const components = { weakSkill, dueReview: dueReview ? 40 : 0, coursePhase: coursePhase ? 15 : 0, goal: goal ? 20 : 0, diversity: diversity ? -25 : 0 };
      const reasons = [];
      if (weakSkill > 0) reasons.push(`${candidate.skill} is currently weaker (${Math.round(skillLevel)} / 100).`);
      if (dueReview) reasons.push('It has a due review.');
      if (coursePhase) reasons.push(`It supports this course phase: ${currentPhase}.`);
      if (goal) reasons.push('It matches one of your selected goals.');
      if (diversity) reasons.push(`${candidate.skill} was recently practiced, so variety lowers its priority today.`);
      if (!reasons.length) reasons.push('It keeps your practice balanced.');
      return { ...candidate, components, total: Object.values(components).reduce((sum, value) => sum + value, 0), reasons, sourceIndex };
    }).sort((left, right) => right.total - left.total || left.sourceIndex - right.sourceIndex)
      .map(({ sourceIndex, ...candidate }) => candidate);
  }

  root.RecommendationEngine = Object.freeze({ rank });
})(globalThis);
