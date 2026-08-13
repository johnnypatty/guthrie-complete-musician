(function (root) {
  'use strict';
  function create(context) {
    const { document, controller, store, inputManager } = context;
    const $ = (selector) => document.querySelector(selector);
    let unsubscribe = null;
    let takes = [];
    function escape(value) { return root.UiComponents?.escapeHtml ? root.UiComponents.escapeHtml(value) : String(value); }
    async function renderTakes() {
      takes = await store.list();
      const list = $('#recording-list'); if (!list) return;
      if (!takes.length) { list.innerHTML = '<p class="empty-copy">No local takes yet.</p>'; return; }
      list.innerHTML = takes.map((take) => `<article class="take-row" data-take-id="${escape(take.id)}"><div><strong>${escape(take.metadata?.exerciseId || 'Practice take')}</strong><small>${escape(take.id)} · ${escape(take.mimeType || take.blob?.type || 'audio')}</small></div><div class="button-row"><button type="button" data-play="${escape(take.id)}">Play</button><button type="button" data-export="${escape(take.id)}">Export</button><button type="button" data-delete="${escape(take.id)}">Delete</button></div></article>`).join('');
      list.querySelectorAll('[data-play]').forEach((button) => button.addEventListener('click', () => controller.play(button.dataset.play)));
      list.querySelectorAll('[data-export]').forEach((button) => button.addEventListener('click', async () => {
        const file = await controller.exportTake(button.dataset.export); const url = URL.createObjectURL(file.blob); const link = document.createElement('a'); link.href = url; link.download = file.filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
      }));
      list.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', async () => { if (root.confirm('Delete this local take? This cannot be undone.')) { await store.delete(button.dataset.delete, { confirmed: true }); renderTakes(); } }));
    }
    function render(model) {
      if (!$('#recording-status')) return;
      $('#recording-status').textContent = model.message;
      $('#record-start').disabled = !['idle', 'saved', 'storage-full', 'storage-unavailable'].includes(model.status) || inputManager.snapshot().status !== 'connected';
      $('#record-stop').disabled = !['countdown', 'recording'].includes(model.status);
      if (model.status === 'saved') renderTakes();
    }
    function init() {
      if (!$('#record-start')) return;
      unsubscribe = controller.subscribe(render); renderTakes();
      $('#record-start').addEventListener('click', () => {
        const stream = inputManager.borrowStream();
        if (!stream) { $('#recording-status').textContent = 'Connect Guitar Input first.'; return; }
        controller.start(stream, { id: `take-${Date.now()}`, exerciseId: $('#record-exercise').value.trim() || 'free-practice', tempo: Number($('#record-tempo').value) || 80, selfRating: $('#record-rating').value, note: $('#record-note').value.trim().slice(0, 1000) });
      });
      $('#record-stop').addEventListener('click', controller.stop);
    }
    function deactivate() { controller.deactivate(); }
    return Object.freeze({ init, deactivate, renderTakes, destroy() { deactivate(); unsubscribe?.(); } });
  }
  root.RecordingView = Object.freeze({ create });
})(typeof globalThis !== 'undefined' ? globalThis : this);
