(function (root) {
  'use strict';

  const RATINGS = new Set(['clean', 'shaky', 'failed']);
  const NOTE_LIMIT = 280;

  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function blockMs(state, index = state.activeIndex) { return state.plan.blocks[index].minutes * 60_000; }
  function normalizeNow(now) { const value = Number(now); if (!Number.isFinite(value)) throw new Error('A finite time is required.'); return value; }

  function create(plan) {
    if (!plan || !Array.isArray(plan.blocks) || !plan.blocks.length) throw new Error('A non-empty session plan is required.');
    return {
      plan: copy(plan), status: 'ready', activeIndex: 0, remainingMs: plan.blocks[0].minutes * 60_000,
      lastTickAt: null, finalTen: false, results: [], pain: false, rampEligible: true,
      safetyMessage: '', startedAt: null, endedAt: null
    };
  }

  function progress(state, now) {
    const time = normalizeNow(now);
    if (state.status !== 'running' || state.lastTickAt == null) return { ...state };
    const remainingMs = Math.max(0, state.remainingMs - Math.max(0, time - state.lastTickAt));
    const next = { ...state, remainingMs, lastTickAt: time, finalTen: remainingMs > 0 && remainingMs <= 10_000 };
    if (remainingMs > 0) return next;
    const block = next.plan.blocks[next.activeIndex];
    if (block.type === 'practice') return { ...next, status: 'rating', lastTickAt: null, finalTen: false };
    return advance(next, { rating: 'rested', note: '' }, time);
  }

  function advance(state, result, now) {
    const block = state.plan.blocks[state.activeIndex];
    const results = [...state.results, {
      blockId: block.id, candidateId: block.candidateId || null, title: block.title, type: block.type,
      minutes: block.minutes, tempo: block.tempo ?? null, rating: result.rating, note: result.note || '', completedAt: normalizeNow(now)
    }];
    const activeIndex = state.activeIndex + 1;
    if (activeIndex >= state.plan.blocks.length) return { ...state, results, activeIndex, remainingMs: 0, status: 'ended', lastTickAt: null, finalTen: false, endedAt: normalizeNow(now) };
    return { ...state, results, activeIndex, remainingMs: blockMs({ ...state, activeIndex }), status: 'paused', lastTickAt: null, finalTen: false };
  }

  function transition(current, event, now) {
    if (!current || !event || typeof event.type !== 'string') throw new Error('A session state and event are required.');
    let state = progress(current, now);
    const time = normalizeNow(now);
    switch (event.type) {
      case 'START':
      case 'RESUME':
        if (!['ready', 'paused'].includes(state.status)) return state;
        return { ...state, status: 'running', lastTickAt: time, startedAt: state.startedAt ?? time };
      case 'TICK': return state;
      case 'PAUSE': return state.status === 'running' ? { ...state, status: 'paused', lastTickAt: null } : state;
      case 'RESTART_BLOCK':
        if (state.status === 'ended') return state;
        return { ...state, status: 'paused', remainingMs: blockMs(state), lastTickAt: null, finalTen: false };
      case 'SKIP':
        if (state.status === 'ended') return state;
        return advance(state, { rating: 'skipped', note: '' }, time);
      case 'RATE': {
        if (state.status !== 'rating') return state;
        if (!RATINGS.has(event.rating)) throw new Error('Rating must be clean, shaky, or failed.');
        const note = String(event.note || '').trim();
        if (note.length > NOTE_LIMIT) throw new Error(`Notes must be ${NOTE_LIMIT} characters or fewer.`);
        return advance(state, { rating: event.rating, note }, time);
      }
      case 'PAIN': return { ...state, pain: true, rampEligible: false, safetyMessage: 'Stop and rest. Resume only when you feel comfortable.' };
      case 'END': return { ...state, status: 'ended', lastTickAt: null, finalTen: false, endedAt: time };
      default: throw new Error(`Unsupported session event: ${event.type}`);
    }
  }

  function serializeRecovery(state) {
    if (!state || state.status === 'ended') return null;
    return { plan: copy(state.plan), activeIndex: state.activeIndex, results: copy(state.results), pain: Boolean(state.pain), rampEligible: Boolean(state.rampEligible), startedAt: state.startedAt };
  }

  function restoreRecovery(value) {
    if (!value || !value.plan) throw new Error('A saved session boundary is required.');
    const state = create(value.plan);
    const activeIndex = Math.min(Math.max(0, Number(value.activeIndex) || 0), state.plan.blocks.length - 1);
    return { ...state, activeIndex, remainingMs: blockMs({ ...state, activeIndex }), status: 'paused', results: Array.isArray(value.results) ? copy(value.results) : [], pain: Boolean(value.pain), rampEligible: value.rampEligible !== false && !value.pain, startedAt: value.startedAt ?? null, safetyMessage: value.pain ? 'Stop and rest. Resume only when you feel comfortable.' : '' };
  }

  function review(state) {
    const ratings = { clean: 0, shaky: 0, failed: 0, skipped: 0 };
    for (const result of state.results) if (ratings[result.rating] != null) ratings[result.rating] += 1;
    const practice = state.results.filter((result) => result.type === 'practice');
    const weak = practice.find((result) => ['failed', 'shaky'].includes(result.rating));
    return {
      plannedMinutes: state.plan.blocks.reduce((total, block) => total + block.minutes, 0),
      completedMinutes: state.results.reduce((total, result) => total + result.minutes, 0), ratings,
      pain: state.pain, rampEligible: state.rampEligible, results: copy(state.results),
      improvement: weak?.note || (weak ? `Revisit ${weak.title} below today's tempo.` : 'Keep the same relaxed control next time.'),
      nextRecommendation: state.pain ? 'Rest and return at an easy effort when comfortable.' : (weak ? `Start next time with a slower ${weak.title} block.` : 'Repeat one successful block with a new musical constraint.')
    };
  }

  root.SessionRunner = Object.freeze({ NOTE_LIMIT, create, transition, serializeRecovery, restoreRecovery, review });
})(typeof globalThis !== 'undefined' ? globalThis : this);
