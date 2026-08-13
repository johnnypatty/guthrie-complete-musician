import test from 'node:test';
import assert from 'node:assert/strict';
await import('../src/js/gear-profile.js');

test('normalizes only bounded privacy-safe gear fields', () => {
  assert.deepEqual(globalThis.GearProfile.normalize({ guitar: 'HH superstrat', bridge: 'floating tremolo', strings: '10–46', tuning: 'E standard', notes: 'Headphones and GP-200' }), { guitar: 'HH superstrat', bridge: 'floating tremolo', strings: '10–46', tuning: 'E standard', notes: 'Headphones and GP-200' });
  assert.throws(() => globalThis.GearProfile.normalize({ notes: 'x'.repeat(501) }), /notes/i);
  assert.deepEqual(globalThis.GearProfile.normalize({ seller: 'private', price: '2000' }), {});
});
