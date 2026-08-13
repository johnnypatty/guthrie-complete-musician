import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
test('application shell has five route landmarks, focused H1s, labels, and text-equivalent progress data', async () => {
  const html = await readFile(resolve(root, 'src/templates/index.html'), 'utf8');
  const recordingView = await readFile(resolve(root, 'src/js/recording-view.js'), 'utf8');
  assert.equal((html.match(/data-route-view=/g) || []).length, 5);
  assert.equal((html.match(/<h1\b[^>]*tabindex="-1"/g) || []).length, 5);
  assert.match(html, /<main id="main-content">/); assert.match(html, /data-skip-link/);
  assert.match(html, /<table id="skill-summary-table"/); assert.match(html, /Reset local progress/);
  assert.match(recordingView, /Delete this local take/);
  assert.match(html, /id="input-connect"[^>]*>Connect guitar input/);
  assert.match(html, /id="record-start"[^>]*>Record after 3-count/);
  assert.doesNotMatch(html, /autoplay|aria-label=""/i);
});

test('styles cover reduced motion and forced colors with responsive touch targets', async () => {
  const css = (await Promise.all(['app-shell.css','components.css','views.css'].map((name) => readFile(resolve(root, 'src/assets', name), 'utf8')))).join('\n');
  assert.match(css, /prefers-reduced-motion/); assert.match(css, /forced-colors/); assert.match(css, /min-height:\s*44px/);
});
