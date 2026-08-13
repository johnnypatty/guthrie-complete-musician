import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/recording-controller.js');
const RecordingController = globalThis.RecordingController;

function clock() {
  let id = 0;
  const timers = new Map();
  return { timers, setTimeout(fn, ms) { timers.set(++id, { fn, ms }); return id; }, clearTimeout(key) { timers.delete(key); }, run(ms) { const item = [...timers].find(([, value]) => value.ms === ms); if (item) { timers.delete(item[0]); item[1].fn(); } } };
}

class Recorder {
  static isTypeSupported(type) { return type === 'audio/webm;codecs=opus'; }
  constructor(stream, options) { this.stream = stream; this.mimeType = options.mimeType; this.state = 'inactive'; }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['take'], { type: 'audio/webm' }) }); this.onstop?.(); }
}

test('reports unsupported recording without disturbing input', () => {
  const controller = RecordingController.create({ MediaRecorder: null, store: {} });
  assert.equal(controller.snapshot().status, 'unsupported');
});

test('counts down, chooses a supported MIME, manually/hard stops, and never stops borrowed tracks', async () => {
  const fakeClock = clock();
  const saved = [];
  const track = { stopped: false, stop() { this.stopped = true; } };
  const stream = { getTracks: () => [track] };
  const controller = RecordingController.create({ MediaRecorder: Recorder, clock: fakeClock, store: { async save(value) { saved.push(value); return { status: 'saved', reference: { recordingRef: value.id } }; } } });
  controller.start(stream, { id: 'take-a', exerciseId: 'timing' });
  assert.equal(controller.snapshot().status, 'countdown');
  fakeClock.run(3000);
  assert.equal(controller.snapshot().status, 'recording');
  assert.equal(controller.snapshot().mimeType, 'audio/webm;codecs=opus');
  controller.stop();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(saved.length, 1);
  assert.equal(track.stopped, false);

  controller.start(stream, { id: 'take-b' }); fakeClock.run(3000); fakeClock.run(60000);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(saved.length, 2);
});

test('uses actual blob MIME, revokes URLs, and enforces sequential A/B playback', async () => {
  const urls = [];
  const revoked = [];
  let paused = 0;
  const audioFactory = () => ({ play() { return Promise.resolve(); }, pause() { paused += 1; }, onended: null });
  const controller = RecordingController.create({ MediaRecorder: Recorder, store: { async get(id) { return { id, blob: new Blob([id], { type: 'audio/ogg' }) }; } }, urlApi: { createObjectURL(blob) { const url = `blob:${blob.type}:${urls.length}`; urls.push(url); return url; }, revokeObjectURL(url) { revoked.push(url); } }, audioFactory });
  await controller.play('a');
  await controller.play('b');
  assert.equal(paused, 1);
  assert.equal(revoked.length, 1);
  const exported = await controller.exportTake('a');
  assert.match(exported.filename, /\.ogg$/);
  controller.deactivate();
  assert.ok(revoked.length >= 2);
});
