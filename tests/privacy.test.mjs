import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { scanPrivateText, scanApplicationText, scanTree } from '../scripts/lib/privacy.mjs';

test('flags seller identity and transaction-specific dates', () => {
  const matches = scanPrivateText(
    'Marketplace seller: Example Seller; pickup date: 2099-04-03',
    'guide.md'
  );
  assert.deepEqual(matches, ['seller-identity', 'transaction-date']);
});

test('flags private contact and payment details', () => {
  const matches = scanPrivateText(
    'Contact me at player@example.com or +49 151 23456789. Send payment by PayPal.',
    'notes.md'
  );
  assert.deepEqual(matches, ['email-address', 'phone-number', 'payment-detail']);
});

test('flags an exact transaction pickup price', () => {
  const matches = scanPrivateText('Exact pickup price (€9,999) reconfirmed', 'guide.md');
  assert.deepEqual(matches, ['transaction-price']);
});

test('allows a generic used-guitar inspection guide', () => {
  assert.deepEqual(
    scanPrivateText('Check the tremolo, frets, serial, case and certificate.', 'guide.md'),
    []
  );
});

test('scanTree returns only files with findings in stable path order', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gcm-privacy-'));
  await mkdir(join(root, 'nested'));
  await writeFile(join(root, 'clean.md'), 'A generic practice lesson.');
  await writeFile(join(root, 'nested', 'private.md'), 'Marketplace seller: Example Seller');

  const findings = await scanTree(root);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].path, 'nested/private.md');
  assert.deepEqual(findings[0].matches, ['seller-identity']);
});

test('flags hidden network and analytics APIs but allows same-origin service-worker fetch', () => {
  assert.deepEqual(scanApplicationText('fetch("https://tracker.example")', 'src/js/app.js'), ['unallowlisted-fetch']);
  assert.deepEqual(scanApplicationText('new XMLHttpRequest(); navigator.sendBeacon("/x")', 'src/js/app.js'), ['xml-http-request', 'send-beacon']);
  assert.deepEqual(scanApplicationText('fetch(event.request)', 'src/templates/sw.js'), []);
  assert.deepEqual(scanApplicationText('mediaDevices.getUserMedia({ audio: true })', 'src/js/app-shell.js'), ['automatic-media-capture']);
  assert.deepEqual(scanApplicationText('mediaDevices.getUserMedia(constraints)', 'src/js/input-manager.js'), []);
  assert.deepEqual(scanApplicationText('new MediaRecorder(stream)', 'src/js/app-shell.js'), ['bootstrap-media-recorder']);
  assert.deepEqual(scanApplicationText('new MediaRecorder(stream)', 'src/js/recording-controller.js'), []);
  assert.deepEqual(scanApplicationText('readAsDataURL(audio)', 'src/js/app-shell.js'), ['audio-serialization']);
});

test('shipped application modules contain no unallowlisted network or analytics APIs', async () => {
  const root = join(import.meta.dirname, '..');
  const moduleRoot = join(root, 'src', 'js');
  const files = (await readdir(moduleRoot, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => join(entry.parentPath, entry.name));
  const findings = [];
  for (const file of files) {
    const matches = scanApplicationText(await readFile(file, 'utf8'), file);
    if (matches.length) findings.push({ file, matches });
  }
  assert.deepEqual(findings, []);
});
