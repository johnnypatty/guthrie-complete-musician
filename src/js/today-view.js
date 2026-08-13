(function (root) {
  'use strict';

  function create(context) {
    const { document, saveState, onWeekChange } = context;
    const $ = (selector) => document.querySelector(selector);
    const { escapeHtml, safeInteger } = root.UiComponents;
    let currentPlan = null;

    function selectedGoals() { return [...document.querySelectorAll('input[name="session-goal"]:checked')].map((input) => input.value); }
    function taskKey(block) { return `w${context.state.week}-${context.state.minutes}-${block.instanceId || block.id}`; }
    function updateProgress() {
      const items = [...document.querySelectorAll('.session-item input')];
      const done = items.filter((item) => item.checked).length;
      $('#progress-summary').textContent = `${items.length ? Math.round((done / items.length) * 100) : 0}% complete today`;
    }
    function rememberDecision(action, edits = {}) {
      const recommendation = { id: `week-${context.state.week}`, reason: $('#recommendation-reason').textContent, durationMinutes: context.state.minutes, goals: selectedGoals() };
      const decision = root.SessionController.recommendationDecision(recommendation, action, edits);
      context.state.recommendations = [...context.state.recommendations, decision].slice(-100);
      saveState();
      return decision;
    }

    function render() {
      const week = safeInteger($('#week-input').value, context.state.week, 1, 24);
      const minutes = Number($('#minutes-select').value);
      const goals = selectedGoals();
      context.state.week = week;
      context.state.minutes = minutes;
      const focus = root.PracticeEngine.getWeekFocus(week);
      $('#phase-name').textContent = `Week ${week}: ${focus.phase} — ${focus.cycle}`;
      $('#phase-focus').textContent = focus.focus;
      const ranked = root.RecommendationEngine.rank({ week, goals, candidates: root.SessionPlanner.DEFAULT_CANDIDATES.map((candidate) => ({ ...candidate, goals: [candidate.skill], phases: [focus.phase] })) });
      currentPlan = root.SessionPlanner.plan({ durationMinutes: minutes, week, goals, candidates: ranked, seed: `week-${week}-${goals.join('-')}` });
      const reason = ranked[0]?.reasons?.[0] || 'It balances technique, time, ears, and musical choices for this course week.';
      $('#recommendation-reason').textContent = reason;
      $('#session-list').innerHTML = currentPlan.blocks.map((block) => {
        const legacy = { ...block, instanceId: block.id, id: block.candidateId || block.id };
        const key = taskKey(legacy);
        const done = Boolean(context.state.completed[key]);
        return `<li class="session-item${done ? ' is-done' : ''}" data-task="${escapeHtml(key)}"><input type="checkbox" aria-label="Complete ${escapeHtml(block.title)}" ${done ? 'checked' : ''}><div><strong>${escapeHtml(block.title)}</strong><p>${escapeHtml(block.instruction)}</p></div><time>${block.minutes} min</time></li>`;
      }).join('');
      $('#session-list').querySelectorAll('.session-item').forEach((item) => item.querySelector('input').addEventListener('change', (event) => {
        context.state.completed[item.dataset.task] = event.target.checked;
        item.classList.toggle('is-done', event.target.checked); updateProgress(); saveState();
      }));
      $('#resume-session-strip').hidden = !context.state.activeSession;
      updateProgress(); onWeekChange(); saveState();
    }

    function init() {
      $('#week-input').value = context.state.week;
      $('#minutes-select').value = context.state.minutes;
      $('#week-input').addEventListener('change', render);
      $('#minutes-select').addEventListener('change', render);
      document.querySelectorAll('input[name="session-goal"]').forEach((input) => input.addEventListener('change', () => {
        if (selectedGoals().length > 2) { input.checked = false; $('#recommendation-status').textContent = 'Choose up to two goals.'; }
        render();
      }));
      $('#start-session').addEventListener('click', () => { rememberDecision('accepted'); context.startSession(currentPlan); });
      $('#postpone-session').addEventListener('click', () => { rememberDecision('postponed'); $('#recommendation-status').textContent = 'Plan saved for later. No penalty.'; });
      $('#reject-session').addEventListener('click', () => { rememberDecision('rejected', { note: 'Player chose a different focus.' }); $('#recommendation-status').textContent = 'Recommendation dismissed. Your choice remains in control.'; });
      $('#new-prompt').addEventListener('click', () => { $('#prompt-card').textContent = root.PracticeEngine.pickPrompt(`${Date.now()}-${Math.random()}`).text; });
      $('#prompt-card').textContent = root.PracticeEngine.pickPrompt(`week-${context.state.week}`).text;
      render();
    }
    return { init, render };
  }
  root.TodayView = Object.freeze({ create });
})(typeof globalThis !== 'undefined' ? globalThis : this);
