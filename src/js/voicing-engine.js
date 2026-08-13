(function (root) {
  'use strict';
  function candidates(symbol, low = 48, high = 76) {
    const chord = root.MusicTheory.describeChord(symbol); const pcs = [...new Set(chord.pitchClasses)];
    const tones = pcs.flatMap((pc) => { const notes = []; for (let midi = low; midi <= high; midi += 1) if (midi % 12 === pc) notes.push(midi); return notes; });
    const prioritized = [...tones].sort((a, b) => { const ag = chord.guidePitchClasses.includes(a % 12) ? -1 : 0; const bg = chord.guidePitchClasses.includes(b % 12) ? -1 : 0; return ag - bg || a - b; });
    return Array.from({ length: Math.min(4, Math.max(2, pcs.length)) }, (_, index) => prioritized[index % prioritized.length]).sort((a, b) => a - b);
  }
  function voiceDistance(left, right) { return right.reduce((sum, note) => sum + Math.min(...left.map((previous) => Math.abs(note - previous))), 0); }
  function arrange(symbols, options = {}) {
    const low = options.low ?? 48; const high = options.high ?? 76; const output = [];
    for (const symbol of symbols) {
      const base = candidates(symbol, low, high); if (!output.length) { output.push(base); continue; }
      const variants = [base, base.map((note) => note + 12).filter((note) => note <= high), base.map((note) => note - 12).filter((note) => note >= low)].filter((voice) => voice.length >= 2);
      output.push(variants.sort((a, b) => voiceDistance(output.at(-1), a) - voiceDistance(output.at(-1), b))[0]);
    }
    return output;
  }
  function motion(voices) { let total = 0; for (let index = 1; index < voices.length; index += 1) total += voiceDistance(voices[index - 1], voices[index]); return total; }
  root.VoicingEngine = Object.freeze({ arrange, candidates, motion });
})(typeof globalThis !== 'undefined' ? globalThis : this);
