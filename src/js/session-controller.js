(function (root) {
  'use strict';

  function recommendationDecision(recommendation, action, edits = {}, now = Date.now()) {
    if (!recommendation || !['accepted', 'edited', 'postponed', 'rejected'].includes(action)) throw new Error('Choose a valid recommendation action.');
    const goals = edits.goals ?? recommendation.goals ?? [];
    if (new Set(goals).size > 2) throw new Error('Choose at most two goals.');
    return { ...recommendation, ...edits, goals: [...new Set(goals)], action, decidedAt: Number(now), reason: recommendation.reason };
  }

  function create(options = {}) {
    const Runner = root.SessionRunner;
    const now = options.now || Date.now;
    const setTimer = options.setInterval || root.setInterval;
    const clearTimer = options.clearInterval || root.clearInterval;
    const onChange = options.onChange || (() => {});
    const announce = options.announce || (() => {});
    const persist = options.persist || (() => {});
    let state = options.recovered ? Runner.restoreRecovery(options.recovered) : Runner.create(options.plan);
    let timer = null;
    let announcedFinalTen = false;

    function saveBoundary() { persist(Runner.serializeRecovery(state)); }
    function emit() { onChange(view()); }
    function stopTimer() { if (timer != null) clearTimer(timer); timer = null; }
    function tick() {
      const before = state;
      state = Runner.transition(state, { type: 'TICK' }, now());
      if (state.finalTen && !announcedFinalTen) { announcedFinalTen = true; announce('Ten seconds remaining.'); }
      if (before.status === 'running' && state.status === 'rating') { stopTimer(); announce('Block complete. Rate this attempt.'); }
      if (state.activeIndex !== before.activeIndex) { announcedFinalTen = false; stopTimer(); saveBoundary(); announce('Rest complete. The next block is ready.'); }
      if (state.status === 'ended') { stopTimer(); persist(null); announce('Session complete.'); }
      emit();
    }
    function dispatch(event) {
      const previousIndex = state.activeIndex;
      state = Runner.transition(state, event, now());
      if (['START', 'RESUME'].includes(event.type) && state.status === 'running' && timer == null) timer = setTimer(tick, 250);
      if (['PAUSE', 'RESTART_BLOCK', 'SKIP', 'RATE', 'END'].includes(event.type) || state.status !== 'running') stopTimer();
      if (state.activeIndex !== previousIndex) { announcedFinalTen = false; saveBoundary(); }
      if (event.type === 'PAUSE') saveBoundary();
      if (event.type === 'PAIN') { announce(state.safetyMessage); saveBoundary(); }
      if (event.type === 'END') persist(null);
      emit(); return view();
    }
    function view() {
      return {
        status: state.status, activeBlock: state.plan.blocks[state.activeIndex] || null, activeIndex: state.activeIndex,
        blockCount: state.plan.blocks.length, remainingMs: state.remainingMs, finalTen: state.finalTen,
        pain: state.pain, rampEligible: state.rampEligible, safetyMessage: state.safetyMessage,
        reason: options.reason || '', audioEnabled: false, inputEnabled: false
      };
    }
    function deactivate() { if (state.status === 'running') dispatch({ type: 'PAUSE' }); else stopTimer(); }
    return Object.freeze({ view, start: () => dispatch({ type: state.status === 'paused' ? 'RESUME' : 'START' }), pause: () => dispatch({ type: 'PAUSE' }), restart: () => dispatch({ type: 'RESTART_BLOCK' }), skip: () => dispatch({ type: 'SKIP' }), rate: (rating, note) => dispatch({ type: 'RATE', rating, note }), pain: () => dispatch({ type: 'PAIN' }), end: () => dispatch({ type: 'END' }), review: () => state.status === 'ended' ? Runner.review(state) : null, deactivate });
  }

  root.SessionController = Object.freeze({ create, recommendationDecision });
})(typeof globalThis !== 'undefined' ? globalThis : this);
