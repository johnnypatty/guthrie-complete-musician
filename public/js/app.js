(function () {
  'use strict';

  const STORAGE_KEY = 'gcm-progress-v2';
  const LEGACY_STORAGE_KEY = 'gcm-progress-v1';
  const $ = (selector) => document.querySelector(selector);
  const audio = AudioEngine.create();
  const defaults = ProgressStore.normalize(null);
  let state = loadState();
  let timerInterval = null;
  let timerRemaining = 20 * 60;
  let timerDeadline = 0;

  function safeInteger(value, fallback, min, max) {
    const number = Number(value);
    return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
  }

  function loadState() {
    for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const loaded = ProgressStore.normalize(JSON.parse(raw));
        if (!CourseData.tracks.some((track) => track.id === loaded.trackId)) {
          loaded.trackId = CourseData.tracks[0].id;
          loaded.tempo = CourseData.tracks[0].bpm;
        }
        return loaded;
      } catch (_error) {
        // Try the legacy key, then fall back to safe defaults.
      }
    }
    return ProgressStore.normalize(null);
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, ProgressStore.exportJson(state));
  }

  function currentTrack() {
    return CourseData.tracks.find((track) => track.id === state.trackId) || CourseData.tracks[0];
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function taskKey(block) {
    return `w${state.week}-${state.minutes}-${block.id}`;
  }

  function renderSession() {
    const week = safeInteger($('#week-input').value, state.week, 1, 24);
    const minutes = Number($('#minutes-select').value);
    state.week = week;
    state.minutes = minutes;
    const focus = PracticeEngine.getWeekFocus(week);
    $('#phase-name').textContent = `Week ${week}: ${focus.phase} — ${focus.cycle}`;
    $('#phase-focus').textContent = focus.focus;
    const blocks = PracticeEngine.buildSession(minutes, week);
    $('#session-list').innerHTML = blocks.map((block) => {
      const key = taskKey(block);
      const done = Boolean(state.completed[key]);
      return `<li class="session-item${done ? ' is-done' : ''}" data-task="${escapeHtml(key)}">
        <input type="checkbox" aria-label="Complete ${escapeHtml(block.title)}" ${done ? 'checked' : ''}>
        <div><strong>${escapeHtml(block.title)}</strong><p>${escapeHtml(block.instruction)}</p></div>
        <time>${block.minutes} min</time>
      </li>`;
    }).join('');
    $('#session-list').querySelectorAll('.session-item').forEach((item) => {
      item.querySelector('input').addEventListener('change', (event) => {
        state.completed[item.dataset.task] = event.target.checked;
        item.classList.toggle('is-done', event.target.checked);
        updateProgress();
        saveState();
      });
    });
    updateProgress();
    renderRoadmap();
    saveState();
  }

  function updateProgress() {
    const items = [...document.querySelectorAll('.session-item input')];
    const done = items.filter((item) => item.checked).length;
    const percent = items.length ? Math.round((done / items.length) * 100) : 0;
    $('#progress-summary').textContent = `${percent}% complete today`;
  }

  function renderRoadmap() {
    $('#roadmap-grid').innerHTML = CourseData.phases.map((phase) => {
      const current = state.week >= phase.start && state.week <= phase.end;
      return `<article class="phase-card${current ? ' is-current' : ''}">
        <p class="week-range">Weeks ${phase.start}–${phase.end}</p>
        <h3>${escapeHtml(phase.name)}</h3>
        <p>${escapeHtml(phase.focus)}</p>
      </article>`;
    }).join('');
  }

  function lessonIndex() {
    return Array.isArray(globalThis.GcmLessonIndex) ? globalThis.GcmLessonIndex : CourseData.lessons;
  }

  function renderLibrary() {
    const allLessons = lessonIndex();
    const lessons = LessonSearch.filter(allLessons, {
      query: $('#lesson-search')?.value || '',
      category: $('#lesson-category')?.value || 'all',
      phase: $('#lesson-phase')?.value || 'all'
    });
    $('#library-grid').innerHTML = lessons.map((lesson) =>
      `<a class="library-link${state.lessons[lesson.slug] ? ' is-complete' : ''}" href="${lesson.slug ? `lessons/${encodeURIComponent(lesson.slug)}.html` : encodeURI(lesson.path)}"><small>${escapeHtml(lesson.category || lesson.group)}</small><strong>${escapeHtml(lesson.title)}</strong><span>${escapeHtml(lesson.summary || 'Open lesson')} →</span>${state.lessons[lesson.slug] ? '<b class="completion-badge">Completed</b>' : ''}</a>`
    ).join('');
    if ($('#lesson-result-count')) $('#lesson-result-count').textContent = `${lessons.length} of ${allLessons.length} lessons`;
    if ($('#lesson-no-results')) $('#lesson-no-results').hidden = lessons.length !== 0;
  }

  function populateLessonFilters() {
    const lessons = lessonIndex();
    $('#lesson-category').innerHTML = '<option value="all">All categories</option>' + LessonSearch.options(lessons, 'category')
      .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
    $('#lesson-phase').innerHTML = '<option value="all">All phases</option>' + LessonSearch.options(lessons, 'phase')
      .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  }

  function exportProgress() {
    const blob = new Blob([ProgressStore.exportJson(state)], { type: 'application/json' });
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
      state = imported;
      saveState();
      $('#progress-file-status').textContent = 'Progress imported. Reloading the course…';
      location.reload();
    } catch (error) {
      $('#progress-file-status').textContent = error.message;
    }
  }

  function populateTracks() {
    $('#track-select').innerHTML = CourseData.tracks.map((track) =>
      `<option value="${escapeHtml(track.id)}">${escapeHtml(track.title)}</option>`
    ).join('');
    $('#track-select').value = state.trackId;
  }

  function progressionSections(track) {
    const timeline = PlayerTimeline.buildTimeline(track.progression, state.tempo, track.beatsPerBar);
    const map = new Map();
    timeline.events.forEach((event) => {
      if (!map.has(event.section)) map.set(event.section, { start: event.startBeat, end: event.endBeat });
      else map.get(event.section).end = event.endBeat;
    });
    return [...map.entries()].map(([name, bounds]) => ({ name, ...bounds }));
  }

  function renderTrack(resetLoop) {
    const track = currentTrack();
    if (resetLoop) state.loop = 'full';
    $('#track-style').textContent = track.style;
    $('#track-title').textContent = track.title;
    $('#track-description').textContent = track.description;
    $('#track-key').textContent = track.key;
    $('#track-meter').textContent = track.meter;
    $('#tempo-input').value = state.tempo;
    $('#tempo-output').textContent = `${state.tempo} BPM`;
    const sections = progressionSections(track);
    $('#section-select').innerHTML = '<option value="full">Full progression</option>' + sections.map((section) =>
      `<option value="${section.start}-${section.end}">Section ${escapeHtml(section.name)}</option>`
    ).join('');
    if ([...$('#section-select').options].some((option) => option.value === state.loop)) $('#section-select').value = state.loop;
    else { state.loop = 'full'; $('#section-select').value = 'full'; }

    const timeline = PlayerTimeline.buildTimeline(track.progression, state.tempo, track.beatsPerBar);
    $('#chord-strip').innerHTML = timeline.events.map((event) =>
      `<button type="button" class="chord-chip" data-index="${event.index}" title="${escapeHtml(event.beats)} beats">
        <span>${escapeHtml(event.chord)}</span><small>${escapeHtml(event.section)} • bar ${event.startBar}</small>
      </button>`
    ).join('');
    saveState();
  }

  function loopBounds(track) {
    const timeline = PlayerTimeline.buildTimeline(track.progression, state.tempo, track.beatsPerBar);
    if (state.loop === 'full') return { start: 0, end: timeline.totalBeats };
    const [start, end] = state.loop.split('-').map(Number);
    return { start, end };
  }

  function levels() {
    return {
      pad: state.levels.pad / 100,
      bass: state.levels.bass / 100,
      drums: state.levels.drums / 100,
      master: state.levels.master / 100
    };
  }

  function renderTargetTones(chord) {
    const target = $('#target-tones');
    try {
      const tones = MusicTheory.getTargetTones(chord);
      target.innerHTML = `<strong>${escapeHtml(chord)}</strong>${tones.chordTones.map((note) =>
        `<span class="note-pill${tones.guideTones.includes(note) ? ' is-guide' : ''}">${escapeHtml(note)}</span>`
      ).join('')}<small>Gold = 3rd or 7th: hear these through the change.</small>`;
    } catch (_error) {
      target.textContent = chord;
    }
  }

  function highlightChord(payload) {
    document.querySelectorAll('.chord-chip').forEach((chip) => chip.classList.remove('is-current'));
    const chip = document.querySelector(`.chord-chip[data-index="${payload.index}"]`);
    if (chip) {
      chip.classList.add('is-current');
      chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    $('#player-status').textContent = `${payload.chord} • section ${payload.section}`;
    renderTargetTones(payload.chord);
  }

  function handleTransport(payload) {
    if (payload.phase === 'count-in') {
      $('#transport-position').textContent = `Count-in ${payload.countInBeat} / ${payload.countInTotal}`;
      $('#transport-progress').value = 0;
      return;
    }
    const percent = Math.max(0, Math.min(100, Math.round(payload.progress * 100)));
    $('#transport-position').textContent = `Bar ${payload.bar} • beat ${payload.beatInBar} • ${payload.section}`;
    $('#transport-progress').value = percent;
    $('#transport-progress').textContent = `${percent}%`;
  }

  async function startPlayer() {
    const track = currentTrack();
    const bounds = loopBounds(track);
    $('#play-button').disabled = true;
    $('#player-status').textContent = 'Starting audio…';
    try {
      await audio.start({
        track,
        bpm: state.tempo,
        loopStartBeat: bounds.start,
        loopEndBeat: bounds.end,
        countInBars: state.countInBars,
        levels: levels(),
        onChordChange: highlightChord,
        onTransport: handleTransport
      });
      $('#stop-button').disabled = false;
      $('#player-status').textContent = 'Playing…';
    } catch (error) {
      $('#play-button').disabled = false;
      $('#stop-button').disabled = true;
      $('#player-status').textContent = error.message || 'Audio could not start.';
    }
  }

  function stopPlayer() {
    audio.stop();
    $('#play-button').disabled = false;
    $('#stop-button').disabled = true;
    $('#player-status').textContent = 'Stopped.';
    $('#transport-position').textContent = 'Ready';
    $('#transport-progress').value = 0;
    $('#target-tones').textContent = 'Press Play to reveal guide tones.';
    document.querySelectorAll('.chord-chip').forEach((chip) => chip.classList.remove('is-current'));
  }

  function populateChordLab() {
    const roots = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const labels = {
      '': 'Major', '5': 'Power chord', m: 'Minor', dim: 'Diminished', aug: 'Augmented', sus2: 'Suspended 2', sus4: 'Suspended 4',
      '6': 'Major 6', m6: 'Minor 6', maj7: 'Major 7', '7': 'Dominant 7', m7: 'Minor 7', m7b5: 'Minor 7 flat 5',
      dim7: 'Diminished 7', add9: 'Add 9', maj9: 'Major 9', m9: 'Minor 9', '9': 'Dominant 9', '13': 'Dominant 13',
      '7b9': 'Dominant 7 flat 9', '7#9': 'Dominant 7 sharp 9'
    };
    $('#chord-root').innerHTML = roots.map((root) => `<option>${root}</option>`).join('');
    $('#chord-quality').innerHTML = CourseData.chordQualities.map((quality) =>
      `<option value="${escapeHtml(quality)}">${escapeHtml(labels[quality] || quality)}</option>`
    ).join('');

    function renderChord() {
      try {
        const root = $('#chord-root').value;
        const quality = $('#chord-quality').value;
        const notes = MusicTheory.buildChord(root, quality);
        $('#chord-result').innerHTML = `<strong class="chord-symbol">${escapeHtml(root + quality)}</strong>
          <span class="formula">${escapeHtml(MusicTheory.CHORD_FORMULAS[quality])}</span>
          ${notes.map((note) => `<span class="note-pill">${escapeHtml(note)}</span>`).join('')}`;
      } catch (error) {
        $('#chord-result').textContent = error.message;
      }
    }
    $('#chord-root').addEventListener('change', renderChord);
    $('#chord-quality').addEventListener('change', renderChord);
    renderChord();
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
  }

  function updateTimerDisplay() {
    $('#timer-display').textContent = formatTime(timerRemaining);
  }

  function startPauseTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerRemaining = Math.max(0, (timerDeadline - Date.now()) / 1000);
      $('#timer-start').textContent = 'Resume timer';
      $('#timer-message').textContent = 'Paused. Release your hands and breathe.';
      return;
    }
    if (timerRemaining <= 0) timerRemaining = safeInteger($('#timer-minutes').value, 20, 1, 60) * 60;
    timerDeadline = Date.now() + timerRemaining * 1000;
    $('#timer-start').textContent = 'Pause timer';
    $('#timer-message').textContent = 'Focus on one measurable behavior.';
    timerInterval = setInterval(() => {
      timerRemaining = Math.max(0, (timerDeadline - Date.now()) / 1000);
      updateTimerDisplay();
      if (timerRemaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        $('#timer-start').textContent = 'Start timer';
        $('#timer-message').textContent = 'Block complete. Step away, move, and rest your ears/hands.';
      }
    }, 250);
  }

  function resetTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    timerRemaining = safeInteger($('#timer-minutes').value, 20, 1, 60) * 60;
    $('#timer-start').textContent = 'Start timer';
    $('#timer-message').textContent = '';
    updateTimerDisplay();
  }

  function bindEvents() {
    $('#week-input').value = state.week;
    $('#minutes-select').value = state.minutes;
    $('#week-input').addEventListener('change', renderSession);
    $('#minutes-select').addEventListener('change', renderSession);
    $('#new-prompt').addEventListener('click', () => {
      $('#prompt-card').textContent = PracticeEngine.pickPrompt(`${Date.now()}-${Math.random()}`).text;
    });
    $('#timer-start').addEventListener('click', startPauseTimer);
    $('#timer-reset').addEventListener('click', resetTimer);
    $('#timer-minutes').addEventListener('change', resetTimer);

    $('#lesson-search').addEventListener('input', renderLibrary);
    $('#lesson-category').addEventListener('change', renderLibrary);
    $('#lesson-phase').addEventListener('change', renderLibrary);
    $('#export-progress').addEventListener('click', exportProgress);
    $('#import-progress').addEventListener('click', () => $('#progress-file').click());
    $('#progress-file').addEventListener('change', (event) => importProgressFile(event.target.files?.[0]));

    $('#track-select').addEventListener('change', () => {
      stopPlayer();
      state.trackId = $('#track-select').value;
      state.tempo = currentTrack().bpm;
      renderTrack(true);
    });
    $('#section-select').addEventListener('change', () => {
      stopPlayer();
      state.loop = $('#section-select').value;
      saveState();
    });
    $('#tempo-input').addEventListener('input', () => {
      state.tempo = safeInteger($('#tempo-input').value, currentTrack().bpm, 50, 220);
      $('#tempo-output').textContent = `${state.tempo} BPM`;
      audio.setTempo(state.tempo);
      saveState();
    });
    $('#count-in-select').value = state.countInBars;
    $('#count-in-select').addEventListener('change', () => {
      state.countInBars = safeInteger($('#count-in-select').value, defaults.countInBars, 0, 2);
      saveState();
    });
    $('#play-button').addEventListener('click', startPlayer);
    $('#stop-button').addEventListener('click', stopPlayer);

    ['master', 'pad', 'bass', 'drums'].forEach((voice) => {
      const input = $(`#${voice}-level`);
      input.value = state.levels[voice];
      input.addEventListener('input', () => {
        state.levels[voice] = safeInteger(input.value, defaults.levels[voice], 0, 100);
        audio.setMix(levels());
        saveState();
      });
    });

    $('#reset-progress').addEventListener('click', () => {
      if (!confirm('Reset the locally saved week, checks, track and tempo? Your lesson files will not be deleted.')) return;
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      state = ProgressStore.normalize(null);
      location.reload();
    });
  }

  async function registerOfflineSupport() {
    const status = $('#offline-status');
    if (!status) return;
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) {
      status.textContent = 'Use the ZIP for fully offline access.';
      return;
    }
    try {
      await navigator.serviceWorker.register('sw.js');
      status.textContent = 'Offline support ready after the first complete visit.';
    } catch (_error) {
      status.textContent = 'Offline cache unavailable; the ZIP still works.';
    }
  }

  function init() {
    bindEvents();
    populateTracks();
    renderTrack(false);
    renderSession();
    populateLessonFilters();
    renderLibrary();
    populateChordLab();
    resetTimer();
    $('#prompt-card').textContent = PracticeEngine.pickPrompt(`week-${state.week}`).text;
    registerOfflineSupport();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
