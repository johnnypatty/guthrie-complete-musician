import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/analysis-controller.js');
const Controller = globalThis.AnalysisController;

function createHarness(pitch = { status: 'ready', note: 'A3', cents: 3, frequency: 220, confidence: 0.95 }) {
  const callbacks = [];
  const input = {
    async connect() { return { status: 'connected', deviceLabel: 'GP-200 USB Audio' }; },
    disconnect() {},
    snapshot() { return { status: 'connected', deviceLabel: 'GP-200 USB Audio' }; },
    readFrame() { return new Float32Array([0, 0.2, -0.2, 0]); }
  };
  let now = 0;
  const controller = Controller.create({
    input,
    pitchDetector: { analyse() { return pitch; } },
    signalFeatures: { frame() { return { rms: 0.14, peak: 0.2, clipping: false, clippingRatio: 0, onsetCandidate: false, spectrum: [] }; } },
    raf(fn) { callbacks.push(fn); return callbacks.length; },
    cancelRaf() {},
    now: () => now,
    setNow(value) { now = value; }
  });
  return { controller, callbacks, setNow(value) { now = value; } };
}

test('explains GP-200 clean-preset setup before an explicit connection', () => {
  const { controller } = createHarness();
  const model = controller.snapshot();
  assert.match(model.guidance, /GP-200/i);
  assert.match(model.guidance, /clean|delay|chorus/i);
  assert.equal(model.status, 'idle');
});

test('reports useful level, clipping, noise, and pitch text at a throttled visual rate', async () => {
  const { controller, callbacks, setNow } = createHarness();
  const updates = [];
  controller.subscribe((model) => updates.push(model));
  await controller.connect();
  setNow(100); callbacks.shift()();
  setNow(120); callbacks.shift()();
  setNow(250); callbacks.shift()();
  const measured = updates.filter((model) => model.pitch?.note);
  assert.equal(measured.length, 2);
  assert.equal(measured.at(-1).pitch.note, 'A3');
  assert.match(measured.at(-1).levelText, /input level/i);
  assert.match(measured.at(-1).clippingText, /safe/i);
});

test('calibrates local noise and uses non-chattering live-region messages', async () => {
  const { controller, callbacks, setNow } = createHarness();
  await controller.connect();
  controller.beginNoiseCalibration();
  for (const time of [100, 250, 400, 550, 700]) { setNow(time); callbacks.shift()(); }
  const model = controller.snapshot();
  assert.ok(model.calibration.noiseFloorRms > 0);
  assert.match(model.noiseText, /calibrated/i);
  assert.ok(model.liveMessage.length < 100);
});

test('shows rejected-score explanations instead of forcing a note', async () => {
  const { controller, callbacks, setNow } = createHarness({ status: 'insufficient', reason: 'clipping', confidence: 0.2, note: null });
  await controller.connect();
  setNow(100); callbacks.shift()();
  const model = controller.snapshot();
  assert.equal(model.pitch, null);
  assert.match(model.measurementText, /clipping|lower/i);
});
