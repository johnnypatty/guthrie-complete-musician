import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/js/review-scheduler.js');
const Scheduler = globalThis.ReviewScheduler;
const DAY = 86400000;

test('seeded quiz order is deterministic and due items are stable', () => {
  const now = Date.UTC(2026, 7, 13);
  const items = [{ id: 'b', dueAt: new Date(now - DAY).toISOString() }, { id: 'a', dueAt: new Date(now - DAY).toISOString() }, { id: 'later', dueAt: new Date(now + DAY).toISOString() }];
  const first = Scheduler.create({ now: () => now, seed: 7 }).due(items);
  const second = Scheduler.create({ now: () => now, seed: 7 }).due(items);
  assert.deepEqual(first, second);
  assert.equal(first.length, 2);
});

test('miss resets to one day and correct answers advance 1,3,7,14,30', () => {
  const now = Date.UTC(2026, 7, 13);
  const scheduler = Scheduler.create({ now: () => now });
  let item = { id: 'note-e', type: 'note', prompt: 'Find E', answer: 'E', repetitions: 0 };
  for (const interval of [1, 3, 7, 14, 30, 30]) {
    item = scheduler.answer(item, true);
    assert.equal(item.intervalDays, interval);
    assert.match(item.feedback, /correct/i);
  }
  item = scheduler.answer(item, false, 'F');
  assert.equal(item.intervalDays, 1);
  assert.equal(item.repetitions, 0);
  assert.match(item.feedback, /E/);
});
