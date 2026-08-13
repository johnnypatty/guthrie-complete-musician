import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/course-data.js');
await import('../src/js/session-planner.js');
await import('../src/js/practice-engine.js');
const PracticeEngine = globalThis.PracticeEngine;

test('maps boundary weeks to all six phases', () => {
  assert.equal(PracticeEngine.getPhase(1).name, 'Control and baseline');
  assert.equal(PracticeEngine.getPhase(5).name, 'Vocabulary and articulation');
  assert.equal(PracticeEngine.getPhase(9).name, 'Changes and groove');
  assert.equal(PracticeEngine.getPhase(13).name, 'Fusion language');
  assert.equal(PracticeEngine.getPhase(17).name, 'Advanced technique in music');
  assert.equal(PracticeEngine.getPhase(21).name, 'Personal voice and performance');
});

test('builds exact 90 and 120 minute complete sessions', () => {
  const core = PracticeEngine.buildSession(90, 1);
  const standard = PracticeEngine.buildSession(120, 12);
  assert.equal(core.reduce((sum, block) => sum + block.minutes, 0), 90);
  assert.equal(standard.reduce((sum, block) => sum + block.minutes, 0), 120);
  for (const id of ['prepare', 'technique', 'rhythm', 'ear', 'harmony', 'improv', 'review']) {
    assert.ok(core.some((block) => block.id === id), `missing ${id}`);
  }
  assert.ok(standard.some((block) => block.id === 'repertoire'));
  assert.ok(standard.some((block) => block.id === 'phrase-lab'));
});

test('delegates all supported duration plans to the session planner compatibility facade', () => {
  for (const minutes of [30, 60, 90, 120]) {
    const session = PracticeEngine.buildSession(minutes, 9);
    assert.equal(session.reduce((sum, block) => sum + block.minutes, 0), minutes);
    assert.ok(session.every((block) => block.type === 'practice' || block.type === 'rest'));
    assert.equal(new Set(session.map((block) => block.instanceId)).size, session.length);
    assert.ok(session.filter((block) => block.type === 'practice').every((block) => block.id === block.candidateId));
  }
});

test('deterministic prompts repeat for the same seed', () => {
  assert.deepEqual(PracticeEngine.pickPrompt('week-7-tuesday'), PracticeEngine.pickPrompt('week-7-tuesday'));
});

test('rejects invalid week and duration', () => {
  assert.throws(() => PracticeEngine.getPhase(0), /week/i);
  assert.throws(() => PracticeEngine.buildSession(75, 1), /minutes/i);
  assert.throws(() => PracticeEngine.buildSession(90, 25), /week/i);
});
