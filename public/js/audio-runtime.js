(function (root) {
  'use strict';

  function create(deps = {}) {
    const timers = deps.timers || { setTimeout: (...args) => root.setTimeout(...args), clearTimeout: (id) => root.clearTimeout(id) };
    const eventTarget = deps.eventTarget || root;
    let audioContext = null;
    let master = null;
    let state = 'stopped';
    let generation = 0;
    const callbacks = new Set();
    const buses = new Map();
    const sources = new Set();

    function ContextClass() { return deps.AudioContextClass || root.AudioContext || root.webkitAudioContext; }
    async function activate() {
      if (audioContext) { if (audioContext.state === 'suspended') await audioContext.resume(); state = 'active'; return audioContext; }
      const AudioContextClass = ContextClass();
      if (!AudioContextClass) throw new Error('This browser does not support Web Audio.');
      let next = null;
      try {
        next = new AudioContextClass();
        const nextMaster = next.createGain();
        nextMaster.connect(next.destination);
        if (next.state === 'suspended') await next.resume();
        audioContext = next; master = nextMaster; state = 'active'; return audioContext;
      } catch (error) {
        try { await next?.close?.(); } catch (_) { /* best-effort partial cleanup */ }
        audioContext = null; master = null; state = 'stopped'; throw error;
      }
    }
    function createBus(name) {
      if (!audioContext || !master) throw new Error('Activate audio from a user gesture first.');
      if (!buses.has(name)) { const node = audioContext.createGain(); node.connect(master); buses.set(name, node); }
      return { context: audioContext, node: buses.get(name), master };
    }
    function schedule(callback, payload, audioTime) {
      if (!audioContext || state !== 'active') throw new Error('Audio runtime is not active.');
      const exact = Number(audioTime);
      if (!Number.isFinite(exact)) throw new Error('A finite scheduled audio time is required.');
      const token = generation;
      const timer = timers.setTimeout(() => { callbacks.delete(timer); if (token === generation && state === 'active') callback({ ...payload, audioTime: exact }); }, Math.max(0, (exact - audioContext.currentTime) * 1000));
      callbacks.add(timer); return timer;
    }
    function track(source) { sources.add(source); source.addEventListener?.('ended', () => sources.delete(source), { once: true }); return source; }
    function stop() {
      generation += 1;
      callbacks.forEach((id) => timers.clearTimeout(id)); callbacks.clear();
      sources.forEach((source) => { try { source.stop(); } catch (_) {} try { source.disconnect(); } catch (_) {} }); sources.clear();
      state = 'stopped';
    }
    async function close() {
      stop(); buses.forEach((node) => { try { node.disconnect(); } catch (_) {} }); buses.clear();
      try { master?.disconnect(); } catch (_) {}
      try { await audioContext?.close?.(); } catch (_) {}
      master = null; audioContext = null;
    }
    function audioTime() { return audioContext?.currentTime ?? 0; }
    function context() { return audioContext; }
    function status() { return state; }
    if (eventTarget?.addEventListener) { eventTarget.addEventListener('pagehide', close); eventTarget.addEventListener('beforeunload', stop); }
    return Object.freeze({ activate, createBus, schedule, track, stop, close, audioTime, context, status });
  }

  root.AudioRuntime = Object.freeze({ create });
})(typeof globalThis !== 'undefined' ? globalThis : this);
