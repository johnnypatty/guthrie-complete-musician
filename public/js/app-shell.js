(function (root) {
  'use strict';

  const STORAGE_KEY = 'gcm-progress-v3';

  function create(options = {}) {
    const window = options.window || root;
    const document = options.document || window.document;
    const defaults = ProgressStore.normalize(null);
    const stateStore = LocalStateStore.create(window.localStorage, STORAGE_KEY);
    const audioRuntime = root.AudioRuntime?.create ? root.AudioRuntime.create({ eventTarget: window }) : null;
    const inputManager = root.InputManager?.create && audioRuntime ? root.InputManager.create({ mediaDevices: window.navigator?.mediaDevices, runtime: audioRuntime, eventTarget: window }) : null;
    const repositoryPromise = root.ProgressRepository?.open ? root.ProgressRepository.open({ indexedDB: window.indexedDB, name: 'gcm-private-v3', version: 1 }) : Promise.resolve(null);
    const recordingRepository = {
      status: 'ready',
      async saveRecording(value) { const repo = await repositoryPromise; if (!repo || repo.status !== 'ready') throw new Error('Storage unavailable'); return repo.saveRecording(value); },
      async getRecording(id) { const repo = await repositoryPromise; return repo?.status === 'ready' ? repo.getRecording(id) : null; },
      async listRecordings() { const repo = await repositoryPromise; return repo?.status === 'ready' ? repo.listRecordings() : []; },
      async deleteRecording(id) { const repo = await repositoryPromise; return repo?.status === 'ready' ? repo.deleteRecording(id) : false; }
    };
    const recordingStore = root.RecordingStore?.create ? root.RecordingStore.create(recordingRepository, window.navigator?.storage || {}) : null;
    const recordingController = recordingStore && root.RecordingController?.create ? root.RecordingController.create({ store: recordingStore }) : null;
    const context = {
      window,
      document,
      defaults,
      stateStore,
      audio: AudioEngine.create(),
      audioRuntime,
      inputManager,
      analysis: inputManager && root.AnalysisController?.create ? root.AnalysisController.create({ input: inputManager }) : null,
      recordingStore,
      recordingController,
      state: null,
      saveState() { context.state = stateStore.patch(context.state); return context.state; },
      onWeekChange() {},
      startSession() {}
    };
    const controllers = {};

    function loadState() {
      const loaded = stateStore.load();
      if (!CourseData.tracks.some((track) => track.id === loaded.trackId)) {
        loaded.trackId = CourseData.tracks[0].id;
        loaded.tempo = CourseData.tracks[0].bpm;
      }
      return loaded;
    }

    async function registerOfflineSupport() {
      const status = document.querySelector('#offline-status');
      if (!status) return;
      if (!('serviceWorker' in window.navigator) || !/^https?:$/.test(window.location.protocol)) {
        status.textContent = 'Use the ZIP for fully offline access.';
        return;
      }
      try {
        await window.navigator.serviceWorker.register('sw.js');
        status.textContent = 'Offline support ready after the first complete visit.';
      } catch (_error) {
        status.textContent = 'Offline cache unavailable; the ZIP still works.';
      }
    }

    function init() {
      context.state = loadState();
      controllers.roadmap = RoadmapView.create(context);
      controllers.today = TodayView.create(context);
      controllers.session = SessionView.create(context);
      context.startSession = controllers.session.startPlan;
      controllers.studio = StudioView.create(context);
      controllers.progress = ProgressView.create(context);
      context.onWeekChange = controllers.roadmap.renderRoadmap;
      Object.values(controllers).forEach((controller) => controller.init());
      HashRouter.create({
        window,
        document,
        onDeactivate(route) { controllers[route.name]?.deactivate?.(); }
      }).start();
      registerOfflineSupport();
    }

    return { init };
  }

  root.AppShell = Object.freeze({ create });
})(globalThis);
