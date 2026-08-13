import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/pitch-detector.js');
const Detector = globalThis.PitchDetector;

const RATE = 48000;
function sine(frequency, length = 8192, level = 0.65) {
  return Float32Array.from({ length }, (_, index) => level * Math.sin(2 * Math.PI * frequency * index / RATE));
}
function centsFrequency(frequency, cents) { return frequency * (2 ** (cents / 1200)); }

for (const [frequency, note] of [[82.41, 'E2'], [110, 'A2'], [220, 'A3'], [440, 'A4']]) {
  test(`detects ${frequency} Hz as ${note} with usable confidence`, () => {
    const result = Detector.analyse(sine(frequency), RATE);
    assert.equal(result.status, 'ready');
    assert.equal(result.note, note);
    assert.ok(Math.abs(result.frequency - frequency) < 0.7, `${result.frequency}`);
    assert.ok(Math.abs(result.cents) < 4, `${result.cents}`);
    assert.ok(result.confidence >= 0.8);
  });
}

for (const cents of [-25, 25]) {
  test(`reports a ${cents > 0 ? '+' : ''}${cents}-cent offset`, () => {
    const result = Detector.analyse(sine(centsFrequency(220, cents)), RATE);
    assert.equal(result.status, 'ready');
    assert.ok(Math.abs(result.cents - cents) < 4, `${result.cents}`);
  });
}

test('confidence gates silence, clipping, noise, and out-of-range input with reasons', () => {
  const silence = Detector.analyse(new Float32Array(4096), RATE);
  assert.deepEqual([silence.status, silence.reason], ['insufficient', 'level-too-low']);

  const clipped = Detector.analyse(Float32Array.from({ length: 4096 }, (_, i) => i % 2 ? 1 : -1), RATE);
  assert.deepEqual([clipped.status, clipped.reason], ['insufficient', 'clipping']);

  let seed = 7;
  const noise = Float32Array.from({ length: 8192 }, () => {
    seed = (seed * 16807) % 2147483647;
    return ((seed / 2147483647) * 2 - 1) * 0.35;
  });
  const noisy = Detector.analyse(noise, RATE);
  assert.deepEqual([noisy.status, noisy.reason], ['insufficient', 'low-confidence']);

  const low = Detector.analyse(sine(45), RATE);
  assert.deepEqual([low.status, low.reason], ['insufficient', 'frequency-out-of-range']);
});

test('uses calibrated noise floor and rejects malformed frames safely', () => {
  assert.equal(Detector.analyse(sine(220, 4096, 0.003), RATE, { noiseFloorRms: 0.002 }).reason, 'level-too-low');
  assert.equal(Detector.analyse([], RATE).reason, 'invalid-input');
  assert.equal(Detector.analyse(sine(220), 0).reason, 'invalid-input');
});
