import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { scanPrivateText } from './lib/privacy.mjs';
import { createStoredZip } from './lib/zip.mjs';

const LAUNCHER = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Start Guthrie Complete Musician</title></head><body>
<h1>Guthrie Complete Musician</h1><p><a href="index.html">Open the offline course</a></p>
<p>If the course does not open automatically, double-click <strong>index.html</strong>.</p></body></html>\n`;

async function walkFiles(root) {
  const output = [];
  async function visit(directory) {
    const items = await readdir(directory, { withFileTypes: true });
    items.sort((left, right) => left.name.localeCompare(right.name, 'en'));
    for (const item of items) {
      const absolute = join(directory, item.name);
      if (item.isDirectory()) await visit(absolute);
      else if (item.isFile()) output.push(absolute);
    }
  }
  await visit(root);
  return output;
}

function zipName(root, absolute, prefix = '') {
  return [prefix, relative(root, absolute).split(sep).join('/')].filter(Boolean).join('/');
}

export async function packageOffline(options = {}) {
  const projectRoot = resolve(options.projectRoot || process.cwd());
  const publicDir = resolve(options.publicDir || join(projectRoot, 'public'));
  const contentDir = resolve(options.contentDir || join(projectRoot, 'content'));
  const zipPath = resolve(options.zipPath || join(publicDir, 'downloads', 'guthrie-complete-musician-offline.zip'));
  const entryData = new Map([['START HERE.html', Buffer.from(LAUNCHER, 'utf8')]]);

  for (const absolute of await walkFiles(publicDir)) {
    if (resolve(absolute) === zipPath) continue;
    const name = zipName(publicDir, absolute);
    if (/(?:^|\/)\.git(?:\/|$)|(?:^|\/)Private Notes(?:\/|$)/i.test(name)) continue;
    entryData.set(name, await readFile(absolute));
  }
  for (const absolute of await walkFiles(contentDir)) {
    if (!/\.(?:md|csv)$/i.test(absolute)) continue;
    entryData.set(zipName(contentDir, absolute, 'content'), await readFile(absolute));
  }

  const findings = [];
  for (const [name, data] of entryData) {
    if (!/\.(?:html|js|json|md|csv|txt|css|svg)$/i.test(name)) continue;
    const matches = scanPrivateText(data.toString('utf8'), name);
    if (matches.length) findings.push({ path: name, matches });
  }
  if (findings.length) throw new Error(`Offline privacy scan failed: ${JSON.stringify(findings)}`);

  const entries = [...entryData].map(([name, data]) => ({ name, data }));
  const archive = createStoredZip(entries);
  await mkdir(dirname(zipPath), { recursive: true });
  await writeFile(zipPath, archive);
  return { zipPath, entries: [...entryData.keys()].sort(), entryData };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) {
  packageOffline()
    .then(({ zipPath, entries }) => console.log(`Packaged ${entries.length} files in ${zipPath}`))
    .catch((error) => {
      console.error(error.stack || error.message);
      process.exitCode = 1;
    });
}
