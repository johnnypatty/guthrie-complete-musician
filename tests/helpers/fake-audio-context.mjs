export class FakeParam {
  constructor(value = 0) { this.value = value; this.events = []; }
  record(method, value, time, extra) { this.value = value; this.events.push({ method, value, time, extra }); }
  setValueAtTime(value, time) { this.record('set', value, time); }
  linearRampToValueAtTime(value, time) { this.record('linear', value, time); }
  exponentialRampToValueAtTime(value, time) {
    if (!(value > 0)) throw new Error('exponential automation requires a positive value');
    this.record('exponential', value, time);
  }
  setTargetAtTime(value, time, constant) { this.record('target', value, time, constant); }
}

export class FakeNode {
  constructor(type, context) { this.type = type; this.context = context; this.connections = []; this.stopCount = 0; }
  connect(destination) { this.connections.push(destination); return destination; }
  disconnect() { this.disconnected = true; }
  addEventListener(name, handler) { if (name === 'ended') this.onended = handler; }
  start(time = 0) { this.startedAt = time; }
  stop(time = 0) { this.stoppedAt = time; this.stopCount += 1; this.onended?.(); }
}

export class FakeAudioContext {
  static last;
  constructor() {
    FakeAudioContext.last = this; this.currentTime = 0; this.state = 'suspended'; this.sampleRate = 8000;
    this.destination = new FakeNode('destination', this); this.nodes = []; this.buffers = [];
  }
  node(type) { const node = new FakeNode(type, this); this.nodes.push(node); return node; }
  async resume() { this.state = 'running'; }
  createGain() { const node = this.node('gain'); node.gain = new FakeParam(1); return node; }
  createDynamicsCompressor() { const node = this.node('compressor'); ['threshold', 'knee', 'ratio', 'attack', 'release'].forEach((key) => { node[key] = new FakeParam(); }); return node; }
  createOscillator() { const node = this.node('oscillator'); node.frequency = new FakeParam(); node.detune = new FakeParam(); return node; }
  createBuffer(channels, length, rate) { const data = new Float32Array(length); const buffer = { channels, length, rate, getChannelData: () => data }; this.buffers.push(buffer); return buffer; }
  createBufferSource() { return this.node('buffer-source'); }
  createBiquadFilter() { const node = this.node('filter'); node.frequency = new FakeParam(); node.Q = new FakeParam(); return node; }
}

export function fakeTimers() {
  let id = 0; const intervals = new Map(); const timeouts = new Map();
  return {
    intervals, timeouts,
    setInterval(callback) { const key = ++id; intervals.set(key, callback); return key; },
    clearInterval(key) { intervals.delete(key); },
    setTimeout(callback) { const key = ++id; timeouts.set(key, callback); return key; },
    clearTimeout(key) { timeouts.delete(key); },
    flushIntervals() { [...intervals.values()].forEach((callback) => callback()); },
    flushTimeouts() { const pending = [...timeouts.values()]; timeouts.clear(); pending.forEach((callback) => callback()); }
  };
}
