(function (root) {
  'use strict';
  const PATTERNS = Object.freeze({
    fusion: { subdivision: 2, kick: [0, 3], snare: [2], harmony: 'stabs' }, funk: { subdivision: 4, kick: [0, 3, 6], snare: [4], harmony: 'stabs' }, rock: { subdivision: 2, kick: [0, 2], snare: [1, 3], harmony: 'hold' }, ballad: { subdivision: 2, kick: [0], snare: [2], harmony: 'hold' },
    'neo-soul': { subdivision: 4, kick: [0, 5], snare: [4], harmony: 'stabs' }, ambient: { subdivision: 1, kick: [], snare: [], harmony: 'hold' }, changes: { subdivision: 2, kick: [0], snare: [2], harmony: 'stabs' }, metronome: { subdivision: 1, kick: [], snare: [], harmony: 'none' }
  });
  root.GroovePatterns = PATTERNS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
