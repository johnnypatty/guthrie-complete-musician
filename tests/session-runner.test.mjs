import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/session-runner.js');
const Runner = globalThis.SessionRunner;

const plan = {
  durationMinutes: 3,
  week: 4,
  goals: ['rhythm'],
  seed: 'runner',
  blocks: [
    { id: 'plan-1', candidateId: 'rhythm', type: 'practice', title: 'Pocket', instruction: 'Play behind the click.', minutes: 1 },
    { id: 'plan-2', type: 'rest', title: 'Rest', instruction: 'Release your hands.', minutes: 1 },
    { id: 'plan-3', candidateId: 'ear', type: 'practice', title: 'Sing first', instruction: 'Sing then play.', minutes: 1 }
  ]
};

test('enters a visible final-ten-second state and pauses without losing elapsed time', () => {
  let state = Runner.create(plan);
  state = Runner.transition(state, { type: 'START' }, 1_000);
  state = Runner.transition(state, { type: 'TICK' }, 51_000);
  assert.equal(state.status, 'running');
  assert.equal(state.remainingMs, 10_000);
  assert.equal(state.finalTen, true);

  state = Runner.transition(state, { type: 'PAUSE' }, 55_000);
  assert.equal(state.status, 'paused');
  assert.equal(state.remainingMs, 6_000);
  state = Runner.transition(state, { type: 'RESUME' }, 80_000);
  assert.equal(state.status, 'running');
  assert.equal(state.remainingMs, 6_000);
});

test('rates practice, runs scheduled rest, and reaches the following block paused', () => {
  let state = Runner.transition(Runner.create(plan), { type: 'START' }, 0);
  state = Runner.transition(state, { type: 'TICK' }, 60_000);
  assert.equal(state.status, 'rating');
  state = Runner.transition(state, { type: 'RATE', rating: 'clean', note: 'Loose hands.' }, 60_100);
  assert.equal(state.activeIndex, 1);
  assert.equal(state.status, 'paused');
  state = Runner.transition(state, { type: 'RESUME' }, 70_000);
  state = Runner.transition(state, { type: 'TICK' }, 130_000);
  assert.equal(state.activeIndex, 2);
  assert.equal(state.status, 'paused');
  assert.deepEqual(state.results.map((result) => result.rating), ['clean', 'rested']);
});

test('supports restart, skip, explicit end, all ratings, and bounded notes', () => {
  for (const rating of ['clean', 'shaky', 'failed']) {
    let state = Runner.transition(Runner.create(plan), { type: 'START' }, 0);
    state = Runner.transition(state, { type: 'TICK' }, 60_000);
    const rated = Runner.transition(state, { type: 'RATE', rating, note: 'x'.repeat(280) }, 60_001);
    assert.equal(rated.results[0].rating, rating);
  }
  let state = Runner.transition(Runner.create(plan), { type: 'START' }, 0);
  state = Runner.transition(state, { type: 'TICK' }, 20_000);
  state = Runner.transition(state, { type: 'RESTART_BLOCK' }, 20_100);
  assert.equal(state.remainingMs, 60_000);
  assert.equal(state.status, 'paused');
  state = Runner.transition(state, { type: 'SKIP' }, 20_200);
  assert.equal(state.results[0].rating, 'skipped');
  state = Runner.transition(state, { type: 'END' }, 20_300);
  assert.equal(state.status, 'ended');
  assert.throws(() => Runner.transition(Runner.transition(Runner.transition(Runner.create(plan), { type: 'START' }, 0), { type: 'TICK' }, 60_000), { type: 'RATE', rating: 'clean', note: 'x'.repeat(281) }, 60_001), /280/);
});

test('pain permanently disables ramp eligibility for the session', () => {
  let state = Runner.transition(Runner.create(plan), { type: 'PAIN' }, 1_000);
  assert.equal(state.pain, true);
  assert.equal(state.rampEligible, false);
  assert.match(state.safetyMessage, /stop.*rest/i);
  state = Runner.transition(state, { type: 'START' }, 2_000);
  assert.equal(state.rampEligible, false);
});

test('recovery stores only a completed boundary and always restores paused', () => {
  let state = Runner.transition(Runner.create(plan), { type: 'START' }, 0);
  state = Runner.transition(state, { type: 'TICK' }, 60_000);
  state = Runner.transition(state, { type: 'RATE', rating: 'shaky', note: 'Rushes.' }, 60_001);
  state = Runner.transition(state, { type: 'RESUME' }, 70_000);
  state = Runner.transition(state, { type: 'TICK' }, 85_000);
  const saved = Runner.serializeRecovery(state);
  assert.equal(saved.activeIndex, 1);
  assert.equal('remainingMs' in saved, false);
  assert.equal('lastTickAt' in saved, false);
  const restored = Runner.restoreRecovery(saved);
  assert.equal(restored.status, 'paused');
  assert.equal(restored.activeIndex, 1);
  assert.equal(restored.remainingMs, 60_000);
  assert.deepEqual(restored.results.map((result) => result.rating), ['shaky']);
});

test('final review reports planned/completed minutes, ratings, pain, and a next action', () => {
  let state = Runner.transition(Runner.create(plan), { type: 'START' }, 0);
  state = Runner.transition(state, { type: 'TICK' }, 60_000);
  state = Runner.transition(state, { type: 'RATE', rating: 'failed', note: 'Too fast.' }, 60_001);
  state = Runner.transition(state, { type: 'END' }, 60_002);
  const review = Runner.review(state);
  assert.equal(review.plannedMinutes, 3);
  assert.equal(review.completedMinutes, 1);
  assert.deepEqual(review.ratings, { clean: 0, shaky: 0, failed: 1, skipped: 0 });
  assert.match(review.improvement, /Too fast|Pocket/);
  assert.ok(review.nextRecommendation.length > 0);
});
