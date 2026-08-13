(function (root) {
  'use strict';

  function create(options = {}) {
    const context = options.context;
    const buses = options.buses || {};
    const maxSources = Math.max(1, Number(options.maxSources) || 64);
    const active = new Set();
    let noise = null;

    function bus(lane) { return buses[lane] || buses.harmony || context.destination; }
    function clamp(value, low, high) { return Math.max(low, Math.min(high, Number(value) || 0)); }
    function frequency(midi) { return 440 * Math.pow(2, (clamp(midi, 24, 96) - 69) / 12); }
    function track(source) {
      while (active.size >= maxSources) {
        const oldest = active.values().next().value;
        try { oldest.stop(context.currentTime + .01); } catch (_) {}
        try { oldest.disconnect(); } catch (_) {}
        active.delete(oldest);
      }
      active.add(source);
      source.addEventListener?.('ended', () => active.delete(source), { once: true });
      return source;
    }
    function envelope(destination, start, duration, level, attack = .008, release = .06) {
      const gain = context.createGain();
      const end = start + Math.max(.025, duration);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.linearRampToValueAtTime(Math.max(.0001, level), Math.min(end, start + attack));
      gain.gain.setValueAtTime(Math.max(.0001, level), Math.max(start + attack, end - release));
      gain.gain.exponentialRampToValueAtTime(.0001, end);
      gain.connect(destination);
      return { gain, end };
    }
    function oscillator(destination, midi, start, duration, level, type = 'triangle', detune = 0) {
      const source = track(context.createOscillator());
      const amp = envelope(destination, start, duration, level);
      source.type = type;
      source.frequency.setValueAtTime(frequency(midi), start);
      source.detune?.setValueAtTime(detune, start);
      source.connect(amp.gain); source.start(start); source.stop(amp.end + .02);
    }
    function noiseBuffer() {
      if (noise) return noise;
      const length = Math.max(1, Math.floor(context.sampleRate * .5));
      noise = context.createBuffer(1, length, context.sampleRate);
      const data = noise.getChannelData(0);
      let value = 17;
      for (let index = 0; index < data.length; index += 1) { value = (value * 48271) % (2147 * 1000000 + 483647); data[index] = value / (2147 * 1000000 + 483647) * 2 - 1; }
      return noise;
    }
    function noiseHit(destination, start, duration, frequencyHz, level, filterType) {
      const source = track(context.createBufferSource());
      const filter = context.createBiquadFilter();
      const amp = envelope(destination, start, duration, level, .001, duration * .8);
      source.buffer = noiseBuffer(); filter.type = filterType || 'bandpass'; filter.frequency.value = frequencyHz;
      source.connect(filter); filter.connect(amp.gain); source.start(start); source.stop(amp.end + .01);
    }
    function percussion(event, start, duration, velocity) {
      const destination = bus(event.lane === 'click' ? 'click' : 'drums');
      if (event.instrument === 'kick') {
        const source = track(context.createOscillator()); const amp = envelope(destination, start, .18, .28 * velocity, .001, .15);
        source.type = 'sine'; source.frequency.setValueAtTime(118, start); source.frequency.exponentialRampToValueAtTime(46, start + .13);
        source.connect(amp.gain); source.start(start); source.stop(start + .2); return;
      }
      if (event.instrument === 'snare') { noiseHit(destination, start, .14, 1700, .16 * velocity); oscillator(destination, 54, start, .08, .035 * velocity, 'triangle'); return; }
      if (event.instrument === 'tom') { oscillator(destination, 43, start, .18, .11 * velocity, 'sine'); return; }
      if (event.instrument === 'click') { oscillator(destination, 91, start, .035, .07 * velocity, 'sine'); return; }
      noiseHit(destination, start, Math.min(.07, duration), 6800, .05 * velocity, 'highpass');
    }
    function tonal(event, start, duration, velocity) {
      const notes = Array.isArray(event.notes) && event.notes.length ? event.notes.slice(0, event.lane === 'bass' ? 1 : 6) : [60];
      const destination = bus(event.lane === 'bass' ? 'bass' : 'harmony');
      notes.forEach((note, index) => oscillator(destination, note, start, duration, (event.lane === 'bass' ? .13 : .035) * velocity / Math.sqrt(notes.length), event.lane === 'bass' ? 'triangle' : (event.instrument === 'pad' ? 'sine' : 'triangle'), index % 2 ? 3 : -3));
    }
    function render(event = {}, start, secondsPerTick) {
      const duration = Math.max(.025, Number(event.durationTicks || 1) * Number(secondsPerTick || .01));
      const velocity = clamp(event.velocity ?? .6, .05, 1);
      if (event.lane === 'drums' || event.lane === 'click') percussion(event, start, duration, velocity);
      else tonal(event, start, duration, velocity);
    }
    function stop(when = context.currentTime) {
      active.forEach((source) => { try { source.stop(when); } catch (_) {} try { source.disconnect(); } catch (_) {} });
      active.clear();
    }
    return Object.freeze({ render, stop, activeCount: () => active.size });
  }

  root.SynthVoices = Object.freeze({ create });
})(typeof globalThis !== 'undefined' ? globalThis : this);
