import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/lesson-search.js');
const LessonSearch = globalThis.LessonSearch;

const lessons = [
  { title: 'Picking and Synchronization', summary: 'Relaxed alternate picking', tags: ['technique', 'accuracy'], category: 'Technique', phase: 'Weeks 1-24', slug: 'picking' },
  { title: 'Motif Development', summary: 'Build coherent phrases', tags: ['improvisation', 'phrasing'], category: 'Improvisation and Phrasing', phase: 'Weeks 5-24', slug: 'motif' },
  { title: 'Hearing Chords', summary: 'Sing bass movement', tags: ['ear-training'], category: 'Ear Training and Transcription', phase: 'Weeks 1-24', slug: 'hearing' }
];

test('matches case-insensitive tokens across title summary tags and category', () => {
  assert.deepEqual(LessonSearch.filter(lessons, { query: 'RELAXED accuracy' }).map((lesson) => lesson.slug), ['picking']);
  assert.deepEqual(LessonSearch.filter(lessons, { query: 'ear training' }).map((lesson) => lesson.slug), ['hearing']);
});

test('combines category and phase filters', () => {
  assert.deepEqual(LessonSearch.filter(lessons, {
    query: '',
    category: 'Improvisation and Phrasing',
    phase: 'Weeks 5-24'
  }).map((lesson) => lesson.slug), ['motif']);
});

test('preserves source order and returns an empty list for no match', () => {
  assert.deepEqual(LessonSearch.filter(lessons, { query: 'weeks' }).map((lesson) => lesson.slug), ['picking', 'motif', 'hearing']);
  assert.deepEqual(LessonSearch.filter(lessons, { query: 'sitar orchestration' }), []);
});

test('returns distinct sorted filter options', () => {
  assert.deepEqual(LessonSearch.options(lessons, 'category'), ['Ear Training and Transcription', 'Improvisation and Phrasing', 'Technique']);
  assert.deepEqual(LessonSearch.options(lessons, 'phase'), ['Weeks 1-24', 'Weeks 5-24']);
});
