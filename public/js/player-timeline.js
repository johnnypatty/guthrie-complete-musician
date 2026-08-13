(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PlayerTimeline = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PPQ = 96;

  function secondsPerBeat(bpm) {
    const tempo = Number(bpm);
    if (!Number.isFinite(tempo) || tempo < 40 || tempo > 240) throw new Error('Tempo must be between 40 and 240 BPM');
    return 60 / tempo;
  }

  function normalizeMeter(input) {
    const meter = typeof input === 'number' ? { numerator: Number(input), denominator: 4, groups: [Number(input)], tempoUnit: 4 } : { ...(input || {}) };
    const numerator = Number(meter.numerator);
    const denominator = Number(meter.denominator || 4);
    if (!Number.isInteger(numerator) || numerator < 1 || numerator > 16 || ![2, 4, 8, 16].includes(denominator)) throw new Error('Unsupported meter');
    const groups = Array.isArray(meter.groups) && meter.groups.length ? meter.groups.map(Number) : [numerator];
    if (groups.some((group) => !Number.isInteger(group) || group < 1) || groups.reduce((sum, group) => sum + group, 0) !== numerator) throw new Error('Meter groups must total the numerator');
    const tempoUnit = Number(meter.tempoUnit || denominator);
    if (![2, 4, 8, 16].includes(tempoUnit)) throw new Error('Unsupported tempo unit');
    const ticksPerPulse = PPQ * 4 / denominator;
    const ticksPerBar = numerator * ticksPerPulse;
    let tick = 0;
    const groupTicks = groups.map((group) => { const start = tick; tick += group * ticksPerPulse; return start; });
    return { numerator, denominator, groups, tempoUnit, ticksPerPulse, ticksPerBar, groupTicks };
  }

  function buildTimeline(progression, bpm, beatsPerBar) {
    if (!Array.isArray(progression) || progression.length === 0) throw new Error('Progression must contain chord events');
    const meter = normalizeMeter(beatsPerBar);
    const barBeats = meter.numerator * 4 / meter.denominator;
    const tempoSeconds = secondsPerBeat(bpm);
    const secondsPerTick = tempoSeconds / (PPQ * 4 / meter.tempoUnit);
    let tick = 0;
    const events = progression.map((item, index) => {
      const ticks = item.pulses != null ? Number(item.pulses) * meter.ticksPerPulse : Number(item.beats) * PPQ;
      const beats = ticks / PPQ;
      if (!item.chord || !Number.isFinite(ticks) || ticks <= 0 || !Number.isInteger(ticks)) throw new Error(`Invalid progression event at index ${index}`);
      const startBeat = tick / PPQ;
      const event = {
        index,
        chord: item.chord,
        section: item.section || 'Full',
        beats,
        pulses: ticks / meter.ticksPerPulse,
        startTick: tick,
        endTick: tick + ticks,
        startBeat,
        endBeat: startBeat + beats,
        startTime: tick * secondsPerTick,
        duration: ticks * secondsPerTick,
        startBar: Math.floor(tick / meter.ticksPerBar) + 1
      };
      tick += ticks;
      return event;
    });
    return { events, totalBeats: tick / PPQ, totalTicks: tick, totalSeconds: tick * secondsPerTick, bpm: Number(bpm), beatsPerBar: barBeats, meter, ticksPerPulse: meter.ticksPerPulse, ticksPerBar: meter.ticksPerBar, groupTicks: meter.groupTicks };
  }

  function eventAtBeat(events, beat) {
    if (!Array.isArray(events) || events.length === 0) return null;
    const total = events[events.length - 1].endBeat;
    const normalized = ((Number(beat) % total) + total) % total;
    return events.find((event) => normalized >= event.startBeat && normalized < event.endBeat) || events[0];
  }

  function loopBeat(absoluteBeat, startBeat, endBeat) {
    const start = Number(startBeat);
    const end = Number(endBeat);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('Loop end must be greater than loop start');
    const length = end - start;
    return start + ((((Number(absoluteBeat) - start) % length) + length) % length);
  }

  function loopTick(absoluteTick, startTick, endTick) { return loopBeat(absoluteTick, startTick, endTick); }

  function remapBeat(beat, oldTotal, newTotal) {
    const oldLength = Number(oldTotal);
    const newLength = Number(newTotal);
    const position = Number(beat);
    if (!Number.isFinite(position)) throw new Error('Beat must be finite');
    if (!Number.isFinite(oldLength) || !Number.isFinite(newLength) || oldLength <= 0 || newLength <= 0) {
      throw new Error('Old and new totals must be positive');
    }
    return (loopBeat(position, 0, oldLength) / oldLength) * newLength;
  }

  function positionAtBeat(timeline, beat) {
    if (!timeline || !Array.isArray(timeline.events) || timeline.events.length === 0 || timeline.totalBeats <= 0) {
      throw new Error('Timeline must contain events');
    }
    const normalizedBeat = loopBeat(Number(beat), 0, timeline.totalBeats);
    return {
      event: eventAtBeat(timeline.events, normalizedBeat),
      bar: Math.floor(normalizedBeat / timeline.beatsPerBar) + 1,
      beatInBar: (normalizedBeat % timeline.beatsPerBar) + 1,
      progress: normalizedBeat / timeline.totalBeats,
      normalizedBeat
    };
  }

  return { PPQ, secondsPerBeat, normalizeMeter, buildTimeline, eventAtBeat, loopBeat, loopTick, remapBeat, positionAtBeat };
});
