(function (root) {
  'use strict';

  const REASON_COPY = {
    'level-too-low': 'No stable note: play one clean sustained note a little louder.',
    clipping: 'No score: clipping detected. Lower the GP-200 USB or preset output.',
    'low-confidence': 'No stable note. Use a clean preset and disable delay, reverb, chorus, octave, and backing audio.',
    'frequency-out-of-range': 'No stable guitar note in the supported range.',
    'invalid-input': 'The input frame could not be analysed.'
  };

  function create(options = {}) {
    const input = options.input;
    const pitchDetector = options.pitchDetector || root.PitchDetector;
    const signalFeatures = options.signalFeatures || root.SignalFeatures;
    const raf = options.raf || ((callback) => root.requestAnimationFrame(callback));
    const cancelRaf = options.cancelRaf || ((id) => root.cancelAnimationFrame(id));
    const now = options.now || (() => root.performance?.now?.() || Date.now());
    const sampleRate = options.sampleRate || (() => input.sampleRate?.() || 48000);
    let rafId = null;
    let listeners = new Set();
    let lastVisualMs = -Infinity;
    let lastLiveStatus = '';
    let priorSpectrum = null;
    let calibrationFrames = [];
    let calibrationStarted = null;
    let calibration = { noiseFloorRms: 0, referenceHz: 440 };
    let model = {
      status: 'idle',
      guidance: 'For best results, select GP-200 USB Audio and use a clean or lightly driven preset. Disable delay, reverb, chorus, octave, and backing audio.',
      deviceLabel: '', pitch: null, level: 0, clipping: false,
      levelText: 'Input level: waiting', clippingText: 'Clipping: not measured', noiseText: 'Noise floor: not calibrated',
      measurementText: 'Nothing is listening yet.', liveMessage: 'Guitar input is off.', calibration: { ...calibration }
    };
    function snapshot() { return { ...model, calibration: { ...model.calibration }, pitch: model.pitch ? { ...model.pitch } : null }; }
    function publish(force = false) { if (force || now() - lastVisualMs >= 100) { lastVisualMs = now(); listeners.forEach((listener) => listener(snapshot())); } }
    function setLive(message) { if (message !== lastLiveStatus) { lastLiveStatus = message; model.liveMessage = message; } }
    function loop() {
      if (model.status !== 'connected') return;
      try {
        const samples = input.readFrame();
        if (samples) {
          const features = signalFeatures.frame(samples, sampleRate(), { previousSpectrum: priorSpectrum, timeMs: now() });
          priorSpectrum = features.spectrum;
          const pitch = pitchDetector.analyse(samples, sampleRate(), calibration);
          model.level = features.rms;
          model.clipping = features.clipping;
          model.levelText = `Input level: ${Math.round(features.rms * 100)}%`;
          model.clippingText = features.clipping ? 'Clipping: lower the input' : 'Clipping: safe';
          if (calibrationStarted !== null) {
            calibrationFrames.push(features.rms);
            if (now() - calibrationStarted >= 500 && calibrationFrames.length >= 3) {
              calibration.noiseFloorRms = [...calibrationFrames].sort((a, b) => a - b)[Math.floor(calibrationFrames.length / 2)];
              calibrationStarted = null;
              model.calibration = { ...calibration };
              model.noiseText = `Noise floor calibrated: ${(calibration.noiseFloorRms * 100).toFixed(1)}%`;
              setLive('Noise calibration complete.');
            }
          }
          if (pitch.status === 'ready') {
            model.pitch = pitch;
            model.measurementText = `${pitch.note}, ${pitch.cents >= 0 ? '+' : ''}${pitch.cents.toFixed(1)} cents`;
            setLive(`Stable note ${pitch.note}.`);
          } else {
            model.pitch = null;
            model.measurementText = REASON_COPY[pitch.reason] || 'No stable note.';
            setLive(model.measurementText);
          }
          publish();
        }
      } catch (error) {
        input.fail?.(error);
        model.status = 'analysis-failed'; model.measurementText = error.message || 'Analysis failed.'; publish(true); return;
      }
      rafId = raf(loop);
    }
    async function connect() {
      model.status = 'connecting'; publish(true);
      try {
        const connected = await input.connect();
        model.status = 'connected'; model.deviceLabel = connected.deviceLabel; model.measurementText = 'Play one clean sustained note.'; setLive(`Connected to ${connected.deviceLabel}.`); publish(true);
        rafId = raf(loop); return snapshot();
      } catch (error) {
        model.status = input.snapshot().status; model.measurementText = error.message || 'Input unavailable.'; setLive(model.measurementText); publish(true); throw error;
      }
    }
    function disconnect() { if (rafId !== null) cancelRaf(rafId); rafId = null; input.disconnect(); model.status = 'idle'; model.pitch = null; model.measurementText = 'Nothing is listening.'; setLive('Guitar input disconnected.'); publish(true); }
    function beginNoiseCalibration() { calibrationFrames = []; calibrationStarted = now(); model.noiseText = 'Noise calibration: mute the strings and stay quiet…'; setLive('Noise calibration started.'); publish(true); }
    function subscribe(listener) { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener); }
    return Object.freeze({ connect, disconnect, deactivate: disconnect, beginNoiseCalibration, subscribe, snapshot });
  }

  root.AnalysisController = Object.freeze({ create });
})(typeof globalThis !== 'undefined' ? globalThis : this);
