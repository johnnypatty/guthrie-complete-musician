(function (root) {
  'use strict';

  function create(context) {
    const { document, audio, defaults, saveState, window } = context;
    const $ = (selector) => document.querySelector(selector);
    const { escapeHtml, safeInteger } = UiComponents;
    let playerGeneration = 0;
    let customTrack = null;
    const inputView = context.analysis && root.GuitarInputView ? root.GuitarInputView.create({ document, controller: context.analysis }) : null;
    const recordingView = context.recordingController && root.RecordingView ? root.RecordingView.create({ document, controller: context.recordingController, store: context.recordingStore, inputManager: context.inputManager }) : null;
    const fretboardView = root.FretboardView ? root.FretboardView.create({ document, state: context.state, saveState: context.saveState }) : null;
    const earView = root.EarTrainingView && context.audioRuntime ? root.EarTrainingView.create({ document, runtime: context.audioRuntime, state: context.state, saveState: context.saveState }) : null;

    function currentTrack() {
      return customTrack?.id === context.state.trackId ? customTrack : CourseData.tracks.find((track) => track.id === context.state.trackId) || CourseData.tracks[0];
    }

    function progressionSections(track) {
      const timeline = PlayerTimeline.buildTimeline(track.progression, context.state.tempo, track.meterObject || track.beatsPerBar);
      const map = new Map();
      timeline.events.forEach((event) => {
        if (!map.has(event.section)) map.set(event.section, { start: event.startBeat, end: event.endBeat });
        else map.get(event.section).end = event.endBeat;
      });
      return [...map.entries()].map(([name, bounds]) => ({ name, ...bounds }));
    }

    function renderTrack(resetLoop) {
      const track = currentTrack();
      if (resetLoop) context.state.loop = 'full';
      $('#track-style').textContent = track.style;
      $('#track-title').textContent = track.title;
      $('#track-description').textContent = track.description;
      $('#track-key').textContent = track.key;
      $('#track-meter').textContent = track.meter;
      if ($('#groove-select')) $('#groove-select').value = track.groove || ProgressionEngine.fromTrack(track).groove;
      $('#tempo-input').value = context.state.tempo;
      $('#tempo-output').textContent = `${context.state.tempo} BPM`;
      const sections = progressionSections(track);
      $('#section-select').innerHTML = '<option value="full">Full progression</option>' + sections.map((section) =>
        `<option value="${section.start}-${section.end}">Section ${escapeHtml(section.name)}</option>`
      ).join('');
      if ([...$('#section-select').options].some((option) => option.value === context.state.loop)) $('#section-select').value = context.state.loop;
      else { context.state.loop = 'full'; $('#section-select').value = 'full'; }

      const timeline = PlayerTimeline.buildTimeline(track.progression, context.state.tempo, track.meterObject || track.beatsPerBar);
      $('#chord-strip').innerHTML = timeline.events.map((event) =>
        `<button type="button" class="chord-chip" data-index="${event.index}" title="${escapeHtml(event.beats)} beats">
          <span>${escapeHtml(event.chord)}</span><small>${escapeHtml(event.section)} · bar ${event.startBar}</small>
        </button>`
      ).join('');
      saveState();
    }

    function loopBounds(track) {
      const timeline = PlayerTimeline.buildTimeline(track.progression, context.state.tempo, track.meterObject || track.beatsPerBar);
      if (context.state.loop === 'full') return { start: 0, end: timeline.totalBeats };
      const [start, end] = context.state.loop.split('-').map(Number);
      return { start, end };
    }

    function levels() {
      return {
        pad: context.state.levels.pad / 100,
        bass: context.state.levels.bass / 100,
        drums: context.state.levels.drums / 100,
        master: context.state.levels.master / 100
      };
    }

    function renderTargetTones(chord) {
      const target = $('#target-tones');
      try {
        const tones = MusicTheory.getTargetTones(chord);
        target.innerHTML = `<strong>${escapeHtml(chord)}</strong>${tones.chordTones.map((note) =>
          `<span class="note-pill${tones.guideTones.includes(note) ? ' is-guide' : ''}">${escapeHtml(note)}</span>`
        ).join('')}<small>Amber = 3rd or 7th: hear these through the change.</small>`;
      } catch (_error) {
        target.textContent = chord;
      }
    }

    function highlightChord(payload) {
      document.querySelectorAll('.chord-chip').forEach((chip) => chip.classList.remove('is-current'));
      const chip = document.querySelector(`.chord-chip[data-index="${payload.index}"]`);
      if (chip) {
        chip.classList.add('is-current');
        const reduced = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
        chip.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
      }
      $('#player-status').textContent = `${payload.chord} · section ${payload.section}`;
      renderTargetTones(payload.chord);
    }

    function handleTransport(payload) {
      if (payload.phase === 'count-in') {
        $('#transport-position').textContent = `Count-in ${payload.countInBeat} / ${payload.countInTotal}`;
        $('#transport-progress').value = 0;
        return;
      }
      const percent = Math.max(0, Math.min(100, Math.round(payload.progress * 100)));
      $('#transport-position').textContent = `Bar ${payload.bar} · beat ${payload.beatInBar} · ${payload.section}`;
      $('#transport-progress').value = percent;
      $('#transport-progress').textContent = `${percent}%`;
    }

    async function startPlayer() {
      const startGeneration = playerGeneration;
      const track = currentTrack();
      const bounds = loopBounds(track);
      $('#play-button').disabled = true;
      $('#player-status').textContent = 'Starting audio…';
      try {
        await audio.start({
          track,
          bpm: context.state.tempo,
          loopStartBeat: bounds.start,
          loopEndBeat: bounds.end,
          countInBars: context.state.countInBars,
          levels: levels(),
          groove: $('#groove-select')?.value || track.groove,
          onChordChange: highlightChord,
          onTransport: handleTransport
        });
        if (startGeneration !== playerGeneration) {
          audio.stop();
          return;
        }
        $('#stop-button').disabled = false;
        $('#player-status').textContent = 'Playing…';
      } catch (error) {
        if (startGeneration !== playerGeneration) return;
        $('#play-button').disabled = false;
        $('#stop-button').disabled = true;
        $('#player-status').textContent = error.message || 'Audio could not start.';
      }
    }

    function stopPlayer() {
      playerGeneration += 1;
      audio.stop();
      $('#play-button').disabled = false;
      $('#stop-button').disabled = true;
      $('#player-status').textContent = 'Stopped.';
      $('#transport-position').textContent = 'Ready';
      $('#transport-progress').value = 0;
      $('#target-tones').textContent = 'Press Play to reveal guide tones.';
      document.querySelectorAll('.chord-chip').forEach((chip) => chip.classList.remove('is-current'));
    }

    function populateTracks() {
      $('#track-select').innerHTML = CourseData.tracks.map((track) =>
        `<option value="${escapeHtml(track.id)}">${escapeHtml(track.title)}</option>`
      ).join('');
      $('#track-select').value = context.state.trackId;
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

    function bindEvents() {
      $('#track-select').addEventListener('change', () => {
        stopPlayer();
        context.state.trackId = $('#track-select').value;
        context.state.tempo = currentTrack().bpm;
        renderTrack(true);
      });
      $('#section-select').addEventListener('change', () => {
        stopPlayer();
        context.state.loop = $('#section-select').value;
        saveState();
      });
      $('#tempo-input').addEventListener('input', () => {
        context.state.tempo = safeInteger($('#tempo-input').value, currentTrack().bpm, 40, 240);
        $('#tempo-output').textContent = `${context.state.tempo} BPM`;
        audio.setTempo(context.state.tempo);
        saveState();
      });
      $('#count-in-select').value = context.state.countInBars;
      $('#count-in-select').addEventListener('change', () => {
        context.state.countInBars = safeInteger($('#count-in-select').value, defaults.countInBars, 0, 2);
        saveState();
      });
      $('#play-button').addEventListener('click', startPlayer);
      $('#stop-button').addEventListener('click', stopPlayer);
      $('#groove-select')?.addEventListener('change', () => { stopPlayer(); });

      ['master', 'pad', 'bass', 'drums'].forEach((voice) => {
        const input = $(`#${voice}-level`);
        input.value = context.state.levels[voice];
        input.addEventListener('input', () => {
          context.state.levels[voice] = safeInteger(input.value, defaults.levels[voice], 0, 100);
          audio.setMix(levels());
          saveState();
        });
      });
    }

    function init() {
      populateTracks();
      renderTrack(false);
      populateChordLab();
      bindEvents();
      root.BackingLabView?.create({ document, state: context.state, saveState, onApply(track) { stopPlayer(); customTrack = track; context.state.trackId = track.id; context.state.tempo = track.bpm; populateTracks(); $('#track-select').insertAdjacentHTML('beforeend', `<option value="${escapeHtml(track.id)}">${escapeHtml(track.title)} (custom)</option>`); $('#track-select').value = track.id; renderTrack(true); } }).init();
      inputView?.init();
      recordingView?.init();
      fretboardView?.init();
      earView?.init();
    }

    function deactivate() { stopPlayer(); inputView?.deactivate(); recordingView?.deactivate(); earView?.deactivate(); }

    return { init, renderTrack, startPlayer, stopPlayer, deactivate };
  }

  root.StudioView = Object.freeze({ create });
})(globalThis);
