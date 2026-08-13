(function (root) {
  'use strict';

  const CONFIDENCE_GATE = 0.8;
  const STABLE_NOTE_MS = 300;
  const TARGET_TOLERANCE_CENTS = 15;
  const TARGET_STABLE_MS = 150;
  const FINAL_WINDOW_MS = 250;

  function result(status, reason, confidence, fields = {}) { return { status, confidence, reason, ...fields }; }
  function insufficient(reason, confidence = 0, fields = {}) { return result('insufficient', reason, confidence, fields); }
  function valid(confidence, fields = {}) { return result('valid', null, confidence, fields); }
  function median(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }
  function mean(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
  function round(value, digits = 2) { const scale = 10 ** digits; return Math.round(value * scale) / scale; }
  function duration(frames) { return frames.length > 1 ? Number(frames.at(-1).timeMs) - Number(frames[0].timeMs) : 0; }
  function frameGate(frames, needsPitch = true) {
    if (!Array.isArray(frames) || !frames.length) return { reason: 'missing-calibration', accepted: [], confidence: 0 };
    if (frames.some((frame) => frame.clipping)) return { reason: 'clipping', accepted: [], confidence: 0 };
    const accepted = frames.filter((frame) => Number(frame.confidence) >= CONFIDENCE_GATE && (!needsPitch || Number.isFinite(Number(frame.cents))));
    if (!accepted.length || accepted.length < frames.length * 0.6) return { reason: 'low-confidence', accepted, confidence: mean(accepted.map((frame) => Number(frame.confidence) || 0)) };
    return { reason: null, accepted, confidence: mean(accepted.map((frame) => Number(frame.confidence) || 0)) };
  }

  function sustain(frames) {
    const gate = frameGate(frames);
    if (gate.reason) return insufficient(gate.reason, gate.confidence);
    const durationMs = duration(gate.accepted);
    if (durationMs < STABLE_NOTE_MS) return insufficient('note-too-short', gate.confidence, { durationMs });
    const cents = gate.accepted.map((frame) => Number(frame.cents));
    const centre = median(cents);
    return valid(gate.confidence, {
      durationMs,
      centreCents: round(centre),
      medianAbsoluteDeviationCents: round(median(cents.map((value) => Math.abs(value - centre))))
    });
  }

  function bend(frames, targetCents) {
    const target = Number(targetCents);
    if (![50, 100, 150, 200].includes(target)) return insufficient('invalid-target');
    const gate = frameGate(frames);
    if (gate.reason) return insufficient(gate.reason, gate.confidence);
    const durationMs = duration(gate.accepted);
    if (durationMs < STABLE_NOTE_MS) return insufficient('note-too-short', gate.confidence, { durationMs });
    const lastTime = Number(gate.accepted.at(-1).timeMs);
    const finalValues = gate.accepted.filter((frame) => Number(frame.timeMs) >= lastTime - FINAL_WINDOW_MS).map((frame) => Number(frame.cents));
    const finalPitch = median(finalValues);
    const direction = target >= 0 ? 1 : -1;
    const overshootCents = Math.max(0, ...gate.accepted.map((frame) => (Number(frame.cents) - target) * direction));
    let settlingTimeMs = null;
    for (let start = 0; start < gate.accepted.length; start += 1) {
      const startTime = Number(gate.accepted[start].timeMs);
      const stable = gate.accepted.filter((frame) => Number(frame.timeMs) >= startTime && Number(frame.timeMs) <= startTime + TARGET_STABLE_MS);
      if (stable.length >= 2 && Number(stable.at(-1).timeMs) - startTime >= TARGET_STABLE_MS && stable.every((frame) => Math.abs(Number(frame.cents) - target) <= TARGET_TOLERANCE_CENTS)) {
        settlingTimeMs = startTime - Number(gate.accepted[0].timeMs);
        break;
      }
    }
    if (settlingTimeMs === null) return insufficient('target-not-stable', gate.confidence, { finalErrorCents: round(finalPitch - target), overshootCents: round(overshootCents) });
    return valid(gate.confidence, { targetCents: target, finalErrorCents: round(finalPitch - target), overshootCents: round(overshootCents), settlingTimeMs });
  }

  function vibrato(frames) {
    const gate = frameGate(frames);
    if (gate.reason) return insufficient(gate.reason, gate.confidence);
    const durationMs = duration(gate.accepted);
    if (durationMs <= 0) return insufficient('note-too-short', gate.confidence);
    const raw = gate.accepted.map((frame) => Number(frame.cents));
    const centre = median(raw);
    const values = raw.map((value) => value - centre);
    const crossings = [];
    for (let index = 1; index < values.length; index += 1) {
      if ((values[index - 1] <= 0 && values[index] > 0) || (values[index - 1] >= 0 && values[index] < 0)) crossings.push(Number(gate.accepted[index].timeMs));
    }
    const cycles = crossings.length / 2;
    const rateHz = cycles / (durationMs / 1000);
    const widthCents = Math.max(...values) - Math.min(...values);
    if (rateHz < 3 || rateHz > 10) return insufficient('rate-out-of-range', gate.confidence, { rateHz: round(rateHz), cycles: round(cycles), widthCents: round(widthCents) });
    if (cycles < 3) return insufficient('fewer-than-three-cycles', gate.confidence, { rateHz: round(rateHz), cycles: round(cycles), widthCents: round(widthCents) });
    if (widthCents < 10 || widthCents > 200) return insufficient('width-out-of-range', gate.confidence, { rateHz: round(rateHz), cycles: round(cycles), widthCents: round(widthCents) });
    const halfPeriods = crossings.slice(1).map((time, index) => time - crossings[index]);
    const averageHalfPeriod = mean(halfPeriods);
    const consistency = averageHalfPeriod ? Math.max(0, 1 - (Math.sqrt(mean(halfPeriods.map((period) => (period - averageHalfPeriod) ** 2))) / averageHalfPeriod)) : 0;
    return valid(gate.confidence, { rateHz: round(rateHz), widthCents: round(widthCents), cycles: round(cycles), consistency: round(consistency) });
  }

  function timing(onsets, scheduledTimes) {
    if (!Array.isArray(onsets) || !onsets.length || !Array.isArray(scheduledTimes) || !scheduledTimes.length) return insufficient('missing-events');
    const errorsMs = onsets.map((onset) => {
      const nearest = scheduledTimes.reduce((best, scheduled) => Math.abs(scheduled - onset) < Math.abs(best - onset) ? scheduled : best, scheduledTimes[0]);
      return round(Number(onset) - Number(nearest));
    });
    const directions = errorsMs.map((error) => error > 0 ? 'late' : (error < 0 ? 'early' : 'on-time'));
    return valid(1, { errorsMs, directions, meanAbsoluteErrorMs: round(mean(errorsMs.map(Math.abs))), signedMeanErrorMs: round(mean(errorsMs)) });
  }

  function noiseFloor(frames) {
    if (!Array.isArray(frames) || !frames.length) return insufficient('missing-calibration');
    if (frames.some((frame) => frame.clipping)) return insufficient('clipping');
    const rms = frames.map((frame) => Number(frame.rms)).filter(Number.isFinite);
    if (!rms.length) return insufficient('missing-calibration');
    return valid(1, { rms: round(median(rms), 5), peakRms: round(Math.max(...rms), 5), frameCount: rms.length });
  }

  function stringNoise(frames) {
    if (!Array.isArray(frames) || !frames.length || !frames.some((frame) => Number.isFinite(Number(frame.noiseFloorRms)))) return insufficient('missing-calibration', 0, { experimental: true, maximumTechniqueWeight: 0.1 });
    const outside = frames.filter((frame) => !frame.inNoteWindow);
    const transients = outside.filter((frame) => frame.onsetCandidate && Number(frame.highBandRatio) >= 0.5 && Number(frame.rms) >= Number(frame.noiseFloorRms) * 2);
    return valid(0.6, {
      experimental: true,
      transientCount: transients.length,
      ratio: round(outside.length ? transients.length / outside.length : 0, 4),
      maximumTechniqueWeight: 0.1,
      label: 'Experimental string-noise clue'
    });
  }

  root.PerformanceAnalyser = Object.freeze({ sustain, bend, vibrato, timing, noiseFloor, stringNoise });
})(typeof globalThis !== 'undefined' ? globalThis : this);
