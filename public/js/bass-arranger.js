(function (root) {
  'use strict';
  function nearest(pc, previous = 40) { const choices = []; for (let midi = 28; midi <= 52; midi += 1) if (midi % 12 === pc) choices.push(midi); return choices.sort((a, b) => Math.abs(a - previous) - Math.abs(b - previous))[0]; }
  function arrange(timeline, options = {}) {
    let previous = 40; const events = [];
    for (const chordEvent of timeline.events) {
      const chord = root.MusicTheory.describeChord(chordEvent.chord); const step = timeline.ticksPerPulse; const count = Math.max(1, Math.floor((chordEvent.endTick - chordEvent.startTick) / step));
      for (let pulse = 0; pulse < count; pulse += 1) {
        const tick = chordEvent.startTick + pulse * step; let pc = pulse === 0 ? chord.bassPitchClass : (pulse % 2 ? (chord.rootPitchClass + 7) % 12 : chord.rootPitchClass); let role = timeline.groupTicks.includes(tick % timeline.ticksPerBar) ? 'group-anchor' : 'pulse';
        const isLast = chordEvent === timeline.events.at(-1) && pulse === count - 1 && options.loop;
        if (isLast) { const target = root.MusicTheory.describeChord(timeline.events[0].chord).bassPitchClass; pc = (target + 11) % 12; role = 'approach'; }
        const midi = nearest(pc, previous); previous = midi;
        events.push({ tick, lane: 'bass', instrument: 'bass', durationTicks: Math.max(1, Math.round(step * .8)), notes: [midi], velocity: role === 'group-anchor' ? .8 : .68, offsetSeconds: 0, sourceEventIndex: chordEvent.index, role });
      }
    }
    return events;
  }
  root.BassArranger = Object.freeze({ arrange });
})(typeof globalThis !== 'undefined' ? globalThis : this);
