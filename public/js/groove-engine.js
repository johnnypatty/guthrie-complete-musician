(function (root) {
  'use strict';
  function rng(seed) { const modulus = 2147 * 1000000 + 483647; let value = Number(seed) || 1; return () => { value = (Math.imul(value, 48271) % modulus + modulus) % modulus; return value / modulus; }; }
  function compile(timeline, options = {}) {
    const pattern = root.GroovePatterns[options.groove]; if (!pattern) throw new Error('Unknown groove'); const random = rng(options.seed); const start = options.loopStartTick ?? 0; const end = options.loopEndTick ?? timeline.totalTicks; const events = [];
    function add(event, structural = false) { if (event.tick < start || event.tick >= end) return; const variation = structural ? 0 : (random() - .5) * .1; events.push({ durationTicks: Math.max(1, event.durationTicks), notes: [], sourceEventIndex: -1, ...event, velocity: Math.max(.2, Math.min(1, event.velocity * (1 + variation))), offsetSeconds: structural ? 0 : (random() - .5) * .024 }); }
    const subdivisionTicks = timeline.ticksPerPulse / pattern.subdivision;
    for (let tick = start; tick < end; tick += subdivisionTicks) {
      const slot = Math.round((tick % timeline.ticksPerBar) / subdivisionTicks); const groupAccent = timeline.groupTicks.includes(tick % timeline.ticksPerBar);
      add({ tick, lane: 'drums', instrument: 'hat', durationTicks: subdivisionTicks / 2, velocity: groupAccent ? .75 : .5 }, groupAccent);
      if (pattern.kick.includes(slot)) add({ tick, lane: 'drums', instrument: 'kick', durationTicks: subdivisionTicks, velocity: .82 }, tick % timeline.ticksPerBar === 0);
      if (pattern.snare.includes(slot)) add({ tick, lane: 'drums', instrument: 'snare', durationTicks: subdivisionTicks, velocity: .75 });
      if (options.groove === 'metronome' && groupAccent) add({ tick, lane: 'click', instrument: 'click', durationTicks: 12, velocity: tick % timeline.ticksPerBar === 0 ? .9 : .65 }, true);
    }
    if (options.groove !== 'metronome') {
      root.BassArranger.arrange(timeline, { seed: options.seed, loop: true }).forEach((event) => add(event, event.tick === 0 || timeline.groupTicks.includes(event.tick % timeline.ticksPerBar)));
      const voices = root.VoicingEngine.arrange(timeline.events.map((event) => event.chord), { seed: options.seed });
      timeline.events.forEach((event, index) => add({ tick: event.startTick, lane: 'harmony', instrument: options.groove === 'ambient' ? 'pad' : 'keys', durationTicks: pattern.harmony === 'hold' ? event.endTick - event.startTick : Math.min(timeline.ticksPerPulse, event.endTick - event.startTick), notes: voices[index], velocity: options.groove === 'ambient' ? .45 : .58, sourceEventIndex: event.index }, true));
    }
    return events.sort((a, b) => a.tick - b.tick || a.lane.localeCompare(b.lane) || a.instrument.localeCompare(b.instrument));
  }
  root.GrooveEngine = Object.freeze({ compile });
})(typeof globalThis !== 'undefined' ? globalThis : this);
