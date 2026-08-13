import test from 'node:test'; import assert from 'node:assert/strict';
await import('../src/js/music-theory.js'); await import('../src/js/player-timeline.js'); await import('../src/js/bass-arranger.js');
const Bass = globalThis.BassArranger;
test('anchors slash bass and groups, approaches loop target, and bounds range/leaps', () => {
  const timeline = globalThis.PlayerTimeline.buildTimeline([{ chord: 'C/E', pulses: 2, section: 'A' }, { chord: 'F7', pulses: 2, section: 'A' }], 100, { numerator: 4, denominator: 4, groups: [2, 2] });
  const events = Bass.arrange(timeline, { seed: 3, loop: true });
  assert.equal(events[0].notes[0] % 12, 4); assert.ok(events.every((event) => event.notes[0] >= 28 && event.notes[0] <= 52));
  assert.ok(events.slice(1).every((event, index) => Math.abs(event.notes[0] - events[index].notes[0]) <= 12)); assert.equal(events.at(-1).role, 'approach');
  assert.ok(events.some((event) => event.role === 'group-anchor'));
});
