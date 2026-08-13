import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/music-theory.js');
await import('../src/js/fretboard-engine.js');
const Fretboard = globalThis.FretboardEngine;

test('maps all 78 standard-tuning positions with stable IDs and octave invariants', () => {
  const positions = Fretboard.positions();
  assert.equal(positions.length, 78);
  assert.equal(new Set(positions.map((position) => position.id)).size, 78);
  for (let string = 1; string <= 6; string += 1) {
    const open = positions.find((position) => position.string === string && position.fret === 0);
    const octave = positions.find((position) => position.string === string && position.fret === 12);
    assert.equal(open.pitchClass, octave.pitchClass);
    assert.equal(octave.midi, open.midi + 12);
  }
});

test('spells enharmonics, intervals, triads, sevenths, guides, and current chord overlays', () => {
  assert.equal(Fretboard.noteName(1, true), 'Db');
  assert.equal(Fretboard.noteName(1, false), 'C#');
  const c = Fretboard.overlay({ root: 'C', chord: 'Cmaj7' });
  const pc = Object.fromEntries(c.legend.map((item) => [item.interval, item.pitchClass]));
  assert.deepEqual([pc['1'], pc['3'], pc['5'], pc['7']], [0, 4, 7, 11]);
  assert.ok(c.positions.some((position) => position.isChordTone && position.isGuideTone));
  assert.ok(c.positions.every((position) => position.interval));
});
