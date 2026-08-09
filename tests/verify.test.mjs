import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { buildSite } from '../scripts/build.mjs';
import { packageOffline } from '../scripts/package-offline.mjs';
import { verifySite } from '../scripts/verify.mjs';

const projectRoot = resolve(import.meta.dirname, '..');

test('verifySite accepts a complete privacy-safe build', async () => {
  const publicRoot = await mkdtemp(join(tmpdir(), 'gcm-verify-'));
  await buildSite({ projectRoot, contentRoot: join(projectRoot, 'content'), outDir: publicRoot });
  await packageOffline({ projectRoot, publicDir: publicRoot, zipPath: join(publicRoot, 'downloads', 'guthrie-complete-musician-offline.zip') });

  const result = await verifySite({ projectRoot, publicRoot });

  assert.equal(result.lessonCount, 47);
  assert.equal(result.brokenLinks.length, 0);
  assert.equal(result.privacyFindings.length, 0);
});

test('verifySite rejects a broken local asset link', async () => {
  const publicRoot = await mkdtemp(join(tmpdir(), 'gcm-verify-'));
  await buildSite({ projectRoot, contentRoot: join(projectRoot, 'content'), outDir: publicRoot });
  await packageOffline({ projectRoot, publicDir: publicRoot, zipPath: join(publicRoot, 'downloads', 'guthrie-complete-musician-offline.zip') });
  await rm(join(publicRoot, 'assets', 'icon.svg'));

  await assert.rejects(() => verifySite({ projectRoot, publicRoot }), /broken local links.*icon\.svg/i);
});
