import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/music-theory.js');
await import('../src/js/player-timeline.js');
await import('../src/js/progression-engine.js');
await import('../src/js/voicing-engine.js');
await import('../src/js/bass-arranger.js');
await import('../src/js/groove-patterns.js');
await import('../src/js/groove-engine.js');
await import('../src/js/synth-voices.js');
await import('../src/js/audio-runtime.js');
await import('../src/js/audio-engine.js');
const AudioEngine = globalThis.AudioEngine;

class AudioParamFake {
  constructor(value = 0) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
}

class AudioNodeFake {
  constructor() { this.stopCount = 0; this.disconnected = false; }
  connect(destination) { this.destination = destination; return destination; }
  disconnect() { this.disconnected = true; }
  addEventListener() {}
  start() { this.started = true; }
  stop() { this.stopCount += 1; }
}

class FakeAudioContext {
  static last = null;
  constructor() {
    FakeAudioContext.last = this;
    this.currentTime = 0;
    this.state = 'suspended';
    this.sampleRate = 8000;
    this.destination = new AudioNodeFake();
    this.gains = [];
    this.sources = [];
  }
  async resume() { this.state = 'running'; }
  createGain() { const node = new AudioNodeFake(); node.gain = new AudioParamFake(); this.gains.push(node); return node; }
  createDynamicsCompressor() {
    const node = new AudioNodeFake();
    for (const field of ['threshold', 'knee', 'ratio', 'attack', 'release']) node[field] = new AudioParamFake();
    return node;
  }
  createOscillator() {
    const node = new AudioNodeFake();
    node.frequency = new AudioParamFake();
    node.detune = new AudioParamFake();
    this.sources.push(node);
    return node;
  }
  createBuffer(_channels, length) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    const node = new AudioNodeFake();
    this.sources.push(node);
    return node;
  }
  createBiquadFilter() {
    const node = new AudioNodeFake();
    node.frequency = new AudioParamFake();
    return node;
  }
}

function createTimers() {
  let id = 0;
  const intervals = new Map();
  const timeouts = new Map();
  return {
    intervals,
    timeouts,
    setInterval(callback) { id += 1; intervals.set(id, callback); return id; },
    clearInterval(timerId) { intervals.delete(timerId); },
    setTimeout(callback) { id += 1; timeouts.set(id, callback); return id; },
    clearTimeout(timerId) { timeouts.delete(timerId); },
    flushIntervals() { [...intervals.values()].forEach((callback) => callback()); },
    flushTimeouts() { const callbacks = [...timeouts.values()]; timeouts.clear(); callbacks.forEach((callback) => callback()); }
  };
}

function testTrack() {
  return {
    beatsPerBar: 4,
    progression: [
      { chord: 'Dm7', beats: 4, section: 'A' },
      { chord: 'G7', beats: 4, section: 'A' }
    ]
  };
}

test('count-in transitions to playing and reports transport position', async () => {
  const timers = createTimers();
  const handlers = {};
  const events = [];
  const engine = AudioEngine.create({
    AudioContextClass: FakeAudioContext,
    timers,
    eventTarget: { addEventListener(name, handler) { handlers[name] = handler; } }
  });

  await engine.start({
    track: testTrack(), bpm: 120, loopStartBeat: 0, loopEndBeat: 8,
    countInBars: 1, levels: { pad: .7, bass: .7, drums: .6, master: .8 },
    onTransport: (event) => events.push(event)
  });
  timers.flushTimeouts();
  assert.equal(events[0].phase, 'count-in');
  assert.equal(typeof events[0].audioTime, 'number');

  FakeAudioContext.last.currentTime = 3;
  timers.flushIntervals();
  timers.flushTimeouts();
  assert.ok(events.some((event) => event.phase === 'playing' && event.bar === 1));
  assert.equal(engine.isPlaying(), true);

  handlers.pagehide();
  assert.equal(engine.isPlaying(), false);
});

test('large background clock jumps resynchronize without stale scheduling bursts', async () => {
  const timers = createTimers();
  const events = [];
  const engine = AudioEngine.create({ AudioContextClass: FakeAudioContext, timers, eventTarget: { addEventListener() {} } });
  await engine.start({ track: testTrack(), bpm: 120, loopStartBeat: 0, loopEndBeat: 8, countInBars: 0, onTransport: (event) => events.push(event) });
  timers.flushTimeouts();
  const sourcesBefore = FakeAudioContext.last.sources.length;
  FakeAudioContext.last.currentTime = 60;
  timers.flushIntervals();
  timers.flushTimeouts();
  assert.ok(FakeAudioContext.last.sources.length - sourcesBefore < 20, 'must skip stale subdivisions instead of bursting them');
  assert.ok(events.at(-1).audioTime >= 60);
});

test('clamps voice and master levels and stop cancels timers and sources', async () => {
  const timers = createTimers();
  const engine = AudioEngine.create({
    AudioContextClass: FakeAudioContext,
    timers,
    eventTarget: { addEventListener() {} }
  });

  await engine.start({
    track: testTrack(), bpm: 120, loopStartBeat: 0, loopEndBeat: 8, countInBars: 0,
    levels: { pad: 2, bass: -1, drums: .5, master: 1.5 }
  });

  const context = FakeAudioContext.last;
  assert.deepEqual(context.gains.slice(0, 4).map((node) => node.gain.value), [1, 1, 0, .5]);
  assert.equal(timers.intervals.size, 1);
  assert.ok(context.sources.length > 0);

  engine.stop();

  assert.equal(timers.intervals.size, 0);
  assert.equal(timers.timeouts.size, 0);
  assert.ok(context.sources.every((node) => node.stopCount >= 1 && node.disconnected));
});

test('transport renders compiler events without making harmony decisions', async () => {
  const timers = createTimers();
  const rendered = [];
  const engine = AudioEngine.create({
    AudioContextClass: FakeAudioContext, timers, eventTarget: { addEventListener() {} },
    rendererFactory: () => ({ render(event, time) { rendered.push({ event, time }); }, stop() {} })
  });
  await engine.start({ track: testTrack(), bpm: 120, loopStartBeat: 0, loopEndBeat: 8, countInBars: 0 });
  assert.ok(rendered.some(({ event }) => event.lane === 'harmony' && event.sourceEventIndex === 0));
  assert.ok(rendered.some(({ event }) => event.lane === 'bass'));
  assert.ok(rendered.some(({ event }) => event.lane === 'drums'));
});

test('grouped count-in accents 7/8 groups and tempo waits for a loop boundary', async () => {
  const timers = createTimers(); const rendered = [];
  const engine = AudioEngine.create({
    AudioContextClass: FakeAudioContext, timers, eventTarget: { addEventListener() {} },
    rendererFactory: () => ({ render(event, time) { rendered.push({ event, time }); }, stop() {} })
  });
  const track = { bpm: 120, title: 'Seven', style: 'fusion', meterObject: { numerator: 7, denominator: 8, groups: [2, 2, 3], tempoUnit: 8 }, progression: [{ chord: 'Em7', pulses: 7, section: 'A' }] };
  await engine.start({ track, bpm: 120, countInBars: 1 });
  const clicks = rendered.filter(({ event }) => event.lane === 'click');
  assert.equal(clicks.length, 7);
  assert.deepEqual(clicks.filter(({ event }) => event.velocity > .7).map(({ event }) => event.countInPulse), [1, 3, 5]);
  const before = engine.tempo(); engine.setTempo(160);
  assert.equal(engine.tempo(), before);
  FakeAudioContext.last.currentTime = 8;
  timers.flushIntervals();
  assert.equal(engine.tempo(), 160);
});
