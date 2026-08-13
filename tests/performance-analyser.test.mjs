import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/performance-analyser.js');
const Analyser = globalThis.PerformanceAnalyser;

function frames(durationMs, stepMs, make) {
  const output = [];
  for (let timeMs = 0; timeMs <= durationMs; timeMs += stepMs) output.push({ timeMs, confidence: 0.95, clipping: false, rms: 0.2, ...make(timeMs) });
  return output;
}

test('measures stable sustain after the frozen 300ms gate', () => {
  const result = Analyser.sustain(frames(600, 25, (time) => ({ cents: [0, 2, -2, 1][(time / 25) % 4] })));
  assert.equal(result.status, 'valid');
  assert.equal(result.durationMs, 600);
  assert.ok(result.medianAbsoluteDeviationCents <= 2);
});

test('measures final bend error, overshoot, and settling', () => {
  const clean = Analyser.bend(frames(800, 25, (time) => ({ cents: Math.min(100, time / 5) })), 100);
  assert.equal(clean.status, 'valid');
  assert.ok(Math.abs(clean.finalErrorCents) < 1);
  assert.equal(clean.overshootCents, 0);
  assert.ok(clean.settlingTimeMs >= 400 && clean.settlingTimeMs <= 550);

  const overshot = Analyser.bend(frames(900, 25, (time) => ({ cents: time < 300 ? time / 2.5 : (time < 500 ? 120 : 100) })), 100);
  assert.equal(overshot.status, 'valid');
  assert.ok(overshot.overshootCents >= 19);
  assert.ok(overshot.settlingTimeMs >= 500);
});

test('measures a 5Hz 60-cent peak-to-peak vibrato', () => {
  const result = Analyser.vibrato(frames(1000, 10, (time) => ({ cents: 30 * Math.sin(2 * Math.PI * 5 * time / 1000) })));
  assert.equal(result.status, 'valid');
  assert.ok(Math.abs(result.rateHz - 5) < 0.3, `${result.rateHz}`);
  assert.ok(result.widthCents > 58 && result.widthCents < 62, `${result.widthCents}`);
  assert.ok(result.cycles >= 4.5);
});

test('pairs onsets to nearest scheduled time and reports early/late direction', () => {
  const result = Analyser.timing([980, 2025, 2998], [1000, 2000, 3000]);
  assert.equal(result.status, 'valid');
  assert.deepEqual(result.errorsMs, [-20, 25, -2]);
  assert.deepEqual(result.directions, ['early', 'late', 'early']);
  assert.equal(result.meanAbsoluteErrorMs, 15.67);
});

test('calibrates noise floor and labels broadband string-noise as experimental', () => {
  const floor = Analyser.noiseFloor(frames(500, 25, () => ({ rms: 0.008, cents: null })));
  assert.equal(floor.status, 'valid');
  assert.equal(floor.rms, 0.008);

  const transients = frames(500, 25, (time) => ({
    cents: null,
    inNoteWindow: time >= 200 && time <= 350,
    onsetCandidate: [50, 150, 425].includes(time),
    highBandRatio: [50, 150, 425].includes(time) ? 0.8 : 0.05,
    noiseFloorRms: 0.008
  }));
  const result = Analyser.stringNoise(transients);
  assert.equal(result.status, 'valid');
  assert.equal(result.experimental, true);
  assert.equal(result.transientCount, 3);
  assert.ok(result.ratio > 0 && result.ratio <= 1);
  assert.equal(result.maximumTechniqueWeight, 0.1);
});

test('suppresses invalid measurements with specific reasons', () => {
  assert.equal(Analyser.sustain(frames(250, 25, () => ({ cents: 0 }))).reason, 'note-too-short');
  assert.equal(Analyser.vibrato(frames(400, 10, (time) => ({ cents: 30 * Math.sin(2 * Math.PI * 5 * time / 1000) }))).reason, 'fewer-than-three-cycles');
  assert.equal(Analyser.vibrato(frames(1000, 10, (time) => ({ cents: 30 * Math.sin(2 * Math.PI * 2 * time / 1000) }))).reason, 'rate-out-of-range');
  assert.equal(Analyser.sustain(frames(500, 25, () => ({ cents: 0, clipping: true }))).reason, 'clipping');
  assert.equal(Analyser.sustain(frames(500, 25, () => ({ cents: 0, confidence: 0.4 }))).reason, 'low-confidence');
  assert.equal(Analyser.stringNoise(frames(500, 25, () => ({ onsetCandidate: true, highBandRatio: 0.9, inNoteWindow: false }))).reason, 'missing-calibration');
  assert.equal(Analyser.noiseFloor([]).reason, 'missing-calibration');
});
