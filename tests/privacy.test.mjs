import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { scanPrivateText, scanTree } from '../scripts/lib/privacy.mjs';

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
