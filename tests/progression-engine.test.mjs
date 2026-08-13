import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/music-theory.js');
await import('../src/js/player-timeline.js');
await import('../src/js/progression-engine.js');
await import('../src/js/course-data.js');
const Progression = globalThis.ProgressionEngine;

test('validates exact grouped 7/8 bars, section/bar loops, and supported values', () => {
  const preset = Progression.normalize({
    id: 'seven', name: 'Seven', tempo: 120, meter: { numerator: 7, denominator: 8, groups: [2, 2, 3], tempoUnit: 8 }, groove: 'fusion',
    events: [{ chord: 'Em7', pulses: 2, section: 'A' }, { chord: 'Cmaj7', pulses: 2, section: 'A' }, { chord: 'D', pulses: 3, section: 'A' }]
  });
  assert.equal(preset.timeline.totalTicks, 336);
  assert.deepEqual(Progression.loopBounds(preset, { section: 'A' }), { startTick: 0, endTick: 336 });
  assert.deepEqual(Progression.loopBounds(preset, { startBar: 1, endBar: 1 }), { startTick: 0, endTick: 336 });
});

test('enforces custom bounds and full-bar totals without mutating invalid imports', () => {
  const base = { id: 'x', name: 'Original', tempo: 80, meter: { numerator: 4, denominator: 4 }, groove: 'rock', events: [{ chord: 'Cmaj7', pulses: 4, section: 'A' }] };
  assert.throws(() => Progression.normalize({ ...base, tempo: 39 }), /tempo/i);
  assert.throws(() => Progression.normalize({ ...base, events: [] }), /1.*64/i);
  assert.throws(() => Progression.normalize({ ...base, events: Array.from({ length: 65 }, () => base.events[0]) }), /1.*64/i);
  assert.throws(() => Progression.normalize({ ...base, events: [{ chord: 'Cmaj7', pulses: 3, section: 'A' }] }), /full bar/i);
  assert.throws(() => Progression.normalize({ ...base, groove: 'unknown' }), /groove/i);
  const text = JSON.stringify({ ...base, events: [{ chord: 'Nope', pulses: 4, section: 'A' }] });
  const before = structuredClone(base);
  assert.throws(() => Progression.importPreset(text, base), /chord/i);
  assert.deepEqual(base, before);
});

test('ramps only after clean self evidence or valid timing and supports undo', () => {
  const preset = Progression.normalize({ id: 'r', name: 'Ramp', tempo: 80, meter: { numerator: 4, denominator: 4 }, groove: 'funk', events: [{ chord: 'A7', pulses: 4, section: 'A' }] });
  assert.equal(Progression.ramp(preset, { clean: false }).tempo, 80);
  const raised = Progression.ramp(preset, { clean: true, step: 4 });
  assert.equal(raised.tempo, 84);
  assert.equal(Progression.undoRamp(raised).tempo, 80);
  assert.equal(Progression.ramp(preset, { timing: { status: 'valid', meanAbsoluteErrorMs: 20 }, step: 3 }).tempo, 83);
});

test('compiles every curated track through stable normalization', () => {
  for (const track of globalThis.CourseData.tracks) {
    const preset = Progression.fromTrack(track);
    assert.ok(preset.timeline.totalTicks > 0, track.id);
    assert.ok(Progression.GROOVES.includes(preset.groove), track.id);
  }
});
