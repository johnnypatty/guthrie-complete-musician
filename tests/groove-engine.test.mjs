import test from 'node:test'; import assert from 'node:assert/strict';
await import('../src/js/music-theory.js'); await import('../src/js/player-timeline.js'); await import('../src/js/voicing-engine.js'); await import('../src/js/bass-arranger.js'); await import('../src/js/groove-patterns.js'); await import('../src/js/groove-engine.js');
const Groove = globalThis.GrooveEngine;
for (const id of ['fusion', 'funk', 'rock', 'ballad', 'neo-soul', 'ambient', 'changes', 'metronome']) test(`${id} compiles sorted bounded semantic events`, () => {
  const timeline = globalThis.PlayerTimeline.buildTimeline([{ chord: 'Em7', pulses: 2, section: 'A' }, { chord: 'Cmaj7', pulses: 2, section: 'A' }, { chord: 'D', pulses: 3, section: 'A' }], 120, { numerator: 7, denominator: 8, groups: [2, 2, 3], tempoUnit: 8 });
  const first = Groove.compile(timeline, { groove: id, seed: 4, loopStartTick: 0, loopEndTick: timeline.totalTicks }); const second = Groove.compile(timeline, { groove: id, seed: 4, loopStartTick: 0, loopEndTick: timeline.totalTicks });
  assert.deepEqual(first, second); assert.ok(first.every((event, index) => event.tick >= 0 && event.tick < timeline.totalTicks && (!index || event.tick >= first[index - 1].tick))); assert.ok(first.every((event) => Math.abs(event.offsetSeconds) <= 0.012 && event.velocity >= 0.2 && event.velocity <= 1));
  assert.ok(first.some((event) => event.tick === 0)); assert.ok(first.some((event) => event.tick === 96)); assert.ok(first.some((event) => event.tick === 192));
});
