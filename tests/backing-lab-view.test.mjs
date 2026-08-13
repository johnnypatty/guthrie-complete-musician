import test from 'node:test';
import assert from 'node:assert/strict';
await import('../src/js/backing-lab-view.js');

test('parses a readable custom progression and rejects malformed lines', () => {
  assert.deepEqual(globalThis.BackingLabView.parseLines('Dm7 | 4 | A\nG7 | 4 | B'), [
    { chord: 'Dm7', pulses: 4, section: 'A' }, { chord: 'G7', pulses: 4, section: 'B' }
  ]);
  assert.throws(() => globalThis.BackingLabView.parseLines('Dm7 | nope'), /pulse/i);
});

test('formats portable progression text without hidden fields', () => {
  assert.equal(globalThis.BackingLabView.formatLines([{ chord: 'Cmaj7', pulses: 3, section: 'Verse' }]), 'Cmaj7 | 3 | Verse');
});
