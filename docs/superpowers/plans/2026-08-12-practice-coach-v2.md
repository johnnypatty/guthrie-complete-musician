# Practice Coach v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete approved Practice Coach v2 as a private-by-default, offline-capable static application with a coach-first interface, local guitar analysis, recording comparison, interactive musicianship training, a substantially more musical Backing Lab, adaptive progress, and generic gear guidance.

**Architecture:** Keep the existing dependency-light UMD/browser architecture and Node build pipeline. Pure domain modules own planning, theory, signal metrics, musical-event compilation, and progress scoring; browser adapters own IndexedDB, media devices, recording, Web Audio rendering, and route controllers. A shared audio runtime provides one exact musical clock, and a single persistence gateway prevents home/lesson pages from overwriting each other.

**Tech Stack:** Node.js 22+, Node built-in test runner, static HTML/CSS/JavaScript, Web Audio API, MediaDevices, MediaRecorder, IndexedDB, localStorage, service worker, GitHub Pages.

## Global Constraints

- No account, telemetry, analytics, cloud sync, audio upload, external AI request, or automatic microphone activation.
- The existing 47 lesson URLs, offline ZIP, schemas 1 and 2 imports, and legacy hashes remain usable.
- The app must work without microphone, MediaRecorder, IndexedDB, or network access; only the related optional capability may be disabled.
- Guitar analysis is monophonic and confidence-gated; it never claims reliable processed-signal chord transcription or judges creativity/tone/emotion.
- Progress JSON never embeds audio bytes, Blob data, base64 audio, or IndexedDB-internal values.
- Every production behavior follows red-green-refactor; each task ends with targeted tests, the full suite, a build/verify pass when relevant, and a saved commit.
- All primary controls remain keyboard-operable, at least 44 CSS pixels, reduced-motion aware, and understandable without color.
- Backing playback begins only from a user gesture and uses conservative internal gain; the app never claims to know headphone sound-pressure level.

## Frozen v2 Contracts

- Session durations: 30, 60, 90, 120 minutes. Rest allocation: 0, 5, 10, 15 minutes respectively, included inside the exact total.
- Review intervals: 1, 3, 7, 14, 30 days; a miss returns the item to a one-day interval.
- Progress summaries use a 28-day recency window and show `low`, `medium`, or `high` confidence from evidence count rather than fake precision.
- Meter model: `{ numerator, denominator, groups, tempoUnit }`; 7/8 BPM counts eighth notes and defaults to groups `[2, 2, 3]`.
- Timing resolution: `PPQ = 96` quarter-note ticks; user-facing progression lengths are denominator-note pulses and normalize to integer ticks.
- Custom progressions: 1-64 events, at most 128 bars, chord text at most 16 characters, section text at most 32 characters, and tempo 40-240 BPM.
- Storage warning: show pressure when `usage / quota >= 0.8` or estimated remaining quota is below 50 MB.
- Pitch acceptance: calibrated RMS gate, no clipping above 0.98 absolute sample for 1% of a frame, detector confidence at least 0.8, and guitar-range frequency 65-1400 Hz.
- Stable note: at least 300 ms of accepted frames; bend target is valid within Â±15 cents for 150 ms and uses a 250 ms final window.
- Vibrato: at least three cycles, 3-10 Hz rate, and 10-200 cents peak-to-peak width; values outside are reported as insufficient rather than scored.
- Onset refractory interval: 80 ms. String-noise output is always labelled experimental and never contributes more than 10% to a technique observation.

---

## Phase A â€” Foundation, Application Shell, and Guided Coach

### Task 1: Characterize Existing Public Contracts

**Files:**
- Modify: `tests/repository.test.mjs`
- Modify: `tests/build.test.mjs`
- Modify: `tests/offline.test.mjs`
- Create: `tests/legacy-contracts.test.mjs`

**Interfaces:**
- Consumes: current public build, schema-2 progress, existing lesson URLs and legacy anchors.
- Produces: a passing characterization gate that later refactors must preserve.

- [ ] **Step 1: Add passing characterization tests** that build the current site and hand-check literal expectations for all 47 lesson URLs, old `#backing-lab`, `#library`, `#roadmap` anchors, schema-2 fields, offline ZIP launcher, and the rule that mounting the page does not request media permission.
- [ ] **Step 2: Run `npm.cmd test`** and confirm 0 failures before behavior changes.
- [ ] **Step 3: Commit** only the tests with `test: characterize v1 public contracts`.

### Task 2: Introduce Progress Schema 3 and One Local-State Gateway

**Files:**
- Create: `src/js/progress-schema.js`
- Create: `src/js/local-state-store.js`
- Modify: `src/js/progress-store.js`
- Modify: `src/js/app.js`
- Modify: `src/js/lesson-page.js`
- Create: `tests/progress-schema.test.mjs`
- Create: `tests/local-state-store.test.mjs`
- Modify: `tests/progress-store.test.mjs`

**Interfaces:**
- Produces: `ProgressSchema.migrate(value)`, `ProgressSchema.projectPortable(snapshot)`, `ProgressSchema.parsePortable(text)`, and `LocalStateStore.create(storage, key).load()/save()/patch()`.
- Compatibility: `ProgressStore.normalize/exportJson/importJson` becomes a facade over the v3 schema while preserving existing callers.

- [ ] **Step 1: Write failing migration tests** with literal schema-1 and schema-2 fixtures; expect schema 3, preserved week/lessons/backing settings, 30/60/90/120 duration validation, empty v3 collections, and legacy completions without invented dates.
- [ ] **Step 2: Run `node --test tests/progress-schema.test.mjs`** and verify failure because the module is missing.
- [ ] **Step 3: Implement the pure migration and portable allowlist**, rejecting unknown versions and section-specific malformed values before mutation.
- [ ] **Step 4: Write and verify failing gateway tests** proving home and lesson-page patches preserve unknown v3 sections rather than whole-object overwrites.
- [ ] **Step 5: Implement the gateway and route both pages through it.** Keep old keys as rollback evidence, but stop reading them after a valid v3 state exists.
- [ ] **Step 6: Run targeted tests and `npm.cmd test`; commit** with `refactor: centralize schema v3 local state`.

### Task 3: Add Transactional IndexedDB Repositories and Transfer Boundary

**Files:**
- Create: `src/js/indexed-db-adapter.js`
- Create: `src/js/progress-repository.js`
- Create: `src/js/progress-transfer.js`
- Create: `tests/indexed-db-adapter.test.mjs`
- Create: `tests/progress-repository.test.mjs`
- Create: `tests/progress-transfer.test.mjs`

**Interfaces:**
- Produces: `IndexedDbAdapter.open({ indexedDB, name, version })`; repository stores `meta`, `sessions`, `attempts`, `skillObservations`, `reviewItems`, `customProgressions`, `recommendations`, `gearProfile`, and `recordings`.
- Produces: `ProgressTransfer.exportSnapshot(repository)` and `importSnapshot(repository, text, { mode })`, where mode is `merge` or `replace-metadata`; neither operation reads/writes recording blobs.

- [ ] **Step 1: Write failing adapter/repository tests** using an in-memory API-compatible test adapter that exercises transaction commit, abort, key uniqueness, and idempotent deterministic legacy IDs.
- [ ] **Step 2: Verify RED**, then implement database upgrade and repository operations with IndexedDB database version independent from portable schema version.
- [ ] **Step 3: Write failing transfer tests** proving invalid sections cause zero writes, recordings remain untouched, imported missing recording references become `audio-unavailable`, and output contains no Blob/base64/byte arrays.
- [ ] **Step 4: Implement allowlisted atomic transfer and fallback status** `storage-unavailable` without disabling the course/session shell.
- [ ] **Step 5: Run targeted/full tests; commit** with `feat: add private transactional progress storage`.

### Task 4: Build the Coach-First Hash-Routed Application Shell

**Files:**
- Create: `src/js/hash-router.js`
- Create: `src/js/app-shell.js`
- Create: `src/js/ui-components.js`
- Create: `src/js/today-view.js`
- Create: `src/js/session-view.js`
- Create: `src/js/studio-view.js`
- Create: `src/js/progress-view.js`
- Create: `src/js/roadmap-view.js`
- Modify: `src/js/app.js`
- Modify: `src/templates/index.html`
- Create: `src/assets/tokens.css`
- Create: `src/assets/app-shell.css`
- Create: `src/assets/components.css`
- Create: `src/assets/views.css`
- Modify: `src/assets/style.css`
- Create: `tests/hash-router.test.mjs`
- Modify: `tests/build.test.mjs`

**Interfaces:**
- Produces: routes `#/today`, `#/session`, `#/studio`, `#/progress`, `#/roadmap`, plus nested Studio routes; maps old anchors to the matching v2 destination.
- `app.js` becomes composition/bootstrap only; inactive views use `hidden` and leave the focus/accessibility tree.

- [ ] **Step 1: Write failing router tests** for default/unknown hash to Today, legacy mapping, nested Studio parsing, back/forward state, page title, focus target, and exactly one `aria-current="page"` nav item.
- [ ] **Step 2: Verify RED**, then implement the pure hash parser and browser router adapter.
- [ ] **Step 3: Add build-level failing expectations** for five destinations, a visible H1 per view, fixed mobile bottom navigation, desktop rail, and unchanged lesson URLs.
- [ ] **Step 4: Implement the approved coach-first shell** using semantic tokens, three surface levels, one amber primary action color, teal information states, restrained elevation, inline SVG icons with labels, safe-area phone padding, and a distraction-free Session route.
- [ ] **Step 5: Split current Backing/Chord/Roadmap bindings out of `app.js` without changing behavior.** Timer output is no longer a continuously updating live region; route focus and motion obey `prefers-reduced-motion`.
- [ ] **Step 6: Run tests/build/verify and responsive keyboard smoke checks; commit** with `feat: introduce coach-first application shell`.

### Task 5: Implement Transparent Recommendations and Exact Session Plans

**Files:**
- Create: `src/js/recommendation-engine.js`
- Create: `src/js/session-planner.js`
- Modify: `src/js/practice-engine.js`
- Create: `tests/recommendation-engine.test.mjs`
- Create: `tests/session-planner.test.mjs`
- Modify: `tests/practice-engine.test.mjs`

**Interfaces:**
- Produces: `RecommendationEngine.rank(context)` returning candidates with component scores and plain-language reasons.
- Produces: `SessionPlanner.plan({ durationMinutes, week, goals, candidates, seed })` with exact-total typed practice/rest blocks.
- The existing `PracticeEngine.buildSession()` delegates to planner compatibility defaults.

- [ ] **Step 1: Write failing literal tests** for stable ranking from weak skills/due reviews/course phase/goals, diversity penalty, at-most-two goals, and evidence-based reasons.
- [ ] **Step 2: Verify RED**, then implement deterministic ranking with no opaque aggregate exposed without components.
- [ ] **Step 3: Write failing plan tests** for exact 30/60/90/120 totals, rest totals 0/5/10/15, safe distribution, editable tempo/backing data, and seeded determinism.
- [ ] **Step 4: Implement minimal planning and compatibility facade.** No plan may contain negative/zero practice time or more than 35 minutes without a rest boundary.
- [ ] **Step 5: Run targeted/full tests; commit** with `feat: add transparent adaptive session plans`.

### Task 6: Implement the Guided Session State Machine and UI

**Files:**
- Create: `src/js/session-runner.js`
- Create: `src/js/session-controller.js`
- Modify: `src/js/today-view.js`
- Modify: `src/js/session-view.js`
- Modify: `src/js/app.js`
- Create: `tests/session-runner.test.mjs`
- Create: `tests/session-controller.test.mjs`

**Interfaces:**
- Produces: pure reducer `SessionRunner.transition(state, event, now)` for `START`, `TICK`, `PAUSE`, `RESUME`, `RESTART_BLOCK`, `SKIP`, `RATE`, `PAIN`, and `END`.
- Recovery serializes only the last completed boundary and restores paused; it never resumes timer, audio, input, or monitoring.

- [ ] **Step 1: Write failing state-machine tests** for final-ten-second state, pause/resume, rest transition, restart/skip/end, clean/shaky/failed rating, note limits, pain disabling ramp eligibility, and interruption recovery.
- [ ] **Step 2: Verify RED**, then implement the pure state machine with injected time.
- [ ] **Step 3: Write failing controller behavior tests** for Start within three actions, Resume strip, recommendation reason, edit/postpone/reject, active-block-only UI, explicit End, threshold-only announcements, and final review data.
- [ ] **Step 4: Implement Today and distraction-free Session flows** with native fieldsets/legends for goals and ratings, conservative audio defaults, and explicit player control.
- [ ] **Step 5: Run targeted/full tests, build and verify; commit** with `feat: add fully guided practice sessions`.

---

## Phase B â€” Shared Audio Runtime, Guitar Analysis, and Recording

### Task 7: Share the Audio Clock and Harden Lifecycle Cleanup

**Files:**
- Create: `src/js/audio-runtime.js`
- Modify: `src/js/audio-engine.js`
- Modify: `src/js/player-timeline.js`
- Modify: `tests/audio-state.test.mjs`
- Create: `tests/audio-runtime.test.mjs`

**Interfaces:**
- Produces one lazy `AudioRuntime.create(deps)` owning the AudioContext, exact audio clock, output graph, and scheduled subdivision timestamps.
- Transport payloads include scheduled `audioTime`; UI callback time is never used for timing scores.

- [ ] **Step 1: Write failing lifecycle/timestamp tests** for user-gesture creation, exact scheduled time, safe stopped state before start, cleanup after partial failure, no source callbacks after stop, and shared-clock consumers.
- [ ] **Step 2: Verify RED**, implement runtime injection, and refactor engine lifecycle without audible policy changes.
- [ ] **Step 3: Test background catch-up** so large clock jumps resynchronize instead of scheduling a burst of stale events.
- [ ] **Step 4: Run full tests; commit** with `refactor: share and harden the audio runtime`.

### Task 8: Implement Pitch Detection and Pure Signal Features

**Files:**
- Create: `src/js/pitch-detector.js`
- Create: `src/js/signal-features.js`
- Create: `tests/pitch-detector.test.mjs`
- Create: `tests/signal-features.test.mjs`

**Interfaces:**
- `PitchDetector.analyse(samples, sampleRate, calibration)` returns `{ status, frequency, note, cents, confidence, reason }`.
- `SignalFeatures.frame(samples, sampleRate)` returns RMS, peak/clipping ratio, zero-crossing rate, spectral flux inputs, high-band ratio, and onset candidate fields.

- [ ] **Step 1: Write failing hand-derived fixtures** for 82.41, 110, 220, and 440 Hz plus Â±25-cent offsets; silence/nois]9ó«h‘éì¶»§q«^vFòW6RFV6†æ–6–ã°¢Ò7G&–ærÖvVvR6†ævW2æB6WGW6öç6WVVæ6W3°¢Ò6–væÂÖ6†–âæö—6RæBw&÷VæF–ærG&÷V&ÆW6†ö÷F–æs°¢Ò–ç7G'VÖVçBÖ–çFVææ6RæB6fR7F÷&vRà ¤W†—7F–ær$sƒSs'F–6ÆW2Ö’&VÖ–â2&6†—fVBÖöFVÂW†×ÆW2Â'WBF†W’&Ræ÷BF†RV&Æ–2Æ–6F–öâw277VÖVB–ç7G'VÖVçBâW'6öæÂ6†'fVÂÂ–&æW¢Âç–Æöâ×7G&–ærÂ7G&–ærÖvVvRÂ6WGWÂW&6†6RÂæB6öÆÆV7F–öâæ÷FW2Æ—fR–âF†R÷F–öæÂÆö6ÂvV"&öf–ÆRæB&R–æ6ÇVFVBöæÇ’v†VâF†RÆ–W"FVÆ–&W&FVÇ’W‡÷'G2&öw&W72à ¢22"âFFÂ&—f7’ÂæB6fWG ¤v—D‡V"vW26W'fW27FF–2Æ–6F–öâf–ÆW2öæÇ’âF†RFVfVÇBÆ–6F–öâW&f÷&×2æòFVÆVÖWG'’ÂæÇ—F–72Â66÷VçB7&VF–öâÂ6Æ÷VB7–æ2ÂVF–òWÆöBÂW‡FW&æÂ’&WVW7BÂ÷"&6¶w&÷VæBÖ–7&÷†öæR7F—fF–öâà ¢Ò6ÖÆÂ&VfW&Væ6W2æB&W7VÖ&ÆR6W76–öâ7FFRW6RÆö6Å7F÷&vVà¢Ò6W76–öâ†—7F÷'’Â6¶–ÆÂö'6W'fF–öç2Â&Wf–Wr—FV×2ÂæB7W7FöÒ&öw&W76–öç2W6R–æFW†VDD"à¢ÒVF–ò&Æö'2W6R6W&FR–æFW†VDD"7F÷&Rà¢Ò6W'f–6R×v÷&¶W"66†W26öçF–âöæÇ’V&Æ–2Æ–6F–öâ76WG2à¢ÒW‡÷'B&WV—&W2W‡Æ–6—B7F–öâæB6ÆV&Ç’7FFW2v†WF†W"F†Rf–ÆR6öçF–ç2&öw&W72ÖWFFF÷"VF–òà¢Ò&W6WB†26W&FR6†ö–6W2f÷"&öw&W72Â&V6÷&F–æw2Â7W7FöÒ&öw&W76–öç2ÂvV"&öf–ÆRÂ÷"ÆÂÆö6ÂFFà ¥F†RÆ–6F–öâW6W27W÷'F—fRVGV6F–öæÂÆæwVvRâ–â&ö×G2Gf—6R7F÷–æræB6öç7VÇF–ærVÆ–f–VBGVÇB÷"†VÇF‚&öfW76–öæÂv†Vâ&÷&–FS²F†W’Fòæ÷BF–væ÷6R–æ§W&–W2â†V&–ærwV–Fæ6R&V6öÖÖVæG26öç6W'fF—fRÆWfVÇ2æB'&V·2v—F†÷WB6Æ–Ö–ærFòÖV7W&R6fR†VG†öæRÆ÷VFæW72à ¢222â66W76–&–Æ—G’æBöffÆ–æR&V†f–÷  ¤ÆÂfVGW&W2&R¶W–&ö&BÖ÷W&&ÆRæBW‡÷6Rf—6–&ÆRfö7W2ÂÆ&VÆÆVB6öçG&öÇ2ÂÆ—fR×&Vv–öâWFFW2F†BFòæ÷B6†GFW"öâWfW'’VF–òg&ÖRÂ&VGV6VBÖÖ÷F–öâ7W÷'BÂ†–v‚Ö6öçG&7BÖV7W&VÖVçB7FFW2ÂæBFW‡BWV—fÆVçG2f÷"w&‡2â6öÆ÷"—2æWfW"F†RöæÇ’72öf–Â6–væÂà ¥F†RwV–FVB'VææW"æBæÇ—6—2f–Ww2FBFò6ÖÆÂ67&VVç2Â'WB–çWBÖæÇ—6—26÷’æ÷FW2F†BÖö&–ÆR'&÷w6W"öFWf–6R7W÷'Bf&–W2âVç7W÷'FVBfVGW&W2f–Â–æF—f–GVÆÇ’æBÆVfRF†R&W7BöbF†RtgVæ7F–öæÂà ¥7FF–2ÆW76öç2Â6W76–öâÆææ–ærÂ6VÆb×&FVBwV–FVB6W76–öç2ÂF†V÷'’Væv–æW2Â6fVBÖWFFFÂæBvVæW&FVB&6¶–ærÆ"VF–òv÷&²öffÆ–æRgFW"f—'7B66†Râ'&÷w6W"–ç7FÆÆF–öâÂÖ–7&÷†öæRW&Ö—76–öâÂæBFWf–6RVçVÖW&F–öâföÆÆ÷rÆFf÷&Ò&WV—&VÖVçG2æB6ææ÷B&R&öÖ—6VBöâWfW'’VÖ&VFFVB'&÷w6W"à ¢22BâW'&÷"†æFÆ–æp ¤W'&÷'2&RÆö6ÂÂ7F–öæ&ÆRÂæB66÷VC  ¢ÒW&Ö—76–öâFVæ–VC¢W‡Æ–â†÷rFò&WG'’æB¶VWæöâÖ–çWB&7F–6Rf–Æ&ÆRà¢Ò–çWBF—66öææV7FVC¢7F÷æÇ—6—2Â&W6W'fR6ö×ÆWFVBÖV7W&VÖVçG2ÂæBöffW"&V6öææV7Bà¢ÒÆ÷r6öæf–FVæ6Rö6Æ—–æs¢7W&W7266÷&W2æB6†÷r6WGW6÷'&V7F–öç2à¢Ò&V6÷&F–ærVç7W÷'FVB÷"V÷FW†6VVFVC¢&W6W'fRÖWFFFv†Vâ÷76–&ÆRæBöffW"W‡÷'BöFVÆWFR7F–öç2à¢Ò6÷''WB–×÷'FVB¥4ôã¢&V¦V7B—Bv—F†÷WB×WFF–ær7W'&VçBFFæB–FVçF–g’F†R–çfÆ–B6V7F–öâà¢Ò–çFW''WFVB6W76–öã¢&W7F÷&RF†RÆ7B6ö×ÆWFVB&Æö6²æB6²&Vf÷&R&W7VÖ–ærà¢ÒVF–òVæv–æRf–ÇW&S¢7F÷66†VGVÆVB6÷W&6W2÷F–ÖW'2æB&WGW&â6öçG&öÇ2Fò6fR–FÆR7FFRà ¤æòW'&÷"WFöÖF–6ÆÇ’FVÆWFW2†—7F÷'’÷"&V6÷&F–æw2à ¢22RâFW7F–æræBfW&–f–6F–öà ¤WfW'’æWr&V†f–÷"föÆÆ÷w2&VBÖw&VVâ×&Vf7F÷"v—F‚æöFRw2'V–ÇBÖ–âFW7B'VææW"âW&RÖöGVÆW2&V6V—fRF—&V7BVæ—BFW7G2â'&÷w6W"Öf6–ærÖöGVÆW2&V6V—fRFWVæFVæ7’Ö–æ¦V7FVBf¶W2f÷"ÖVF–7G&V×2ÂVF–òg&ÖW2ÂÖVF–&V6÷&FW"Â–æFW†VDD"Â6Æö6·2ÂæBF–ÖW'2âFW7G26÷fW"&÷F‚7W÷'FVBæBVç7W÷'FVB'&÷w6W"F‡2à ¥&WV—&VBWFöÖFVB6÷fW&vR–æ6ÇVFW3  ¢ÒW†7BÖGW&F–öâÆç2Â&W7B–ç6W'F–öâÂ&F–æw2Â–çFW''WF–öâ&V6÷fW'’ÂæB–â×7F÷&V†f–÷#°¢ÒG&ç7&VçB&V6öÖÖVæFF–öâ&æ¶–æræBW6W"÷fW'&–FW3°¢Òg&WVVæ7’öæ÷FRö6VçG26öçfW'6–öâÂ6öæf–FVæ6R&V¦V7F–öâÂ&VæB÷f–'&Fò÷F–Ö–ærf—‡GW&W2ÂæBÖWG&–27W&W76–öã°¢ÒFWf–6RÆ–fV7–6ÆRæB6ö×ÆWFRÖVF–×G&6²6‡WFF÷vã°¢Ò&V6÷&F–ærÖWFFFÂV÷Ff–ÇW&RÂFVÆWF–öâ6öæf—&ÖF–öâ&÷VæF'’ÂæBW‡÷'B6W&F–öã°¢Òg&WF&ö&B÷6—F–öç2Â–çFW'fÂö6†÷&B×FöæRç7vW'2Â&Wf–Wr66†VGVÆ–ærÂæB&6¶–ærÆ"7–æ6‡&öæ—¦F–öã°¢Ò&öw&W76–öâfÆ–FF–öâÂöFBÖÖWFW"F–ÖVÆ–æW2ÂÆö÷–ærÂFV×ò&×2ÂæB–×÷'G3°¢Ò66†VÖó"Fò2Ö–w&F–öâÂ–çfÆ–B–×÷'B–Ö×WF&–Æ—G’Â6¶–ÆÂ7VÖÖ&–W2ÂæB&V6öÖÖVæFF–öâWf–FVæ6S°¢Ò&—f7’66ç2&÷f–æræòæWGv÷&²æÇ—F–72÷WÆöBF‚æBæòVF–ò–â&öw&W72¥4ôã°¢Ò'V–ÆBÂöffÆ–æR66†RÂ¤•6¶vRÂ'&ö¶VâÖÆ–æ²fW&–f–6F–öâÂ¶W–&ö&B6VÖçF–72ÂæB&VGV6VBÖÖ÷F–öâ&V†f–÷"à ¥&VÆV6RfW&–f–6F–öâ'Vç2F†R6ö×ÆWFRFW7B7V—FRÂ&öGV7F–öâ'V–ÆBÂöffÆ–æR6¶vRÂ6—FRfW&–f–W"ÂæB'&÷w6W"v–ç7BFW6·F÷æBæ'&÷rf–Ww÷'G2â&VÂÖFWf–6RÖçVÂ6†V6·26÷fW"uÓ#6VÆV7F–öâÂ6ÆVâÖæ÷FRFWFV7F–öâÂF—66öææV7B÷&V6öææV7BÂ&V6÷&F–ærÆ–&6²öW‡÷'BÂFVæ–VBW&Ö—76–öç2ÂöffÆ–æR&VÆöBÂæB7F÷&vR&W6WBà ¢22bâFVÆ—fW'’6WVVæ6P ¥F†Rv÷&²—2F—f–FVB–çFò–æFWVæFVçFÇ’FW7F&ÆR&VÆV6W2öâöæRc"'&æ6ƒ  £âf÷VæFF–öã¢æWræf–vF–öâ6†VÆÂÂ66†VÖc2Â–æFW†VDD"&÷VæF'’ÂæBÖ–w&F–öâà£"âwV–FVB6ö6ƒ¢ÆææW"Â&V6öÖÖVæFF–öâ&V6öç2Â'VææW"Â&W7G2Â&F–æw2Â&V6÷fW'’ÂæB&Wf–Wrà£2âwV—F"–çWC¢W&Ö—76–öâöFWf–6RÆ–fV7–6ÆRÂ6Æ–'&F–öâÂ—F6‚FWFV7F–öâÂæBÖV7W&VÖVçBÆ"à£Bâ&V6÷&F–ærÆ#¢Æö6Â&V6÷&F–ær7F÷&RÂÆ–&6²ÂW‡÷'BÂæBô"6ö×&—6öâà£Râg&WF&ö&BbV"G&–æW#¢ÆV&âõV—¢Â&Wf–WrVWVRÂF&vWB×FöæR–çFVw&F–öâÂæB÷F–öæÂ—F6‚ÖF6†–ærà£bâ&6¶–ærÆ"#¢7W7FöÒ&öw&W76–öç2ÂÖWFW'2Âw&ö÷fW2ÂÆö÷2Â&×2Â÷fW&Æ—2ÂæB÷'F&ÆR&W6WG2à£râ&öw&W72F6†&ö&C¢6¶–ÆÂÖöFVÂÂG&VæG2Â76W76ÖVçG2ÂæBFF—fRæW‡B×6W76–öâ&V6öÖÖVæFF–öç2à£‚âvV"b6WGWÆ#¢vVæW&–2V&Æ–2wV–FW2æB÷F–öæÂÆö6ÂW'6öæÂ&öf–ÆRà£’â–çFVw&F–öâæB&VÆV6S¢öffÆ–æR&V†f–÷"Â66W76–&–Æ—G’Â&W7öç6—fRÂFö7VÖVçFF–öâÂ&—f7’66âÂæBv—D‡V"vW2FWÆ÷–ÖVçBà ¤V6‚&VÆV6RÆVfW2F†RW†—7F–ær6÷W'6RW6&ÆRâæòÆFW"7V'7—7FVÒ—2ÆÆ÷vVBFòÖ¶RâV&Æ–W"7V'7—7FVÒFWVæBöâÖ–7&÷†öæRW&Ö—76–öâÂ&V6÷&F–ær7W÷'BÂ÷"æWGv÷&²6W'f–6Rà ¢22râW‡Æ–6—BæöâÔvöÇ2f÷"c  ¢Ò&VÆ–&ÆRöÇ—†öæ–26†÷&BG&ç67&—F–öâg&öÒ&ö6W76VBwV—F"6–væÂà¢ÒWFöÖF–2§VFvVÖVçBöbFöæRVÆ—G’ÂVÖ÷F–öâÂ7&VF—f—G’Â÷"v†WF†W"Æ––ær(	Ç6÷VæG2Æ–¶RwWF‡&–Rv÷fâî(	Ğ¢Ò6Æ÷VB66÷VçG2Â7&÷72ÖFWf–6R7–æ2Â6ö6–ÂfVVG2ÂV&Æ–2&V6÷&F–æw2ÂÆVFW&&ö&G2Â÷"FV6†W"Ö&¶WGÆ6W2à¢Ò6÷—&–v‡FVBF'2Â6öæw2Â6öÖÖW&6–Â&6¶–ærG&6·2Â÷"'F—7BVF–òà¢ÒÖVF–6ÂF–væ÷6—2ÂwV&çFVVB†V&–ær×6fWG’ÖV7W&VÖVçBÂ÷"&WÆ6VÖVçBf÷"â–â×W'6öâFV6†W"÷FV6†æ–6–âà¢ÒÖæFF÷'’Ö6†–æRÖÆV&æ–ærÖöFVÂ÷"W‡FW&æÂ’’à ¥F†W6R&÷VæF&–W2¶VWc"&—fFRÂVæFW'7FæF&ÆRÂöffÆ–æRÖ6&ÆRÂæB6†–Wf&ÆRv†–ÆRÆVf–ær&ööÒf÷"gWGW&R÷F–öæÂW‡W&–ÖVçG2à