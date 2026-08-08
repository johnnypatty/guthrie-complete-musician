(function () {
  'use strict';

  const STORAGE_KEY = 'gcm-progress-v1';
  const $ = (selector) => document.querySelector(selector);
  const audio = AudioEngine.create();
  const defaults = {
    week: 1,
    minutes: 90,
    completed: {},
    trackId: CourseData.tracks[0].id,
    tempo: CourseData.tracks[0].bpm,
    loop: 'full',
    levels: { pad: 72, bass: 72, drums: 62 }
  };
  let state = loadState();
  let timerInterval = null;
  let timerRemaining = 20 * 60;
  let timerDeadline = 0;

  function safeInteger(value, fallback, min, max) {
    const number = Number(value);
    return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const validTrack = CourseData.tracks.some((track) => track.id === saved.trackId);
      return {
        week: safeInteger(saved.week, defaults.week, 1, 24),
        minutes: [90, 120].includes(Number(saved.minutes)) ? Number(saved.minutes) : defaults.minutes,
        completed: saved.completed && typeof saved.completed === 'object' ? saved.completed : {},
        trackId: validTrack ? saved.trackId : defaults.trackId,
        tempo: safeInteger(saved.tempo, defaults.tempo, 50, 220),
        loop: typeof saved.loop === 'string' ? saved.loop : 'full',
        levels: {
          pad: safeInteger(saved.levels?.pad, 72, 0, 100),
          bass: safeInteger(saved.levels?.bass, 72, 0, 100),
          drums: safeInteger(saved.levels?.drums, 62, 0, 100)
        }
      };
    } catch (_) {
      return { ...defaults, completed: {}, levels: { ...defaults.levels } };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

  function renderLibrary() {
    const lessons = Array.isArray(globalThis.GcmLessonIndex) ? globalThis.GcmLessonIndex : CourseData.lessons;
    $('#library-grid').innerHTML = lessons.map((lesson) =>
      `<a class="library-link" href="${lesson.slug ? `lessons/${encodeURIComponent(lesson.slug)}.html` : encodeURI(lesson.path)}"><small>${escapeHtml(lesson.category || lesson.group)}</small><strong>${escapeHtml(lesson.title)}</strong><span>${escapeHtml(lesson.summary || 'Open lesson')} →</span></a>`
    ).join('');
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
      drums: state.levels.drums / 100
    };
  }

  function highlightChord(payload) {
    document.querySelectorAll('.chord-chip').forEach((chip) => chip.classList.remove('is-current'));
    const chip = document.querySelector(`.chord-chip[data-index="${payload.index}"]`);
    if (chip) {
      chip.classList.add('is-current');
      chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    $('#player-status').textContent = `${payload.chord} • section ${payload.section}`;
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
        levels: levels(),
        onChordChange: highlightChord
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
    $('#play-button').addEventListener('click', startPlayer);
    $('#stop-button').addEventListener('click', stopPlayer);

    ['pad', 'bass', 'drums'].forEach((voice) => {
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
      state = { ...defaults, completed: {}, levels: { ...defaults.levels } };
      location.reload();
    });
  }

  function init() {
    bindEvents();
    populateTracks();
    renderTrack(false);
    renderSession();
    renderLibrary();
    populateChordLab();
    resetTimer();
    $('#prompt-card').textContent = PracticeEngine.pickPrompt(`week-${state.week}`).text;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
