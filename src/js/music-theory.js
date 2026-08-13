(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MusicTheory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const LETTER_PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  const DEFINITIONS = {
    '': { formula: '1 3 5', intervals: [0, 4, 7], degrees: [0, 2, 4] },
    '5': { formula: '1 5', intervals: [0, 7], degrees: [0, 4] },
    m: { formula: '1 b3 5', intervals: [0, 3, 7], degrees: [0, 2, 4] },
    dim: { formula: '1 b3 b5', intervals: [0, 3, 6], degrees: [0, 2, 4] },
    aug: { formula: '1 3 #5', intervals: [0, 4, 8], degrees: [0, 2, 4] },
    sus2: { formula: '1 2 5', intervals: [0, 2, 7], degrees: [0, 1, 4] },
    sus4: { formula: '1 4 5', intervals: [0, 5, 7], degrees: [0, 3, 4] },
    '6': { formula: '1 3 5 6', intervals: [0, 4, 7, 9], degrees: [0, 2, 4, 5] },
    m6: { formula: '1 b3 5 6', intervals: [0, 3, 7, 9], degrees: [0, 2, 4, 5] },
    maj7: { formula: '1 3 5 7', intervals: [0, 4, 7, 11], degrees: [0, 2, 4, 6] },
    '7': { formula: '1 3 5 b7', intervals: [0, 4, 7, 10], degrees: [0, 2, 4, 6] },
    m7: { formula: '1 b3 5 b7', intervals: [0, 3, 7, 10], degrees: [0, 2, 4, 6] },
    m7b5: { formula: '1 b3 b5 b7', intervals: [0, 3, 6, 10], degrees: [0, 2, 4, 6] },
    dim7: { formula: '1 b3 b5 bb7', intervals: [0, 3, 6, 9], degrees: [0, 2, 4, 6], simplifyIndices: [3] },
    add9: { formula: '1 3 5 9', intervals: [0, 4, 7, 2], degrees: [0, 2, 4, 1] },
    maj9: { formula: '1 3 5 7 9', intervals: [0, 4, 7, 11, 2], degrees: [0, 2, 4, 6, 1] },
    m9: { formula: '1 b3 5 b7 9', intervals: [0, 3, 7, 10, 2], degrees: [0, 2, 4, 6, 1] },
    '9': { formula: '1 3 5 b7 9', intervals: [0, 4, 7, 10, 2], degrees: [0, 2, 4, 6, 1] },
    '13': { formula: '1 3 5 b7 9 11 13', intervals: [0, 4, 7, 10, 2, 5, 9], degrees: [0, 2, 4, 6, 1, 3, 5] },
    '7b9': { formula: '1 3 5 b7 b9', intervals: [0, 4, 7, 10, 1], degrees: [0, 2, 4, 6, 1] },
    '7#9': { formula: '1 3 5 b7 #9', intervals: [0, 4, 7, 10, 3], degrees: [0, 2, 4, 6, 1] }
  };

  const CHORD_FORMULAS = Object.fromEntries(
    Object.entries(DEFINITIONS).map(([quality, definition]) => [quality, definition.formula])
  );

  function normalizeNote(note) {
    if (typeof note !== 'string' || !/^[A-Ga-g](?:#|b)?$/.test(note.trim())) {
      throw new Error(`Invalid root note: ${note}`);
    }
    const clean = note.trim();
    return clean[0].toUpperCase() + clean.slice(1);
  }

  function noteToPc(note) {
    const clean = normalizeNote(note);
    let pc = LETTER_PCS[clean[0]];
    if (clean[1] === '#') pc += 1;
    if (clean[1] === 'b') pc -= 1;
    return (pc + 12) % 12;
  }

  function accidentalForDifference(diff) {
    const normalized = ((diff + 6) % 12) - 6;
    if (normalized === 0) return '';
    if (normalized === 1) return '#';
    if (normalized === 2) return '##';
    if (normalized === -1) return 'b';
    if (normalized === -2) return 'bb';
    return null;
  }

  function spellInterval(root, semitones, degree, simplify) {
    const rootName = normalizeNote(root);
    const targetPc = (noteToPc(rootName) + semitones) % 12;
    if (simplify) {
      const names = rootName.includes('b') ? FLAT_NAMES : NOTE_NAMES;
      return names[targetPc];
    }
    const rootLetterIndex = LETTERS.indexOf(rootName[0]);
    const targetLetter = LETTERS[(rootLetterIndex + degree) % 7];
    const accidental = accidentalForDifference(targetPc - LETTER_PCS[targetLetter]);
    if (accidental === null) {
      const names = rootName.includes('b') ? FLAT_NAMES : NOTE_NAMES;
      return names[targetPc];
    }
    return targetLetter + accidental;
  }

  function buildChord(root, quality) {
    const cleanRoot = normalizeNote(root);
    const normalizedQuality = quality == null ? '' : String(quality);
    const definition = DEFINITIONS[normalizedQuality];
    if (!definition) throw new Error(`Unsupported chord quality: ${normalizedQuality}`);
    return definition.intervals.map((interval, index) =>
      spellInterval(cleanRoot, interval, definition.degrees[index], definition.simplifyIndices?.includes(index))
    );
  }

  function parseChord(symbol) {
    if (typeof symbol !== 'string') throw new Error('Chord symbol must be text');
    const match = symbol.trim().match(/^([A-Ga-g](?:#|b)?)([^/]*?)(?:\/([A-Ga-g](?:#|b)?))?$/);
    if (!match) throw new Error(`Invalid chord symbol: ${symbol}`);
    const root = normalizeNote(match[1]);
    const quality = match[2] || '';
    if (!DEFINITIONS[quality]) throw new Error(`Unsupported chord quality: ${quality}`);
    return { root, quality, bass: match[3] ? normalizeNote(match[3]) : null };
  }

  function transposeNote(note, semitones, preferFlats) {
    const pc = (noteToPc(note) + Number(semitones) % 12 + 12) % 12;
    return (preferFlats ? FLAT_NAMES : NOTE_NAMES)[pc];
  }

  function transposeChord(symbol, semitones) {
    if (!Number.isInteger(Number(semitones))) throw new Error('Semitones must be an integer');
    const parsed = parseChord(symbol);
    const preferFlats = parsed.root.includes('b');
    const newRoot = transposeNote(parsed.root, Number(semitones), preferFlats);
    const newBass = parsed.bass ? transposeNote(parsed.bass, Number(semitones), parsed.bass.includes('b')) : null;
    return `${newRoot}${parsed.quality}${newBass ? `/${newBass}` : ''}`;
  }

  function getTargetTones(symbol) {
    const parsed = parseChord(symbol);
    const definition = DEFINITIONS[parsed.quality];
    const chordTones = buildChord(parsed.root, parsed.quality);
    const formula = definition.formula.split(/\s+/);
    let guideTones = chordTones.filter((_note, index) => /^(?:b|#)?3$|^(?:bb|b|#)?7$/.test(formula[index]));
    if (guideTones.length === 0) {
      guideTones = chordTones.filter((_note, index) => ![0, 4].includes(definition.degrees[index])).slice(0, 2);
    }
    if (guideTones.length === 0 && chordTones.length > 1) guideTones = [chordTones[1]];
    return { chordTones, guideTones };
  }

  function describeChord(symbol) {
    const parsed = parseChord(symbol);
    const definition = DEFINITIONS[parsed.quality];
    const notes = buildChord(parsed.root, parsed.quality);
    const labels = definition.formula.split(/\s+/);
    const tones = notes.map((note, index) => ({ note, pitchClass: noteToPc(note.replace('bb', 'b').replace('##', '#')), role: labels[index], priority: /3|7/.test(labels[index]) ? 'guide' : (index === 0 ? 'root' : 'color') }));
    return { ...parsed, symbol, rootPitchClass: noteToPc(parsed.root), bassPitchClass: noteToPc(parsed.bass || parsed.root), tones, pitchClasses: tones.map((tone) => tone.pitchClass), guidePitchClasses: tones.filter((tone) => tone.priority === 'guide').map((tone) => tone.pitchClass) };
  }

  return {
    NOTE_NAMES,
    CHORD_FORMULAS,
    buildChord,
    getTargetTones,
    parseChord,
    transposeChord,
    noteToPc,
    describeChord
  };
});
