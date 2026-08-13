import test from 'node:test';
import assert from 'node:assert/strict';
await import('../src/js/music-theory.js'); await import('../src/js/voicing-engine.js');
const Voicing = globalThis.VoicingEngine;
test('voice-leads guide tones cyclically in range with common-tone retention', () => {
  const symbols = ['Cmaj7', 'Am7', 'Dm7', 'G7'];
  const voices = Voicing.arrange(symbols, { low: 48, high: 76, seed: 4 });
  assert.equal(voices.length, 4); assert.ok(voices.flat().every((midi) => midi >= 48 && midi <= 76));
  const motion = Voicing.motion(voices); const roots = Voicing.motion(symbols.map((symbol) => [48 + globalThis.MusicTheory.describeChord(symbol).rootPitchClass]));
  assert.ok(motion < roots + 36);
  assert.ok(voices.some((voice, index) => index && voice.some((note) => voices[index - 1].includes(note))));
});
test('handles C13 priority, sus, power, and diminished chords deterministically', () => {
  const symbols = ['C13', 'Fsus4', 'G5', 'Bdim7']; const first = Voicing.arrange(symbols, { seed: 9 }); const second = Voicing.arrange(symbols, { seed: 9 });
  assert.deepEqual(first, second); assert.ok(first[0].some((midi) => midi % 12 === 4)); assert.ok(first[0].some((midi) => midi % 12 === 10)); assert.ok(first.every((voice) => voice.length >= 2 && voice.length <= 5));
});
