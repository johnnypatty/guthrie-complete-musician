import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/audio-runtime.js');
const Runtime = globalThis.AudioRuntime;

class Param { constructor() { this.value = 0; } }
class Node { connect(target) { this.target = target; return target; } disconnect() { this.disconnected = true; } stop() { this.stopped = true; } }
class Context {
  static constructions = 0;
  constructor() { Context.constructions += 1; this.currentTime = 1.25; this.state = 'suspended'; this.destination = new Node(); this.closed = false; }
  createGain() { const node = new Node(); node.gain = new Param(); return node; }
  async resume() { this.state = 'running'; }
  async close() { this.closed = true; }
}

function timers() {
  let id = 0;
  const pending = new Map();
  return { pending, setTimeout(callback, delay) { pending.set(++id, { callback, delay }); return id; }, clearTimeout(key) { pending.delete(key); }, flush() { const values = [...pending.values()]; pending.clear(); values.forEach(({ callback }) => callback()); } };
}

test('creates context/output only after explicit activation and shares one exact clock', async () => {
  Context.constructions = 0;
  const runtime = Runtime.create({ AudioContextClass: Context, timers: timers(), eventTarget: { addEventListener() {} } });
  assert.equal(Context.constructions, 0);
  assert.equal(runtime.status(), 'stopped');
  const first = await runtime.activate();
  const second = await runtime.activate();
  assert.equal(Context.constructions, 1);
  assert.equal(first, second);
  assert.equal(runtime.audioTime(), 1.25);
  assert.equal(runtime.createBus('backing').context, first);
  assert.equal(runtime.createBus('analysis').context, first);
});

test('delivers exact scheduled audioTime and cancels callbacks after stop', async () => {
  const fakeTimers = timers();
  const runtime = Runtime.create({ AudioContextClass: Context, timers: fakeTimers, eventTarget: { addEventListener() {} } });
  await runtime.activate();
  const events = [];
  runtime.schedule((payload) => events.push(payload), { beat: 3 }, 1.75);
  assert.equal(fakeTimers.pending.values().next().value.delay, 500);
  fakeTimers.flush();
  assert.deepEqual(events, [{ beat: 3, audioTime: 1.75 }]);
  runtime.schedule((payload) => events.push(payload), { beat: 4 }, 2);
  runtime.stop();
  fakeTimers.flush();
  assert.equal(events.length, 1);
  assert.equal(runtime.status(), 'stopped');
});

test('cleans partial graph construction failure and remains safely stopped', async () => {
  class Broken extends Context {
    createGain() { throw new Error('graph failed'); }
  }
  const runtime = Runtime.create({ AudioContextClass: Broken, timers: timers(), eventTarget: { addEventListener() {} } });
  await assert.rejects(runtime.activate(), /graph failed/);
  assert.equal(runtime.status(), 'stopped');
  assert.equal(runtime.context(), null);
});
