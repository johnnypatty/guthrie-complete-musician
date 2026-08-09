import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/music-theory.js');
const MusicTheory = globalThis.MusicTheory;

test('builds common C chord qualities with useful spelling', () => {
  const expected = {
    '': ['C', 'E', 'G'], m: ['C', 'Eb', 'G'], dim: ['C', 'Eb', 'Gb'], aug: ['C', 'E', 'G#'],
    sus2: ['C', 'D', 'G'], sus4: ['C', 'F', 'G'], maj7: ['C', 'E', 'G', 'B'],
    '7': ['C', 'E', 'G', 'Bb'], m7: ['C', 'Eb', 'G', 'Bb'], m7b5: ['C', 'Eb', 'Gb', 'Bb'],
    dim7: ['C', 'Eb', 'Gb', 'A'], add9: ['C', 'E', 'G', 'D'], '9': ['C', 'E', 'G', 'Bb', 'D'],
    '13': ['C', 'E', 'G', 'Bb', 'D', 'F', 'A']
  };
  for (const [quality, notes] of Object.entries(expected)) {
    assert.deepEqual(MusicTheory.buildChord('C', quality), notes, quality || 'major');
  }
});

test('parses and transposes roots, qualities, and slash basses', () => {
  assert.deepEqual(MusicTheory.parseChord('F#m7/C#'), { root: 'F#', quality: 'm7', bass: 'C#' });
  assert.equal(MusicTheory.transposeChord('Bbmaj7', 2), 'Cmaj7');
  assert.equal(MusicTheory.transposeChord('F#m7/C#', -2), 'Em7/B');
});

test('returns chord tones and third/seventh guide tones with correct spelling', () => {
  assert.deepEqual(MusicTheory.getTargetTones('G7'), {
    chordTones: ['G', 'B', 'D', 'F'], guideTones: ['B', 'F']
  });
  assert.deepEqual(MusicTheory.getTargetTones('Bbmaj7'), {
    chordTones: ['Bb', 'D', 'F', 'A'], guideTones: ['D', 'A']
  });
  assert.deepEqual(MusicTheory.getTargetTones('F#m7/C#'), {
    chordTones: ['F#', 'A', 'C#', 'E'], guideTones: ['A', 'E']
  });
  assert.deepEqual(MusicTheory.getTargetTones('Dsus4'), {
    chordTones: ['D', 'G', 'A'], guideTones: ['G']
  });
});

test('rejects invalid roots and unsupported qualities', () => {
  assert.throws(() => MusicTheory.buildChord('H', 'm7'), /root/i);
  assert.throws(() => MusicTheory.getTargetTones('Cmystery'), /quality/i);
});
