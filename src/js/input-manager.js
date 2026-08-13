(function (root) {
  'use strict';

  const ERROR_STATES = { NotAllowedError: 'permission-denied', NotFoundError: 'no-device', NotReadableError: 'device-busy', AbortError: 'device-busy' };

  function create(options = {}) {
    const mediaDevices = options.mediaDevices || root.navigator?.mediaDevices;
    const runtime = options.runtime;
    const eventTarget = options.eventTarget || root;
    let stream = null;
    let source = null;
    let analyser = null;
    let monitorNode = null;
    let connectionGeneration = 0;
    let state = { status: 'disconnected', deviceId: '', deviceLabel: '', devices: [], monitoring: false, reason: null };

    function snapshot() { return { ...state, devices: state.devices.map((device) => ({ ...device })) }; }
    function stopOwned(nextStatus = 'disconnected', reason = null) {
      try { source?.disconnect?.(); } catch (_) {}
      try { analyser?.disconnect?.(); } catch (_) {}
      stream?.getTracks?.().forEach((track) => { try { track.stop(); } catch (_) {} });
      stream = null; source = null; analyser = null; monitorNode = null;
      state = { ...state, status: nextStatus, monitoring: false, reason };
    }
    async function connect(deviceId = '') {
      if (!mediaDevices?.getUserMedia || !runtime) {
        state = { ...state, status: 'unsupported', reason: 'Audio input is unavailable in this browser.' };
        throw new Error(state.reason);
      }
      const generation = ++connectionGeneration;
      stopOwned('connecting');
      try {
        const constraints = { audio: deviceId ? { deviceId: { exact: deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } : { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
        stream = await mediaDevices.getUserMedia(constraints);
        if (generation !== connectionGeneration) {
          stream?.getTracks?.().forEach((track) => { try { track.stop(); } catch (_) {} });
          stream = null;
          throw Object.assign(new Error('Input connection was cancelled.'), { name: 'AbortError', cancelled: true });
        }
        const context = await runtime.activate();
        if (generation !== connectionGeneration) {
          stream?.getTracks?.().forEach((track) => { try { track.stop(); } catch (_) {} });
          stream = null;
          throw Object.assign(new Error('Input connection was cancelled.'), { name: 'AbortError', cancelled: true });
        }
        source = context.createMediaStreamSource(stream);
        analyser = context.createAnalyser();
        analyser.fftSize = 4096;
        source.connect(analyser);
        stream.getTracks().forEach((track) => track.addEventListener?.('ended', () => stopOwned('device-disappeared', 'The selected input disconnected.'), { once: true }));
        const devices = (await mediaDevices.enumerateDevices?.() || []).filter((device) => device.kind === 'audioinput').map(({ deviceId: id, label }) => ({ deviceId: id, label: label || 'Audio input' }));
        const selected = devices.find((device) => device.deviceId === deviceId) || devices[0] || { deviceId, label: 'Audio input' };
        state = { status: 'connected', deviceId: selected.deviceId, deviceLabel: selected.label, devices, monitoring: false, reason: null };
        return snapshot();
      } catch (error) {
        if (!error?.cancelled) stopOwned(ERROR_STATES[error?.name] || 'failed', error?.message || 'Input connection failed.');
        throw error;
      }
    }
    async function selectDevice(deviceId) { return connect(String(deviceId || '')); }
    function setMonitoring(enabled, options = {}) {
      if (enabled && !options.warningAccepted) throw new Error('Accept the monitoring feedback warning first.');
      if (!stream || state.status !== 'connected') throw new Error('Connect an input first.');
      if (enabled) {
        monitorNode = runtime.createBus('monitor').node;
        if (monitorNode.gain) monitorNode.gain.value = 0;
        source.connect(monitorNode);
      } else if (monitorNode) {
        try { source.disconnect(monitorNode); } catch (_) {}
        monitorNode = null;
      }
      state = { ...state, monitoring: Boolean(enabled) };
      return snapshot();
    }
    function readFrame() {
      if (!analyser) return null;
      const samples = new Float32Array(analyser.fftSize || 4096);
      analyser.getFloatTimeDomainData?.(samples);
      return samples;
    }
    function borrowStream() { return stream; }
    function disconnect() { connectionGeneration += 1; stopOwned('disconnected'); }
    function deactivate() { disconnect(); }
    function fail(error) { stopOwned('analysis-failed', error?.message || 'Analysis failed.'); }
    eventTarget?.addEventListener?.('pagehide', disconnect);
    eventTarget?.addEventListener?.('beforeunload', disconnect);
    return Object.freeze({ connect, selectDevice, disconnect, deactivate, fail, setMonitoring, readFrame, borrowStream, snapshot });
  }

  root.InputManager = Object.freeze({ create });
})(typeof globalThis !== 'undefined' ? globalThis : this);
