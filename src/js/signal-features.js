(function (root) {
  'use strict';

  const REFRACTORY_MS = 80;
  const CLIPPING_LEVEL = 0.98;
  const CLIPPING_RATIO = 0.01;
  const SPECTRUM_BINS = 257;

  function spectrumFor(samples) {
    const size = Math.min(512, samples.length);
    if (!size) return new Array(SPECTRUM_BINS).fill(0);
    const result = new Array(SPECTRUM_BINS).fill(0);
    let total = 0;
    for (let bin = 0; bin < SPECTRUM_BINS; bin += 1) {
      let real = 0;
      let imaginary = 0;
      for (let index = 0; index < size; index += 1) {
        const sample = Number(samples[index]) || 0;
        const window = 0.5 - (0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, size - 1)));
        const angle = (2 * Math.PI * bin * index) / 512;
        real += sample * window * Math.cos(angle);
        imaginary -= sample * window * Math.sin(angle);
      }
      result[bin] = Math.hypot(real, imaginary);
      total += result[bin];
    }
    if (total > 0) for (let bin = 0; bin < result.length; bin += 1) result[bin] /= total;
    return result;
  }

  function frame(samples, sampleRate, options = {}) {
    const values = samples || [];
    const count = Math.max(1, values.length);
    let squareSum = 0;
    let peak = 0;
    let clippingCount = 0;
    let crossings = 0;
    for (let index = 0; index < values.length; index += 1) {
      const sample = Number(values[index]) || 0;
      squareSum += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
      if (Math.abs(sample) > CLIPPING_LEVEL) clippingCount += 1;
      if (index > 0 && ((sample >= 0) !== ((Number(values[index - 1]) || 0) >= 0))) crossings += 1;
    }
    const rms = Math.sqrt(squareSum / count);
    const clippingRatio = clippingCount / count;
    const spectrum = spectrumFor(values);
    const previous = Array.isArray(options.previousSpectrum) ? options.previousSpectrum : [];
    let spectralFlux = 0;
    for (let index = 0; index < spectrum.length; index += 1) spectralFlux += Math.max(0, spectrum[index] - (Number(previous[index]) || 0));
    const nyquist = (Number(sampleRate) || 48000) / 2;
    let highBandRatio = 0;
    for (let index = 0; index < spectrum.length; index += 1) {
      const frequency = (index / (spectrum.length - 1)) * nyquist;
      if (frequency >= 2500) highBandRatio += spectrum[index];
    }
    const timeMs = Number(options.timeMs) || 0;
    const lastOnsetMs = Number(options.lastOnsetMs);
    const enoughFlux = spectralFlux >= 0.18 && rms >= 0.01;
    const refractory = Number.isFinite(lastOnsetMs) && (timeMs - lastOnsetMs) < REFRACTORY_MS;
    return {
      rms,
      peak,
      clippingRatio,
      clipping: clippingRatio >= CLIPPING_RATIO,
      zeroCrossingRate: values.length > 1 ? crossings / (values.length - 1) : 0,
      spectrum,
      spectralFlux,
      highBandRatio,
      onsetCandidate: enoughFlux && !refractory,
      onsetReason: enoughFlux && refractory ? 'refractory' : (enoughFlux ? 'flux-rise' : 'below-threshold')
    };
  }

  root.SignalFeatures = Object.freeze({ frame, REFRACTORY_MS, CLIPPING_LEVEL, CLIPPING_RATIO });
})(typeof globalThis !== 'undefined' ? globalThis : this);
