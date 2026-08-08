# Guthrie Complete Musician GitHub Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the approved 24-week guitar-musicianship course as a privacy-safe, accessible, offline-capable GitHub Pages site and synchronize the improved build to the user's Desktop.

**Architecture:** A dependency-free Node.js build reads trusted Markdown with validated front matter, renders static lesson pages, copies the existing interactive dashboard modules, and produces a deterministic offline ZIP. Browser state stays local through a versioned progress module, and an official GitHub Actions workflow deploys only the generated `public/` artifact.

**Tech Stack:** Node.js 22, browser-native HTML/CSS/JavaScript, Web Audio API, service workers, Node's built-in test runner, GitHub Actions, GitHub Pages.

## Global Constraints

- Repository name: `guthrie-complete-musician`; visibility: public; default branch: `main`.
- No analytics, cookies, accounts, advertisements, remote fonts, external runtime scripts, or copyrighted music/tab/notation files.
- Do not place the seller's identity, conversation excerpts, dates, travel plans, or transaction details in tracked files or Git history.
- Preserve the seller-specific RG8570 guide only in the Desktop `Private Notes` folder.
- End-user progress must remain browser-local unless the user explicitly exports or imports a JSON file.
- Website/build/test code uses MIT; original course prose and original static visuals use CC BY-NC-SA 4.0.
- Public deployment occurs only after the complete local test, build, verification, privacy, browser, and offline-package gates pass.

---

## File Structure

- `.gitignore`: prevents legacy working copies, private notes, temporary packages, logs, and dependencies from entering Git.
- `content/**/*.md`: public lesson sources with validated front matter.
- `content/templates/*.csv`: downloadable practice and repertoire worksheets.
- `src/templates/*.html`: dashboard, lesson, fallback, and local-start templates.
- `src/assets/*`: responsive styles, print styles, icon, and social preview.
- `src/js/*.js`: focused browser modules for theory, practice, timeline, audio, progress, search, and application behavior.
- `scripts/lib/content.mjs`: front-matter, slug, inline Markdown, and block Markdown parsing.
- `scripts/lib/zip.mjs`: deterministic stored-ZIP creation with CRC32.
- `scripts/build.mjs`: validates sources and writes `public/`.
- `scripts/package-offline.mjs`: creates the private-safe downloadable ZIP.
- `scripts/verify.mjs`: checks output completeness, links, cache coverage, placeholders, and privacy markers.
- `tests/*.test.mjs`: Node tests for source/build/browser-independent behavior.
- `.github/workflows/test.yml`: pull-request and branch validation.
- `.github/workflows/pages.yml`: validated Pages build and deployment.
- `public/`: generated deployable output.

---

### Task 1: Establish the Privacy Boundary and Public Content Tree

**Files:**
- Create: `.gitignore`
- Create: `scripts/lib/privacy.mjs`
- Create: `tests/privacy.test.mjs`
- Create: `content/01-daily-practice/*.md` through `content/12-rg8570-buying-guide/*.md`
- Create: `content/templates/Practice Log.csv`
- Create: `content/templates/Repertoire Tracker.csv`
- Preserve outside Git: Desktop `Private Notes/RG8570 Seller-Specific Notes.md`

**Interfaces:**
- Produces: `scanPrivateText(text: string, path: string): string[]` and `scanTree(root: string): Promise<Array<{path:string, matches:string[]}>>`.
- Produces: public Markdown front matter fields `title`, `category`, `phase`, `difficulty`, `tags`, and `summary`.

- [ ] **Step 1: Write the failing privacy test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { scanPrivateText } from '../scripts/lib/privacy.mjs';

test('flags seller identity and transaction-specific dates', () => {
  const matches = scanPrivateText('Marketplace seller: Example Seller; pickup date: 2099-04-03', 'guide.md');
  assert.deepEqual(matches, ['seller-identity', 'transaction-date']);
});

test('allows a generic used-guitar inspection guide', () => {
  assert.deepEqual(scanPrivateText('Check the tremolo, frets, serial, case and certificate.', 'guide.md'), []);
});
```

- [ ] **Step 2: Run the privacy test and verify the missing-module failure**

Run: `node --test tests/privacy.test.mjs`

Expected: FAIL because `scripts/lib/privacy.mjs` does not exist.

- [ ] **Step 3: Implement the scanner and ignore rules**

`scanPrivateText` returns stable marker names for the known seller name, exact travel/pickup dates, copied marketplace message headers, email addresses, phone-like contact strings, and payment identifiers. `.gitignore` excludes `/Private Notes/`, `/private-source/`, the twelve legacy numbered root folders, `/site/`, `/START HERE.html`, `/node_modules/`, `/tmp/`, and `*.log`.

- [ ] **Step 4: Preserve the private guide and create sanitized public content**

Copy the complete original seller-specific verdict to Desktop `Private Notes` before transforming the repository content. Copy all other course lessons into normalized `content/` category folders, add complete front matter, rename public-personal phrasing to reader-neutral phrasing, and replace the RG8570 verdict with a generic model evaluation and inspection decision guide.

- [ ] **Step 5: Run privacy and source checks**

Run: `node --test tests/privacy.test.mjs`

Expected: 2 tests pass.

Run: `node -e "import('./scripts/lib/privacy.mjs').then(async m=>{const x=await m.scanTree('content');if(x.length){console.error(x);process.exit(1)}console.log('privacy scan: clean')})"`

Expected: `privacy scan: clean`.

- [ ] **Step 6: Commit the privacy-safe source boundary**

Stage only `.gitignore`, `scripts/lib/privacy.mjs`, `tests/privacy.test.mjs`, and `content/`. Confirm `git diff --cached --name-only` contains no legacy numbered root path or `Private Notes`, then commit `feat: establish privacy-safe course sources`.

---

### Task 2: Build and Verify Static Lesson Pages

**Files:**
- Create: `scripts/lib/content.mjs`
- Create: `scripts/build.mjs`
- Create: `src/templates/lesson.html`
- Create: `src/templates/index.html`
- Create: `src/templates/404.html`
- Create: `tests/content.test.mjs`
- Create: `tests/build.test.mjs`
- Create: `package.json`
- Create: `package-lock.json`

**Interfaces:**
- Produces: `parseFrontMatter(source: string, path: string): {attributes: object, body: string}`.
- Produces: `slugify(value: string): string`.
- Produces: `renderMarkdown(source: string): string` supporting headings, paragraphs, ordered/unordered/task lists, blockquotes, fenced code, tables, links, strong/emphasis, and inline code.
- Produces: `loadLessons(contentRoot: string): Promise<Lesson[]>` where each lesson has `title`, `category`, `phase`, `difficulty`, `tags`, `summary`, `slug`, `sourcePath`, and `html`.

- [ ] **Step 1: Write parser and renderer tests first**

```js
test('validates required front matter', () => {
  assert.throws(() => parseFrontMatter('---\ntitle: Picking\n---\n# Picking', 'picking.md'), /category/);
});

test('renders safe lesson structures', () => {
  const html = renderMarkdown('# Title\n\n- [x] Relax\n\n| A | B |\n|---|---|\n| 1 | 2 |');
  assert.match(html, /<h1[^>]*>Title<\/h1>/);
  assert.match(html, /type="checkbox" checked disabled/);
  assert.match(html, /<table>/);
});
```

- [ ] **Step 2: Run the content tests and verify they fail for missing exports**

Run: `node --test tests/content.test.mjs`

Expected: FAIL because `scripts/lib/content.mjs` is absent.

- [ ] **Step 3: Implement the minimal dependency-free content module**

Escape source HTML before rendering; permit only renderer-created markup. Validate scalar/list front matter, normalize slugs, reject duplicate slugs, and include the failing source path in every validation error.

- [ ] **Step 4: Run content tests to green**

Run: `node --test tests/content.test.mjs`

Expected: all content tests pass.

- [ ] **Step 5: Write a failing end-to-end build test**

The test builds into a temporary directory and asserts a canonical index, one HTML page per lesson, breadcrumb and previous/next navigation, `data/lessons.json`, source Markdown links that stay inside GitHub rather than the hosted reader, valid CSV downloads, and zero unresolved template tokens.

- [ ] **Step 6: Implement `build.mjs` and templates**

Generate semantic lesson pages, a searchable lesson index, dashboard metadata, canonical/base-aware links, `.nojekyll`, and a human-readable `404.html`. Use `GITHUB_REPOSITORY` to derive the canonical Pages URL while keeping localhost and downloaded copies relative.

- [ ] **Step 7: Run build tests and a real build**

Run: `node --test tests/content.test.mjs tests/build.test.mjs`

Expected: all tests pass.

Run: `node scripts/build.mjs`

Expected: exit 0 and a generated lesson count equal to the public Markdown count.

- [ ] **Step 8: Commit the lesson build**

Commit `feat: generate accessible static lesson pages` with parser, builder, templates, tests, package files, and generated public lesson output.

---

### Task 3: Add Versioned Progress, Search, and Lesson Completion

**Files:**
- Create: `src/js/progress-store.js`
- Create: `src/js/lesson-search.js`
- Create: `tests/progress-store.test.mjs`
- Create: `tests/lesson-search.test.mjs`
- Modify: `src/templates/index.html`
- Modify: `src/templates/lesson.html`
- Modify: `src/assets/style.css`
- Modify: `src/js/app.js`

**Interfaces:**
- Produces: `ProgressStore.normalize(input: unknown): ProgressState` with schema version 2.
- Produces: `ProgressStore.exportJson(state): string` and `ProgressStore.importJson(text): ProgressState`.
- Produces: `LessonSearch.filter(lessons, {query, category, phase}): Lesson[]`.

- [ ] **Step 1: Write failing progress migration/import tests**

Test migration from `gcm-progress-v1`, rejection of unknown schema versions, nonmutation on invalid JSON, bounded week/tempo/levels, and retention of lesson completion keys.

- [ ] **Step 2: Run the progress tests and verify the expected missing-module failure**

Run: `node --test tests/progress-store.test.mjs`

Expected: FAIL because `src/js/progress-store.js` is absent.

- [ ] **Step 3: Implement the UMD progress module and integrate it**

The browser stores schema-2 state under `gcm-progress-v2`; it reads schema 1 once, normalizes it, then saves schema 2 without deleting the old key. Export uses a user-triggered Blob download; import reads only the selected local JSON file and updates state only after validation succeeds.

- [ ] **Step 4: Write failing search tests**

Test case-insensitive token matching across title, summary, tags and category, combined category/phase filters, stable source ordering, and an empty result for unmatched queries.

- [ ] **Step 5: Implement search and lesson completion UI**

Add dashboard search/category controls, a result count, no-results guidance, lesson completion checkboxes, reading-progress indication, print action, keyboard-visible focus, mobile layout, and reduced-motion behavior.

- [ ] **Step 6: Run the focused and complete tests**

Run: `node --test tests/progress-store.test.mjs tests/lesson-search.test.mjs`

Expected: all focused tests pass.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 7: Rebuild and commit**

Run: `npm run build && npm run verify` on a shell that supports `&&`; on PowerShell run the two commands sequentially and stop if the first fails.

Commit `feat: add searchable lessons and portable local progress`.

---

### Task 4: Upgrade the Backing Lab and Audio Safety

**Files:**
- Modify: `src/js/audio-engine.js`
- Modify: `src/js/player-timeline.js`
- Modify: `src/js/music-theory.js`
- Modify: `src/js/app.js`
- Modify: `src/templates/index.html`
- Modify: `src/assets/style.css`
- Create: `tests/player-timeline.test.mjs`
- Create: `tests/audio-state.test.mjs`
- Extend: `tests/music-theory.test.mjs`

**Interfaces:**
- Produces: `PlayerTimeline.remapBeat(oldBeat, oldTotal, newTotal): number`.
- Produces: `PlayerTimeline.positionAtBeat(timeline, beat): {event, bar, beatInBar, progress}`.
- Produces: `MusicTheory.getTargetTones(symbol: string): {chordTones:string[], guideTones:string[]}`.
- `AudioEngine.create()` accepts `countInBars`, master level, and exposes `stop(): void`, `setTempo(bpm): void`, `setLevels(levels): void`.

- [ ] **Step 1: Add failing timeline-position and tempo-remap tests**

Cover beat zero, final-loop wrap, section bounds, odd meter, tempo-relative remapping, and chord event selection.

- [ ] **Step 2: Run the focused tests and confirm behavioral failures**

Run: `node --test tests/player-timeline.test.mjs`

Expected: FAIL because the new functions are undefined.

- [ ] **Step 3: Implement timeline helpers and target-tone analysis**

Use the existing validated chord parser, prioritizing thirds and sevenths as guide tones when present. Preserve enharmonic spelling that matches each displayed chord symbol.

- [ ] **Step 4: Add failing audio-state tests around a clock adapter**

Test count-in transition, master/part level clamping, immediate stop cancellation, and page-exit stop without constructing a real browser AudioContext.

- [ ] **Step 5: Implement Backing Lab controls and status**

Add count-in selection, master volume, current bar/beat/section, loop progress, target tones, recoverable unsupported/suspended-audio messages, and immediate silence on Stop, `pagehide`, and `beforeunload`. Tempo remains 50–220 BPM and remaps the current loop-relative position.

- [ ] **Step 6: Run focused tests, complete tests, and rebuild**

Run: `node --test tests/player-timeline.test.mjs tests/audio-state.test.mjs tests/music-theory.test.mjs`

Expected: all focused tests pass.

Run: `npm test`; then `npm run build`; then `npm run verify`.

Expected: every command exits 0.

- [ ] **Step 7: Commit the Backing Lab upgrade**

Commit `feat: improve backing lab timing and musical feedback`.

---

### Task 5: Add the PWA Cache and Deterministic Offline ZIP

**Files:**
- Create: `scripts/lib/zip.mjs`
- Create: `scripts/package-offline.mjs`
- Create: `src/templates/sw.js`
- Create: `src/manifest.webmanifest`
- Create: `src/assets/icon.svg`
- Create: `src/assets/social-preview.svg`
- Create: `tests/zip.test.mjs`
- Create: `tests/offline.test.mjs`
- Modify: `scripts/build.mjs`
- Modify: `src/js/app.js`

**Interfaces:**
- Produces: `crc32(buffer: Uint8Array): number`.
- Produces: `createStoredZip(entries: Array<{name:string,data:Uint8Array}>, options): Uint8Array` with normalized `/` paths and fixed timestamps.
- Produces: generated `public/sw.js` with a versioned cache and complete precache URL list.

- [ ] **Step 1: Write failing CRC32 and ZIP-structure tests**

Use the standard CRC32 vector `123456789` → `0xCBF43926`; assert local-file, central-directory and end-of-central-directory signatures; reject absolute paths and `..` path traversal.

- [ ] **Step 2: Run ZIP tests and verify the missing-module failure**

Run: `node --test tests/zip.test.mjs`

Expected: FAIL because `scripts/lib/zip.mjs` is absent.

- [ ] **Step 3: Implement deterministic stored ZIP generation**

Write little-endian headers, UTF-8 filenames, CRC32, deterministic DOS date/time, central-directory offsets, and end record. Keep entries uncompressed so the implementation remains small, auditable, and cross-platform.

- [ ] **Step 4: Write failing offline/PWA tests**

Assert that the generated manifest has standalone display metadata, the service-worker list covers the dashboard and every lesson page, the offline ZIP excludes `.git`, private/legacy sources and seller markers, and `START HERE.html` points to the packaged index.

- [ ] **Step 5: Implement the service worker, icons, package script, and status UI**

Use cache-first for versioned static assets and network-first with cached fallback for navigation. Registration failure changes only the offline-status text. Package `public/`, public Markdown, and public CSV worksheets; exclude the ZIP itself while assembling to avoid recursion.

- [ ] **Step 6: Verify the archive independently**

Run: `npm run package:offline`.

Expected: `public/downloads/guthrie-complete-musician-offline.zip` exists.

Run PowerShell `Expand-Archive` into a new temporary directory, run the privacy scanner on the extracted tree, and confirm `START HERE.html`, `index.html`, all lesson pages and assets are present.

- [ ] **Step 7: Run all tests/build/verification and commit**

Run: `npm test`; `npm run build`; `npm run package:offline`; `npm run verify`.

Expected: every command exits 0.

Commit `feat: add installable offline course package`.

---

### Task 6: Add Public Documentation, Licenses, CI, and Pages Deployment

**Files:**
- Replace: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `LICENSE-CODE`
- Create: `LICENSE-CONTENT`
- Create: `.github/workflows/test.yml`
- Create: `.github/workflows/pages.yml`
- Create: `tests/repository.test.mjs`
- Modify: `scripts/verify.mjs`

**Interfaces:**
- `npm test`: runs every `tests/*.test.mjs` file.
- `npm run build`: creates a clean `public/` tree.
- `npm run package:offline`: creates the downloadable ZIP.
- `npm run verify`: fails on incomplete output, broken relative links, privacy markers, placeholder tokens, missing cache entries, invalid workflow permissions, or accidental private files.

- [ ] **Step 1: Write failing repository-policy tests**

Assert the unofficial-project notice, privacy statement, dual-license references, no-copyrighted-material policy, exact repository scripts, least-privilege workflow permissions, and absence of secret-like values.

- [ ] **Step 2: Run repository tests and confirm missing-file failures**

Run: `node --test tests/repository.test.mjs`

Expected: FAIL because the public documentation and workflows are absent.

- [ ] **Step 3: Create public documentation and dual licenses**

README covers the live site, offline download, course scope, privacy, accessibility, local build commands, content policy, limitations, and acknowledgement that the project is unofficial and not endorsed by Guthrie Govan.

- [ ] **Step 4: Add validation and deployment workflows**

`test.yml` checks out source, sets up Node 22 with npm cache, runs `npm ci`, tests, build, packaging and verification. `pages.yml` uses `pages: write` and `id-token: write` only in the deploy job, builds from a clean checkout, uploads `public/`, and deploys with official Pages actions.

- [ ] **Step 5: Run the full publication gate locally**

Run: `npm ci`; `npm test`; `npm run build`; `npm run package:offline`; `npm run verify`.

Expected: every command exits 0 with zero privacy findings and zero broken links.

- [ ] **Step 6: Commit repository automation**

Inspect `git diff --cached` and commit `chore: add public documentation and Pages automation`.

---

### Task 7: Browser QA and Desktop Synchronization

**Files:**
- Create: `scripts/serve.mjs`
- Create locally only: browser screenshots under `tmp/browser-qa/`
- Update outside Git: `C:\Users\Asus\OneDrive\Masaüstü\Guthrie Complete Musician\`

**Interfaces:**
- `node scripts/serve.mjs --root public --port 4173` serves only the generated site with correct MIME types and no directory traversal.

- [ ] **Step 1: Write and run a failing server behavior test**

Test `/`, a lesson URL, manifest MIME type, missing-page fallback, and rejection of encoded `..` traversal before implementing the server.

- [ ] **Step 2: Implement the small local QA server**

Bind to `127.0.0.1`, serve only the resolved root, apply cache-disabled headers, and shut down cleanly on `SIGINT`/`SIGTERM`.

- [ ] **Step 3: Run browser QA against localhost**

At desktop and narrow mobile widths, verify keyboard navigation, visible focus, skip link, search/filter, lesson previous/next, progress persistence, export/import error handling, timer, Chord Lab, Backing Lab Play/Stop, count-in, tempo/loop changes, target tones, no autoplay, and offline-status behavior. Save screenshots of dashboard desktop, dashboard mobile, lesson page, and Backing Lab.

- [ ] **Step 4: Run a fresh final local gate**

Run: `npm ci`; `npm test`; `npm run build`; `npm run package:offline`; `npm run verify`; then extract and rescan the offline ZIP.

Expected: all tests pass, build/package/verify exit 0, and privacy scan is clean.

- [ ] **Step 5: Synchronize the Desktop copy**

Back up the Desktop seller-specific verdict into `Private Notes`, copy the verified public/local package and readable `content/` sources, preserve `Private Notes`, remove obsolete generated public files only within the exact Desktop course folder, and compare hashes for the generated public tree and offline ZIP.

- [ ] **Step 6: Commit the local server and final generated output**

Commit `test: add browser QA server and verified public build`.

---

### Task 8: Create the Public Repository and Verify GitHub Pages

**Files:**
- No new source files unless live verification exposes a reproducible defect; any defect requires a failing regression test before its fix.

**Interfaces:**
- Remote: `https://github.com/johnnypatty/guthrie-complete-musician`.
- Pages target: `https://johnnypatty.github.io/guthrie-complete-musician/`.

- [ ] **Step 1: Verify local GitHub prerequisites and final scope**

Run `gh --version`, `gh auth status`, `git status -sb`, `git log --oneline --decorate -8`, `git ls-files`, and the full local publication gate. Confirm no tracked path contains `Private Notes`, a legacy seller-specific RG verdict, email/phone/payment data, or marketplace conversation text.

- [ ] **Step 2: Create the new public repository**

Create `johnnypatty/guthrie-complete-musician` without initializing remote files, set the approved description, and add topics `guitar`, `music-theory`, `ear-training`, `improvisation`, `practice`, `web-audio`, `offline-first`, and `github-pages` where supported.

- [ ] **Step 3: Push the verified `main` branch**

Add the HTTPS origin, re-check staged/tracked scope, then push `main` with upstream tracking. Do not force-push.

- [ ] **Step 4: Monitor Actions and Pages to terminal success**

Inspect the test workflow and Pages deployment logs. If a check fails, reproduce it locally, add a failing regression test, fix minimally, rerun the complete gate, commit, push, and monitor again.

- [ ] **Step 5: Verify the live site and download**

Open the Pages URL, verify the dashboard, at least three lesson categories, Backing Lab sound after intentional Play, mobile layout, hard refresh, service-worker offline fallback, and the downloadable ZIP. Download and extract the live ZIP, compare its hash with the local artifact, and run the privacy scan on the extraction.

- [ ] **Step 6: Report final links and evidence**

Provide the repository, Pages site, offline ZIP, local Desktop launcher, commit SHA, workflow result, test count, lesson count, privacy result, and any browser limitation that could not be exercised.
