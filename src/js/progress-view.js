(function (root) {
  'use strict';

  function create(context) {
    const { document, stateStore } = context;
    const $ = (selector) => document.querySelector(selector);
    const controller = root.ProgressController.create({ state: context.state });

    function renderDashboard() {
      const view = controller.project();
      $('#skill-summary-grid').innerHTML = view.chartRows.map((row) => `<article class="skill-card"><span>${UiComponents.escapeHtml(row.skill)}</span><strong>${row.score == null ? '—' : `${row.score} / 100`}</strong><small>${row.confidence} confidence · ${row.evidence} evidence item${row.evidence === 1 ? '' : 's'}</small><div class="skill-bar" style="--skill-value:${row.score || 0}%" aria-hidden="true"></div></article>`).join('');
      $('#skill-summary-table').innerHTML = `<caption>Text equivalent of every skill chart</caption><thead><tr><th>Skill</th><th>Score</th><th>Confidence</th><th>Evidence</th></tr></thead><tbody>${view.chartRows.map((row) => `<tr><th>${UiComponents.escapeHtml(row.skill)}</th><td>${row.score ?? 'Not enough evidence'}</td><td>${row.confidence}</td><td>${row.evidence}</td></tr>`).join('')}</tbody>`;
      $('#due-review-count').textContent = `${view.dueReviews.length} due review${view.dueReviews.length === 1 ? '' : 's'}`;
      $('#repertoire-count').textContent = `${view.unfinishedRepertoire.length} unfinished repertoire item${view.unfinishedRepertoire.length === 1 ? '' : 's'}`;
    }

    function exportProgress() {
      const blob = new Blob([ProgressStore.exportJson(context.state)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'guthrie-complete-musician-progress.json';
      link.click();
      URL.revokeObjectURL(url);
      $('#progress-file-status').textContent = 'Progress exported. The file stayed on this device.';
    }

    async function importProgressFile(file) {
      if (!file) return;
      try {
        const imported = ProgressStore.importJson(await file.text());
        if (!CourseData.tracks.some((track) => track.id === imported.trackId)) {
          imported.trackId = CourseData.tracks[0].id;
          imported.tempo = CourseData.tracks[0].bpm;
        }
        context.state = stateStore.save(imported);
        $('#progress-file-status').textContent = 'Progress imported. Reloading the course…';
        context.window.location.reload();
      } catch (error) {
        $('#progress-file-status').textContent = error.message;
      }
    }

    function init() {
      renderDashboard();
      $('#export-progress').addEventListener('click', exportProgress);
      $('#import-progress').addEventListener('click', () => $('#progress-file').click());
      $('#progress-file').addEventListener('change', (event) => importProgressFile(event.target.files?.[0]));
      $('#reset-progress').addEventListener('click', () => {
        if (!context.window.confirm('Reset the locally saved week, checks, track and tempo? Your lesson files will not be deleted.')) return;
        context.state = stateStore.save(ProgressStore.normalize(null));
        context.window.location.reload();
      });
    }

    return { init, renderDashboard };
  }

  root.ProgressView = Object.freeze({ create });
})(globalThis);
