# Guitar Reference Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the active Practice Coach shell with the approved Guitar Reference identity, Modern Luthier themes, neutral routes/tools/articles, local universal-search foundation, and an immutable, exportable Legacy Practice Data migration without losing recordings, custom progressions, gear notes, meaningful settings, or any current article URL.

**Architecture:** Keep the current dependency-free IIFE/browser architecture and Node 22 static build. Before removing any coach UI, capture the old LocalStorage and IndexedDB metadata without mutation, fingerprint it, transactionally project reusable data into a new Guitar Reference repository, and retain coach-only history in a read-only archive; keep recording blobs in the existing `gcm-private-v3` database. Then introduce theme, route, tool, article, search, identity, and release layers in that order so every commit remains testable and reversible.

**Tech Stack:** Node.js 22+, Node built-in test runner, static HTML/CSS/JavaScript, Web Crypto, Web Audio API, MediaDevices, MediaRecorder, IndexedDB, localStorage, service worker, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-13-guitar-reference-redesign.md`

## Global Constraints

- Public name: **Guitar Reference**. Exact credit: *An open guitar toolkit by johnnypatty*.
- Primary navigation: **Tools**, **Backing Tracks**, **Guitarists**, **Gear**, **Theory**. Home is not duplicated as a primary item.
- The active product is not a coach. It must not generate recommendations, sessions, weakness rankings, review assignments, streaks, or judgement copy.
- Keep all existing `lessons/<slug>.html` URLs live; public article metadata/chrome must be neutral.
- Treat `gcm-progress-v1`, `gcm-progress-v2`, `gcm-progress-v3`, and every existing non-recording `gcm-private-v3` store as immutable migration sources until explicit, separately confirmed Legacy Practice Data deletion; `recordings` remains live user-owned data and is never a migration fingerprint/deletion target.
- Keep `gcm-private-v3` at its existing version and keep recording blobs in place; do not copy, rename, clear, or upgrade the database during ordinary migration.
- New preferences key: `guitar-reference-preferences-v1`.
- New metadata database: `guitar-reference-private-v1`, version `1`.
- No mandatory account, analytics, telemetry, cloud sync, background microphone activation, audio upload, or runtime framework dependency.
- Microphone, recorder, audio, and external navigation start only after explicit user action; route deactivation stops owned media/audio work.
- Light and dark themes follow system preference by default and use a stored local override only after user choice.
- Minimum text targets: body 16px, controls 14px, labels/metadata 12px, navigation 13–14px; mobile text inputs use 16px where necessary.
- Desktop workspaces use about 92–94% of viewport width and cap near 1,800px; no page-level horizontal overflow at 320 CSS pixels.
- Full keyboard operation, visible focus, reduced motion, forced-colors support, semantic landmarks/dialogs, and 44px primary mobile targets are release requirements.
- Preserve `public/**` as generated output; never hand-edit it.
- Preserve `.superpowers/` as untracked design evidence; never stage it.
- All production changes use red-green-refactor. Every task ends with focused tests, then `npm.cmd test`, `npm.cmd run build`, `npm.cmd run package:offline`, `npm.cmd run verify`, `git diff --check`, and an intentional commit unless the task explicitly says it is a passing characterization-only commit.

## Target File Map

### New state and migration modules

- `src/js/guitar-reference-data-schema.js` — canonical preferences, progression, gear, recording-manifest, and archive validation.
- `src/js/migration-fingerprint.js` — stable canonicalization and SHA-256 source fingerprint.
- `src/js/legacy-source-capture.js` — read-only capture of all `gcm-*` migration sources.
- `src/js/guitar-reference-preferences.js` — the only owner of `guitar-reference-preferences-v1`.
- `src/js/guitar-reference-repository.js` — transactional current metadata and read-only archive repository.
- `src/js/practice-coach-migration.js` — deterministic reconciliation and idempotent startup migration.
- `src/js/legacy-practice-data.js` — archive read/export/explicit-deletion API.

### New shell and presentation modules

- `src/data/project.json` — single identity/repository/version source.
- `src/data/routes.json` — primary routes, subroutes, and legacy hash aliases.
- `src/data/tools.json` — neutral tool/search metadata.
- `src/js/theme-bootstrap.js` — pre-paint theme selection.
- `src/js/theme-controller.js` — persisted system/light/dark preference.
- `src/js/navigation-menu.js` — accessible compact mobile menu.
- `src/js/tools-view.js` — neutral Input Monitor, recorder, generated Backing Lab, and local-data controls.
- `src/js/theory-foundation-view.js` — temporary neutral mount for existing chord/fretboard/ear primitives until the full Theory plan replaces it.
- `src/js/legacy-data-view.js` — read-only archive export/delete UI.
- `src/js/home-view.js` and `src/js/universal-search.js` — route/tool/article search foundation.
- `src/js/article-page.js` — neutral static article behavior.
- `scripts/lib/search-index.mjs` — deterministic build-generated search records.
- `scripts/lib/project.mjs` — project metadata and footer rendering.
- `scripts/lib/product-language.mjs` — generated-shell coach-language gate.
- `src/templates/article.html` — neutral replacement for `lesson.html` while retaining output paths.

### Existing modules retained as compatibility or neutral primitives

- `progress-schema.js` and `progress-store.js` remain migration decoders until migration coverage no longer needs them.
- `recording-store.js` remains the neutral take manager; `progress-repository.js` stays a migration decoder only after Task 10 replaces live recording access with a no-version, `recordings`-store-only adapter that never upgrades `gcm-private-v3`.
- `audio-runtime.js`, `audio-engine.js`, `input-manager.js`, analysis, recorder, timeline, progression, groove, synthesis, and current fretboard/theory primitives remain and are remounted neutrally.
- `public/**` is rebuilt from `src/**`, `content/**`, and build scripts after each production task.

---

### Task 1: Characterize Every Migration and URL Contract

**Files:**

- Create: `tests/fixtures/foundation/gcm-progress-v1.json`
- Create: `tests/fixtures/foundation/gcm-progress-v2.json`
- Create: `tests/fixtures/foundation/gcm-progress-v3.json`
- Create: `tests/fixtures/foundation/legacy-article-urls.json`
- Create: `tests/foundation-characterization.test.mjs`
- Modify: `tests/build.test.mjs`

**Interfaces:**

- Consumes current `ProgressSchema`, `ProgressStore`, `ProgressRepository`, build output, and exact current storage names.
- Produces checked-in representative v1/v2/v3 payloads and the immutable legacy URL subset used by every later task.

- [ ] **Step 1: Move the exact current 53-entry `PUBLIC_LESSON_URLS` literal from `tests/build.test.mjs` into `tests/fixtures/foundation/legacy-article-urls.json`.** Import the JSON in `build.test.mjs`; do not regenerate it from current content, because it is a compatibility contract.

```js
import legacyArticleUrls from './fixtures/foundation/legacy-article-urls.json' with { type: 'json' };

for (const url of legacyArticleUrls) {
  await stat(join(built.outDir, ...url.split('/')));
}
```

- [ ] **Step 2: Add literal v1/v2/v3 fixtures.** The v3 fixture must contain one real-shaped odd-meter custom progression, full union gear profile, active session, session, attempt with `recordingRef`, skill observation, review item, recommendation decision, and lesson/completion maps.

```json
{
  "schemaVersion": 3,
  "week": 8,
  "minutes": 90,
  "completed": { "w8-90-technique": true },
  "lessons": { "motif-development": true },
  "trackId": "seven",
  "tempo": 120,
  "loop": "full",
  "countInBars": 1,
  "levels": { "pad": 70, "bass": 68, "drums": 62, "master": 80 },
  "activeSession": { "plan": { "durationMinutes": 30, "week": 8, "goals": ["ear"], "seed": "x", "blocks": [{ "id": "block-1", "type": "practice", "title": "Hear it", "instruction": "Sing first.", "minutes": 30 }] }, "activeIndex": 0, "results": [], "pain": false, "rampEligible": true, "startedAt": 123 },
  "sessions": [{ "id": "session-1", "title": "Evening", "minutes": 30 }],
  "attempts": [{ "id": "attempt-1", "recordingRef": "take-1", "note": "Relaxed." }],
  "skillObservations": [{ "id": "observation-1", "skill": "timing", "value": 72, "valid": true }],
  "reviewItems": [{ "id": "review-1", "type": "ear-interval", "prompt": "Minor third", "answer": "3 semitones", "dueAt": "2026-08-14T00:00:00.000Z", "repetitions": 1 }],
  "customProgressions": [{ "id": "seven", "name": "Seven", "tempo": 120, "groove": "fusion", "meter": { "numerator": 7, "denominator": 8, "groups": [2, 2, 3], "tempoUnit": 8 }, "events": [{ "chord": "Em7", "pulses": 2, "section": "A" }, { "chord": "Cmaj7", "pulses": 2, "section": "A" }, { "chord": "D", "pulses": 3, "section": "A" }], "seed": 29, "notes": "Keep this." }],
  "recommendations": [{ "id": "week-8", "reason": "Reason", "durationMinutes": 30, "goals": ["ear"], "action": "accepted", "decidedAt": 123, "note": "keep" }],
  "gearProfile": { "guitar": "HH superstrat", "bridge": "floating tremolo", "strings": "10-46", "tuning": "E standard", "interface": "GP-200", "input": "USB 1", "gp200Preset": "Lead", "amp": "Cornford", "notes": "Headphones", "sampleRate": 48000, "latencyMs": 7.5 }
}
```

- [ ] **Step 3: Write passing characterization tests.** Assert the existing normalizer preserves every currently supported field, recording bytes are absent from portable metadata, recording blobs remain in the `recordings` store, and storage/cache identifiers are exact literals.

```js
test('foundation freezes migration source names and legacy URL subset', async () => {
  assert.deepEqual(sourceNames, {
    localStorage: ['gcm-progress-v3', 'gcm-progress-v2', 'gcm-progress-v1'],
    indexedDb: 'gcm-private-v3',
    cachePrefix: 'gcm-static-'
  });
  const built = await buildFixture();
  for (const url of legacyArticleUrls) await stat(join(built.outDir, url));
});
```

- [ ] **Step 4: Run the characterization gate and confirm it passes before production changes.**

```powershell
node --test tests/foundation-characterization.test.mjs tests/build.test.mjs tests/legacy-contracts.test.mjs tests/progress-schema.test.mjs tests/recording-store.test.mjs
```

Expected: PASS. If a fixture exposes an existing loss, document it as a migration input and do not loosen the fixture.

- [ ] **Step 5: Commit the passing characterization only.**

```powershell
git add tests/fixtures/foundation tests/foundation-characterization.test.mjs tests/build.test.mjs
git commit -m "test: characterize Guitar Reference migration contracts"
```

---

### Task 2: Define Canonical Guitar Reference Data and Fingerprints

**Files:**

- Create: `src/js/guitar-reference-data-schema.js`
- Create: `src/js/migration-fingerprint.js`
- Create: `tests/guitar-reference-data-schema.test.mjs`
- Create: `tests/migration-fingerprint.test.mjs`

**Interfaces:**

- Produces `GuitarReferenceDataSchema.{SCHEMA_VERSION,PREFERENCES_KEY,DEFAULT_PREFERENCES,normalizePreferences,normalizeCustomProgression,normalizeGearProfile,projectRecordingManifest,validateLegacyArchive}`.
- Produces `MigrationFingerprint.{canonicalize,fingerprintInput,create}`.
- `normalizeCustomProgression` requires a caller-supplied stable ID, delegates musical validity to `ProgressionEngine.normalize`, and removes derived timeline/tick fields. Migration assigns missing IDs first; it never permits the engine's time-based default.

- [ ] **Step 1: Write failing schema tests for the actual progression and gear shapes.**

```js
test('projects a complete odd-meter progression without cached derived timing', () => {
  const normalized = Schema.normalizeCustomProgression({
    id: 'seven', name: 'Seven', tempo: 120, groove: 'fusion',
    meter: { numerator: 7, denominator: 8, groups: [2, 2, 3], tempoUnit: 8, ticksPerPulse: 48, ticksPerBar: 336 },
    events: [{ chord: 'Em7', pulses: 2, section: 'A' }, { chord: 'Cmaj7', pulses: 2, section: 'A' }, { chord: 'D', pulses: 3, section: 'A' }],
    seed: 29, notes: 'Keep this.'
  });
  assert.deepEqual(normalized.meter, { numerator: 7, denominator: 8, groups: [2, 2, 3], tempoUnit: 8 });
  assert.equal('timeline' in normalized, false);
  assert.equal(normalized.notes, 'Keep this.');
});

test('keeps the union of both historical gear schemas', () => {
  const gear = { guitar: 'HH superstrat', bridge: 'floating tremolo', strings: '10-46', tuning: 'E standard', interface: 'GP-200', input: 'USB 1', gp200Preset: 'Lead', amp: 'Cornford', notes: 'Headphones', sampleRate: 48000, latencyMs: 7.5 };
  assert.deepEqual(Schema.normalizeGearProfile(gear), { id: 'profile', ...gear });
});
```

- [ ] **Step 2: Run the schema test to verify RED.**

```powershell
node --test tests/guitar-reference-data-schema.test.mjs
```

Expected: FAIL because `guitar-reference-data-schema.js` does not exist.

- [ ] **Step 3: Implement exact canonical schemas and bounds.**

```js
const SCHEMA_VERSION = 1;
const PREFERENCES_KEY = 'guitar-reference-preferences-v1';
const DEFAULT_PREFERENCES = Object.freeze({
  schemaVersion: 1,
  theme: 'system',
  toolSettings: Object.freeze({ tempo: 74, countInBars: 1, levels: Object.freeze({ pad: 72, bass: 72, drums: 62, master: 80 }) }),
  lastSelection: Object.freeze({ trackSource: null, trackId: null, loop: null })
});

root.GuitarReferenceDataSchema = Object.freeze({
  SCHEMA_VERSION, PREFERENCES_KEY, DEFAULT_PREFERENCES,
  normalizePreferences, normalizeCustomProgression, normalizeGearProfile,
  projectRecordingManifest, validateLegacyArchive
});
```

Implement `normalizePreferences` with tempo 40–240, count-in 0–2, levels 0–100, theme `system|light|dark`, `lastSelection.trackSource` as `builtin|custom|null`, and nullable nonempty selection strings. `trackSource` and `trackId` must both be null or both non-null; migration maps a matching custom ID to `custom`, otherwise a matching built-in ID to `builtin`, otherwise clears both with a warning. Implement progression limits already enforced by `ProgressionEngine`: 1–64 events, 128 bars, meter numerator 1–16, denominator/tempo unit 2/4/8/16, groups summing to numerator, chord 16 chars, section 32 chars, ID 128 chars, name 64 chars. Reject rather than truncate user strings. Gear accepts the full union documented in the test, with notes up to 4096 chars.

- [ ] **Step 4: Run schema tests to verify GREEN.**

```powershell
node --test tests/guitar-reference-data-schema.test.mjs tests/progression-engine.test.mjs tests/gear-profile.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Write failing deterministic fingerprint tests.**

```js
test('fingerprint ignores capture time, sorts object keys, and changes with user data', async () => {
  const one = captureFixture({ capturedAt: '2026-08-13T10:00:00.000Z' });
  const two = captureFixture({ capturedAt: '2026-08-14T10:00:00.000Z' });
  assert.equal(await Fingerprint.create(one), await Fingerprint.create(two));
  two.indexedDb.stores.recordings.push(recordingManifest({ id: 'new-current-take' }));
  assert.equal(await Fingerprint.create(one), await Fingerprint.create(two));
  two.localStorage[0].raw = two.localStorage[0].raw.replace('Reason', 'Different reason');
  assert.notEqual(await Fingerprint.create(one), await Fingerprint.create(two));
});
```

- [ ] **Step 6: Run the fingerprint test to verify RED.**

```powershell
node --test tests/migration-fingerprint.test.mjs
```

Expected: FAIL because `migration-fingerprint.js` does not exist.

- [ ] **Step 7: Implement canonical SHA-256 fingerprints.** Arrays retain order; object keys sort; `capturedAt`, recording manifests, and audio bytes are excluded. If the legacy database is missing or contains only `recordings`, normalize that entire database portion to the same `recording-only` sentinel: creating the first take must not change migration identity. Otherwise include database status/version, all non-recording store names, and every non-recording metadata record; the `recordings` store name/version is excluded. Return `sha256:` plus 64 lowercase hex characters. Add `missing DB → create first recording → fingerprint unchanged` and `non-recording store/value → fingerprint changed` tests.

```js
async function create(capture, { subtle = root.crypto?.subtle } = {}) {
  if (!subtle) throw new Error('SHA-256 is unavailable.');
  const bytes = new TextEncoder().encode(canonicalize(fingerprintInput(capture)));
  const digest = new Uint8Array(await subtle.digest('SHA-256', bytes));
  return `sha256:${[...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
```

- [ ] **Step 8: Run focused/full gates and commit.**

```powershell
node --test tests/guitar-reference-data-schema.test.mjs tests/migration-fingerprint.test.mjs tests/progression-engine.test.mjs tests/gear-profile.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add src/js/guitar-reference-data-schema.js src/js/migration-fingerprint.js tests/guitar-reference-data-schema.test.mjs tests/migration-fingerprint.test.mjs
git commit -m "feat: define Guitar Reference local data contracts"
```

---

### Task 3: Capture Legacy Sources Without Mutation

**Files:**

- Create: `src/js/legacy-source-capture.js`
- Create: `tests/legacy-source-capture.test.mjs`
- Modify: `tests/support/memory-indexeddb.mjs`

**Interfaces:**

```js
LegacySourceCapture.LOCAL_KEYS
LegacySourceCapture.DATABASE_NAME
LegacySourceCapture.STORE_NAMES
LegacySourceCapture.openExisting({ indexedDB, name })
LegacySourceCapture.capture({ storage, indexedDB, now })
```

`capture()` returns a deep-frozen JSON-safe object with exact raw LocalStorage strings/status, old database name/version/status, every metadata-store record, recording manifests without bytes, and path-specific warnings. Every source target carries `{knownDeletionTarget,deletionEligible}`. It enumerates `database.objectStoreNames`; future unknown stores are captured as opaque JSON-safe records plus `unknown-store` warnings rather than silently ignored, with both flags false. Unknown stores are archive/fingerprint-only and are never deletion or reappearance targets in this plan.

- [ ] **Step 1: Write failing tests for read-only access, corrupt JSON, absent databases, future database versions, and recording manifests.**

```js
test('capture does not mutate local storage, stores, version, or recording bytes', async () => {
  const before = storage.getItem('gcm-progress-v3');
  const bytes = await recordingBytes(oldRepository, 'take-1');
  const capture = await LegacySourceCapture.capture({ storage, indexedDB, now: () => '2026-08-13T12:00:00.000Z' });
  assert.equal(storage.getItem('gcm-progress-v3'), before);
  assert.deepEqual(await recordingBytes(oldRepository, 'take-1'), bytes);
  assert.equal(indexedDB.accessLog().some(({ mode }) => mode === 'readwrite'), false);
  assert.equal(Object.isFrozen(capture), true);
  assert.deepEqual(capture.indexedDb.stores.recordings[0], {
    id: 'take-1', mimeType: 'audio/webm', createdAt: '2026-08-12T10:00:00.000Z',
    metadata: { exerciseId: 'timing', note: 'Relaxed.' }, size: 4, blobType: 'audio/webm'
  });
});

test('corrupt v3 raw text remains captured without overwriting valid v2', async () => {
  storage.setItem('gcm-progress-v3', '{broken');
  storage.setItem('gcm-progress-v2', JSON.stringify({ schemaVersion: 2, week: 8 }));
  const capture = await LegacySourceCapture.capture({ storage, indexedDB });
  assert.equal(capture.localStorage[0].status, 'invalid-json');
  assert.equal(capture.localStorage[0].raw, '{broken');
  assert.equal(storage.getItem('gcm-progress-v3'), '{broken');
});
```

- [ ] **Step 2: Run to verify RED.**

```powershell
node --test tests/legacy-source-capture.test.mjs
```

Expected: FAIL because the module is missing.

- [ ] **Step 3: Extend only the in-memory test adapter with access logging and version-preserving open behavior.** Do not change production storage semantics to satisfy the fixture.

```js
adapter.accessLog = () => structuredClone(log);
// Each transaction appends { stores: [...names], mode } before execution.
```

- [ ] **Step 4: Implement `openExisting` using `indexedDB.open(name)` without a version.** If `oldVersion === 0`, abort the upgrade and return `{status:'missing'}`. Treat security, blocked, abort, and read failures as `{status:'unavailable',error}` rather than missing. Never create a store, request a version, or start a write transaction.

```js
function openExisting({ indexedDB, name = DATABASE_NAME }) {
  if (!indexedDB?.open) return Promise.resolve({ status: 'unavailable', version: null, database: null });
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => { if (!settled) { settled = true; resolve(value); } };
    const request = indexedDB.open(name);
    request.onupgradeneeded = (event) => {
      if (event.oldVersion === 0) {
        request.transaction?.abort();
        finish({ status: 'missing', version: null, database: null });
      }
    };
    request.onblocked = () => finish({ status: 'unavailable', version: null, database: null, error: 'blocked' });
    request.onerror = () => finish({ status: 'unavailable', version: null, database: null, error: request.error?.message || 'open-failed' });
    request.onsuccess = () => finish({ status: 'ready', version: request.result.version, database: request.result });
  });
}
```

- [ ] **Step 5: Implement `capture`.** Start one readonly transaction spanning every enumerated present store, queue all `getAll()` requests before yielding, await transaction completion, then close the database and process the results. Convert recording blobs through `projectRecordingManifest`; convert unexpected binary values outside recordings into descriptors plus `binary-value-not-copied` warnings and set that entire source target's `deletionEligible:false`. Preserve raw corrupt payloads. Tests prove one consistent transaction, unknown-store capture, known-store binary capture becoming non-deletable, close-on-success/failure, and no destination write when source status is unavailable.

- [ ] **Step 6: Run focused/full gates and commit.**

```powershell
node --test tests/legacy-source-capture.test.mjs tests/indexed-db-adapter.test.mjs tests/progress-repository.test.mjs tests/recording-store.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add src/js/legacy-source-capture.js tests/legacy-source-capture.test.mjs tests/support/memory-indexeddb.mjs
git commit -m "feat: capture Practice Coach data without mutation"
```

---

### Task 4: Add the Transactional Guitar Reference Repository and Preferences

**Files:**

- Create: `src/js/guitar-reference-preferences.js`
- Create: `src/js/guitar-reference-repository.js`
- Create: `tests/guitar-reference-preferences.test.mjs`
- Create: `tests/guitar-reference-repository.test.mjs`
- Modify: `src/js/indexed-db-adapter.js`
- Modify: `tests/indexed-db-adapter.test.mjs`
- Modify: `tests/support/memory-indexeddb.mjs`

**Interfaces:**

```js
GuitarReferencePreferences.create(storage, key) => {
  load(), save(value), mergeMigration(value), patch(partial),
  stageMutation({ id, clock, patch }), listPending(), replayPending(), clear({ confirmed, clearedAt })
}

GuitarReferenceRepository.open({ indexedDB, name, version }) => {
  status,
  getMigrationState(),
  commitMigration({ fingerprint, completedAt, preferences, customProgressions, gearProfile, archive }),
  markPreferencesApplied({ fingerprint, appliedAt }),
  currentSnapshot(),
  getLegacyArchive(),
  getLegacyDeletionJournal(),
  listReappearedLegacyDeletionJournals({ includeStale = true }),
  getReappearedLegacyDeletionJournal({ expectedDeletedFingerprint, expectedReappearanceFingerprint }),
  updateLegacyDeletionJournal({ expectedFingerprint, completedTargets, updatedAt }),
  updateReappearedLegacyDeletionJournal({ expectedDeletedFingerprint, expectedReappearanceFingerprint, proposedArchive, completedTargets, updatedAt }),
  finalizeLegacyDeletion({ expectedFingerprint, deletedAt }),
  reconcileReappearedLegacySource({ expectedDeletedFingerprint, expectedReappearanceFingerprint, expectedCurrentRevision, reconciledAt, preferences, customProgressions, gearProfile, archive }),
  finalizeReappearedLegacyDeletion({ expectedDeletedFingerprint, expectedReappearanceFingerprint, deletedAt, deletedTargets }),
  reconcileChangedLegacySource({ expectedCurrentFingerprint, expectedCurrentRevision, newFingerprint, reconciledAt, preferences, customProgressions, gearProfile, archive }),
  adoptUnmarkedCurrentData({ expectedCurrentRevision, currentExportReceipt, sourceExportReceipt, resolution, fingerprint, completedAt, preferences, customProgressions, gearProfile, archive }),
  resolveReappearanceJournals({ journalExportReceipts, resolution }),
  importCurrentMetadata(envelope, { mode: 'merge'|'replace-current' })
}

IndexedDbAdapter.open({ indexedDB, name, version, stores = LEGACY_STORE_NAMES })
```

Constants are `DATABASE_NAME = 'guitar-reference-private-v1'`, `DATABASE_VERSION = 1`, `MIGRATION_ID = 'migration:practice-coach-v2'`, `ARCHIVE_ID = 'legacy:practice-coach-v2'`, `DELETION_ID = 'deletion:practice-coach-v2'`, and `GEAR_ID = 'profile'`. Stores are `meta`, `customProgressions`, and `gearProfile`, all key-path `id`. The archive is stored only as `{id: ARCHIVE_ID, value: archive}`; the inner archive has `archiveType:'practice-coach-v2'`, not a competing storage ID.

`IndexedDbAdapter.open` gains one backward-compatible option: an explicit store descriptor list. Omitting it creates the existing Practice Coach stores exactly as before; `GuitarReferenceRepository` supplies only the three stores above. Reject empty, duplicate, or invalid descriptors before opening a database. Never create the old coach stores inside `guitar-reference-private-v1`. The repository marker initializes monotonic `currentRevision:0`; every custom-progression, gear, import, adoption, and reconciliation transaction increments it. Review returns that revision, and reconciliation must compare it inside the write transaction before touching current data. Test first neutral mutation yields revision 1 and first successful reconciliation/adoption increments exactly once.

- [ ] **Step 1: Write failing preference tests.** Verify canonical defaults, persistence, corrupt-value fallback without overwriting raw data, storage-unavailable fallback, and confirmation-gated clear that never reads/removes `gcm-*` keys. Persist an explicit-field mask alongside the canonical value: a theme-only mutation marks only `theme` explicit rather than materializing default tempo/levels/selection as user choices. `mergeMigration` fills every non-explicit field from migration while preserving explicit valid values. `stageMutation` first writes an immutable record under unique prefix `guitar-reference-preference-mutation-v1:<unguessable-id>`; because tabs never share a mutation key, a losing canonical-envelope race cannot erase the patch. `listPending` enumerates/deduplicates those records, and `replayPending` deterministically applies them into the canonical preferences envelope, whose explicit mask and last applied clock/IDs make replay idempotent; compare-remove deletes only the exact completed journal key. Public `patch(partial)` is an async convenience that validates, calls `stageMutation`, awaits `replayPending`, and resolves only after its exact ID is applied or reports a conflict—it never directly replaces the canonical document. `clear` first writes a canonical clear epoch/tombstone, then removes journals at or before that epoch; replay ignores and garbage-collects such journals, while genuinely later mutations remain explicit. A crash anywhere resumes cleanup from the tombstone, so clear → reload cannot resurrect prior patches. None calls the IndexedDB repository. Test theme-only pre-migration persistence, two tabs reading the same canonical value then staging distinct patches without Web Locks, a deliberately losing canonical write race, theme/tool mutation races, every replay/clear crash boundary, exact replay, and migrated tempo/levels/composite selection.

```js
test('preferences owns only its new key', () => {
  const preferences = GuitarReferencePreferences.create(storage);
  preferences.save({ ...DEFAULT_PREFERENCES, theme: 'dark' });
  assert.equal(JSON.parse(storage.getItem('guitar-reference-preferences-v1')).theme, 'dark');
  assert.equal(storage.getItem('gcm-progress-v3'), originalV3);
});
```

- [ ] **Step 2: Run preference tests to verify RED, implement the small allowlisted adapter, and rerun GREEN.**

```powershell
node --test tests/guitar-reference-preferences.test.mjs
```

- [ ] **Step 3: Write failing repository tests for all four migration decisions.**

```js
test('commitMigration is atomic, idempotent, and refuses changed sources', async () => {
  const first = await repository.commitMigration(fixture({ fingerprint: 'sha256:first' }));
  const second = await repository.commitMigration(fixture({ fingerprint: 'sha256:first' }));
  const changed = await repository.commitMigration(fixture({ fingerprint: 'sha256:changed' }));
  assert.equal(first.status, 'committed');
  assert.equal(second.status, 'already-committed');
  assert.equal(changed.status, 'source-changed');
  assert.equal((await repository.getMigrationState()).fingerprint, 'sha256:first');
});

test('populated current stores without a marker require review', async () => {
  await seedCurrentProgression(database, progressionFixture());
  assert.equal((await repository.commitMigration(fixture())).status, 'needs-review');
});
```

- [ ] **Step 4: Run repository tests to verify RED.**

```powershell
node --test tests/guitar-reference-repository.test.mjs
```

Expected: FAIL because the repository module is missing.

- [ ] **Step 5: Implement one atomic migration transaction.** A successful transaction writes normalized current progressions, the one gear profile, the archive record, and the migration marker. Failures abort all three stores. `importCurrentMetadata` accepts only a versioned Guitar Reference metadata envelope, fully normalizes and validates the complete envelope before opening a write transaction, and supports only `merge` and `replace-current`; `replace-current` clears only `customProgressions` and `gearProfile` inside the same transaction that writes every replacement, never archive/migration meta. Both modes atomically increment `currentRevision`. Tests seed current data, submit a partly invalid envelope, and assert the exact snapshot/revision remains unchanged; injected clear/write failures also roll back exactly.

```js
const marker = {
  id: MIGRATION_ID,
  migrationVersion: 1,
  status: 'complete',
  fingerprint,
  completedAt,
  preferences,
  preferencesApplied: false,
  preferencesAppliedAt: null,
  currentRevision: 0,
  legacyDeletedAt: null,
  deletionTombstone: null
};
```

- [ ] **Step 6: Add rollback/finalization/reconciliation tests.** Inject a failure after the first put and assert no marker, archive, progression, or gear record exists. Normal journal updates require the marker fingerprint. Reappearance journal records use the distinct ID `deletion:practice-coach-v2:reappearance:<fresh-fingerprint>` and persist a bounded clone of the original proposed archive/capture plus both fingerprints and `completedTargets`. `listReappearedLegacyDeletionJournals({includeStale:true})` returns frozen minimal descriptors for every reappearance journal with `matchesCurrentTombstone`; the fingerprint-specific getter returns the full frozen clone or null. On startup with `legacyDeletedAt`, migration checks the all-journal list before any fresh capture and resumes only exactly one matching journal when there are no stale journals. Stale-only, multiple-current, and mixed current/stale journals enter review. After each is individually exported, `resolveReappearanceJournals` can atomically retain one compatible journal and archive the others as read-only revision evidence, or discard all only with the exact phrase `DISCARD EXPORTED REAPPEARANCE JOURNALS`; unexported/mismatched IDs cause zero writes. `adoptUnmarkedCurrentData` resolves `needs-review`: only after successful current/source exports and explicit per-conflict choices does it atomically preserve/merge/replace current neutral records, store archive+marker, and initialize/increment revision; invalid/stale revision changes nothing. Test stale-only and mixed startup, export-first adoption, partial reload, journal retain/discard, both reappearance transitions, destination edit refusal, and rollback.

- [ ] **Step 7: Run focused/full gates and commit.**

```powershell
node --test tests/guitar-reference-preferences.test.mjs tests/guitar-reference-repository.test.mjs tests/indexed-db-adapter.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add src/js/guitar-reference-preferences.js src/js/guitar-reference-repository.js src/js/indexed-db-adapter.js tests/guitar-reference-preferences.test.mjs tests/guitar-reference-repository.test.mjs tests/indexed-db-adapter.test.mjs tests/support/memory-indexeddb.mjs
git commit -m "feat: add private Guitar Reference metadata storage"
```

---

### Task 5: Reconcile and Migrate Practice Coach Data Idempotently

**Files:**

- Create: `src/js/practice-coach-migration.js`
- Create: `tests/practice-coach-migration.test.mjs`

**Interfaces:**

```js
PracticeCoachMigration.selectState(capture)
PracticeCoachMigration.reconcileProgressions(capture)
PracticeCoachMigration.reconcileGearProfile(capture)
PracticeCoachMigration.project(capture, { fingerprint, now })
PracticeCoachMigration.run({ storage, indexedDB, repository, preferencesStore, now, subtle })
```

`run()` returns its status plus a deep-cloned `legacyCompatibilityState` selected from the captured source. That clone exists only to keep surviving neutral tools functional during Tasks 7-10; it is never written to a legacy key and is removed from active runtime in Task 11.

Selection priority is valid object v3, then v2, then v1, then defaults. Schema absent/1/2/3 is decoded through a cloned `ProgressSchema.migrate()` call; unsupported schema remains archive-only with a warning. The migrator never calls the current lossy `ProgressTransfer`.

- [ ] **Step 1: Write failing projection tests using the exact Task 1 fixtures.**

```js
test('keeps coach shapes in the archive and out of current data', async () => {
  const result = PracticeCoachMigration.project(captureFixture(), { fingerprint: 'sha256:source', now: '2026-08-13T15:00:00.000Z' });
  assert.equal('activeSession' in result.preferences, false);
  assert.equal('recommendations' in result.preferences, false);
  assert.equal(result.archive.legacyState.activeSession.plan.blocks[0].id, 'block-1');
  assert.equal(result.archive.legacyState.recommendations[0].durationMinutes, 30);
  assert.equal(result.customProgressions[0].meter.numerator, 7);
  assert.equal(result.gearProfile.bridge, 'floating tremolo');
});
```

- [ ] **Step 2: Add progression/gear reconciliation tests.** Local selected-state values win; IDB fills missing values; exact progressions deduplicate; same ID with different content yields deterministic `~2`, `~3` suffixes within 128 chars; invalid legacy progression shapes remain archive-only with warnings; gear conflicts remain in the archive and never truncate.

Reserve every explicit progression ID before assigning any generated/conflict ID. Missing IDs become `legacy-` plus the first 16 lowercase hex characters of a canonical content SHA-256; collisions extend the hash deterministically. Conflict suffix allocation skips all reserved/generated IDs, so input IDs `mine`, `mine~2`, and a conflicting second `mine` produce `mine`, `mine~2`, `mine~3` regardless of clock or enumeration source.

- [ ] **Step 3: Run to verify RED.**

```powershell
node --test tests/practice-coach-migration.test.mjs
```

- [ ] **Step 4: Implement pure selection and projection before orchestration.** Archive includes exact raw source capture, selected key, coach fields, unknown top-level fields, recording manifest, migrated-field inventory, and warnings.

```js
const archive = {
  archiveType: 'practice-coach-v2', archiveVersion: 1, readOnly: true,
  createdAt: now, sourceFingerprint: fingerprint, selectedStateKey,
  sourceCapture: structuredClone(capture),
  legacyState,
  migrationReport: { preferenceFields, customProgressionIds, gearFields, recordingIds, warnings }
};
```

- [ ] **Step 5: Write failing orchestration tests.** Assert order capture → fingerprint → project → atomic commit → preference save → `markPreferencesApplied`; source keys/recording bytes never change. Verify `migrated`, `already-migrated`, `source-changed`, `source-unavailable`, `needs-review`, `migrated-with-preference-warning`, and `legacy-already-deleted` outcomes. `source-unavailable` performs zero destination writes. A marker with `legacyDeletedAt` returns `legacy-already-deleted` before source recapture and never recreates the archive.

- [ ] **Step 6: Implement `run`.** Read the marker first. If `legacyDeletedAt` is set, call `listReappearedLegacyDeletionJournals()` before inspecting legacy storage: one matching in-progress journal returns `legacy-reappearance-deletion-partial` with its original proposed archive/capture; multiple/cross-tombstone journals return `legacy-reappearance-journals-review`; neither path recaptures. Only when no journal exists perform the cheap read-only reappearance check against the three legacy LocalStorage keys and archived known deletion-target store names—never `recordings` or preserved unknown stores. If metadata reappears, make a fresh full capture/fingerprint and return `legacy-source-reappeared` with `previousArchive:null`, tombstone, and proposed archive. If nothing reappears, reconstruct compatibility state from marker preferences/current repository/neutral defaults and return `legacy-already-deleted`. Otherwise capture and reject unavailable sources. Merge migrated preferences without overwriting valid new-key values. Failed preference save/mark keeps `preferencesApplied:false`; identical startup retries both. Test deletion → preserved unknown store → reload, partial reappearance deletion → reload → original journal/capture → completion without recapture, multiple journal review, old-tab reappearance → fresh export/reconcile, and explicit second deletion.

- [ ] **Step 7: Run focused/full gates and commit.**

```powershell
node --test tests/practice-coach-migration.test.mjs tests/legacy-source-capture.test.mjs tests/guitar-reference-repository.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add src/js/practice-coach-migration.js tests/practice-coach-migration.test.mjs
git commit -m "feat: migrate reusable Practice Coach data safely"
```

---

### Task 6: Add Read-Only Legacy Practice Data Export and Explicit Deletion

**Files:**

- Create: `src/js/legacy-practice-data.js`
- Create: `tests/legacy-practice-data.test.mjs`
- Modify: `src/js/guitar-reference-repository.js`
- Modify: `tests/guitar-reference-repository.test.mjs`

**Interfaces:**

```js
LegacyPracticeData.create({ repository, storage, indexedDB, captureSource, createFingerprint }) => {
  read(),
  exportJson({ exportedAt }),
  exportReappearanceJson({ reappearance, exportedAt }),
  exportNeedsReviewSource({ capture, sourceFingerprint, exportedAt }),
  exportCurrentMetadata({ exportedAt }),
  exportReappearanceJournals({ journalIds, exportedAt }),
  adoptUnmarkedCurrentData({ currentExportReceipt, sourceExportReceipt, expectedCurrentRevision, resolution, completedAt }),
  resolveReappearanceJournals({ journalExportReceipts, resolution }),
  reviewChangedSource({ reviewedAt }),
  reconcileChangedSource({ confirmation, expectedCurrentFingerprint, reviewedProjection }),
  deletePermanently({ confirmation, expectedFingerprint, closedCopiesConfirmed, deletedAt })
}
```

Ordinary export is `{format:'guitar-reference-legacy-practice-data',formatVersion:1,exportedAt,recordingBytesIncluded:false,archive}` as `guitar-reference-legacy-practice-data.json`. A post-deletion reappearance is `{format:'guitar-reference-legacy-reappearance',formatVersion:1,exportedAt,recordingBytesIncluded:false,tombstone,sourceFingerprint,sourceCapture}` as `guitar-reference-legacy-reappearance.json`. `needs-review` uses two separate files: `{format:'guitar-reference-unmarked-current-data',formatVersion:1,exportedAt,currentRevision,currentMetadata}` as `guitar-reference-unmarked-current-data.json`, and `{format:'guitar-reference-needs-review-source',formatVersion:1,exportedAt,sourceFingerprint,sourceCapture}` as `guitar-reference-needs-review-source.json`. Journal export is `{format:'guitar-reference-reappearance-journals',formatVersion:1,exportedAt,tombstoneFingerprint,journals:[...]}` as `guitar-reference-reappearance-journals.json`. Every successful download returns a typed receipt `{format,contentSha256,currentRevision?,sourceFingerprint?,journalIds?,tombstoneFingerprint?,exportedAt}` computed from the exact downloaded bytes; adoption/resolution recanonicalizes current records and atomically verifies every receipt field/hash against the reviewed revision, capture, or immutable journal IDs before writing. A caller boolean is never accepted as proof. Reappearance envelopes are fresh, truthful data, not deleted history. Deletion requires `DELETE LEGACY PRACTICE DATA` plus “I closed other open copies or tabs.”

`source-changed`, `needs-review`, and `legacy-source-reappeared` are resolvable states, not permanent lockouts. For existing archives, the view exports old archive and new capture, shows a field-level diff, and enables reconciliation after both exports plus `RECONCILE LEGACY PRACTICE DATA`; previous raw capture remains in revision history. After prior deletion there is no old archive to export: the UI states that clearly, exports only the fresh reappeared capture plus tombstone metadata, and can reconcile it as a new revision or explicitly delete it using its fresh fingerprint. No flow invents or resurrects deleted raw history.

- [ ] **Step 1: Write failing read/export tests.** Returned data is a frozen clone, there is no update API, archive content never feeds current state, and JSON includes recording manifests but no binary objects or encoded audio payload fields. Exact raw legacy strings remain byte-for-byte unchanged even if their user-authored text contains words such as “base64” or “rawBytes.”

```js
test('legacy export is read-only JSON without audio bytes', async () => {
  const exported = JSON.parse(await legacy.exportJson({ exportedAt: '2026-08-13T16:00:00.000Z' }));
  assert.equal(exported.recordingBytesIncluded, false);
  assert.equal(exported.archive.sourceCapture.indexedDb.stores.recordings[0].id, 'take-1');
  assert.equal(findBinaryValues(exported).length, 0);
  assert.equal(exported.archive.sourceCapture.localStorage[0].raw, exactLegacyRaw);
  assert.deepEqual(findReservedBinaryFields(exported), []);
});
```

- [ ] **Step 2: Write failing deletion tests.** Wrong phrase, missing closed-copies acknowledgement, changed non-recording source, or any known target marked `deletionEligible:false` performs zero deletions. Successful deletion verifies canonical deep equality (or canonical per-record hashes) for every migrated progression and gear value; clears only archived eligible legacy metadata stores and three eligible legacy LocalStorage keys; never clears unknown/unarchived stores, `recordings`, or the database; atomically finalizes archive deletion/`legacyDeletedAt` last. Adding or intentionally deleting a recording after migration does not block cleanup. Queue a competing IDB write before the clear and prove the one readwrite compare-and-clear transaction either includes it and refuses deletion or serializes safely; queue a LocalStorage rewrite before removal and prove it is detected; a write after completed cleanup must be caught as reappearance on next startup.

```js
test('explicit deletion preserves recording bytes and current metadata', async () => {
  const before = await recordingBytes(oldRepository, 'take-1');
  const result = await legacy.deletePermanently({ confirmation: 'DELETE LEGACY PRACTICE DATA', expectedFingerprint, closedCopiesConfirmed: true, deletedAt });
  assert.equal(result.status, 'deleted');
  assert.deepEqual(await recordingBytes(oldRepository, 'take-1'), before);
  assert.equal((await currentRepository.currentSnapshot()).customProgressions[0].id, 'seven');
  assert.equal(await currentRepository.getLegacyArchive(), null);
});

test('partial deletion records completed stages and retries to completion', async () => {
  storage.failRemoveOnce('gcm-progress-v2');
  assert.equal((await legacy.deletePermanently(confirmation)).status, 'partial');
  assert.deepEqual((await repository.getLegacyDeletionJournal()).completedTargets, expectedCompletedBeforeFailure);
  assert.equal((await legacy.deletePermanently(confirmation)).status, 'deleted');
});
```

- [ ] **Step 3: Write failing review/reconciliation tests.** `reviewChangedSource` is read-only and produces exact old/new fingerprints plus field-level diff. Reconcile is unavailable until required exact-byte exports report typed receipts; wrong hash/format/fingerprint/revision/journal ID/tombstone performs zero writes. For `needs-review`, export the exact current and source envelopes/filenames above, require explicit per-conflict resolution, then call `adoptUnmarkedCurrentData` with both receipts; no boolean or hidden replace default exists. For multiple/stale journals, export exact journal envelopes and call `resolveReappearanceJournals` with receipts covering every selected ID. Cover tampered downloaded bytes, stale current revision, partial receipt sets, delete → old-tab rewrite → fresh export/reconcile, and assert no deleted raw archive is invented.

- [ ] **Step 4: Run to verify RED.**

```powershell
node --test tests/legacy-practice-data.test.mjs
```

- [ ] **Step 5: Implement changed-source review/reconciliation, then journaled deletion.** Reconciliation follows the export-first contract above. Branch explicitly by state. For an existing archive, require `expectedFingerprint === archive.sourceFingerprint`, use the normal journal, and finish with `finalizeLegacyDeletion`. For `legacy-source-reappeared`, require `expectedFingerprint === proposedArchive.sourceFingerprint` plus the tombstone's deleted fingerprint, use only the matching reappearance journal, and finish with `finalizeReappearedLegacyDeletion`; reconciliation uses `reconcileReappearedLegacySource`. Both branches require the exact phrase, closed-copies acknowledgement, and every requested target to be known and `deletionEligible:true`; otherwise delete nothing. When available, acquire an origin-wide exclusive `navigator.locks` cleanup lock for cooperating new tabs, while stating honestly that old builds do not participate and the acknowledgement plus reappearance detection remain the safety boundary. For approved old IDB metadata, perform the read, canonical comparison, and clear inside the same readwrite transaction; never compare in an earlier readonly transaction. For each LocalStorage target, compare the exact archived raw string immediately before `removeItem`, remove, immediately verify absence, and stop/journal on any mismatch or reappearance. Ignore live recordings; never touch unknown stores. Verify canonical current destination values before cleanup. Any earlier failure returns `{status:'partial',removed,preserved:{archiveOrTombstone:true,recordings:true,currentData:true},errors}`; retry resumes only the fingerprint-matched journal. A later write by an old tab is not claimed to be preventable: startup captures it as a new `legacy-source-reappeared` decision.

- [ ] **Step 6: Run focused/full gates and commit.**

```powershell
node --test tests/legacy-practice-data.test.mjs tests/guitar-reference-repository.test.mjs tests/recording-store.test.mjs tests/progress-repository.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add src/js/legacy-practice-data.js src/js/guitar-reference-repository.js tests/legacy-practice-data.test.mjs tests/guitar-reference-repository.test.mjs
git commit -m "feat: add read-only Legacy Practice Data controls"
```

---

### Task 7: Gate Startup on Migration Without Removing the Working Shell

**Files:**

- Create: `src/js/guitar-reference-bootstrap.js`
- Create: `src/js/neutral-write-outbox.js`
- Create: `tests/guitar-reference-bootstrap.test.mjs`
- Create: `tests/neutral-write-outbox.test.mjs`
- Modify: `src/js/guitar-reference-repository.js`
- Modify: `src/js/app.js`
- Modify: `src/js/app-shell.js`
- Modify: `src/js/hash-router.js`
- Modify: `src/js/lesson-page.js`
- Modify: `src/templates/index.html`
- Modify: `tests/app-shell-lifecycle.test.mjs`
- Modify: `tests/guitar-reference-repository.test.mjs`
- Modify: `tests/hash-router.test.mjs`
- Modify: `tests/legacy-contracts.test.mjs`
- Modify: `tests/repository.test.mjs`

**Interfaces:**

```js
GuitarReferenceBootstrap.start({ window, document }) => Promise<{
  repository, preferencesStore, migration, shell
}>

NeutralWriteOutbox.create(storage, { prefix = 'guitar-reference-write-outbox-v1:', locks = navigator.locks }) => {
  stage(mutation), list(), clear({ expectedId }), replay({ repository, preferencesStore })
}

GuitarReferenceRepository.allocateNeutralMutation({ id, entityKey, type, payload, createdAt }) =>
  Promise<{id,entityKey,sequence,type,payload,createdAt}>
GuitarReferenceRepository.applyNeutralMutation({ id, entityKey, sequence, type:'custom-progression'|'gear-profile', payload }) =>
  Promise<{status:'applied'|'already-applied'|'superseded',lastApplied}>

HashRouter.create({ window, document, catalog, onDeactivate }) // awaits Promise-returning onDeactivate before hiding; rejected exits restore the committed hash/state
```

`guitar-reference-write-outbox-v1:` is the LocalStorage mirror prefix for progression/gear records only. `allocateNeutralMutation` runs in the repository's one atomic meta transaction: it increments a database-owned sequence, validates the full payload, and stores a durable pending envelope before returning; `stage()` mirrors that allocated envelope to its unique key for synchronous lifecycle visibility. Preferences use only the separate preferences-owned immutable mutation prefix/API defined in Task 4. `list()` combines repository-pending progression/gear mutations and LocalStorage mirrors, deduplicated by ID. Replay acquires the origin-wide Web Lock when available, rereads after acquisition, serializes target transactions, and compare-removes only a terminal exact ID. `applyNeutralMutation` atomically writes a progression/gear target, advances `currentRevision`, records the last applied `(entityKey,sequence,id)`, and deletes the repository pending envelope; exact replay is idempotent and older allocated sequence is `superseded`. Tests drive the real two-tab allocation/stage path, crash after repository allocation/mirror, and every replay boundary; preference race tests remain in the preferences suite. Records never contain coach fields, raw capture, or recordings.

The startup order is fixed: open the new repository; create new preferences; run migration; only then initialize the transitional shell. The transitional shell receives only `migration.legacyCompatibilityState`, a detached in-memory clone. It must not construct `LocalStateStore`, call `load()` against old keys, or write/reset/import `gcm-progress-v1/v2/v3` at any point. It must not open/create `gcm-private-v3` on mount when capture reported it missing; recording storage opens lazily after explicit recording action.

- [ ] **Step 1: Write failing bootstrap-order tests with spies.**

```js
test('startup migrates before any legacy shell load or patch', async () => {
  await Bootstrap.start(fixture.deps);
  assert.deepEqual(fixture.calls.slice(0, 4), ['repository:open', 'preferences:create', 'migration:run', 'shell:init']);
  assert.equal(fixture.calls.some((call) => call.startsWith('legacy-storage:')), false);
});
```

- [ ] **Step 2: Add failure-state and lazy-storage tests.** If new IndexedDB is unavailable, show a scoped local-data warning and allow non-storage reference/tool routes to initialize; never overwrite legacy keys. If migration returns `source-changed`, `source-unavailable`, or `needs-review`, expose a blocking legacy-review state for data-changing controls but keep read-only content available. A missing legacy recording database remains missing after mount; only an explicit Record action may create it.

- [ ] **Step 3: Run to verify RED.**

```powershell
node --test tests/guitar-reference-bootstrap.test.mjs tests/app-shell-lifecycle.test.mjs
```

- [ ] **Step 4: Implement bootstrap, script order, and crash-recoverable compatibility writes.** Load schema/fingerprint/capture/preferences/repository/migration/archive/outbox modules after `ProgressionEngine` and before bootstrap/shell/app. Refactor `tests/repository.test.mjs` in this task: replace its brittle exact full script-array equality with named dependency-order assertions, uniqueness, required-module presence, and forbidden legacy-writer checks, so later runtime modules can be added without unrelated contract churn. Pass the detached compatibility clone into the shell; remove `LocalStateStore`. A temporary adapter exposes `saveState():Promise` and `flush():Promise`; progression/gear mutations first call repository allocation, preferences use immutable `GuitarReferencePreferences.stageMutation/listPending/replayPending` journals, and replay follows the separate contracts above before showing success. Startup replays valid pending records idempotently before shell init. Upgrade `HashRouter` so programmatic clicks/submits are intercepted and `onDeactivate` is awaited before `history.pushState` changes the URL; rejection therefore leaves history length/index, URL, title, body, and current link untouched and permits immediate retry. Stamp each committed entry with a router-owned monotonic history index. For browser Back/Forward (`popstate`), compare destination/current indices, await deactivation, and on rejection use a suppression-guarded `history.go(currentIndex-destinationIndex)` to return to the exact existing entry; no entry is replaced or duplicated, the guard clears only after restoration, and a later Back/Forward can retry. Hash-only external/manual changes use the same indexed normalization path without recursion. `pagehide` only signals pending state. Test actual two-tab staging including a losing no-Web-Locks preference race, A/B rapid mutation, two tabs replaying edits to the same entity with repository allocation order winning, reload after completed write, every allocation/preference crash boundary, theme-save interleaving in both orders, corrupt/future record quarantine, transaction failure visibility, intercepted-link history length/index, URL/title/body/current-link rollback, no recursion, same-link retry, and complete Back/Forward destination order after rejection.

- [ ] **Step 5: Disable every old writer, not only shell controls.** Reset/import/export controls are unavailable in the transitional shell. Remove completion-state mutation from `lesson-page.js` while preserving its neutral reading/print behavior until Task 12 replaces it. Do not delete old controller source yet; that happens after neutral tools mount, but assert that no shell route, article page, cached legacy action, or keyboard action can invoke a legacy write.

- [ ] **Step 6: Run focused/full build gates and commit regenerated output.**

```powershell
node --test tests/guitar-reference-bootstrap.test.mjs tests/neutral-write-outbox.test.mjs tests/guitar-reference-repository.test.mjs tests/hash-router.test.mjs tests/app-shell-lifecycle.test.mjs tests/legacy-contracts.test.mjs tests/repository.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add src/js/guitar-reference-bootstrap.js src/js/neutral-write-outbox.js src/js/guitar-reference-repository.js src/js/app.js src/js/app-shell.js src/js/hash-router.js src/js/lesson-page.js src/templates/index.html tests/guitar-reference-bootstrap.test.mjs tests/neutral-write-outbox.test.mjs tests/guitar-reference-repository.test.mjs tests/hash-router.test.mjs tests/app-shell-lifecycle.test.mjs tests/legacy-contracts.test.mjs tests/repository.test.mjs public
git commit -m "feat: gate startup on safe local-data migration"
```

---

### Task 8: Build the Modern Luthier Light and Dark Theme Foundation

**Files:**

- Create: `src/js/theme-bootstrap.js`
- Create: `src/js/theme-controller.js`
- Create: `tests/theme-controller.test.mjs`
- Create: `tests/theme-build-contract.test.mjs`
- Modify: `src/js/guitar-reference-bootstrap.js`
- Modify: `src/js/app-shell.js`
- Modify: `src/js/lesson-page.js`
- Modify: `src/assets/tokens.css`
- Modify: `src/assets/style.css`
- Modify: `src/assets/app-shell.css`
- Modify: `src/assets/components.css`
- Modify: `src/assets/views.css`
- Modify: `src/templates/index.html`
- Modify: `src/templates/lesson.html`
- Modify: `src/templates/404.html`
- Modify: `src/manifest.webmanifest`
- Modify: `tests/guitar-reference-bootstrap.test.mjs`
- Modify: `tests/app-shell-lifecycle.test.mjs`
- Modify: `tests/legacy-contracts.test.mjs`

**Interfaces:**

```js
ThemeController.resolve(preference, prefersDark) => 'light' | 'dark'
ThemeController.create({ window, document, preferencesStore }) => {
  init(), setPreference('system'|'light'|'dark'),
  getPreference(), getResolvedTheme(), destroy()
}
```

- [ ] **Step 1: Write failing controller tests.** Cover system/light/dark resolution, local persistence, storage errors, system listener only in system mode, `data-theme`, theme-control pressed/selected state, `theme-color` meta update, and destroy cleanup.

- [ ] **Step 2: Run to verify RED.**

```powershell
node --test tests/theme-controller.test.mjs
```

- [ ] **Step 3: Implement a tiny pre-paint bootstrap in `<head>` before stylesheet links.** It reads only the `theme` field from `guitar-reference-preferences-v1`, falls back to `matchMedia`, catches missing/corrupt storage, and assigns `document.documentElement.dataset.theme`. It performs no write, tracking, or network work.

- [ ] **Step 4: Implement controller/bootstrap wiring for both application and static pages.** `GuitarReferenceBootstrap.start` creates the controller with the Task 7 `preferencesStore`, calls `init()` before shell route rendering, exposes it on shell context, and calls `destroy()` from shell teardown/page lifecycle tests. `lesson-page.js` initializes the same controller against `GuitarReferencePreferences` for still-static pages and destroys it on `pagehide`; later `article-page.js` inherits that exact contract. `setPreference` awaits the race-safe `preferencesStore.patch({theme})` stage+replay convenience and shows success only after its exact mutation applies; it never writes a stale full copy. Add app-shell and static-page integration tests that click all three choices and verify persistence/listener cleanup, both interleavings of pre-migration theme selection/migration merge, and a theme write racing a tool-level write with both surviving; unit-only success is insufficient.

- [ ] **Step 5: Write failing build-contract tests for both complete palettes and typography/width requirements.** Assert every semantic token exists in `:root` and `[data-theme='dark']`, `color-scheme` is declared, body/control/metadata minimums are present, content max is near 1,800px, and no undefined historical aliases `--space-4`, `--surface-2`, `--text-2`, `--success` remain.

```js
for (const token of ['canvas','surface-1','surface-2','text','text-muted','action','border','focus','danger','success']) {
  assert.match(css, new RegExp(`--color-${token}:`));
}
assert.doesNotMatch(css, /var\(--(?:space-4|surface-2|text-2|success)\)/);
```

- [ ] **Step 6: Implement the approved Modern Luthier tokens.** Light uses mineral white/soft grey-green, dark uses deep green-black, brass is restrained action/focus signal, and both have independently chosen contrast-safe values. Bundle no remote font request; use a documented serif/sans system stack in this task.

- [ ] **Step 7: Run focused/full build gates and commit regenerated output.**

```powershell
node --test tests/theme-controller.test.mjs tests/theme-build-contract.test.mjs tests/accessibility-contracts.test.mjs tests/build.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add src/js/theme-bootstrap.js src/js/theme-controller.js src/js/guitar-reference-bootstrap.js src/js/app-shell.js src/js/lesson-page.js src/assets src/templates src/manifest.webmanifest tests/theme-controller.test.mjs tests/theme-build-contract.test.mjs tests/guitar-reference-bootstrap.test.mjs tests/app-shell-lifecycle.test.mjs tests/legacy-contracts.test.mjs public
git commit -m "feat: add Modern Luthier themes"
```

---

### Task 9: Introduce the Neutral Guitar Reference Route Shell

**Files:**

- Create: `src/data/routes.json`
- Create: `src/js/navigation-menu.js`
- Create: `tests/navigation-menu.test.mjs`
- Modify: `scripts/build.mjs`
- Modify: `src/js/hash-router.js`
- Modify: `src/js/app-shell.js`
- Modify: `src/templates/index.html`
- Modify: `src/assets/app-shell.css`
- Modify: `src/assets/components.css`
- Modify: `tests/hash-router.test.mjs`
- Modify: `tests/accessibility-contracts.test.mjs`
- Modify: `tests/build.test.mjs`

**Interfaces:**

```js
globalThis.GuitarReferenceRouteCatalog = {
  routes: [{ id, title, hash, primary, subroutes }],
  aliases: { [legacyHash]: destinationHash }
}

HashRouter.parseHash(value, catalog)
HashRouter.create({ window, document, catalog, onDeactivate })
NavigationMenu.create({ document }) => { init(), close(), destroy() }
```

Routes are `home`, `tools`, `backing-tracks`, `guitarists`, `gear`, and `theory`; only the last five are primary. Old hashes map deliberately: Today/Session/Progress to Home or Legacy Practice Data; Studio input/recording/backing to Tools subroutes; Studio fretboard/chords to Theory; Roadmap/Library to Tools/Guides; Guitar to Gear.

The literal alias table is fixed and tested: `#top`, `#today`, `#/today`, `#/session`, and `#/progress` → `#/home`; `#backing-lab`, `#/studio/backing` → `#/tools/backing-lab`; `#/studio/input` → `#/tools/input`; `#/studio/recording` → `#/tools/recorder`; `#chord-lab`, `#/studio/chords` → `#/theory/chords`; `#/studio/fretboard` → `#/theory/fretboard`; `#roadmap`, `#/roadmap` → `#/tools/guides`; `#library`, `#/roadmap/library` → `#/tools/guides`; `#guitar`, `#/roadmap/gear` → `#/gear`; bare `#/studio` → `#/tools`. Unknown hashes → `#/home`. Legacy Practice Data is linked from Tools/local data rather than overloading an old route.

- [ ] **Step 1: Write failing pure route tests.** Empty/unknown → Home; all six routes parse; supported subroutes parse; every literal alias above has its exact destination; invalid nested route → Home; document title uses `Guitar Reference`.

- [ ] **Step 2: Write failing browser-router tests.** Exactly one route visible/current, route heading focus, reduced-motion scrolling, deactivation before hide, skip navigation, and back/forward behavior remain.

- [ ] **Step 3: Write failing navigation-menu tests.** Toggle updates `aria-expanded`, Escape closes and returns focus, clicking a route closes, focus does not enter a closed menu, and desktop behavior does not duplicate current state.

- [ ] **Step 4: Run to verify RED.**

```powershell
node --test tests/hash-router.test.mjs tests/navigation-menu.test.mjs tests/accessibility-contracts.test.mjs tests/build.test.mjs
```

- [ ] **Step 5: Generate `GuitarReferenceRouteCatalog` during build from `src/data/routes.json`.** Validate unique IDs/hashes and alias destinations; write `public/js/route-catalog.js` so `file://` does not require `fetch`.

- [ ] **Step 6: Implement the six-route shell.** Use compact top navigation and menu on small screens; remove the permanent mobile bottom bar; allow approximately 94% viewport width with 1,800px cap; keep old controller-dependent DOM `hidden inert` only until Tasks 10–11 and never expose it through navigation.

- [ ] **Step 7: Run focused/full build gates and commit regenerated output.**

```powershell
node --test tests/hash-router.test.mjs tests/navigation-menu.test.mjs tests/accessibility-contracts.test.mjs tests/build.test.mjs tests/app-shell-lifecycle.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add src/data/routes.json src/js/navigation-menu.js src/js/hash-router.js src/js/app-shell.js src/templates/index.html src/assets/app-shell.css src/assets/components.css scripts/build.mjs tests/navigation-menu.test.mjs tests/hash-router.test.mjs tests/accessibility-contracts.test.mjs tests/build.test.mjs public
git commit -m "feat: add neutral Guitar Reference shell"
```

---

### Task 10: Remount Reusable Tools and Legacy Data Under Neutral Routes

**Files:**

- Create: `src/js/backing-data.js`
- Create: `src/js/legacy-recording-adapter.js`
- Create: `src/js/tools-view.js`
- Create: `src/js/theory-foundation-view.js`
- Create: `src/js/legacy-data-view.js`
- Create: `src/assets/tools.css`
- Create: `src/assets/theory-foundation.css`
- Create: `tests/tools-view.test.mjs`
- Create: `tests/theory-foundation-view.test.mjs`
- Create: `tests/legacy-data-view.test.mjs`
- Create: `tests/legacy-recording-adapter.test.mjs`
- Modify: `src/templates/index.html`
- Modify: `src/js/app-shell.js`
- Modify: `src/js/course-data.js`
- Modify: `src/js/backing-lab-view.js`
- Modify: `src/js/recording-view.js`
- Delete: `src/js/ear-training-view.js`
- Modify: `src/js/fretboard-view.js`
- Modify: `src/assets/style.css`
- Modify: `tests/app-shell-lifecycle.test.mjs`
- Modify: `tests/support/memory-indexeddb.mjs`

**Interfaces:**

```js
globalThis.BackingData = Object.freeze({ tracks })
BackingData.resolveSelection({ trackSource, trackId }, { customProgressions = [] }) => track | null
LegacyRecordingAdapter.openExisting({ indexedDB, name = 'gcm-private-v3' }) => Promise<{status,repository}>
LegacyRecordingAdapter.createOnRecord({ indexedDB, name = 'gcm-private-v3' }) => Promise<{status,repository}>
ToolsView.create(context) => { init(): Promise<void>, deactivate() }
TheoryFoundationView.create(context) => { init(): Promise<void>, deactivate() }
LegacyDataView.create({ document, legacyData, download, confirm }) => { init(), render(), destroy() }
```

Tools mounts an accurate **Input Monitor** (selected device, level, clipping, and noise-calibration status only), recorder, local Backing Lab, setup guides, and local-data controls. Sample-rate-correct pitch/tuner and latency measurement are honestly marked “coming in the Theory & Core Tools workstream.” Theory temporarily mounts current chord/fretboard display primitives without assignments or the current score-producing ear-training controller. `BackingData` is the canonical API retained by Plan 04; Plan 04 may add a `BackingPresets` compatibility name but must not create a second owner.

- [ ] **Step 1: Write failing lifecycle tests.** Mount performs zero `getUserMedia`, MediaRecorder, AudioContext activation, or audio start calls. Leaving Tools stops pending audio start, backing audio, input tracks, monitoring, playback, and active recording. Leaving Theory stops its audio and input borrowers.

- [ ] **Step 2: Write failing persistence tests.** Custom progression selected by composite `{trackSource:'custom',trackId}` survives reload and appears alongside built-ins; real `{meter,events,seed,notes}` shape is preserved through the new repository; current recording database/takes remain available; gear fields/notes remain available. Seed a built-in and custom track with the same `trackId`, select each in turn, reload, and prove `resolveSelection` uses `trackSource` so neither record shadows the other.

- [ ] **Step 3: Write failing neutral-copy tests.** No `clean take +2 BPM`, automatic ramp, `Needs work/Good/Clean` judgement, review queue creation, assignment, coach recommendation, or automatic next action appears in these views. Raw legacy self-rating data remains in the archive.

- [ ] **Step 4: Write failing Legacy Data view tests.** Read-only counts/warnings render; ordinary/reappearance/current/journal exports download their exact filenames; `needs-review` shows current/source export receipts plus per-conflict choices and can call adoption; multi-journal review lists fingerprints/timestamps, requires every journal export, and can retain/archive or phrase-confirm discard; deletion requires exact confirmation and the closed-copies choice; recordings/current data remain reported as preserved; partial failures are visible and retryable.

- [ ] **Step 5: Run to verify RED.**

```powershell
node --test tests/tools-view.test.mjs tests/theory-foundation-view.test.mjs tests/legacy-data-view.test.mjs tests/legacy-recording-adapter.test.mjs tests/app-shell-lifecycle.test.mjs
```

- [ ] **Step 6: Move surviving generated presets to `BackingData` and reduce `course-data.js` to a compatibility facade.** Preserve every current preset ID plus progression, meter, tempo, groove, seed, and user selection. Titles/descriptions, coaching prose, artist-style names, and unverified key/mode claims become `reviewState:'legacy-unreviewed'` editorial fields that are not rendered as verified facts. Neutral consumers/tests use `BackingData`; `CourseData` exposes the exact legacy fields needed only by coach modules until Task 11 deletes both facade and consumers. Add identity tests proving the facade does not duplicate/mutate records.

- [ ] **Step 7: Implement neutral view composition and future-version-safe recording access.** Use `context.repository`, `context.preferencesStore`, and `context.legacyData`. Implement `legacy-recording-adapter.js`: `openExisting` opens `gcm-private-v3` without a requested version, aborts a missing-database upgrade, validates the existing `recordings` key-path store before CRUD, and never creates/upgrades a future-version database; `createOnRecord` may create version 1 only after confirmed missing status and an explicit Record action. Add it to build script order before `recording-view.js`. Test missing/blocked/future-version cases, playback/save/delete at version >1, close/error behavior, no metadata-store access, and zero database creation on mount. Adapt recorder metadata display to neutral titles/notes without changing stored blobs or erasing old fields.

- [ ] **Step 8: Run focused/full build gates and commit regenerated output.**

```powershell
node --test tests/tools-view.test.mjs tests/theory-foundation-view.test.mjs tests/legacy-data-view.test.mjs tests/legacy-recording-adapter.test.mjs tests/app-shell-lifecycle.test.mjs tests/input-manager.test.mjs tests/recording-store.test.mjs tests/progression-engine.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add -A src/js/backing-data.js src/js/legacy-recording-adapter.js src/js/tools-view.js src/js/theory-foundation-view.js src/js/legacy-data-view.js src/js/app-shell.js src/js/course-data.js src/js/backing-lab-view.js src/js/recording-view.js src/js/ear-training-view.js src/js/fretboard-view.js src/templates/index.html src/assets tests/tools-view.test.mjs tests/theory-foundation-view.test.mjs tests/legacy-data-view.test.mjs tests/legacy-recording-adapter.test.mjs tests/app-shell-lifecycle.test.mjs tests/support/memory-indexeddb.mjs tests/progression-engine.test.mjs public
git commit -m "feat: remount neutral guitar tools"
```

---

### Task 11: Remove the Active Practice Coach Runtime

**Files:**

- Create: `scripts/lib/product-language.mjs`
- Create: `tests/neutral-runtime.test.mjs`
- Delete: `src/js/today-view.js`
- Delete: `src/js/session-view.js`
- Delete: `src/js/progress-view.js`
- Delete: `src/js/roadmap-view.js`
- Delete: `src/js/recommendation-engine.js`
- Delete: `src/js/skill-model.js`
- Delete: `src/js/progress-controller.js`
- Delete: `src/js/session-planner.js`
- Delete: `src/js/practice-engine.js`
- Delete: `src/js/session-runner.js`
- Delete: `src/js/session-controller.js`
- Delete: `src/js/review-scheduler.js`
- Delete: `src/js/course-data.js`
- Delete: `tests/recommendation-engine.test.mjs`
- Delete: `tests/skill-model.test.mjs`
- Delete: `tests/progress-controller.test.mjs`
- Delete: `tests/session-planner.test.mjs`
- Delete: `tests/practice-engine.test.mjs`
- Delete: `tests/session-runner.test.mjs`
- Delete: `tests/session-controller.test.mjs`
- Delete: `tests/review-scheduler.test.mjs`
- Modify: `src/templates/index.html`
- Modify: `src/js/app-shell.js`
- Modify: `scripts/build.mjs`
- Modify: `scripts/verify.mjs`
- Modify: `tests/build.test.mjs`
- Modify: `tests/app-shell-lifecycle.test.mjs`
- Modify: `tests/legacy-contracts.test.mjs`

**Interfaces:**

```js
scanProductLanguage({ indexHtml, notFoundHtml, manifest, articleChrome }) => [{ location, term }]
```

`AppShell` uses Guitar Reference repository/preferences only. Legacy progress modules may load solely as migration decoders until a later schema cleanup, but no coach controller or decision engine is copied or loaded as active runtime.

- [ ] **Step 1: Write failing runtime tests.** Generated index contains no Today/Session/Progress/Roadmap view, recommendation notification, guided-session action, practice scoring, acceptance/rejection flow, or active session planner. Built script order contains neutral tools and migration modules but no deleted coach module.

- [ ] **Step 2: Add product-language scanner tests with exact allowed contexts.** It scans generated shell/manifest/article chrome, not arbitrary article prose where words like “practice” may be legitimate. Allow old storage keys and compatibility filenames only in non-user-facing internals.

- [ ] **Step 3: Run to verify RED.**

```powershell
node --test tests/neutral-runtime.test.mjs tests/build.test.mjs tests/legacy-contracts.test.mjs
```

- [ ] **Step 4: Remove controller registration, markup, script tags, coach source modules/tests, and the `CourseData` compatibility facade together.** Preserve migration decoders, raw archive schemas, legacy hash aliases, canonical `BackingData`, neutral tools, and all data fixtures.

- [ ] **Step 5: Update verifier to call `scanProductLanguage` against generated application chrome.** Return file/path and offending term; do not use a brittle repository-wide word ban.

- [ ] **Step 6: Run focused/full build gates and commit regenerated output.**

```powershell
node --test tests/neutral-runtime.test.mjs tests/hash-router.test.mjs tests/app-shell-lifecycle.test.mjs tests/legacy-contracts.test.mjs tests/build.test.mjs tests/legacy-practice-data.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add -A src/js src/templates/index.html scripts/lib/product-language.mjs scripts/build.mjs scripts/verify.mjs tests public
git commit -m "refactor: remove active Practice Coach runtime"
```

---

### Task 12: Convert the Build Pipeline and Chrome to Neutral Reference Articles

**Files:**

- Create: `src/templates/article.html`
- Create: `src/js/article-page.js`
- Create: `tests/article-page.test.mjs`
- Create: `tests/article-neutrality.test.mjs`
- Delete: `src/templates/lesson.html`
- Delete: `src/js/lesson-page.js`
- Modify: `scripts/lib/content.mjs`
- Modify: `scripts/build.mjs`
- Modify: `scripts/verify.mjs`
- Modify: `tests/content.test.mjs`
- Modify: `tests/build.test.mjs`
- Modify: `tests/offline.test.mjs`
- Modify: `tests/server.test.mjs`

**Interfaces:**

```js
loadArticles(contentRoot) => Promise<Array<{
  id, slug, title, section,
  articleType: 'guide'|'reference'|'worksheet'|'example',
  reviewState: 'legacy-unreviewed'|'reviewed'|'not-applicable',
  summary, tags, sourcePath, html
}>>

ArticlePage.create({ window, document }) => { init(), destroy() }
```

Generate `public/lessons/<slug>.html` unchanged, `public/data/articles.json`, and `public/js/article-index.js` assigning `globalThis.GuitarReferenceArticleIndex`.

- [ ] **Step 1: Write failing content compatibility tests.** `loadArticles` accepts current and neutral front matter, maps YAML `review-state` to camelCase `reviewState`, defaults legacy prose to `legacy-unreviewed`, and validates only `legacy-unreviewed|reviewed|not-applicable`. Every legacy URL fixture remains a subset; new articles may increase the total. Generated records have no phase/week/difficulty/completion fields.

- [ ] **Step 2: Write failing article-page/chrome tests.** Neutral breadcrumb, title, section/type/tags, visible review-state badge/explanation, source link, print, reading progress, and footer remain. Completion checkbox, ordered previous/next lesson pressure, course phase, difficulty badge, week copy, and state mutation are absent. Article index and later universal-search records preserve `reviewState` in context.

- [ ] **Step 3: Run to verify RED.**

```powershell
node --test tests/article-page.test.mjs tests/article-neutrality.test.mjs tests/content.test.mjs tests/build.test.mjs
```

- [ ] **Step 4: Implement neutral article generation.** Keep filename-derived slugs and preserve existing URLs. `ArticlePage` owns only reading progress/print/navigation cleanup and performs no LocalStorage completion writes. Current content remains readable through compatibility projection until Tasks 13-15 rewrite its metadata and prose.

- [ ] **Step 5: Run focused/full build gates and commit regenerated output.**

```powershell
node --test tests/article-page.test.mjs tests/article-neutrality.test.mjs tests/content.test.mjs tests/build.test.mjs tests/offline.test.mjs tests/server.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add -A src/templates/article.html src/templates/lesson.html src/js/article-page.js src/js/lesson-page.js scripts/lib/content.mjs scripts/build.mjs scripts/verify.mjs tests/article-page.test.mjs tests/article-neutrality.test.mjs tests/content.test.mjs tests/build.test.mjs tests/offline.test.mjs tests/server.test.mjs public
git commit -m "refactor: generate neutral reference articles"
```

---

### Task 13: Neutralize Daily-Practice and Technique Articles

**Files:**

- Create: `tests/content-neutrality.test.mjs`
- Create: `tests/fixtures/content-neutrality-groups.mjs`
- Modify: `content/01-daily-practice/2-hour-session.md`
- Modify: `content/01-daily-practice/90-minute-core.md`
- Modify: `content/01-daily-practice/long-day-blocks.md`
- Modify: `content/01-daily-practice/rest-and-injury-prevention.md`
- Modify: `content/01-daily-practice/weekly-schedule.md`
- Modify: `content/02-technique/bending-vibrato-dynamics-and-harmonics.md`
- Modify: `content/02-technique/clean-speed-system.md`
- Modify: `content/02-technique/legato-and-tapping.md`
- Modify: `content/02-technique/picking-and-synchronization.md`
- Modify: `content/02-technique/sweeping-string-skipping-and-muting.md`

**Contract:** Every listed file keeps its filename/URL and existing musical substance, but uses `title`, `section`, `article-type`, `tags`, `summary`, and optional `review-state` front matter. This task removes prescriptions and clearly labels suggestions/examples; it does not certify unsourced substantive claims. Session/schedule pages become optional time-layout references; technique pages become searchable guides rather than assigned work.

- [ ] **Step 1: Add these exact paths to `CONTENT_NEUTRALITY_GROUPS.foundationA` and write failing source tests.** Assert the group has no duplicates, every file exists, front matter is neutral, and obsolete phase/week/difficulty fields are absent.

- [ ] **Step 2: Rewrite metadata and framing one article at a time.** Remove prescribed weekly order, completion pressure, adaptive-plan language, and coach voice. Preserve substantive claims unless a current citation directly supports a correction; flag unsupported high-risk claims for Research Plan 01/Reference Plan 03 rather than silently rewriting them. Keep explicit safety advice and distinguish observed fact, exercise suggestion, and creative example.

- [ ] **Step 3: Run the group test, inspect generated articles, then run full gates and commit.**

```powershell
node --test tests/content-neutrality.test.mjs tests/content.test.mjs tests/build.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add content/01-daily-practice content/02-technique tests/content-neutrality.test.mjs tests/fixtures/content-neutrality-groups.mjs public
git commit -m "docs: neutralize practice and technique references"
```

---

### Task 14: Neutralize Rhythm, Ear-Training, and Theory Articles

**Files:**

- Modify: `tests/fixtures/content-neutrality-groups.mjs`
- Modify: `tests/content-neutrality.test.mjs`
- Modify: `content/03-rhythm-and-groove/funk-and-muted-articulation.md`
- Modify: `content/03-rhythm-and-groove/odd-meter-and-rhythmic-displacement.md`
- Modify: `content/03-rhythm-and-groove/time-subdivisions-and-metronome.md`
- Modify: `content/04-ear-training/famous-short-melodies-and-riffs.md`
- Modify: `content/04-ear-training/hearing-chords-and-bass-lines.md`
- Modify: `content/04-ear-training/the-no-tabs-method.md`
- Modify: `content/04-ear-training/transcription-ladder.md`
- Modify: `content/05-fretboard-theory-chords/fretboard-freedom.md`
- Modify: `content/05-fretboard-theory-chords/how-chords-are-built.md`
- Modify: `content/05-fretboard-theory-chords/how-scales-are-built.md`
- Modify: `content/05-fretboard-theory-chords/modes-harmony-and-playing-through-changes.md`
- Modify: `content/05-fretboard-theory-chords/seventh-chords-extensions-and-alterations.md`
- Modify: `content/05-fretboard-theory-chords/triads-inversions-and-voice-leading.md`

**Contract:** This Foundation task changes metadata and framing only. Existing theory statements are not declared newly verified; Theory Plan 02 later validates/corrects them against formal contracts. Rhythm and ear-training material becomes optional reference rather than assignment.

- [ ] **Step 1: Add the exact paths to `CONTENT_NEUTRALITY_GROUPS.foundationB` and verify RED for old metadata/copy.**

- [ ] **Step 2: Rewrite metadata and framing.** Preserve useful exercises as optional examples, remove assignments and fixed progression ladders, mark unsourced theory claims `reviewState:'legacy-unreviewed'` in article metadata, and retain links only when their destination and label remain honest. Do not invent citations or perform broad factual corrections before Plans 01-03.

- [ ] **Step 3: Run both converted groups, inspect representative theory/artist/stagecraft pages, then run full gates and commit.**

```powershell
node --test tests/content-neutrality.test.mjs tests/content.test.mjs tests/build.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add content/03-rhythm-and-groove content/04-ear-training content/05-fretboard-theory-chords tests/content-neutrality.test.mjs tests/fixtures/content-neutrality-groups.mjs public
git commit -m "docs: neutralize rhythm ear-training and theory references"
```

---

### Task 15: Neutralize Improvisation, Repertoire, and Stagecraft Articles

**Files:**

- Modify: `tests/fixtures/content-neutrality-groups.mjs`
- Modify: `tests/content-neutrality.test.mjs`
- Modify: `content/06-improvisation-phrasing/build-your-own-vocabulary.md`
- Modify: `content/06-improvisation-phrasing/motif-development.md`
- Modify: `content/06-improvisation-phrasing/target-notes-and-chord-changes.md`
- Modify: `content/06-improvisation-phrasing/tension-release-and-outside-playing.md`
- Modify: `content/06-improvisation-phrasing/the-musical-sentence.md`
- Modify: `content/07-repertoire-covers/arrangement-and-performance-checklist.md`
- Modify: `content/07-repertoire-covers/cover-rules-no-tabs.md`
- Modify: `content/07-repertoire-covers/guthrie-study-map.md`
- Modify: `content/07-repertoire-covers/personal-cover-ladder.md`
- Modify: `content/08-personality-humour/develop-your-own-voice.md`
- Modify: `content/08-personality-humour/natural-stage-banter.md`
- Modify: `content/08-personality-humour/storytelling-timing-and-callbacks.md`

**Contract:** Improvisation/repertoire exercises become optional examples; artist-specific material is labeled legacy analysis pending Plans 01/03, never impersonation or endorsement; humour material becomes stage-communication reference and never promises a personality can be copied.

- [ ] **Step 1: Add the exact paths to `CONTENT_NEUTRALITY_GROUPS.foundationC` and verify RED.**

- [ ] **Step 2: Rewrite metadata and framing.** Remove assignments/ladders, preserve useful examples, mark unsourced artist claims `reviewState:'legacy-unreviewed'`, and do not invent citations.

- [ ] **Step 3: Run all converted groups, inspect improvisation/artist/stagecraft pages, then run full gates and commit.**

```powershell
node --test tests/content-neutrality.test.mjs tests/content.test.mjs tests/build.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add content/06-improvisation-phrasing content/07-repertoire-covers content/08-personality-humour tests/content-neutrality.test.mjs tests/fixtures/content-neutrality-groups.mjs public
git commit -m "docs: neutralize improvisation and artist study references"
```

---

### Task 16: Neutralize Assessments, Worksheets, and Learning Resources

**Files:**

- Modify: `tests/fixtures/content-neutrality-groups.mjs`
- Modify: `tests/content-neutrality.test.mjs`
- Modify: `content/09-assessments/24-week-final-performance.md`
- Modify: `content/09-assessments/baseline-test.md`
- Modify: `content/09-assessments/monthly-tests.md`
- Modify: `content/09-assessments/weekly-review.md`
- Modify: `content/10-templates-trackers/recording-review-checklist.md`
- Modify: `content/10-templates-trackers/solo-analysis-worksheet.md`
- Modify: `content/10-templates-trackers/transcription-worksheet.md`
- Modify: `content/11-learning-resources/resource-guide.md`
- Modify: `content/11-learning-resources/source-notes.md`

**Contract:** Assessments become optional self-check references; worksheets remain downloadable/printable tools; source notes become preliminary methodology pending Plans 01/03.

- [ ] **Step 1: Add exact paths to `CONTENT_NEUTRALITY_GROUPS.foundationD` and verify RED.**

- [ ] **Step 2: Rewrite metadata/framing while preserving the CSV templates unchanged.**

- [ ] **Step 3: Run converted groups and full gates, then commit.**

```powershell
node --test tests/content-neutrality.test.mjs tests/content.test.mjs tests/build.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add content/09-assessments content/10-templates-trackers content/11-learning-resources tests/content-neutrality.test.mjs tests/fixtures/content-neutrality-groups.mjs public
git commit -m "docs: neutralize self-check and learning references"
```

---

### Task 17: Neutralize Setup and Model-Specific Buying Guides

**Files:**

- Modify: `tests/fixtures/content-neutrality-groups.mjs`
- Modify: `tests/content-neutrality.test.mjs`
- Modify: `content/12-gear-and-setup/action-relief-intonation.md`
- Modify: `content/12-gear-and-setup/floating-tremolo-setup.md`
- Modify: `content/12-gear-and-setup/maintenance-and-storage.md`
- Modify: `content/12-gear-and-setup/signal-noise-and-grounding.md`
- Modify: `content/12-gear-and-setup/string-gauge-changes.md`
- Modify: `content/12-gear-and-setup/used-guitar-inspection.md`
- Modify: `content/12-rg8570-buying-guide/future-stainless-refret-notes.md`
- Modify: `content/12-rg8570-buying-guide/in-person-inspection-checklist.md`
- Modify: `content/12-rg8570-buying-guide/rg8570-long-term-evaluation.md`

**Contract:** Setup/buying material carries risk, scope, and evidence boundaries. No model-specific opinion is presented as universal fact.

- [ ] **Step 1: Add exact paths to `CONTENT_NEUTRALITY_GROUPS.foundationE` and verify RED.** Add a coverage assertion that the union of A/B/C/D/E equals every Markdown source discovered under `content/`, with no duplicate or unclassified file.

- [ ] **Step 2: Rewrite metadata and prose.** Preserve the CSV templates unchanged. Separate inspection facts, tolerances, user preferences, and work that should be referred to a qualified technician.

- [ ] **Step 3: Run complete neutrality/URL/build checks, inspect one page from every section, then run full gates and commit.**

```powershell
node --test tests/content-neutrality.test.mjs tests/content.test.mjs tests/build.test.mjs tests/offline.test.mjs tests/server.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add content/12-gear-and-setup content/12-rg8570-buying-guide tests/content-neutrality.test.mjs tests/fixtures/content-neutrality-groups.mjs public
git commit -m "docs: neutralize setup and buying references"
```

---

### Task 18: Add the Universal-Search Contract and Finished Home View

**Files:**

- Create: `src/data/tools.json`
- Create: `scripts/lib/search-index.mjs`
- Create: `src/js/universal-search.js`
- Create: `src/js/home-view.js`
- Create: `tests/search-index.test.mjs`
- Create: `tests/universal-search.test.mjs`
- Create: `tests/home-view.test.mjs`
- Modify: `scripts/build.mjs`
- Modify: `src/templates/index.html`
- Modify: `src/js/app-shell.js`
- Modify: `src/assets/views.css`
- Modify: `tests/build.test.mjs`
- Modify: `tests/offline.test.mjs`

**Interfaces:**

```js
buildSearchIndex({ routes, tools, articles, records = [] }) => SearchRecord[]

SearchRecord = {
  id, type, title, summary, href,
  keywords: string[],
  context: object
}

UniversalSearch.create(records) => {
  search(query, { limit = 12, types = [] })
}

HomeView.create({ document, search }) => {
  init(), renderResults(query), destroy()
}
```

The build writes `public/data/search-index.json` and `public/js/search-index.js` exposing frozen `globalThis.GuitarReferenceSearchIndex`. Runtime does not fetch the index so it works under `file://`. Later plans append theory, track, guitarist, and gear records through `records` without changing the API. Foundation route records are honest landing states, not fake content records.

- [ ] **Step 1: Write failing build-index tests.** Reject duplicate IDs, missing titles/hrefs, unsupported result types, and routes outside the catalog. Assert deterministic stable ordering and identical JSON/JS normalized content.

- [ ] **Step 2: Write failing pure search tests.** Case/diacritic insensitive, token based, stable, grouped by type, type-filtered, bounded by limit, and context-preserving. Estimated/unknown/review state in `context` must not be flattened into generic fact text.

```js
test('search keeps evidence context attached to results', () => {
  const result = search.search('odd meter', { types: ['article'] })[0];
  assert.deepEqual(result.context, { section: 'Rhythm', articleType: 'reference', reviewState: 'legacy-unreviewed' });
});
```

- [ ] **Step 3: Write failing Home interaction tests.** Empty query shows navigation rather than recommendations; result click resolves the exact route; Escape clears results and restores input focus; arrow keys and Enter operate listbox/results; status updates announce result counts, not every keystroke character.

- [ ] **Step 4: Run to verify RED.**

```powershell
node --test tests/search-index.test.mjs tests/universal-search.test.mjs tests/home-view.test.mjs
```

- [ ] **Step 5: Implement the build/pure modules.** Normalize search text with NFKD/diacritic removal and lowercase tokenization. Rank exact title, title prefix, all-token match, then partial keyword match; preserve source order as final tie-breaker.

- [ ] **Step 6: Implement the approved Home with exact Foundation destinations.** Working cards link to `#/tools/input` (Input Monitor), `#/tools/recorder`, `#/tools/backing-lab`, `#/theory/chords`, and `#/theory/fretboard`. Backing Tracks (`#/backing-tracks`), Guitarists (`#/guitarists`), Gear (`#/gear`), full Theory Workspace/Tuner/Metronome (`#/theory`) render tested “planned workstream” landing states with no fake data, dead actions, or “available now” copy. Include identity/independent status and trust/methodology. Cards are navigation, not recommendations; later plans replace landing state content in place.

- [ ] **Step 7: Run focused/full build gates and commit regenerated output.**

```powershell
node --test tests/search-index.test.mjs tests/universal-search.test.mjs tests/home-view.test.mjs tests/build.test.mjs tests/offline.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add src/data/tools.json scripts/lib/search-index.mjs src/js/universal-search.js src/js/home-view.js scripts/build.mjs src/templates/index.html src/js/app-shell.js src/assets/views.css tests/search-index.test.mjs tests/universal-search.test.mjs tests/home-view.test.mjs tests/build.test.mjs tests/offline.test.mjs public
git commit -m "feat: add universal search home"
```

---

### Task 19: Complete Identity, Footer, Governance, and Media Surfaces

**Files:**

- Create: `src/data/project.json`
- Create: `scripts/lib/project.mjs`
- Create: `content/11-learning-resources/media-attributions.md`
- Create: `content/11-learning-resources/corrections-history.md`
- Create: `content/11-learning-resources/privacy-and-local-data.md`
- Create: `THIRD_PARTY_NOTICES.md`
- Create: `tests/identity-contracts.test.mjs`
- Modify: `tests/fixtures/content-neutrality-groups.mjs`
- Modify: `tests/content-neutrality.test.mjs`
- Modify: `tests/verify.test.mjs`
- Modify: `src/templates/index.html`
- Modify: `src/templates/article.html`
- Modify: `src/templates/404.html`
- Modify: `src/manifest.webmanifest`
- Modify: `src/assets/icon.svg`
- Modify: `src/assets/social-preview.svg`
- Modify: `scripts/build.mjs`
- Modify: `scripts/package-offline.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `SECURITY.md`
- Modify: `tests/repository.test.mjs`

**Interfaces:**

```js
loadProjectMetadata(projectRoot) => {
  name: 'Guitar Reference',
  credit: 'An open guitar toolkit by johnnypatty',
  description, repository, owner, version, lastUpdated
}

renderProjectFooter(project, { pathPrefix }) => string
```

- [ ] **Step 1: Write failing identity/content-count tests.** Built metadata, brand, manifest, SVG accessible title, social preview, article chrome, 404, offline launcher, README, and repository docs use Guitar Reference. Exact credit appears. Package/project versions agree. Add the three new Markdown paths to `CONTENT_NEUTRALITY_GROUPS.governance`, require foundationA/B/C/D/E/governance to equal the discovered Markdown set, and replace the verifier’s fixed 53 count with the validated build result while retaining the immutable 53-URL subset.

- [ ] **Step 2: Write failing footer/link tests.** Footer includes concise description; owner/account/repository; Sources & Methodology; Media Attributions; Corrections History and Report an Error; code/content/third-party licenses; privacy/local data; contribution; version/last-updated; and unaffiliated disclaimer. Every internal link resolves from index and article path prefixes and is cached offline.

- [ ] **Step 3: Run to verify RED.**

```powershell
node --test tests/identity-contracts.test.mjs tests/repository.test.mjs tests/build.test.mjs
```

- [ ] **Step 4: Implement project metadata as the single build-time identity source.** `project.json` contains no secret or private contact data. Render footer at build time to index/article/404; citations remain near facts rather than moving to the footer. The three governance articles are honest Foundation placeholders explaining the workflow/current state; Reference Plan 03 populates and validates claim/media/correction records rather than creating duplicate surfaces.

- [ ] **Step 5: Replace identity assets with code-native SVG.** Do not use generated bitmap photography. Include source/license records for any third-party visual element; otherwise keep the mark original and typographic.

- [ ] **Step 6: Update documentation and policies.** State independent/unaffiliated status, no copyrighted media redistribution, local-data boundaries, source/correction workflow, contribution validation, and dual license plus third-party notices.

- [ ] **Step 7: Run focused/full build gates and commit regenerated output.**

```powershell
node --test tests/identity-contracts.test.mjs tests/repository.test.mjs tests/build.test.mjs tests/article-neutrality.test.mjs tests/offline.test.mjs
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
git add src/data/project.json scripts/lib/project.mjs content/11-learning-resources/media-attributions.md content/11-learning-resources/corrections-history.md content/11-learning-resources/privacy-and-local-data.md THIRD_PARTY_NOTICES.md src/templates src/manifest.webmanifest src/assets/icon.svg src/assets/social-preview.svg scripts/build.mjs scripts/package-offline.mjs package.json package-lock.json README.md CONTRIBUTING.md SECURITY.md tests/identity-contracts.test.mjs tests/content-neutrality.test.mjs tests/fixtures/content-neutrality-groups.mjs tests/verify.test.mjs tests/repository.test.mjs public
git commit -m "feat: complete Guitar Reference identity"
```

---

### Task 20: Finalize Offline, GitHub Pages, and Foundation Release Gates

**Files:**

- Create: `tests/pages-base-path.test.mjs`
- Modify: `src/templates/sw.js`
- Modify: `scripts/build.mjs`
- Modify: `scripts/package-offline.mjs`
- Modify: `scripts/verify.mjs`
- Modify: `scripts/serve.mjs`
- Modify: `src/templates/404.html`
- Modify: `.github/workflows/test.yml`
- Modify: `.github/workflows/pages.yml`
- Modify: `tests/offline.test.mjs`
- Modify: `tests/verify.test.mjs`
- Modify: `tests/server.test.mjs`
- Modify: `tests/repository.test.mjs`
- Modify: `README.md`
- Regenerate: `public/**`

**Interfaces:**

```js
buildSite({ projectRoot, contentRoot, outDir, repository, basePath }) => {
  outDir, articleCount, searchRecordCount
}

packageOffline({
  projectRoot, publicDir,
  zipPath: 'public/downloads/guitar-reference-offline.zip',
  compatibilityZipPath: 'public/downloads/guthrie-complete-musician-offline.zip'
}) => { zipPath, compatibilityZipPath, entries }

createStaticServer({ root, mountPath = '/' })
```

One generated `public` tree serves both targets: all artifact-to-artifact links/scripts/styles are relative, so the same files work beneath a GitHub Pages repository prefix and through `file://`. `basePath` affects only deployment-scope values that cannot be relative (service-worker scope, canonical/OpenGraph URL when configured, preview server mount, and 404 return target). The offline packager copies the verified tree and supplies a local launcher; it does not rebuild a divergent second site.

- [ ] **Step 1: Write failing repository-prefix tests.** Build/serve at `/guthrie-complete-musician/`; assert index, assets, manifest, service worker, hash routes, direct article, article assets, and 404 return remain valid. Test root and prefix independently.

- [ ] **Step 2: Write failing offline packaging tests.** New ZIP and byte-identical old compatibility alias exist; neither archive includes itself or the other ZIP; launcher says Guitar Reference; extracted `START HERE.html` opens local index; search/articles/tools/local-data shell are present; remote media is not bundled without license.

- [ ] **Step 3: Write failing cache migration tests.** New worker uses `guitar-reference-static-*`, deletes both stale `guitar-reference-static-*` and old `gcm-static-*` on activation, caches every generated local artifact except ZIPs/worker marker exclusions, and never caches LocalStorage/IndexedDB/recordings.

- [ ] **Step 4: Run to verify RED.**

```powershell
node --test tests/pages-base-path.test.mjs tests/offline.test.mjs tests/verify.test.mjs tests/server.test.mjs tests/repository.test.mjs
```

- [ ] **Step 5: Implement the single-tree relative-link invariant, base-path-aware server/service-worker/404 handling, and compatibility package.** Tests compare the Pages-served and extracted-ZIP asset/link graphs. Keep relative `file://` paths. Do not duplicate external full-resolution media into the ZIP.

- [ ] **Step 6: Extend verifier.** Validate legacy URL subset, search index, route catalog, internal/source/media relationships present so far, both ZIP aliases, cache completeness, no unresolved tokens, privacy scan, product-language scan, and workflow gate/permissions.

- [ ] **Step 7: Run the complete automated release gate fresh.**

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
```

Expected: zero failing tests; build/package/verify exit 0; both ZIPs exist; verifier reports the exact article and public-file counts.

- [ ] **Step 8: Run manual browser QA from the repository prefix.**

```powershell
node scripts/serve.mjs --root public --port 4173 --mount-path /guthrie-complete-musician/
```

Check `http://127.0.0.1:4173/guthrie-complete-musician/` in both themes at 320px, tablet, desktop, and ultrawide. Verify keyboard menu, skip link, route focus, no overflow, explicit Input Monitor permission, planned Tuner state, recording/audio shutdown after route exit, direct legacy article URL, offline after one complete visit, and extracted ZIP opened through `START HERE.html`. Record actual dimensions and any limitation in the task report; do not claim browser QA if it was not performed.

- [ ] **Step 9: Commit the verified release artifacts.**

```powershell
git add src/templates/sw.js scripts/build.mjs scripts/package-offline.mjs scripts/verify.mjs scripts/serve.mjs src/templates/404.html .github/workflows/test.yml .github/workflows/pages.yml tests/pages-base-path.test.mjs tests/offline.test.mjs tests/verify.test.mjs tests/server.test.mjs tests/repository.test.mjs README.md public
git commit -m "chore: finalize Guitar Reference foundation release"
```

---

## Foundation Completion Checklist

- [ ] `gcm-progress-v1/v2/v3` and `gcm-private-v3` are unchanged after ordinary migration.
- [ ] Existing recording bytes and metadata remain accessible.
- [ ] Actual custom progression, union gear, recommendation, and active-session shapes are preserved in current data or the read-only archive as specified.
- [ ] Legacy Practice Data cannot affect Home, Tools, Theory, search, or any recommendation/session behavior.
- [ ] Explicit legacy deletion verifies the source fingerprint and never touches recordings/current data.
- [ ] Active public routes are Home, Tools, Backing Tracks, Guitarists, Gear, and Theory; the five named destinations are the primary navigation.
- [ ] No active Practice Coach runtime or coach language remains in generated application chrome.
- [ ] All 53 legacy article URLs remain valid and neutral.
- [ ] Modern Luthier light/dark themes, increased text sizes, wide layout, footer, and GitHub/credit links match the approved direction.
- [ ] Universal search reaches every Foundation route, neutral tool, and article with no network request.
- [ ] No automatic microphone/audio/recording action occurs on mount.
- [ ] GitHub Pages base-path and extracted offline ZIP both work.
- [ ] Full automated gate and recorded manual QA pass before any completion claim.
