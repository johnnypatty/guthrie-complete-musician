import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/signal-features.js');
const Features = globalThis.SignalFeatures;
const RATE = 48000;

function sine(frequency, level = 0.5, length = 1024) {
  return Float32Array.from({ length }, (_, i) => level * Math.sin(2 * Math.PI * frequency * i / RATE));
}

test('returns finite level, peak, clipping, and zero-crossing values', () => {
  const result = Features.frame(sine(440), RATE);
  assert.ok(Math.abs(result.rms - Math.SQRT1_2 * 0.5) < 0.02);
  assert.ok(result.peak > 0.49 && result.peak <= 0.501);
  assert.equal(result.clippingRatio, 0);
  assert.ok(result.zeroCrossingRate > 0.01 && result.zeroCrossingRate < 0.03);
  Object.values(result).filter((value) => typeof value === 'number').forEach(Number.isFinite);
});

test('reports clipping by the frozen one-percent rule', () => {
  const samples = new Float32Array(1000).fill(0.1);
  for (let i = 0; i < 10; i += 1) samples[i] = 0.99;
  const result = Features.frame(samples, RATE);
  assert.equal(result.clippingRatio, 0.01);
  assert.equal(result.clipping, true);
});

test('separates high-frequency energy and supplies reusable flux inputs', () => {
  const low = Features.frame(sine(220), RATE);
  const high = Features.frame(sine(6000), RATE, { previousSpectrum: low.spectrum });
  assert.ok(low.highBandRatio < 0.15, `${low.highBandRatio}`);
  assert.ok(high.highBandRatio > 0.7, `${high.highBandRatio}`);
  assert.ok(high.spectralFlux > 0.2, `${high.spectralFlux}`);
  assert.ok(Array.isArray(high.spectrum));
});

test('onset candidates obey the 80ms refractory period', () => {
  const transient = sine(4000, 0.8);
  const previousSpectrum = new Array(257).fill(0);
  const first = Features.frame(transient, RATE, { previousSpectrum, timeMs: 1000, lastOnsetMs: 0 });
  const blocked = Features.frame(transient, RATE, { previousSpectrum, timeMs: 1050, lastOnsetMs: 1000 });
  assert.equal(first.onsetCandidate, true);
  assert.equal(blocked.onsetCandidate, false);
  assert.equal(blocked.onsetReason, 'refractory');
});

test('zero input remains finite and never triggers an onset', () => {
  const result = Features.frame(new Float32Array(512), RATE);
  assert.equal(result.rms, 0);
  assert.equal(result.spectralFlux, 0);
  assert.equal(result.highBandRatio, 0);
  assert.equal(result.onsetCandidate, false);
  assert.ok(Object.values(result).filter((value) => typeof value === 'number').every(Number.isFinite));
});
