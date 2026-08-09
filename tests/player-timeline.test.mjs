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
  assert.throws(() => PlayerTimeline.buildTimeline(progression, 49, 4), /tempo/i);
  assert.throws(() => PlayerTimeline.buildTimeline(progression, 221, 4), /tempo/i);
  assert.throws(() => PlayerTimeline.remapBeat(1, 0, 8), /total/i);
});
