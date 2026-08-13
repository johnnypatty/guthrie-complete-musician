import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/input-manager.js');
const Manager = globalThis.InputManager;

function harness(error = null) {
  const listeners = {};
  const track = { stopped: false, addEventListener(type, fn) { listeners[type] = fn; }, stop() { this.stopped = true; } };
  const stream = { getTracks: () => [track] };
  const calls = [];
  const source = { targets: [], connect(node) { this.targets.push(node); }, disconnect() { this.targets = []; } };
  const analyser = { fftSize: 0, disconnect() {} };
  const context = { createMediaStreamSource() { return source; }, createAnalyser() { return analyser; } };
  const runtime = { async activate() { return context; }, createBus() { return { node: { gain: { value: 0 } } }; } };
  const mediaDevices = {
    async getUserMedia(constraints) { calls.push(constraints); if (error) throw error; return stream; },
    async enumerateDevices() { return [{ kind: 'audioinput', deviceId: 'gp200', label: 'GP-200 USB Audio' }]; }
  };
  const eventTarget = { addEventListener(type, fn) { listeners[type] = fn; } };
  return { manager: Manager.create({ mediaDevices, runtime, eventTarget }), calls, track, listeners, source, analyser, stream };
}

test('mount is inert and explicit connect owns a muted analysis-only stream', async () => {
  const h = harness();
  assert.equal(h.calls.length, 0);
  assert.equal(h.manager.snapshot().status, 'disconnected');
  await h.manager.connect();
  assert.equal(h.calls.length, 1);
  assert.equal(h.manager.snapshot().status, 'connected');
  assert.equal(h.manager.snapshot().deviceLabel, 'GP-200 USB Audio');
  assert.equal(h.source.targets.length, 1);
  assert.equal(h.source.targets[0], h.analyser);
  assert.equal(h.manager.snapshot().monitoring, false);
});

for (const [name, status] of [['NotAllowedError', 'permission-denied'], ['NotFoundError', 'no-device'], ['NotReadableError', 'device-busy']]) {
  test(`isolates ${name} as ${status}`, async () => {
    const error = Object.assign(new Error(name), { name });
    const h = harness(error);
    await assert.rejects(h.manager.connect());
    assert.equal(h.manager.snapshot().status, status);
  });
}

test('device selection is explicit and disconnect/route/pagehide/ended/failure stop tracks', async () => {
  for (const trigger of ['disconnect', 'deactivate', 'pagehide', 'ended', 'failure']) {
    const h = harness();
    await h.manager.connect();
    if (trigger === 'disconnect') h.manager.disconnect();
    if (trigger === 'deactivate') h.manager.deactivate();
    if (trigger === 'pagehide') h.listeners.pagehide();
    if (trigger === 'ended') h.listeners.ended();
    if (trigger === 'failure') h.manager.fail(new Error('analysis failed'));
    assert.equal(h.track.stopped, true, trigger);
    assert.notEqual(h.manager.snapshot().status, 'connected', trigger);
  }
});

test('monitoring requires an explicit warned action and borrowed streams remain manager-owned', async () => {
  const h = harness();
  await h.manager.connect();
  assert.throws(() => h.manager.setMonitoring(true), /warning/i);
  h.manager.setMonitoring(true, { warningAccepted: true });
  assert.equal(h.manager.snapshot().monitoring, true);
  assert.equal(h.manager.borrowStream(), h.stream);
  assert.equal(h.track.stopped, false);
  h.manager.disconnect();
  assert.equal(h.track.stopped, true);
});

test('route deactivation cancels a pending permission request and stops a late stream', async () => {
  let resolvePermission;
  const lateTrack = { stopped: false, stop() { this.stopped = true; }, addEventListener() {} };
  const lateStream = { getTracks: () => [lateTrack] };
  const mediaDevices = {
    getUserMedia() { return new Promise((resolve) => { resolvePermission = resolve; }); },
    async enumerateDevices() { return []; }
  };
  let activated = 0;
  const runtime = { async activate() { activated += 1; return {}; } };
  const manager = Manager.create({ mediaDevices, runtime, eventTarget: { addEventListener() {} } });

  const pending = manager.connect();
  manager.deactivate();
  resolvePermission(lateStream);

  await assert.rejects(pending, /cancelled/i);
  assert.equal(lateTrack.stopped, true);
  assert.equal(activated, 0);
  assert.equal(manager.snapshot().status, 'disconnected');
  assert.equal(manager.borrowStream(), null);
});
