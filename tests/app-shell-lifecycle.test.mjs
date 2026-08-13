import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

async function source(name) {
  return readFile(resolve(import.meta.dirname, `../src/js/${name}.js`), 'utf8');
}

function element() {
  const listeners = new Map();
  return {
    disabled: false,
    textContent: '',
    value: '',
    addEventListener(name, callback) { listeners.set(name, callback); },
    dispatch(name) { listeners.get(name)?.({ target: this }); },
    classList: { remove() {} }
  };
}

async function pendingStudioFixture() {
  const elements = new Map([
    ['#play-button', element()],
    ['#stop-button', Object.assign(element(), { disabled: true })],
    ['#player-status', element()],
    ['#transport-position', element()],
    ['#transport-progress', Object.assign(element(), { value: 0 })],
    ['#target-tones', element()]
  ]);
  let resolveStart;
  let rejectStart;
  let stops = 0;
  const startPromise = new Promise((resolve, reject) => {
    resolveStart = resolve;
    rejectStart = reject;
  });
  const context = {
    UiComponents: { escapeHtml(value) { return String(value); }, safeInteger(value) { return Number(value); } },
    CourseData: { tracks: [{ id: 'track', progression: [], beatsPerBar: 4 }] },
    MusicTheory: {},
    PlayerTimeline: { buildTimeline() { return { totalBeats: 16, events: [] }; } },
    globalThis: null
  };
  context.globalThis = context;
  vm.runInNewContext(await source('studio-view'), context, { filename: 'studio-view.js' });
  const controller = context.StudioView.create({
    document: {
      querySelector(selector) { return elements.get(selector); },
      querySelectorAll() { return []; }
    },
    audio: {
      start() { return startPromise; },
      stop() { stops += 1; }
    },
    defaults: {},
    saveState() {},
    window: {},
    state: {
      trackId: 'track', tempo: 80, loop: 'full', countInBars: 1,
      levels: { pad: 70, bass: 70, drums: 60, master: 80 }
    }
  });
  return { controller, elements, rejectStart, resolveStart, stops: () => stops };
}

test('AppShell retains view controllers and routes deactivation to the controller being left', async () => {
  const calls = [];
  let routerOptions;
  const controllers = {};
  const makeView = (name) => ({
    create() {
      const controller = {
        init() { calls.push(`init:${name}`); },
        deactivate() { calls.push(`deactivate:${name}`); }
      };
      controllers[name] = controller;
      return controller;
    }
  });
  const document = { querySelector() { return null; } };
  const window = { document, localStorage: {}, navigator: {}, location: { protocol: 'file:' } };
  const context = {
    ProgressStore: { normalize() { return { trackId: 'track' }; } },
    LocalStateStore: { create() { return { load() { return { trackId: 'track' }; }, patch(value) { return value; } }; } },
    CourseData: { tracks: [{ id: 'track', bpm: 80 }] },
    AudioEngine: { create() { return {}; } },
    RoadmapView: makeView('roadmap'),
    TodayView: makeView('today'),
    SessionView: makeView('session'),
    StudioView: makeView('studio'),
    ProgressView: makeView('progress'),
    HashRouter: { create(options) { routerOptions = options; return { start() {} }; } },
    globalThis: null
  };
  context.globalThis = context;
  vm.runInNewContext(await source('app-shell'), context, { filename: 'app-shell.js' });

  context.AppShell.create({ window, document }).init();
  routerOptions.onDeactivate({ name: 'studio' });
  routerOptions.onDeactivate({ name: 'session' });

  assert.equal(controllers.studio !== undefined, true);
  assert.equal(controllers.session !== undefined, true);
  assert.deepEqual(calls.slice(-2), ['deactivate:studio', 'deactivate:session']);
});

test('Session deactivation pauses the guided controller without resetting its block', async () => {
  const selectors = ['#session-resume-note', '#session-rating', '#session-review', '.guided-session-card', '#session-end', '#session-progress-label', '#session-block-title', '#session-block-instruction', '#session-block-type', '#session-tempo', '#timer-display', '#timer-message', '#timer-start', '#timer-reset', '#session-skip', '#session-safety', '#session-review-summary'];
  const elements = new Map(selectors.map((selector) => [selector, Object.assign(element(), { hidden: false, innerHTML: '', classList: { toggle() {}, remove() {} } })]));
  elements.get('#session-rating').reset = () => {};
  let status = 'ready';
  let deactivations = 0;
  const guided = {
    view() { return { status, activeBlock: { id: 'plan-1', type: 'practice', title: 'Pocket', instruction: 'Stay relaxed.', minutes: 1 }, activeIndex: 0, blockCount: 1, remainingMs: 60_000, finalTen: false, safetyMessage: '' }; },
    start() { status = 'running'; }, pause() { status = 'paused'; }, restart() {}, skip() {}, pain() {}, rate() {}, end() { status = 'ended'; }, review() { return null; },
    deactivate() { deactivations += 1; if (status === 'running') status = 'paused'; }
  };
  const context = {
    UiComponents: { escapeHtml(value) { return String(value); } },
    SessionPlanner: { DEFAULT_CANDIDATES: [], plan() { return { durationMinutes: 30, week: 1, blocks: [{ id: 'plan-1', type: 'practice', title: 'Pocket', instruction: 'Stay relaxed.', minutes: 1 }] }; } },
    SessionController: { create() { return guided; } },
    globalThis: null
  };
  context.globalThis = context;
  vm.runInNewContext(await source('session-view'), context, { filename: 'session-view.js' });
  const controller = context.SessionView.create({ document: { querySelector(selector) { return elements.get(selector); } }, window: { location: {} }, state: { activeSession: null, minutes: 30, week: 1 }, saveState() {} });
  controller.init();
  elements.get('#timer-start').dispatch('click');
  controller.deactivate();

  assert.equal(deactivations, 1);
  assert.equal(status, 'paused');
  assert.equal(guided.view().activeIndex, 0);
  assert.equal(guided.view().remainingMs, 60_000);
});

test('Studio deactivation explicitly stops audio and resets observable transport state', async () => {
  const elements = new Map([
    ['#play-button', Object.assign(element(), { disabled: true })],
    ['#stop-button', Object.assign(element(), { disabled: false })],
    ['#player-status', Object.assign(element(), { textContent: 'Playing…' })],
    ['#transport-position', Object.assign(element(), { textContent: 'Bar 4' })],
    ['#transport-progress', Object.assign(element(), { value: 45 })],
    ['#target-tones', Object.assign(element(), { textContent: 'C E G' })]
  ]);
  let stops = 0;
  const context = { UiComponents: {}, CourseData: { tracks: [] }, MusicTheory: {}, PlayerTimeline: {}, globalThis: null };
  context.globalThis = context;
  vm.runInNewContext(await source('studio-view'), context, { filename: 'studio-view.js' });
  const controller = context.StudioView.create({
    document: {
      querySelector(selector) { return elements.get(selector); },
      querySelectorAll() { return []; }
    },
    audio: { stop() { stops += 1; } },
    defaults: {},
    saveState() {},
    window: {},
    state: {}
  });

  controller.deactivate();

  assert.equal(stops, 1);
  assert.equal(elements.get('#play-button').disabled, false);
  assert.equal(elements.get('#stop-button').disabled, true);
  assert.equal(elements.get('#player-status').textContent, 'Stopped.');
  assert.equal(elements.get('#transport-position').textContent, 'Ready');
  assert.equal(elements.get('#transport-progress').value, 0);
});

test('Studio deactivation invalidates a pending audio start before it can resume hidden playback', async () => {
  const fixture = await pendingStudioFixture();
  const pendingStart = fixture.controller.startPlayer();
  assert.equal(fixture.elements.get('#player-status').textContent, 'Starting audio…');

  fixture.controller.deactivate();
  fixture.resolveStart();
  await pendingStart;

  assert.equal(fixture.stops(), 2, 'deactivation stops once and stale successful start stops again');
  assert.equal(fixture.elements.get('#play-button').disabled, false);
  assert.equal(fixture.elements.get('#stop-button').disabled, true);
  assert.equal(fixture.elements.get('#player-status').textContent, 'Stopped.');
  assert.equal(fixture.elements.get('#transport-position').textContent, 'Ready');
});

test('a pending Studio start failure after deactivation cannot overwrite route-exit idle state', async () => {
  const fixture = await pendingStudioFixture();
  const pendingStart = fixture.controller.startPlayer();

  fixture.controller.deactivate();
  fixture.rejectStart(new Error('Audio context resume failed'));
  await pendingStart;

  assert.equal(fixture.stops(), 1);
  assert.equal(fixture.elements.get('#play-button').disabled, false);
  assert.equal(fixture.elements.get('#stop-button').disabled, true);
  assert.equal(fixture.elements.get('#player-status').textContent, 'Stopped.');
  assert.equal(fixture.elements.get('#transport-position').textContent, 'Ready');
});
