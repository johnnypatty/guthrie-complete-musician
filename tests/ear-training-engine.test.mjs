import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/ear-training-engine.js');
const Ear = globalThis.EarTrainingEngine;

test('seeded prompts repeat and stay in practical guitar/listening ranges', () => {
  for (const type of ['note-match', 'interval', 'triad', 'chord-tone', 'call-response']) {
    const first = Ear.prompt({ type, seed: 42 });
    const second = Ear.prompt({ type, seed: 42 });
    assert.deepEqual(first, second);
    assert.ok(first.notes.every((midi) => midi >= 48 && midi <= 76), `${type}`);
    assert.ok(first.replayLimit >= 1 && first.replayLimit <= 3);
  }
});

test('evaluates interval and triad answers with explanations and review items', () => {
  const interval = { id: 'i', type: 'interval', answer: 'major 3rd', notes: [60, 64], explanation: 'Four semitones.' };
  assert.equal(Ear.evaluate(interval, 'major 3rd').correct, true);
  const missed = Ear.evaluate(interval, 'minor 3rd');
  assert.equal(missed.correct, false);
  assert.match(missed.feedback, /Four semitones/i);
  assert.equal(missed.reviewItem.answer, 'major 3rd');

  const triad = Ear.prompt({ type: 'triad', seed: 9 });
  assert.ok(['major', 'minor', 'diminished', 'augmented'].includes(triad.answer));
});

test('self-confirm and optional pitch match remain valid without an input', () => {
  const prompt = Ear.prompt({ type: 'note-match', seed: 3 });
  assert.equal(Ear.selfConfirm(prompt, true).correct, true);
  assert.equal(Ear.pitchMatch(prompt, { status: 'insufficient', reason: 'low-confidence' }).status, 'self-confirm-required');
  const targetHz = 440 * 2 ** ((prompt.notes[0] - 69) / 12);
  assert.equal(Ear.pitchMatch(prompt, { status: 'ready', frequency: targetHz, confidence: 0.95 }).status, 'matched');
});
