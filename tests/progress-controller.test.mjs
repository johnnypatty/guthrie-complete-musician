import test from 'node:test';
import assert from 'node:assert/strict';
await import('../src/js/skill-model.js'); await import('../src/js/progress-controller.js');

test('projects due reviews, unfinished repertoire, evidence, and text chart rows', () => {
  const state = { skillObservations: [{ skill: 'ear', type: 'self', value: 55, at: '2026-08-13T10:00:00Z' }], reviewItems: [{ id: 'r1', dueAt: '2026-08-12T10:00:00Z' }], attempts: [{ id: 'song-1', title: 'Melody', complete: false }], recommendations: [] };
  const controller = globalThis.ProgressController.create({ state, now: Date.parse('2026-08-13T12:00:00Z') });
  const view = controller.project();
  assert.equal(view.dueReviews.length, 1); assert.equal(view.unfinishedRepertoire.length, 1);
  assert.ok(view.chartRows.some((row) => row.skill === 'ear' && row.score === 55));
  controller.decide({ id: 'ear-review', action: 'postpone', reason: 'Fresh ears tomorrow' });
  assert.equal(state.recommendations[0].action, 'postpone');
});
