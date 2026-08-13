import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/player-timeline.js');
const PlayerTimeline = globalThis.PlayerTimeline;

const progression = [
  { chord: 'Dm7', beats: 4, section: 'A' },
  { chord: 'G7', beats: 4, section: 'A' },
  { chord: 'Cmaj7', beats: 4, section: 'B' },
  { chord: 'Am7', beats: 2, section: 'B' },
  { chord: 'A7', beats: 2, section: 'B' }
];

test('builds beat and time boundaries at 120 BPM', () => {
  const timeline = PlayerTimeline.buildTimeline(progression, 120, 4);
  assert.deepEqual(timeline.events.map((event) => event.startBeat), [0, 4, 8, 12, 14]);
  assert.deepEqual(timeline.events.map((event) => event.startTime), [0, 2, 4, 6, 7]);
  assert.equal(timeline.totalBeats, 16);
  assert.equal(timeline.totalSeconds, 8);
});

test('uses left-closed right-open boundaries and wraps the end', () => {
  const timeline = PlayerTimeline.buildTimeline(progression, 60, 4);
  assert.equal(PlayerTimeline.eventAtBeat(timeline.events, 0).chord, 'Dm7');
  assert.equal(PlayerTimeline.eventAtBeat(timeline.events, 3.999).chord, 'Dm7');
  assert.equal(PlayerTimeline.eventAtBeat(timeline.events, 4).chord, 'G7');
  assert.equal(PlayerTimeline.eventAtBeat(timeline.events, 16).chord, 'Dm7');
});

test('wraps absolute beats inside a selected loop', () => {
  assert.equal(PlayerTimeline.loopBeat(8, 4, 12), 8);
  assert.equal(PlayerTimeline.loopBeat(12, 4, 12), 4);
  assert.equal(PlayerTimeline.loopBeat(15, 4, 12), 7);
  assert.equal(PlayerTimeline.loopBeat(2, 4, 12), 10);
});

test('reports event, bar, beat and progress in 4/4 and odd meter', () => {
  const common = PlayerTimeline.buildTimeline(progression, 100, 4);
  assert.deepEqual(PlayerTimeline.positionAtBeat(common, 5), {
    event: common.events[1], bar: 2, beatInBar: 2, progress: 5 / 16, normalizedBeat: 5
  });

  const odd = PlayerTimeline.buildTimeline([
    { chord: 'Em7', beats: 5, section: 'A' },
    { chord: 'A7', beats: 5, section: 'A' }
  ], 100, 5);
  const position = PlayerTimeline.positionAtBeat(odd, 7.5);
  assert.equal(position.event.chord, 'A7');
  assert.equal(position.bar, 2);
  assert.equal(position.beatInBar, 3.5);
  assert.equal(position.progress, 0.75);
});

test('remaps loop-relative position when loop length changes', () => {
  assert.equal(PlayerTimeline.remapBeat(4, 16, 8), 2);
  assert.equal(PlayerTimeline.remapBeat(15, 16, 32), 30);
  assert.equal(PlayerTimeline.remapBeat(16, 16, 8), 0);
});

test('rejects invalid tempo and remapping totals', () => {
  assert.doesNotThrow(() => PlayerTimeline.buildTimeline(progression, 40, 4));
  assert.doesNotThrow(() => PlayerTimeline.buildTimeline(progression, 240, 4));
  assert.throws(() => PlayerTimeline.buildTimeline(progression, 39, 4), /tempo/i);
  assert.throws(() => PlayerTimeline.buildTimeline(progression, 241, 4), /tempo/i);
  assert.throws(() => PlayerTimeline.remapBeat(1, 0, 8), /total/i);
});

test('uses PPQ ticks and eighth-note tempo for grouped 7/8 exactly', () => {
  const meter = { numerator: 7, denominator: 8, groups: [2, 2, 3], tempoUnit: 8 };
  const timeline = PlayerTimeline.buildTimeline([
    { chord: 'Em7', pulses: 2, section: 'A' },
    { chord: 'Cmaj7', pulses: 2, section: 'A' },
    { chord: 'D', pulses: 3, section: 'A' }
  ], 120, meter);
  assert.equal(PlayerTimeline.PPQ, 96);
  assert.equal(timeline.ticksPerPulse, 48);
  assert.equal(timeline.ticksPerBar, 336);
  assert.equal(timeline.totalTicks, 336);
  assert.equal(timeline.totalSeconds, 3.5);
  assert.deepEqual(timeline.events.map((event) => event.startTick), [0, 96, 192]);
  assert.deepEqual(timeline.groupTicks, [0, 96, 192]);
});

test('normalizes 3/4 and grouped 5/4 meters and keeps loops right-open', () => {
  assert.equal(PlayerTimeline.normalizeMeter({ numerator: 3, denominator: 4 }).ticksPerBar, 288);
  const five = PlayerTimeline.normalizeMeter({ numerator: 5, denominator: 4, groups: [3, 2] });
  assert.equal(five.ticksPerBar, 480);
  assert.deepEqual(five.groupTicks, [0, 288]);
  assert.equal(PlayerTimeline.loopTick(480, 0, 480), 0);
  assert.equal(PlayerTimeline.loopTick(479, 0, 480), 479);
});
