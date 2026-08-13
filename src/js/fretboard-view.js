(function (root) {
  'use strict';
  function create({ document, state, saveState }) {
    const $ = (selector) => document.querySelector(selector);
    let revealed = true;
    let quiz = null;
    function escape(value) { return root.UiComponents.escapeHtml(value); }
    function render() {
      if (!$('#fretboard-grid')) return;
      const rootNote = $('#fretboard-root').value;
      const chord = `${rootNote}${$('#fretboard-quality').value}`;
      const data = root.FretboardEngine.overlay({ root: rootNote, chord });
      $('#fretboard-grid').innerHTML = data.positions.map((position) => `<button type="button" class="fret-cell${position.isChordTone ? ' is-chord-tone' : ''}${position.isGuideTone ? ' is-guide-tone' : ''}" data-position="${position.id}" aria-label="String ${position.string}, fret ${position.fret}${revealed ? `, ${escape(position.note)}, ${escape(position.interval)}` : ''}"><small>${position.fret}</small><strong>${revealed ? escape(position.note) : '?'}</strong><span>${revealed ? escape(position.interval) : ''}</span></button>`).join('');
      $('#fretboard-legend').textContent = `Root ${rootNote}. Chord ${chord}. Amber-ringed notes are the 3rd or 7th guide tones.`;
      $('#fretboard-grid').querySelectorAll('[data-position]').forEach((button) => button.addEventListener('click', () => answer(button.dataset.position)));
    }
    function startQuiz() {
      const positions = root.FretboardEngine.positions();
      quiz = positions[Math.floor(Date.now() / 1000) % positions.length]; revealed = false;
      $('#fretboard-feedback').textContent = `Find every ${quiz.note}, or start with string ${quiz.string}. Choose one position.`; render();
    }
    function answer(id) {
      if (!quiz) return;
      const selected = root.FretboardEngine.positions().find((position) => position.id === id);
      const correct = selected.note === quiz.note;
      $('#fretboard-feedback').textContent = correct ? `Correct: ${selected.note} on string ${selected.string}, fret ${selected.fret}. Hear it before the next answer.` : `${selected.note} is not ${quiz.note}. Count semitones from the nearest open string.`;
      state.reviewItems ||= [];
      if (!correct) state.reviewItems.push({ id: `fret-${quiz.note}-${Date.now()}`, type: 'fretboard-note', prompt: `Find ${quiz.note}`, answer: quiz.note, dueAt: new Date(Date.now() + 86400000).toISOString(), repetitions: 0 });
      saveState();
    }
    function init() {
      if (!$('#fretboard-grid')) return;
      $('#fretboard-root').innerHTML = root.MusicTheory.NOTE_NAMES.map((note) => `<option>${note}</option>`).join('');
      $('#fretboard-quality').innerHTML = ['', 'm', '7', 'maj7', 'm7'].map((quality) => `<option value="${quality}">${quality || 'major'}</option>`).join('');
      $('#fretboard-root').addEventListener('change', render); $('#fretboard-quality').addEventListener('change', render);
      $('#fretboard-reveal').addEventListener('click', () => { revealed = !revealed; quiz = null; $('#fretboard-feedback').textContent = revealed ? 'Notes and intervals revealed.' : 'Notes hidden. Use interval locations from the root.'; render(); });
      $('#fretboard-quiz').addEventListener('click', startQuiz); render();
    }
    return Object.freeze({ init, render, deactivate() {} });
  }
  root.FretboardView = Object.freeze({ create });
})(typeof globalThis !== 'undefined' ? globalThis : this);
