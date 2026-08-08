import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadLessons } from './lib/content.mjs';
import { scanTree } from './lib/privacy.mjs';

const TEXT_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.svg', '.webmanifest']);

async function listFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function localTarget(raw, file, publicRoot) {
  const withoutFragment = raw.split('#', 1)[0].split('?', 1)[0];
  if (!withoutFragment || /^(?:https?:|mailto:|tel:|data:|blob:)/i.test(withoutFragment)) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(withoutFragment);
  } catch (_error) {
    return { error: 'invalid URL encoding', raw };
  }
  const target = decoded.startsWith('/')
    ? resolve(publicRoot, `.${decoded}`)
    : resolve(dirname(file), decoded);
  const root = resolve(publicRoot);
  if (target !== root && !target.startsWith(`${root}${sep}`)) return { error: 'escapes public root', raw };
  return { target, raw };
}

export async function verifySite(options = {}) {
  const projectRoot = resolve(options.projectRoot || process.cwd());
  const publicRoot = resolve(options.publicRoot || join(projectRoot, 'public'));
  const contentRoot = join(projectRoot, 'content');
  const files = await listFiles(publicRoot);
  const lessons = await loadLessons(contentRoot);
  const lessonPages = files.filter((file) => dirname(file) === join(publicRoot, 'lessons') && extname(file) === '.html');
  const privacyFindings = [
    ...(await scanTree(contentRoot)).map((finding) => ({ ...finding, root: 'content' })),
    ...(await scanTree(publicRoot)).map((finding) => ({ ...finding, root: 'public' }))
  ];
  const unresolvedTokens = [];
  const brokenLinks = [];

  for (const file of files.filter((item) => TEXT_EXTENSIONS.has(extname(item).toLowerCase()))) {
    const text = await readFile(file, 'utf8');
    if (/\{\{[A-Z0-9_]+\}\}/.test(text)) {
      unresolvedTokens.push(relative(publicRoot, file).split(sep).join('/'));
    }
    if (extname(file).toLowerCase() !== '.html') continue;
    for (const match of text.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
      const candidate = localTarget(match[1], file, publicRoot);
      if (!candidate) continue;
      if (candidate.error) {
        brokenLinks.push({ file: relative(publicRoot, file).split(sep).join('/'), url: match[1], reason: candidate.error });
        continue;
      }
      try {
        await access(candidate.target);
      } catch (_error) {
        brokenLinks.push({
          file: relative(publicRoot, file).split(sep).join('/'),
          url: match[1],
          target: relative(publicRoot, candidate.target).split(sep).join('/')
        });
      }
    }
  }

  const required = ['index.html', '404.html', '.nojekyll', 'assets/icon.svg', 'assets/social-preview.svg', 'data/lessons.json'];
  const missingRequired = [];
  for (const path of required) {
    try {
      await access(join(publicRoot, path));
    } catch (_error) {
      missingRequired.push(path);
    }
  }

  const failures = [];
  if (lessonPages.length !== lessons.length) failures.push(`lesson count mismatch: ${lessonPages.length} pages for ${lessons.length} sources`);
  if (privacyFindings.length) failures.push(`privacy findings: ${JSON.stringify(privacyFindings)}`);
  if (unresolvedTokens.length) failures.push(`unresolved template tokens: ${unresolvedTokens.join(', ')}`);
  if (brokenLinks.length) failures.push(`broken local links: ${JSON.stringify(brokenLinks)}`);
  if (missingRequired.length) failures.push(`missing required output: ${missingRequired.join(', ')}`);
  if (failures.length) throw new Error(`Verification failed\n- ${failures.join('\n- ')}`);

  return {
    lessonCount: lessons.length,
    fileCount: files.length,
    privacyFindings,
    brokenLinks,
    unresolvedTokens,
    missingRequired
  };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) {
  verifySite()
    .then((result) => console.log(`Verified ${result.lessonCount} lessons across ${result.fileCount} public files.`))
    .catch((error) => {
      console.error(error.stack || error.message);
      process.exitCode = 1;
    });
}
