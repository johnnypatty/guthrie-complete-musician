(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CourseData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const phases = [
    { start: 1, end: 4, name: 'Control and baseline', focus: 'Relaxation, pulse, fretboard landmarks, triads, sung melodies and motifs.' },
    { start: 5, end: 8, name: 'Vocabulary and articulation', focus: 'Picking/legato balance, bends, vibrato, seventh chords and short transcription.' },
    { start: 9, end: 12, name: 'Changes and groove', focus: 'Funk control, inversions, voice leading, target notes and a complete by-ear cover.' },
    { start: 13, end: 16, name: 'Fusion language', focus: 'Modes as sound, chromatic approaches, odd groupings and transformed vocabulary.' },
    { start: 17, end: 20, name: 'Advanced technique in music', focus: 'Sweep, tap and string-skip integration, altered tension and demanding project sections.' },
    { start: 21, end: 24, name: 'Personal voice and performance', focus: 'Original arrangement, coherent solo, complete cover, storytelling and final set.' }
  ];

  const prompts = [
    'Use only three notes. Make rhythm and dynamics carry the solo.',
    'Play on one string and sing each phrase before playing it.',
    'State a two-to-five-note motif and transform it three times.',
    'Leave at least one full beat of silence after every phrase.',
    'Land on each chord third, but approach it differently every time.',
    'Use only chord tones for one chorus, then add one chromatic approach.',
    'Begin every phrase after beat one.',
    'Build from whisper to shout, then end quietly.',
    'Answer every high-register phrase with a low-register phrase.',
    'Improvise rhythm on one muted note before adding pitches.',
    'Use bends only when you can hear the exact target first.',
    'Repeat one phrase exactly; alter only its final note next time.',
    'Make a question, pause, and answer it.',
    'Target sevenths on one chorus and roots on the next.',
    'Use a common tone across each chord change whenever possible.',
    'Place a short outside phrase, then resolve clearly within one beat.',
    'Use no more than one fast burst per four-bar phrase.',
    'Create a melody with long notes; decorate only the second pass.',
    'Start every phrase with an up-beat pickup.',
    'Use triplet rhythm against a straight backing without losing the bar.',
    'Make the top note of each phrase descend while harmony changes.',
    'Use one articulation per phrase: pick, legato, slide, then bend.',
    'Quote a tiny motif from your opening during the final chorus.',
    'Play one chorus without the lowest two strings.',
    'Play one chorus without the highest two strings.',
    'Resolve every chromatic note by the smallest possible motion.',
    'Treat the backing like a conversation: respond to drum accents.',
    'Create three endings and choose the strongest one.',
    'Use a five-note grouping while keeping the 4/4 bar audible.',
    'Play fewer notes than feels comfortable and make each release clean.',
    'Turn one vocal melody fragment into a new instrumental response.',
    'Keep the pitches, change the phrase rhythm after every repetition.',
    'Keep the rhythm, change notes to follow each chord.',
    'Delay one expected resolution, then make the arrival obvious.',
    'Use vibrato only on the most important note of each phrase.',
    'Make the final 20 seconds summarize the first 20 seconds.'
  ];

  const tracks = [
    {
      id: 'emotional-d-minor', title: 'D Minor Emotional Arena', style: 'Expressive rock', key: 'D minor', meter: '4/4', beatsPerBar: 4, bpm: 74,
      description: 'Wide space for Gary Moore, Timmons, Vai and vocal bend practice.',
      progression: [
        { chord: 'Dm', beats: 4, section: 'A' }, { chord: 'Bbmaj7', beats: 4, section: 'A' },
        { chord: 'F', beats: 4, section: 'A' }, { chord: 'C', beats: 4, section: 'A' },
        { chord: 'Gm7', beats: 4, section: 'B' }, { chord: 'Bb', beats: 4, section: 'B' },
        { chord: 'A7', beats: 4, section: 'B' }, { chord: 'Dm', beats: 4, section: 'B' }
      ]
    },
    {
      id: 'a-blues-voice', title: 'A Blues Conversation', style: 'Blues/rock', key: 'A', meter: '4/4', beatsPerBar: 4, bpm: 82,
      description: 'Pitch-aware bends, call/response and rhythmic space.',
      progression: [
        { chord: 'A7', beats: 16, section: 'A' }, { chord: 'D7', beats: 8, section: 'A' },
        { chord: 'A7', beats: 8, section: 'A' }, { chord: 'E7', beats: 4, section: 'B' },
        { chord: 'D7', beats: 4, section: 'B' }, { chord: 'A7', beats: 4, section: 'B' }, { chord: 'E7', beats: 4, section: 'B' }
      ]
    },
    {
      id: 'e-dorian-fusion', title: 'E Dorian Fusion', style: 'Fusion', key: 'E Dorian', meter: '4/4', beatsPerBar: 4, bpm: 108,
      description: 'Hear the natural 6 and build motifs over a modal center.',
      progression: [
        { chord: 'Em7', beats: 8, section: 'A' }, { chord: 'A13', beats: 8, section: 'A' },
        { chord: 'Em9', beats: 8, section: 'B' }, { chord: 'Dmaj7', beats: 4, section: 'B' }, { chord: 'A13', beats: 4, section: 'B' }
      ]
    },
    {
      id: 'a-mixolydian-funk', title: 'A Mixolydian Funk', style: 'Funk', key: 'A Mixolydian', meter: '4/4', beatsPerBar: 4, bpm: 112,
      description: 'Muted sixteenths, envelope-style attack and rhythm/lead exchange.',
      progression: [
        { chord: 'A7', beats: 8, section: 'A' }, { chord: 'G/A', beats: 4, section: 'A' }, { chord: 'D/A', beats: 4, section: 'A' },
        { chord: 'A7', beats: 8, section: 'B' }, { chord: 'D7', beats: 4, section: 'B' }, { chord: 'G/A', beats: 4, section: 'B' }
      ]
    },
    {
      id: 'f-lydian-sky', title: 'F Lydian Sky', style: 'Ambient fusion', key: 'F Lydian', meter: '4/4', beatsPerBar: 4, bpm: 84,
      description: 'Major color with a clear #4 and long melodic arcs.',
      progression: [
        { chord: 'Fmaj7', beats: 8, section: 'A' }, { chord: 'G/F', beats: 8, section: 'A' },
        { chord: 'Fmaj9', beats: 8, section: 'B' }, { chord: 'Em7', beats: 4, section: 'B' }, { chord: 'G/F', beats: 4, section: 'B' }
      ]
    },
    {
      id: 'f-dreamy-changes', title: 'F Dreamy Changes', style: 'Neo-soul', key: 'F', meter: '4/4', beatsPerBar: 4, bpm: 76,
      description: 'The earlier romantic progression: voice leading, secondary dominant and borrowed color.',
      progression: [
        { chord: 'Fmaj7', beats: 4, section: 'A' }, { chord: 'A7', beats: 4, section: 'A' },
        { chord: 'Dm7', beats: 4, section: 'A' }, { chord: 'Eb', beats: 4, section: 'A' },
        { chord: 'F6', beats: 4, section: 'B' }, { chord: 'Bbmaj7', beats: 4, section: 'B' },
        { chord: 'Gdim7', beats: 4, section: 'B' }, { chord: 'Am7', beats: 4, section: 'B' },
        { chord: 'Dm7', beats: 4, section: 'C' }, { chord: 'Gm7', beats: 4, section: 'C' },
        { chord: 'C7', beats: 4, section: 'C' }, { chord: 'Fmaj7', beats: 4, section: 'C' }
      ]
    },
    {
      id: 'd-harmonic-minor', title: 'D Harmonic Minor Stage', style: 'Neo-classical', key: 'D harmonic minor', meter: '4/4', beatsPerBar: 4, bpm: 132,
      description: 'Pedal tones, dominant b9 tension and melodic-minor resolution.',
      progression: [
        { chord: 'Dm', beats: 8, section: 'A' }, { chord: 'Gm', beats: 4, section: 'A' }, { chord: 'A7b9', beats: 4, section: 'A' },
        { chord: 'Bb', beats: 4, section: 'B' }, { chord: 'Gm', beats: 4, section: 'B' }, { chord: 'A7b9', beats: 4, section: 'B' }, { chord: 'Dm', beats: 4, section: 'B' }
      ]
    },
    {
      id: 'b-minor-five', title: 'B Minor in Five', style: 'Odd-meter fusion', key: 'B minor', meter: '5/4', beatsPerBar: 5, bpm: 96,
      description: 'Feel 3+2 and 2+3 while developing a melodic motif.',
      progression: [
        { chord: 'Bm9', beats: 10, section: '3+2' }, { chord: 'Gmaj7', beats: 5, section: '3+2' }, { chord: 'A', beats: 5, section: '3+2' },
        { chord: 'Em9', beats: 10, section: '2+3' }, { chord: 'F#7b9', beats: 10, section: '2+3' }
      ]
    },
    {
      id: 'dominant-cycle', title: 'Dominant Cycle Workout', style: 'Changes', key: 'Moving', meter: '4/4', beatsPerBar: 4, bpm: 104,
      description: 'Guide tones, chromatic approaches and clear resolution through moving dominants.',
      progression: [
        { chord: 'E7', beats: 4, section: 'A' }, { chord: 'A7', beats: 4, section: 'A' },
        { chord: 'D7', beats: 4, section: 'A' }, { chord: 'G7', beats: 4, section: 'A' },
        { chord: 'C7', beats: 4, section: 'B' }, { chord: 'F7', beats: 4, section: 'B' },
        { chord: 'Bb7', beats: 4, section: 'B' }, { chord: 'E7', beats: 4, section: 'B' }
      ]
    },
    {
      id: 'e-pedal-metal', title: 'E Pedal Metal', style: 'Metal', key: 'E minor', meter: '4/4', beatsPerBar: 4, bpm: 150,
      description: 'Right-hand stamina, tight rests and short melodic bursts.',
      progression: [
        { chord: 'E5', beats: 8, section: 'Riff A' }, { chord: 'F5', beats: 4, section: 'Riff A' }, { chord: 'G5', beats: 4, section: 'Riff A' },
        { chord: 'C5', beats: 4, section: 'Riff B' }, { chord: 'D5', beats: 4, section: 'Riff B' }, { chord: 'E5', beats: 8, section: 'Riff B' }
      ]
    },
    {
      id: 'f-emotional-changes', title: 'F Emotional Changes', style: 'Melodic lead', key: 'F', meter: '4/4', beatsPerBar: 4, bpm: 68,
      description: 'Slow enough to expose bend pitch, space, and chord-tone melody.',
      progression: [
        { chord: 'Fmaj7', beats: 8, section: 'A' }, { chord: 'A7', beats: 4, section: 'A' }, { chord: 'Dm7', beats: 4, section: 'A' },
        { chord: 'Bbmaj7', beats: 8, section: 'B' }, { chord: 'Gm7', beats: 4, section: 'B' }, { chord: 'C7', beats: 4, section: 'B' }
      ]
    },
    {
      id: 'e-altered-fusion', title: 'E Minor Altered Journey', style: 'Advanced fusion', key: 'E minor', meter: '4/4', beatsPerBar: 4, bpm: 118,
      description: 'ii–V movement, color tones and controlled outside/inside resolution.',
      progression: [
        { chord: 'Am9', beats: 4, section: 'A' }, { chord: 'D13', beats: 4, section: 'A' },
        { chord: 'Gmaj7', beats: 4, section: 'A' }, { chord: 'Cmaj7', beats: 4, section: 'A' },
        { chord: 'F#m7b5', beats: 4, section: 'B' }, { chord: 'B7b9', beats: 4, section: 'B' },
        { chord: 'Em9', beats: 8, section: 'B' }
      ]
    }
  ];

  tracks.forEach((track, index) => {
    const style = track.style.toLowerCase();
    track.meterObject = track.meter === '5/4'
      ? { numerator: 5, denominator: 4, groups: [3, 2], tempoUnit: 4 }
      : { numerator: track.beatsPerBar, denominator: 4, groups: [track.beatsPerBar], tempoUnit: 4 };
    track.groove = style.includes('funk') ? 'funk' : style.includes('neo-soul') ? 'neo-soul' : style.includes('ambient') ? 'ambient' : style.includes('changes') || style.includes('blues') ? 'changes' : style.includes('rock') || style.includes('metal') || style.includes('neo-classical') ? 'rock' : 'fusion';
    track.seed = index + 1;
  });

  const lessons = [
    { group: 'Daily Practice', title: '90-Minute Core', path: '../01 Daily Practice/90 Minute Core.md' },
    { group: 'Technique', title: 'Clean Speed System', path: '../02 Technique/Clean Speed System.md' },
    { group: 'Rhythm', title: 'Funk and Muted Articulation', path: '../03 Rhythm and Groove/Funk and Muted Articulation.md' },
    { group: 'Ear', title: 'The No-Tabs Method', path: '../04 Ear Training and Transcription/The No-Tabs Method.md' },
    { group: 'Harmony', title: 'How Chords Are Built', path: '../05 Fretboard Theory and Chords/How Chords Are Built.md' },
    { group: 'Improvisation', title: 'The Musical Sentence', path: '../06 Improvisation and Phrasing/The Musical Sentence.md' },
    { group: 'Repertoire', title: 'Personal Cover Ladder', path: '../07 Repertoire and Self-Made Covers/Personal Cover Ladder.md' },
    { group: 'Personality', title: 'Natural Stage Banter', path: '../08 Musical Personality and Humour/Natural Stage Banter.md' },
    { group: 'Assessment', title: 'Baseline Test', path: '../09 Assessments/Baseline Test.md' },
    { group: 'Resources', title: 'Best Learning Resources', path: '../11 Best Learning Resources/Resource Guide.md' },
    { group: 'Guitar', title: 'RG8570 Pickup Checklist', path: '../12 RG8570 Buying Guide/In-Person Inspection Checklist.md' }
  ];

  const chordQualities = ['', 'm', '5', 'dim', 'aug', 'sus2', 'sus4', '6', 'm6', 'maj7', '7', 'm7', 'm7b5', 'dim7', 'add9', 'maj9', 'm9', '9', '13', '7b9', '7#9'];

  return { phases, prompts, tracks, lessons, chordQualities };
});
