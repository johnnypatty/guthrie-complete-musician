(function (root, factory) {
  const api = factory(root.MusicTheory, root.PlayerTimeline);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AudioEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (MusicTheory, PlayerTimeline) {
  'use strict';

  function create() {
    let context = null;
    let master = null;
    let compressor = null;
    let padBus = null;
    let bassBus = null;
    let drumBus = null;
    let scheduler = null;
    let config = null;
    let timeline = null;
    let nextStepBeat = 0;
    let nextStepTime = 0;
    let playing = false;
    let lastChordIndex = -1;
    const activeNodes = new Set();
    const callbackTimers = new Set();

    function audioContextConstructor() {
      return globalThis.AudioContext || globalThis.webkitAudioContext;
    }

    function buildGraph() {
      if (context) return;
      const AudioContextClass = audioContextConstructor();
      if (!AudioContextClass) throw new Error('This browser does not support Web Audio. Try current Chrome, Edge, or Firefox.');
      context = new AudioContextClass();
      master = context.createGain();
      compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.18;
      master.gain.value = 0.62;
      padBus = context.createGain();
      bassBus = context.createGain();
      drumBus = context.createGain();
      padBus.connect(compressor);
      bassBus.connect(compressor);
      drumBus.connect(compressor);
      compressor.connect(master);
      master.connect(context.destination);
    }

    function trackNode(node) {
      activeNodes.add(node);
      node.addEventListener?.('ended', () => activeNodes.delete(node), { once: true });
      return node;
    }

    function midiFrequency(midi) {
      return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function scheduleOscillator(destination, frequency, start, duration, type, level, attack, release, detune) {
      const oscillator = trackNode(context.createOscillator());
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.detune.setValueAtTime(detune || 0, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(level, start + attack);
      gain.gain.setValueAtTime(level, Math.max(start + attack, start + duration - release));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    }

    function schedulePad(symbol, start, duration) {
      const parsed = MusicTheory.parseChord(symbol);
      const notes = MusicTheory.buildChord(parsed.root, parsed.quality);
      const usable = notes.slice(0, Math.min(notes.length, 5));
      usable.forEach((note, index) => {
        const pc = MusicTheory.noteToPc(note.replace('bb', 'b').replace('##', '#'));
        const midi = 48 + pc + (index > 0 && pc <= MusicTheory.noteToPc(usable[0]) ? 12 : 0);
        scheduleOscillator(padBus, midiFrequency(midi), start, Math.max(0.18, duration), 'triangle', 0.025, 0.05, 0.12, index % 2 ? 4 : -4);
      });
    }

    function scheduleBass(symbol, start, duration, beatInChord) {
      const parsed = MusicTheory.parseChord(symbol);
      const root = parsed.bass || parsed.root;
      const rootPc = MusicTheory.noteToPc(root);
      const pc = beatInChord % 4 === 2 ? (rootPc + 7) % 12 : rootPc;
      const midi = 36 + pc;
      scheduleOscillator(bassBus, midiFrequency(midi), start, duration * 0.78, 'triangle', 0.14, 0.008, 0.06, 0);
    }

    function scheduleKick(start) {
      const oscillator = trackNode(context.createOscillator());
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(120, start);
      oscillator.frequency.exponentialRampToValueAtTime(48, start + 0.12);
      gain.gain.setValueAtTime(0.28, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      oscillator.connect(gain);
      gain.connect(drumBus);
      oscillator.start(start);
      oscillator.stop(start + 0.18);
    }

    function noiseBuffer(duration) {
      const length = Math.max(1, Math.floor(context.sampleRate * duration));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
      return buffer;
    }

    function scheduleNoise(start, duration, frequency, level) {
      const source = trackNode(context.createBufferSource());
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = noiseBuffer(duration);
      filter.type = frequency > 3000 ? 'highpass' : 'bandpass';
      filter.frequency.value = frequency;
      gain.gain.setValueAtTime(level, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(drumBus);
      source.start(start);
      source.stop(start + duration + 0.01);
    }

    function scheduleSnare(start) {
      scheduleNoise(start, 0.14, 1600, 0.13);
      scheduleOscillator(drumBus, 185, start, 0.08, 'triangle', 0.035, 0.002, 0.05, 0);
    }

    function scheduleHat(start, accent) {
      scheduleNoise(start, 0.035, 6500, accent ? 0.045 : 0.026);
    }

    function queueCallback(payload, when) {
      if (typeof config.onChordChange !== 'function') return;
      const delay = Math.max(0, (when - context.currentTime) * 1000);
      const timer = setTimeout(() => {
        callbackTimers.delete(timer);
        if (playing) config.onChordChange(payload);
      }, delay);
      callbackTimers.add(timer);
    }

    function loopBounds() {
      return {
        start: Number.isFinite(config.loopStartBeat) ? config.loopStartBeat : 0,
        end: Number.isFinite(config.loopEndBeat) ? config.loopEndBeat : timeline.totalBeats
      };
    }

    function scheduleStep(beat, when) {
      const bounds = loopBounds();
      const loopedBeat = PlayerTimeline.loopBeat(beat, bounds.start, bounds.end);
      const event = PlayerTimeline.eventAtBeat(timeline.events, loopedBeat);
      const beatLength = PlayerTimeline.secondsPerBeat(config.bpm);
      const halfStep = Math.round(loopedBeat * 2);
      const isWholeBeat = halfStep % 2 === 0;

      scheduleHat(when, isWholeBeat);
      if (isWholeBeat) {
        const beatNumber = Math.floor(loopedBeat) % config.track.beatsPerBar;
        if (beatNumber === 0 || (config.track.beatsPerBar === 4 && beatNumber === 2)) scheduleKick(when);
        if (config.track.beatsPerBar === 4 && (beatNumber === 1 || beatNumber === 3)) scheduleSnare(when);
        if (config.track.beatsPerBar === 5 && (beatNumber === 2 || beatNumber === 4)) scheduleSnare(when);
        scheduleBass(event.chord, when, beatLength, Math.floor(loopedBeat - event.startBeat));
      }

      if (event.index !== lastChordIndex) {
        const remainingBeats = Math.min(event.endBeat, bounds.end) - loopedBeat;
        schedulePad(event.chord, when, Math.max(beatLength, remainingBeats * beatLength * 0.96));
        lastChordIndex = event.index;
        queueCallback({ chord: event.chord, index: event.index, beat: loopedBeat, section: event.section }, when);
      }
    }

    function schedulerTick() {
      if (!playing) return;
      const lookAhead = context.currentTime + 0.1;
      const halfBeatSeconds = PlayerTimeline.secondsPerBeat(config.bpm) / 2;
      while (nextStepTime < lookAhead) {
        scheduleStep(nextStepBeat, nextStepTime);
        nextStepBeat += 0.5;
        const bounds = loopBounds();
        if (nextStepBeat >= bounds.end - 0.0001) {
          nextStepBeat = bounds.start;
          lastChordIndex = -1;
        }
        nextStepTime += halfBeatSeconds;
      }
    }

    function clearScheduled() {
      if (scheduler) clearInterval(scheduler);
      scheduler = null;
      callbackTimers.forEach((timer) => clearTimeout(timer));
      callbackTimers.clear();
      activeNodes.forEach((node) => {
        try { node.stop(); } catch (_) { /* node already stopped */ }
        try { node.disconnect(); } catch (_) { /* safe cleanup */ }
      });
      activeNodes.clear();
    }

    function setMix(levels) {
      if (!context || !levels) return;
      const now = context.currentTime;
      const clamp = (value) => Math.max(0, Math.min(1, Number(value)));
      if (levels.pad != null) padBus.gain.setTargetAtTime(clamp(levels.pad), now, 0.02);
      if (levels.bass != null) bassBus.gain.setTargetAtTime(clamp(levels.bass), now, 0.02);
      if (levels.drums != null) drumBus.gain.setTargetAtTime(clamp(levels.drums), now, 0.02);
    }

    async function start(nextConfig) {
      buildGraph();
      clearScheduled();
      config = { ...nextConfig };
      timeline = PlayerTimeline.buildTimeline(config.track.progression, config.bpm, config.track.beatsPerBar);
      const bounds = loopBounds();
      if (bounds.start < 0 || bounds.end > timeline.totalBeats || bounds.end <= bounds.start) throw new Error('Invalid loop selection');
      if (context.state === 'suspended') await context.resume();
      setMix(config.levels || { pad: 0.72, bass: 0.72, drums: 0.62 });
      nextStepBeat = bounds.start;
      nextStepTime = context.currentTime + 0.06;
      lastChordIndex = -1;
      playing = true;
      schedulerTick();
      scheduler = setInterval(schedulerTick, 25);
    }

    function stop() {
      playing = false;
      clearScheduled();
      lastChordIndex = -1;
    }

    function setTempo(bpm) {
      if (!config) return;
      const tempo = Number(bpm);
      PlayerTimeline.secondsPerBeat(tempo);
      config.bpm = tempo;
      timeline = PlayerTimeline.buildTimeline(config.track.progression, config.bpm, config.track.beatsPerBar);
      if (playing) {
        clearScheduled();
        nextStepTime = context.currentTime + 0.06;
        lastChordIndex = -1;
        schedulerTick();
        scheduler = setInterval(schedulerTick, 25);
      }
    }

    function isPlaying() { return playing; }

    if (globalThis.addEventListener) {
      globalThis.addEventListener('pagehide', stop);
      globalThis.addEventListener('beforeunload', stop);
    }

    return { start, stop, setTempo, setMix, isPlaying };
  }

  return { create };
});
