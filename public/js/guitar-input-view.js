(function (root) {
  'use strict';

  function create(context) {
    const { document, controller } = context;
    const $ = (selector) => document.querySelector(selector);
    let unsubscribe = null;

    function render(model) {
      const status = $('#input-connection-status');
      if (!status) return;
      status.textContent = model.status === 'connected' ? `Connected · ${model.deviceLabel}` : model.measurementText;
      status.dataset.state = model.status;
      $('#input-connect').disabled = ['connecting', 'connected'].includes(model.status);
      $('#input-disconnect').disabled = model.status !== 'connected';
      $('#input-calibrate').disabled = model.status !== 'connected';
      $('#input-guidance').textContent = model.guidance;
      $('#input-level-value').textContent = model.levelText;
      $('#input-clipping-value').textContent = model.clippingText;
      $('#input-noise-value').textContent = model.noiseText;
      $('#input-pitch-note').textContent = model.pitch?.note || '—';
      $('#input-pitch-detail').textContent = model.measurementText;
      $('#input-level-meter').value = Math.min(1, model.level || 0);
      $('#input-live').textContent = model.liveMessage;
      $('#input-pitch-card').dataset.state = model.pitch ? 'ready' : 'waiting';
      $('#input-clipping-card').dataset.state = model.clipping ? 'warning' : 'safe';
    }

    function init() {
      if (!$('#input-connect')) return;
      unsubscribe = controller.subscribe(render);
      $('#input-connect').addEventListener('click', async () => {
        try { await controller.connect(); } catch (_) { /* rendered as an isolated state */ }
      });
      $('#input-disconnect').addEventListener('click', controller.disconnect);
      $('#input-calibrate').addEventListener('click', controller.beginNoiseCalibration);
    }
    function deactivate() { controller.deactivate(); }
    function destroy() { deactivate(); unsubscribe?.(); unsubscribe = null; }
    return Object.freeze({ init, deactivate, destroy, render });
  }

  root.GuitarInputView = Object.freeze({ create });
})(typeof globalThis !== 'undefined' ? globalThis : this);
