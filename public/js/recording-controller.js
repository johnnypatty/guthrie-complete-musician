(function (root) {
  'use strict';

  const CANDIDATE_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  function create(options = {}) {
    const RecorderClass = options.MediaRecorder ?? root.MediaRecorder;
    const clock = options.clock || root;
    const urlApi = options.urlApi || root.URL;
    const audioFactory = options.audioFactory || (() => new root.Audio());
    const store = options.store;
    let recorder = null;
    let chunks = [];
    let metadata = null;
    let countdownTimer = null;
    let hardStopTimer = null;
    let startedAt = 0;
    let activeAudio = null;
    let activeUrl = null;
    let listeners = new Set();
    let model = { status: RecorderClass ? 'idle' : 'unsupported', countdown: 0, elapsedSeconds: 0, mimeType: '', message: RecorderClass ? 'Ready for a short local take.' : 'Recording is unavailable in this browser.' };
    function snapshot() { return { ...model }; }
    function publish() { listeners.forEach((listener) => listener(snapshot())); }
    function supportedType() { return CANDIDATE_TYPES.find((type) => RecorderClass?.isTypeSupported?.(type)) || ''; }
    function finish() {
      const actualType = chunks.find((chunk) => chunk.type)?.type || recorder?.mimeType || model.mimeType || 'audio/webm';
      const blob = new Blob(chunks, { type: actualType });
      const durationSeconds = Math.min(60, Math.max(0, (Date.now() - startedAt) / 1000));
      store.save({ id: metadata.id, blob, metadata: { ...metadata, durationSeconds, mimeType: actualType } }).then((saved) => {
        model = { ...model, status: saved.status === 'saved' ? 'saved' : saved.status, elapsedSeconds: durationSeconds, mimeType: actualType, message: saved.status === 'saved' ? 'Take saved locally.' : 'Take could not be saved.' };
        publish();
      });
    }
    function begin(stream) {
      chunks = [];
      const mimeType = supportedType();
      recorder = new RecorderClass(stream, mimeType ? { mimeType } : {});
      recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
      recorder.onstop = finish;
      recorder.start(); startedAt = Date.now();
      model = { ...model, status: 'recording', countdown: 0, mimeType: recorder.mimeType || mimeType, message: 'Recording locally…' };
      hardStopTimer = clock.setTimeout(stop, 60000); publish();
    }
    function start(stream, takeMetadata = {}) {
      if (!RecorderClass) return snapshot();
      if (!stream || typeof takeMetadata.id !== 'string' || !takeMetadata.id) throw new Error('A connected input and take id are required.');
      stopPlayback(); metadata = structuredClone(takeMetadata);
      model = { ...model, status: 'countdown', countdown: 3, message: 'Recording starts in 3…' }; publish();
      countdownTimer = clock.setTimeout(() => begin(stream), 3000);
      return snapshot();
    }
    function stop() {
      if (countdownTimer) clock.clearTimeout(countdownTimer); countdownTimer = null;
      if (hardStopTimer) clock.clearTimeout(hardStopTimer); hardStopTimer = null;
      if (recorder?.state === 'recording') recorder.stop();
      else if (model.status === 'countdown') { model = { ...model, status: 'idle', countdown: 0, message: 'Recording cancelled.' }; publish(); }
    }
    function stopPlayback() {
      activeAudio?.pause?.(); activeAudio = null;
      if (activeUrl) urlApi?.revokeObjectURL?.(activeUrl);
      activeUrl = null;
    }
    async function play(id) {
      const record = await store.get(id);
      if (!record?.blob) throw new Error('Recording audio is unavailable.');
      stopPlayback(); activeUrl = urlApi.createObjectURL(record.blob); activeAudio = audioFactory(activeUrl); if ('src' in activeAudio) activeAudio.src = activeUrl;
      activeAudio.onended = stopPlayback;
      await activeAudio.play();
      model = { ...model, status: 'playing', message: `Playing ${id}.` }; publish(); return activeAudio;
    }
    async function exportTake(id) {
      const record = await store.get(id);
      if (!record?.blob) throw new Error('Recording audio is unavailable.');
      const type = record.blob.type || record.mimeType || 'audio/webm';
      const extension = type.includes('ogg') ? 'ogg' : (type.includes('mp4') ? 'm4a' : 'webm');
      return { blob: record.blob, filename: `${id}.${extension}`, mimeType: type };
    }
    function subscribe(listener) { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener); }
    function deactivate() { stop(); stopPlayback(); }
    return Object.freeze({ start, stop, play, exportTake, deactivate, subscribe, snapshot });
  }
  root.RecordingController = Object.freeze({ create, CANDIDATE_TYPES });
})(typeof globalThis !== 'undefined' ? globalThis : this);
