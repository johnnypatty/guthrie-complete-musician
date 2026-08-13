(function (root) {
  'use strict';

  const MIN_FREQUENCY = 65;
  const MAX_FREQUENCY = 1400;
  const SEARCH_MIN = 40;
  const CONFIDENCE_GATE = 0.8;
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function insufficient(reason, confidence = 0) {
    return { status: 'insufficient', frequency: null, note: null, cents: null, confidence, reason };
  }

  function interpolate(values, index) {
    if (index <= 0 || index >= values.length - 1) return index;
    const left = values[index - 1];
    const centre = values[index];
    const right = values[index + 1];
    const denominator = left - (2 * centre) + right;
    return Math.abs(denominator) < 1e-12 ? index : index + (0.5 * (left - right) / denominator);
  }

  function analyse(samples, sampleRate, calibration = {}) {
    if (!samples || samples.length < 256 || !Number.isFinite(sampleRate) || sampleRate <= 0) return insufficient('invalid-input');
    const values = Float64Array.from(samples, (sample) => Number.isFinite(Number(sample)) ? Number(sample) : 0);
    let energy = 0;
    let clipped = 0;
    for (let index = 0; index < samples.length; index += 1) {
      const sample = Number(samples[index]) || 0;
      energy += sample * sample;
      if (Math.abs(sample) > 0.98) clipped += 1;
    }
    const rms = Math.sqrt(energy / samples.length);
    const floor = Math.max(0.005, (Number(calibration.noiseFloorRms) || 0) * 2.5);
    if (rms < floor) return insufficient('level-too-low');
    if ((clipped / samples.length) >= 0.01) return insufficient('clipping');

    const minLag = Math.max(2, Math.floor(sampleRate / MAX_FREQUENCY));
    const maxLag = Math.min(values.length - 2, Math.ceil(sampleRate / SEARCH_MIN));
    if (maxLag <= minLag) return insufficient('invalid-input');
    const differences = new Float64Array(maxLag + 1);
    for (let lag = 1; lag <= maxLag; lag += 1) {
      let difference = 0;
      const end = values.length - lag;
      for (let index = 0; index < end; index += 1) {
        const delta = values[index] - values[index + lag];
        difference += delta * delta;
      }
      differences[lag] = difference;
    }
    const normalized = new Float64Array(maxLag + 1);
    normalized[0] = 1;
    let running = 0;
    for (let lag = 1; lag <= maxLag; lag += 1) {
      running += differences[lag];
      normalized[lag] = running > 0 ? (differences[lag] * lag / running) : 1;
    }
    let candidate = -1;
    for (let lag = minLag; lag < maxLag; lag += 1) {
      if (normalized[lag] < 0.2 && normalized[lag] <= normalized[lag - 1] && normalized[lag] < normalized[lag + 1]) {
        candidate = lag;
        break;
      }
    }
    if (candidate < 0) {
      candidate = minLag;
      for (let lag = minLag + 1; lag <= maxLag; lag += 1) if (normalized[lag] < normalized[candidate]) candidate = lag;
    }
    const confidence = Math.max(0, Math.min(1, 1 - normalized[candidate]));
    if (confidence < CONFIDENCE_GATE) return insufficient('low-confidence', confidence);
    const refinedLag = interpolate(normalized, candidate);
    const frequency = sampleRate / refinedLag;
    if (!Number.isFinite(frequency) || frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) return insufficient('frequency-out-of-range', confidence);
    const reference = Number(calibration.referenceHz) > 0 ? Number(calibration.referenceHz) : 440;
    const midiFloat = 69 + (12 * Math.log2(frequency / reference));
    const midi = Math.round(midiFloat);
    const cents = (midiFloat - midi) * 100;
    const note = `${NOTES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
    return { status: 'ready', frequency, note, cents, confidence, reason: null };
  }

  root.PitchDetector = Object.freeze({ analyse, MIN_FREQUENCY, MAX_FREQUENCY, CONFIDENCE_GATE });
})(typeof globalThis !== 'undefined' ? globalThis : this);
