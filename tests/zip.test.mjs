import test from 'node:test';
import assert from 'node:assert/strict';

import { crc32, createStoredZip } from '../scripts/lib/zip.mjs';

const encoder = new TextEncoder();

test('crc32 matches the standard vector', () => {
  assert.equal(crc32(encoder.encode('123456789')), 0xCBF43926);
});

test('creates a deterministic ZIP with local, central and end records', () => {
  const entries = [
    { name: 'index.html', data: encoder.encode('<h1>Course</h1>') },
    { name: 'lessons/start.html', data: encoder.encode('Start') }
  ];
  const first = createStoredZip(entries);
  const second = createStoredZip([...entries].reverse());
  assert.deepEqual(first, second);
  const view = new DataView(first.buffer, first.byteOffset, first.byteLength);
  assert.equal(view.getUint32(0, true), 0x04034B50);
  assert.ok(first.some((_byte, index) => index + 4 <= first.length && new DataView(first.buffer, first.byteOffset + index, 4).getUint32(0, true) === 0x02014B50));
  assert.equal(view.getUint32(first.length - 22, true), 0x06054B50);
});

test('rejects absolute, drive-qualified and traversal entry names', () => {
  for (const name of ['/secret.txt', 'C:/secret.txt', '../secret.txt', 'safe/../../secret.txt']) {
    assert.throws(() => createStoredZip([{ name, data: encoder.encode('x') }]), /unsafe ZIP entry/i);
  }
});
