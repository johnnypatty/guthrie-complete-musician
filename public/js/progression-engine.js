(function (root) {
  'use strict';
  const GROOVES = Object.freeze(['fusion', 'funk', 'rock', 'ballad', 'neo-soul', 'ambient', 'changes', 'metronome']);
  function cleanText(value, limit, label) { const text = String(value || '').trim(); if (!text || text.length > limit) throw new Error(`${label} must be 1–${limit} characters`); return text; }
  function normalize(value) {
    const source = structuredClone(value || {});
    const tempo = Number(source.tempo);
    if (!Number.isInteger(tempo) || tempo < 40 || tempo > 240) throw new Error('Tempo must be 40–240 BPM');
    if (!GROOVES.includes(source.groove)) throw new Error('Unsupported groove');
    if (!Array.isArray(source.events) || source.events.length < 1 || source.events.length > 64) throw new Error('Progression must contain 1–64 events');
    const meter = root.PlayerTimeline.normalizeMeter(source.meter);
    const events = source.events.map((event, index) => {
      const chord = cleanText(event.chord, 16, `Chord ${index + 1}`); root.MusicTheory.parseChord(chord);
      const section = cleanText(event.section || 'A', 32, 'Section');
      const pulses = Number(event.pulses ?? (Number(event.beats) * meter.denominator / 4));
      if (!Number.isFinite(pulses) || pulses <= 0) throw new Error(`Invalid pulse count at event ${index + 1}`);
      return { chord, pulses, section };
    });
    const timeline = root.PlayerTimeline.buildTimeline(events, tempo, meter);
    if (timeline.totalTicks % meter.ticksPerBar !== 0) throw new Error('Progression must total a full bar');
    if (timeline.totalTicks / meter.ticksPerBar > 128) throw new Error('Progression may contain at most 128 bars');
    return { id: cleanText(source.id || `custom-${Date.now()}`, 128, 'ID'), name: cleanText(source.name || 'Custom progression', 64, 'Name'), tempo, meter, groove: source.groove, seed: Number.isInteger(source.seed) ? source.seed : 1, events, timeline, rampHistory: Array.isArray(source.rampHistory) ? source.rampHistory.filter(Number.isFinite) : [] };
  }
  function fromTrack(track) {
    const style = String(track.style || '').toLowerCase();
    const groove = style.includes('funk') ? 'funk' : style.includes('neo-soul') ? 'neo-soul' : style.includes('ambient') ? 'ambient' : style.includes('changes') || style.includes('blues') ? 'changes' : style.includes('rock') || style.includes('metal') || style.includes('neo-classical') ? 'rock' : 'fusion';
    const meter = track.meterObject || (track.meter === '5/4' ? { numerator: 5, denominator: 4, groups: [3, 2], tempoUnit: 4 } : { numerator: Number(track.beatsPerBar) || 4, denominator: 4, groups: [Number(track.beatsPerBar) || 4], tempoUnit: 4 });
    return normalize({ id: track.id, name: track.title, tempo: track.bpm, meter, groove, seed: track.seed || 1, events: track.progression.map((event) => ({ chord: event.chord, pulses: event.pulses != null ? Number(event.pulses) : Number(event.beats) * meter.denominator / 4, section: event.section })) });
  }
  function loopBounds(preset, selection = {}) {
    const normalized = preset.timeline ? preset : normalize(preset); const timeline = normalized.timeline;
    if (selection.section) { const events = timeline.events.filter((event) => event.section === selection.section); if (!events.length) throw new Error('Unknown section'); return { startTick: events[0].startTick, endTick: events.at(-1).endTick }; }
    const start = Number(selection.startBar || 1); const end = Number(selection.endBar || timeline.totalTicks / timeline.ticksPerBar);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end * timeline.ticksPerBar > timeline.totalTicks) throw new Error('Invalid bar loop');
    return { startTick: (start - 1) * timeline.ticksPerBar, endTick: end * timeline.ticksPerBar };
  }
  function importPreset(text, current) { let parsed; try { parsed = JSON.parse(String(text)); } catch (_) { throw new Error('Preset JSON is invalid'); } const next = normalize(parsed); return next || current; }
  function ramp(preset, evidence = {}) { const qualifies = evidence.clean === true || (evidence.timing?.status === 'valid' && Number(evidence.timing.meanAbsoluteErrorMs) <= 40); if (!qualifies) return structuredClone(preset); const step = Math.max(1, Math.min(10, Number(evidence.step) || 2)); return normalize({ ...preset, tempo: Math.min(240, preset.tempo + step), rampHistory: [...(preset.rampHistory || []), preset.tempo] }); }
  function undoRamp(preset) { const history = [...(preset.rampHistory || [])]; if (!history.length) return structuredClone(preset); const tempo = history.pop(); return normalize({ ...preset, tempo, rampHistory: history }); }
  root.ProgressionEngine = Object.freeze({ GROOVES, normalize, fromTrack, loopBounds, importPreset, ramp, undoRamp });
})(typeof globalThis !== 'undefined' ? globalThis : this);
