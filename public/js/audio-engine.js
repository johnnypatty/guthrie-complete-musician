(function (root) {
  'use strict';

  function create(options = {}) {
    const timers = options.timers || { setInterval: (...args) => root.setInterval(...args), clearInterval: (id) => root.clearInterval(id), setTimeout: (...args) => root.setTimeout(...args), clearTimeout: (id) => root.clearTimeout(id) };
    const eventTarget = options.eventTarget || root;
    let context = null; let master = null; let compressor = null; let renderer = null;
    let buses = null; let scheduler = null; let config = null; let preset = null; let events = [];
    let playing = false; let generation = 0; let cycleStart = 0; let eventCursor = 0; let pendingTempo = null; let appliedTempo = null;
    const callbackTimers = new Set();

    function contextClass() { return options.AudioContextClass || root.AudioContext || root.webkitAudioContext; }
    function buildGraph() {
      if (context) return;
      const AudioContextClass = contextClass();
      if (!AudioContextClass) throw new Error('This browser does not support Web Audio. Try current Chrome, Edge, or Firefox.');
      context = new AudioContextClass(); master = context.createGain(); compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18; compressor.knee.value = 12; compressor.ratio.value = 4; compressor.attack.value = .005; compressor.release.value = .18;
      master.gain.value = .62;
      buses = { harmony: context.createGain(), bass: context.createGain(), drums: context.createGain(), click: context.createGain(), room: context.createGain() };
      const highPass = context.createBiquadFilter(); highPass.type = 'highpass'; highPass.frequency.value = 25;
      Object.values(buses).forEach((node) => node.connect(highPass)); highPass.connect(compressor); compressor.connect(master); master.connect(context.destination);
      const factory = options.rendererFactory || root.SynthVoices?.create;
      if (typeof factory !== 'function') throw new Error('Backing instruments are unavailable. Reload the page and try again.');
      renderer = factory({ context, buses, maxSources: 64 });
    }
    function normalizeTrack(track, bpm) {
      return root.ProgressionEngine.fromTrack({ title: track.title || 'Progression', style: track.style || track.groove || 'fusion', bpm, ...track, bpm });
    }
    function compile() {
      preset = normalizeTrack(config.track, appliedTempo);
      const requestedStart = Number.isFinite(config.loopStartTick) ? config.loopStartTick : Number(config.loopStartBeat || 0) * root.PlayerTimeline.PPQ;
      const requestedEnd = Number.isFinite(config.loopEndTick) ? config.loopEndTick : Number.isFinite(config.loopEndBeat) ? config.loopEndBeat * root.PlayerTimeline.PPQ : preset.timeline.totalTicks;
      if (requestedStart < 0 || requestedEnd > preset.timeline.totalTicks || requestedEnd <= requestedStart) throw new Error('Invalid loop selection');
      config.loopStartTick = requestedStart; config.loopEndTick = requestedEnd;
      events = root.GrooveEngine.compile(preset.timeline, { groove: config.groove || preset.groove, seed: config.seed ?? preset.seed, loopStartTick: requestedStart, loopEndTick: requestedEnd });
      eventCursor = 0;
    }
    function secondsPerTick() { return root.PlayerTimeline.secondsPerBeat(appliedTempo) / (root.PlayerTimeline.PPQ * 4 / preset.meter.tempoUnit); }
    function loopDuration() { return (config.loopEndTick - config.loopStartTick) * secondsPerTick(); }
    function queue(callback, payload, when) {
      if (typeof callback !== 'function') return;
      const token = generation; const delay = Math.max(0, (when - context.currentTime) * 1000);
      const id = timers.setTimeout(() => { callbackTimers.delete(id); if (playing && token === generation) callback({ ...payload, audioTime: when }); }, delay);
      callbackTimers.add(id);
    }
    function countIn() {
      const bars = Number(config.countInBars || 0); if (!bars) return 0;
      const meter = preset.meter; const tickSeconds = secondsPerTick(); const start = context.currentTime + .06;
      for (let bar = 0; bar < bars; bar += 1) {
        for (let pulse = 0; pulse < meter.numerator; pulse += 1) {
          const tick = pulse * meter.ticksPerPulse; const accent = meter.groupTicks.includes(tick); const when = start + (bar * meter.ticksPerBar + tick) * tickSeconds;
          renderer.render({ lane: 'click', instrument: 'click', velocity: accent ? .85 : .54, durationTicks: Math.min(12, meter.ticksPerPulse / 2), countInPulse: pulse + 1 }, when, tickSeconds);
          queue(config.onTransport, { phase: 'count-in', countInBeat: bar * meter.numerator + pulse + 1, countInTotal: bars * meter.numerator }, when);
        }
      }
      return bars * meter.ticksPerBar * tickSeconds;
    }
    function position(event) {
      const relativeTick = event.tick - config.loopStartTick;
      const absoluteTick = config.loopStartTick + relativeTick;
      const harmony = preset.timeline.events.find((item) => absoluteTick >= item.startTick && absoluteTick < item.endTick) || preset.timeline.events[0];
      return { harmony, bar: Math.floor(absoluteTick / preset.meter.ticksPerBar) + 1, pulse: Math.floor((absoluteTick % preset.meter.ticksPerBar) / preset.meter.ticksPerPulse) + 1, progress: relativeTick / (config.loopEndTick - config.loopStartTick) };
    }
    function renderEvent(event, when) {
      const tickSeconds = secondsPerTick(); renderer.render(event, when + Number(event.offsetSeconds || 0), tickSeconds);
      const info = position(event);
      if (event.lane === 'harmony') queue(config.onChordChange, { chord: info.harmony.chord, index: info.harmony.index, beat: event.tick / root.PlayerTimeline.PPQ, section: info.harmony.section }, when);
      if (event.tick % preset.meter.ticksPerPulse === 0 && (event.instrument === 'hat' || event.lane === 'click')) queue(config.onTransport, { phase: 'playing', chord: info.harmony.chord, section: info.harmony.section, bar: info.bar, beatInBar: info.pulse, progress: info.progress, beat: event.tick / root.PlayerTimeline.PPQ }, when);
    }
    function applyPendingAtBoundary(boundaryTime) {
      if (pendingTempo == null) return;
      appliedTempo = pendingTempo; pendingTempo = null; compile(); cycleStart = boundaryTime; eventCursor = 0;
    }
    function resync(now) {
      const duration = loopDuration(); const elapsed = Math.max(0, now - cycleStart); const completed = Math.floor(elapsed / duration);
      if (completed > 0) { cycleStart += completed * duration; eventCursor = 0; applyPendingAtBoundary(cycleStart); }
      const tick = config.loopStartTick + Math.max(0, now - cycleStart) / secondsPerTick();
      eventCursor = events.findIndex((event) => event.tick >= tick); if (eventCursor < 0) eventCursor = events.length;
    }
    function schedulerTick() {
      if (!playing) return;
      const now = context.currentTime; if (now > cycleStart + loopDuration() + .1) resync(now);
      const horizon = now + .12;
      while (playing) {
        if (eventCursor >= events.length) {
          const boundary = cycleStart + loopDuration();
          if (boundary > horizon) break;
          applyPendingAtBoundary(boundary); if (cycleStart !== boundary) cycleStart = boundary; eventCursor = 0; continue;
        }
        const event = events[eventCursor]; const when = cycleStart + (event.tick - config.loopStartTick) * secondsPerTick();
        if (when > horizon) break;
        if (when >= now - .02) renderEvent(event, when);
        eventCursor += 1;
      }
    }
    function clear(fast = false) {
      generation += 1; if (scheduler) timers.clearInterval(scheduler); scheduler = null;
      callbackTimers.forEach((id) => timers.clearTimeout(id)); callbackTimers.clear();
      renderer?.stop(fast ? context?.currentTime || 0 : (context?.currentTime || 0) + .03);
    }
    function setMix(levels = {}) {
      if (!context) return; const now = context.currentTime; const clamp = (value) => Math.max(0, Math.min(1, Number(value)));
      if (levels.master != null) master.gain.setTargetAtTime(clamp(levels.master), now, .02);
      if (levels.pad != null) buses.harmony.gain.setTargetAtTime(clamp(levels.pad), now, .02);
      if (levels.bass != null) buses.bass.gain.setTargetAtTime(clamp(levels.bass), now, .02);
      if (levels.drums != null) buses.drums.gain.setTargetAtTime(clamp(levels.drums), now, .02);
    }
    async function start(nextConfig) {
      buildGraph(); clear(true); config = { ...nextConfig }; appliedTempo = Number(config.bpm || config.track?.bpm);
      root.PlayerTimeline.secondsPerBeat(appliedTempo);
      config.countInBars = Number(config.countInBars || 0); if (!Number.isInteger(config.countInBars) || config.countInBars < 0 || config.countInBars > 2) throw new Error('Count-in must be 0, 1, or 2 bars');
      compile(); if (context.state === 'suspended') await context.resume();
      setMix(config.levels || { pad: .72, bass: .72, drums: .62, master: .8 }); playing = true;
      cycleStart = context.currentTime + .06 + countIn(); eventCursor = 0; schedulerTick(); scheduler = timers.setInterval(schedulerTick, 25);
    }
    function stop(fast = false) { playing = false; clear(fast); eventCursor = 0; }
    function setTempo(value) { const bpm = Number(value); root.PlayerTimeline.secondsPerBeat(bpm); if (!config) return; if (!playing) { appliedTempo = bpm; config.bpm = bpm; compile(); } else pendingTempo = bpm; }
    function tempo() { return appliedTempo; }
    if (eventTarget?.addEventListener) { eventTarget.addEventListener('pagehide', () => stop(true)); eventTarget.addEventListener('beforeunload', () => stop(true)); }
    return Object.freeze({ start, stop, setTempo, setMix, setLevels: setMix, isPlaying: () => playing, tempo });
  }

  root.AudioEngine = Object.freeze({ create });
})(typeof globalThis !== 'undefined' ? globalThis : this);
