import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/session-runner.js');
await import('../src/js/session-controller.js');
const Controller = globalThis.SessionController;

const plan = {
  durationMinutes: 2, week: 3, goals: ['ear'], seed: 'controller',
  blocks: [
    { id: 'plan-1', candidateId: 'ear', type: 'practice', title: 'Hear it', instruction: 'Sing first.', minutes: 1, tempo: 72 },
    { id: 'plan-2', type: 'rest', title: 'Rest', instruction: 'Release.', minutes: 1 }
  ]
};

test('drives a session with threshold-only announcements and conservative transport defaults', () => {
  let now = 0;
  const announcements = [];
  const states = [];
  const timers = [];
  const controller = Controller.create({
    plan,
    reason: 'Ear review is due today.',
    now: () => now,
    setInterval(callback) { timers.push(callback); return timers.length; },
    clearInterval() {},
    onChange(state) { states.push(state.status); },
    announce(message) { announcements.push(message); }
  });
  assert.equal(controller.view().reason, 'Ear review is due today.');
  assert.equal(controller.view().activeBlock.title, 'Hear it');
  assert.equal(controller.view().audioEnabled, false);
  assert.equal(controller.view().inputEnabled, false);
  controller.start();
  now = 49_000; timers[0]();
  now = 50_000; timers[0]();
  now = 51_000; timers[0]();
  assert.equal(announcements.filter((message) => /ten seconds/i.test(message)).length, 1);
  now = 60_000; timers[0]();
  assert.equal(controller.view().status, 'rating');
  assert.equal(announcements.filter((message) => /rate/i.test(message)).length, 1);
  assert.ok(states.length >= 3);
});

test('persists paused boundary recovery, never auto-resumes, and clears it on explicit end', () => {
  let saved = null;
  const controller = Controller.create({
    plan,
    recovered: null,
    now: () => 0,
    setInterval() { return 1; }, clearInterval() {},
    persist(value) { saved = value; }
  });
  controller.start();
  controller.pause();
  assert.equal(saved.status, undefined);
  const restored = Controller.create({ plan, recovered: saved, now: () => 10, setInterval() { throw new Error('must not resume'); }, clearInterval() {} });
  assert.equal(restored.view().status, 'paused');
  restored.end();
  assert.equal(restored.view().status, 'ended');
});

test('records editable recommendation decisions without hiding their reason', () => {
  const recommendation = { id: 'rec-1', reason: 'Rhythm evidence is weakest.', durationMinutes: 60, goals: ['rhythm'] };
  const edited = Controller.recommendationDecision(recommendation, 'edited', { durationMinutes: 30 }, 100);
  const postponed = Controller.recommendationDecision(recommendation, 'postponed', {}, 200);
  const rejected = Controller.recommendationDecision(recommendation, 'rejected', { note: 'Working on repertoire today.' }, 300);
  assert.equal(edited.durationMinutes, 30);
  assert.equal(edited.reason, recommendation.reason);
  assert.equal(postponed.action, 'postponed');
  assert.equal(rejected.note, 'Working on repertoire today.');
  assert.throws(() => Controller.recommendationDecision(recommendation, 'accepted', { goals: ['a', 'b', 'c'] }, 400), /two goals/i);
});

test('review exposes active-block-only data until the user explicitly ends', () => {
  const controller = Controller.create({ plan, now: () => 0, setInterval() { return 1; }, clearInterval() {} });
  const view = controller.view();
  assert.equal(view.activeBlock.id, 'plan-1');
  assert.equal('blocks' in view, false);
  assert.equal(controller.review(), null);
  controller.end();
  assert.ok(controller.review());
});

test('persists an automatically completed rest boundary before waiting on the next block', () => {
  let now = 0;
  let saved = null;
  const timers = [];
  const restPlan = { durationMinutes: 2, week: 3, goals: [], seed: 'rest', blocks: [
    { id: 'plan-1', type: 'rest', title: 'Rest', instruction: 'Release.', minutes: 1 },
    { id: 'plan-2', candidateId: 'ear', type: 'practice', title: 'Hear it', instruction: 'Sing.', minutes: 1 }
  ] };
  const controller = Controller.create({ plan: restPlan, now: () => now, setInterval(callback) { timers.push(callback); return 1; }, clearInterval() {}, persist(value) { saved = value; } });
  controller.start();
  now = 60_000;
  timers[0]();
  assert.equal(controller.view().activeIndex, 1);
  assert.equal(controller.view().status, 'paused');
  assert.equal(saved.activeIndex, 1);
  assert.deepEqual(saved.results.map((result) => result.rating), ['rested']);
});
