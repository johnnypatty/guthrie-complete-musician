(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PlayerTimeline = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function secondsPerBeat(bpm) {
    const tempo = Number(bpm);
    if (!Number.isFinite(tempo) || tempo < 50 || tempo > 220) throw new Error('Tempo must be between 50 and 220 BPM');
    return 60 / tempo;
  }

  function buildTimeline(progression, bpm, beatsPerBar) {
    if (!Array.isArray(progression) || progression.length === 0) throw new Error('Progression must contain chord events');
    const barBeats = Number(beatsPerBar);
    if (!Number.isFinite(barBeats) || barBeats <= 0) throw new Error('Beats per bar must be positive');
    const beatSeconds = secondsPerBeat(bpm);
    let beat = 0;
    const events = progression.map((item, index) => {
      const beats = Number(item.beats);
      if (!item.chord || !Number.isFinite(beats) || beats <= 0) throw new Error(`Invalid progression event at index ${index}`);
      const event = {
        index,
        chord: item.chord,
        section: item.section || 'Full',
        beats,
        startBeat: beat,
        endBeat: beat + beats,
        startTime: beat * beatSeconds,
        duration: beats * beatSeconds,
        startBar: Math.floor(beat / barBeats) + 1
      };
      beat += beats;
      return event;
    });
    return { events, totalBeats: beat, totalSeconds: beat * beatSeconds, bpm: Number(bpm), beatsPerBar: barBeats };
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

  return { secondsPerBeat, buildTimeline, eventAtBeat, loopBeat, remapBeat, positionAtBeat };
});
