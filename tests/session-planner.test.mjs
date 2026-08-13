import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/session-planner.js');
const SessionPlanner = globalThis.SessionPlanner;

const candidates = [
  { id: 'technique', title: 'Clean technique', skill: 'technique', tempo: 92, backing: { trackId: 'e-dorian-fusion', loop: 'A' } },
  { id: 'rhythm', title: 'Rhythm and groove', skill: 'rhythm', tempo: 104, backing: { trackId: 'a-mixolydian-funk', loop: 'full' } },
  { id: 'ear', title: 'Ear and transcription', skill: 'ear', tempo: 72, backing: { trackId: 'f-emotional-changes', loop: 'B' } }
];

test('creates exact safe practice and rest totals for every supported duration', () => {
  const expectedRest = new Map([[30, 0], [60, 5], [90, 10], [120, 15]]);
  for (const [durationMinutes, restMinutes] of expectedRest) {
    const plan = SessionPlanner.plan({ durationMinutes, week: 9, goals: ['clean lead'], candidates, seed: 'same-day' });
    assert.equal(plan.blocks.reduce((total, block) => total + block.minutes, 0), durationMinutes);
    assert.equal(plan.blocks.filter((block) => block.type === 'rest').reduce((total, block) => total + block.minutes, 0), restMinutes);
    assert.ok(plan.blocks.filter((block) => block.type === 'practice').every((block) => block.minutes > 0));
    let uninterruptedPractice = 0;
    for (const block of plan.blocks) {
      uninterruptedPractice = block.type === 'rest' ? 0 : uninterruptedPractice + block.minutes;
      assert.ok(uninterruptedPractice <= 35, `${durationMinutes}-minute plan needs a rest before 35 practice minutes`);
    }
  }
});

test('keeps candidate tempo and backing settings editable in the output plan', () => {
  const plan = SessionPlanner.plan({ durationMinutes: 30, week: 4, goals: ['clean lead'], candidates, seed: 'one' });
  const practice = plan.blocks.find((block) => block.type === 'practice');
  assert.equal(practice.tempo, 92);
  assert.deepEqual(practice.backing, { trackId: 'e-dorian-fusion', loop: 'A' });
  practice.backing.loop = 'changed';
  assert.equal(candidates[0].backing.loop, 'A');
});

test('gives repeated candidate blocks unique checklist instance IDs', () => {
  const oneCandidate = [{ id: 'repeat-me', title: 'Repeat me', skill: 'technique' }];
  const plan = SessionPlanner.plan({ durationMinutes: 120, week: 4, candidates: oneCandidate, seed: 'repeat' });
  const practice = plan.blocks.filter((block) => block.type === 'practice');
  assert.ok(practice.length > 1);
  assert.equal(new Set(practice.map((block) => block.id)).size, practice.length);
  assert.deepEqual(new Set(practice.map((block) => block.candidateId)), new Set(['repeat-me']));
});

test('gives every practice and rest block globally unique IDs with adversarial candidate IDs', () => {
  const adversarialCandidates = [
    { id: 'rest-1', title: 'Looks like a rest', skill: 'technique' },
    { id: 'x', title: 'First x', skill: 'rhythm' },
    { id: 'x-2', title: 'Looks like repeat x', skill: 'ear' }
  ];
  const plan = SessionPlanner.plan({ durationMinutes: 120, week: 4, candidates: adversarialCandidates, seed: 'adversarial' });
  assert.equal(new Set(plan.blocks.map((block) => block.id)).size, plan.blocks.length);
  assert.equal(plan.blocks.find((block) => block.type === 'practice' && block.candidateId === 'rest-1').candidateId, 'rest-1');
});

test('deeply isolates nested backing settings from source candidates', () => {
  const nestedCandidates = [{ id: 'nested', title: 'Nested', skill: 'harmony', backing: { loop: { bars: [1, 2] }, progression: [{ chord: 'Dm7' }] } }];
  const plan = SessionPlanner.plan({ durationMinutes: 30, week: 4, candidates: nestedCandidates, seed: 'nested' });
  const practice = plan.blocks.find((block) => block.type === 'practice');
  practice.backing.loop.bars.push(3);
  practice.backing.progression[0].chord = 'G7';
  assert.deepEqual(nestedCandidates[0].backing, { loop: { bars: [1, 2] }, progression: [{ chord: 'Dm7' }] });
});

test('uses a seed to make the same plan repeat exactly', () => {
  const input = { durationMinutes: 90, week: 14, goals: ['clean lead', 'changes'], candidates, seed: '2026-08-12' };
  assert.deepEqual(SessionPlanner.plan(input), SessionPlanner.plan(input));
  assert.throws(() => SessionPlanner.plan({ ...input, goals: ['a', 'b', 'c'] }), /two goals/i);
});
