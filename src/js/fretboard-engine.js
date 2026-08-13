(function (root) {
  'use strict';
  const OPEN_MIDI = [64, 59, 55, 50, 45, 40];
  const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const INTERVALS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
  function noteName(pc, preferFlats = false) { return (preferFlats ? FLATS : SHARPS)[((Number(pc) % 12) + 12) % 12]; }
  function positions(options = {}) {
    const preferFlats = Boolean(options.preferFlats);
    return OPEN_MIDI.flatMap((open, index) => Array.from({ length: 13 }, (_, fret) => {
      const string = index + 1; const midi = open + fret; const pitchClass = midi % 12;
      return { id: `s${string}-f${fret}`, string, fret, midi, pitchClass, note: noteName(pitchClass, preferFlats), octave: Math.floor(midi / 12) - 1 };
    }));
  }
  function overlay(options = {}) {
    const rootPc = root.MusicTheory.noteToPc(options.root || 'C');
    let chordTones = [];
    let guides = [];
    if (options.chord) {
      const target = root.MusicTheory.getTargetTones(options.chord);
      chordTones = target.chordTones.map(root.MusicTheory.noteToPc);
      guides = target.guideTones.map(root.MusicTheory.noteToPc);
    }
    const mapped = positions({ preferFlats: String(options.root).includes('b') }).map((position) => ({
      ...position,
      interval: INTERVALS[(position.pitchClass - rootPc + 12) % 12],
      isRoot: position.pitchClass === rootPc,
      isChordTone: chordTones.includes(position.pitchClass),
      isGuideTone: guides.includes(position.pitchClass)
    }));
    return { positions: mapped, root: options.root || 'C', chord: options.chord || null, legend: INTERVALS.map((interval, semitones) => ({ interval, semitones, pitchClass: (rootPc + semitones) % 12, note: noteName(rootPc + semitones, String(options.root).includes('b')) })) };
  }
  root.FretboardEngine = Object.freeze({ positions, overlay, noteName, OPEN_MIDI, INTERVALS });
})(typeof globalThis !== 'undefined' ? globalThis : this);
