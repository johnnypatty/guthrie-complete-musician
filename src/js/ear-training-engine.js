(function (root) {
  'use strict';
  const INTERVALS = [{ name: 'minor 2nd', semitones: 1 }, { name: 'major 2nd', semitones: 2 }, { name: 'minor 3rd', semitones: 3 }, { name: 'major 3rd', semitones: 4 }, { name: 'perfect 4th', semitones: 5 }, { name: 'tritone', semitones: 6 }, { name: 'perfect 5th', semitones: 7 }, { name: 'minor 6th', semitones: 8 }, { name: 'major 6th', semitones: 9 }, { name: 'minor 7th', semitones: 10 }, { name: 'major 7th', semitones: 11 }, { name: 'octave', semitones: 12 }];
  const TRIADS = [{ name: 'major', intervals: [0, 4, 7] }, { name: 'minor', intervals: [0, 3, 7] }, { name: 'diminished', intervals: [0, 3, 6] }, { name: 'augmented', intervals: [0, 4, 8] }];
  function random(seed) { let value = (Number(seed) || 1) >>> 0; return () => { value = (Math.imul(value, 1664525) + (1013904 * 1000 + 223)) >>> 0; return value / 4294967296; }; }
  function prompt({ type = 'interval', seed = 1 } = {}) {
    const next = random(seed); const rootMidi = 48 + Math.floor(next() * 17); let notes; let answer; let text; let explanation;
    if (type === 'note-match') { notes = [rootMidi]; answer = rootMidi; text = 'Sing or find this note on the guitar.'; explanation = 'Match the pitch, not a fretboard shape.'; }
    else if (type === 'interval') { const interval = INTERVALS[Math.floor(next() * INTERVALS.length)]; notes = [rootMidi, rootMidi + interval.semitones]; answer = interval.name; text = 'Name the interval and its direction.'; explanation = `${interval.name} spans ${interval.semitones} semitone${interval.semitones === 1 ? '' : 's'}.`; }
    else if (type === 'triad') { const triad = TRIADS[Math.floor(next() * TRIADS.length)]; notes = triad.intervals.map((interval) => rootMidi + interval); answer = triad.name; text = 'Name the triad quality.'; explanation = `${triad.name} triad: ${triad.intervals.join('–')} semitones from the root.`; }
    else if (type === 'chord-tone') { const choices = [3, 4, 7, 10, 11]; const interval = choices[Math.floor(next() * choices.length)]; notes = [rootMidi, rootMidi + interval]; answer = interval; text = 'Sing the second chord tone after hearing the root.'; explanation = `The target sits ${interval} semitones above the root.`; }
    else { const length = 3 + Math.floor(next() * 3); notes = Array.from({ length }, (_, index) => Math.max(48, Math.min(76, rootMidi + [0, 2, 4, 7, -2][Math.floor(next() * 5)] + index % 2))); answer = notes.join(','); text = 'Play the short phrase back by ear.'; explanation = 'Listen for contour and rhythm before searching for notes.'; }
    return { id: `ear-${type}-${seed}`, type, notes, answer, text, explanation, replayLimit: type === 'call-response' ? 3 : 2 };
  }
  function evaluate(item, response) {
    const correct = String(response).trim().toLowerCase() === String(item.answer).trim().toLowerCase();
    return { correct, feedback: correct ? `Correct. ${item.explanation}` : `Answer: ${item.answer}. ${item.explanation}`, reviewItem: correct ? null : { id: `review-${item.id}`, type: `ear-${item.type}`, prompt: item.text, answer: String(item.answer), repetitions: 0, intervalDays: 1 } };
  }
  function selfConfirm(item, correct) { return { correct: Boolean(correct), feedback: correct ? `Confirmed. ${item.explanation}` : `Review it once more. ${item.explanation}` }; }
  function pitchMatch(item, detected) {
    if (!detected || detected.status !== 'ready' || Number(detected.confidence) < 0.8) return { status: 'self-confirm-required', reason: detected?.reason || 'input-unavailable' };
    const target = 440 * 2 ** ((item.notes[0] - 69) / 12); const errorCents = 1200 * Math.log2(Number(detected.frequency) / target);
    return Math.abs(errorCents) <= 25 ? { status: 'matched', errorCents } : { status: 'not-matched', errorCents };
  }
  root.EarTrainingEngine = Object.freeze({ prompt, evaluate, selfConfirm, pitchMatch, INTERVALS, TRIADS });
})(typeof globalThis !== 'undefined' ? globalThis : this);
