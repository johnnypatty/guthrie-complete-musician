(function (root) {
  'use strict';

  function formatTime(milliseconds) {
    const seconds = Math.max(0, Math.ceil(Number(milliseconds) / 1_000));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function create(context) {
    const { document, window, saveState } = context;
    const $ = (selector) => document.querySelector(selector);
    const escapeHtml = root.UiComponents.escapeHtml;
    let controller = null;

    function persist(recovery) { context.state.activeSession = recovery; saveState(); }
    function ensureController() {
      const recovered = context.state.activeSession;
      const plan = recovered?.plan || root.SessionPlanner.plan({ durationMinutes: context.state.minutes, week: context.state.week, candidates: root.SessionPlanner.DEFAULT_CANDIDATES, seed: `week-${context.state.week}` });
      controller = root.SessionController.create({
        plan, recovered, reason: 'This balanced plan matches your course week and chosen session length.',
        persist, onChange: render, announce(message) { $('#timer-message').textContent = message; }
      });
      $('#session-resume-note').hidden = !recovered;
      render();
      return controller;
    }

    function reviewMarkup(review) {
      return `<dl class="review-metrics"><div><dt>Planned</dt><dd>${review.plannedMinutes} min</dd></div><div><dt>Completed</dt><dd>${review.completedMinutes} min</dd></div><div><dt>Clean / shaky / failed</dt><dd>${review.ratings.clean} / ${review.ratings.shaky} / ${review.ratings.failed}</dd></div></dl><p><strong>One improvement:</strong> ${escapeHtml(review.improvement)}</p><p><strong>Next session:</strong> ${escapeHtml(review.nextRecommendation)}</p>`;
    }

    function render() {
      if (!controller) return;
      const view = controller.view();
      const block = view.activeBlock;
      $('#session-rating').hidden = view.status !== 'rating';
      $('#session-review').hidden = view.status !== 'ended';
      $('.guided-session-card').hidden = view.status === 'ended';
      $('#session-end').hidden = view.status === 'ended';
      if (view.status === 'ended') {
        $('#session-review-summary').innerHTML = reviewMarkup(controller.review());
        return;
      }
      if (!block) return;
      $('#session-progress-label').textContent = `Block ${view.activeIndex + 1} of ${view.blockCount}`;
      $('#session-block-title').textContent = block.title;
      $('#session-block-instruction').textContent = block.instruction;
      $('#session-block-type').textContent = block.type === 'rest' ? 'Scheduled rest' : 'Practice';
      $('#session-tempo').textContent = block.tempo ? `${block.tempo} BPM` : '';
      $('#timer-display').textContent = formatTime(view.remainingMs);
      $('#timer-display').classList.toggle('is-final-ten', view.finalTen);
      $('#timer-start').textContent = view.status === 'running' ? 'Pause' : (view.status === 'paused' ? 'Resume' : 'Start block');
      $('#timer-start').disabled = view.status === 'rating';
      $('#session-safety').textContent = view.safetyMessage || (block.type === 'rest' ? 'Release your hands, ears, jaw, and shoulders.' : 'Stay loose. Stop if you feel pain; speed is never worth forcing.');
      if (!['running', 'rating'].includes(view.status)) $('#timer-message').textContent = view.status === 'paused' ? 'Paused. Audio and input remain off.' : 'Ready. Nothing starts until you press Start.';
    }

    function init() {
      $('#timer-start').addEventListener('click', () => {
        if (!controller) ensureController();
        const view = controller.view();
        if (view.status === 'running') controller.pause(); else controller.start();
      });
      $('#timer-reset').addEventListener('click', () => controller?.restart());
      $('#session-skip').addEventListener('click', () => controller?.skip());
      $('#session-end').addEventListener('click', () => controller?.end());
      $('#session-rating').addEventListener('submit', (event) => {
        event.preventDefault();
        const selected = document.querySelector('input[name="block-rating"]:checked');
        if (!selected) return;
        if ($('#session-pain').checked) controller.pain();
        controller.rate(selected.value, $('#session-note').value);
        event.target.reset();
      });
      ensureController();
    }

    function startPlan(plan) {
      controller?.deactivate();
      context.state.activeSession = null;
      controller = root.SessionController.create({ plan, reason: 'This balanced plan matches your course week and selected goals.', persist, onChange: render, announce(message) { $('#timer-message').textContent = message; } });
      $('#session-resume-note').hidden = true;
      render();
      window.location.hash = '#/session';
    }

    function deactivate() { controller?.deactivate(); }
    return { init, render, startPlan, deactivate };
  }

  root.SessionView = Object.freeze({ create, formatTime });
})(typeof globalThis !== 'undefined' ? globalThis : this);
