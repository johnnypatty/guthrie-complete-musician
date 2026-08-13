import test from 'node:test';
import assert from 'node:assert/strict';
await import('../src/js/skill-model.js');
const SkillModel = globalThis.SkillModel;

test('uses transparent 50/30/20 evidence and renormalizes missing categories', () => {
  const now = Date.parse('2026-08-13T12:00:00Z');
  const summary = SkillModel.summarize([
    { skill: 'technique', type: 'self', value: 80, at: '2026-08-12T12:00:00Z' },
    { skill: 'technique', type: 'assessment', value: 60, at: '2026-08-13T10:00:00Z' },
    { skill: 'technique', type: 'signal', value: 90, valid: true, at: '2026-08-13T11:00:00Z' }
  ], { now });
  assert.equal(summary.technique.score, 76);
  assert.equal(summary.technique.evidenceCount, 3);
  assert.equal(summary.technique.confidence, 'developing');
  const sparse = SkillModel.summarize([{ skill: 'ear', type: 'self', value: 70, at: '2026-08-13T11:00:00Z' }], { now });
  assert.equal(sparse.ear.score, 70);
  assert.equal(sparse.ear.confidence, 'low');
});

test('keeps a 28-day rollup, valid trends, and all seven musician skills', () => {
  const now = Date.parse('2026-08-13T12:00:00Z');
  const summary = SkillModel.summarize([
    { skill: 'rhythm', type: 'signal', metric: 'timingMs', value: 42, valid: true, at: '2026-08-01T12:00:00Z' },
    { skill: 'rhythm', type: 'signal', metric: 'timingMs', value: 25, valid: true, at: '2026-08-13T11:00:00Z' },
    { skill: 'rhythm', type: 'signal', metric: 'timingMs', value: 5, valid: false, at: '2026-08-13T11:30:00Z' }
  ], { now });
  assert.deepEqual(Object.keys(summary), ['technique', 'rhythm', 'ear', 'harmony', 'improvisation', 'repertoire', 'performance']);
  assert.deepEqual(summary.rhythm.trends.timingMs, [42, 25]);
  assert.equal(summary.rhythm.rollup28Days.length, 2);
});
