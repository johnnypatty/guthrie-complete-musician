import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/recommendation-engine.js');
const RecommendationEngine = globalThis.RecommendationEngine;

const candidates = [
  { id: 'bend-control', title: 'Bend control', skill: 'technique', goals: ['clean lead'], phases: ['Fusion language'] },
  { id: 'guide-tones', title: 'Guide-tone map', skill: 'harmony', goals: ['changes'], phases: ['Fusion language'] },
  { id: 'ear-phrase', title: 'Sing a phrase', skill: 'ear', goals: ['clean lead'] }
];

test('ranks weak skills and due reviews with visible evidence components', () => {
  const ranked = RecommendationEngine.rank({
    week: 13,
    goals: ['clean lead'],
    skillLevels: { technique: 35, harmony: 82, ear: 64 },
    dueReviews: [{ skill: 'technique', exerciseId: 'bend-control' }],
    candidates
  });

  assert.equal(ranked[0].id, 'bend-control');
  assert.deepEqual(ranked[0].components, {
    weakSkill: 65,
    dueReview: 40,
    coursePhase: 15,
    goal: 20,
    diversity: 0
  });
  assert.equal(ranked[0].total, 140);
  assert.match(ranked[0].reasons.join(' '), /technique is currently weaker/i);
  assert.match(ranked[0].reasons.join(' '), /due review/i);
});

test('accepts candidates in the published one-argument context contract', () => {
  const context = { week: 13, candidates, goals: ['changes'], skillLevels: { technique: 90, harmony: 20 } };
  assert.deepEqual(RecommendationEngine.rank(context), RecommendationEngine.rank({ ...context }, candidates));
});

test('uses a deterministic diversity penalty without hiding why a candidate is lower', () => {
  const ranked = RecommendationEngine.rank({
    week: 13,
    recentSkills: ['technique'],
    skillLevels: { technique: 20, harmony: 30 },
    goals: ['changes']
  }, candidates);

  const technique = ranked.find((candidate) => candidate.id === 'bend-control');
  const harmony = ranked.find((candidate) => candidate.id === 'guide-tones');
  assert.equal(technique.components.diversity, -25);
  assert.match(technique.reasons.join(' '), /recently practiced/i);
  assert.ok(harmony.total > technique.total);
  assert.deepEqual(ranked, RecommendationEngine.rank({
    week: 13,
    recentSkills: ['technique'],
    skillLevels: { technique: 20, harmony: 30 },
    goals: ['changes']
  }, candidates));
});

test('rejects more than two selected goals before ranking', () => {
  assert.throws(() => RecommendationEngine.rank({ goals: ['a', 'b', 'c'] }, candidates), /two goals/i);
});
