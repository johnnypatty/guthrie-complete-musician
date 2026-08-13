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
- Stable note: at least 300 ms of accepted frames; bend target is valid within ±15 cents for 150 ms and uses a 250 ms final window.
- Vibrato: at least three cycles, 3-10 Hz rate, and 10-200 cents peak-to-peak width; values outside are reported as insufficient rather than scored.
- Onset refractory interval: 80 ms. String-noise output is always labelled experimental and never contributes more than 10% to a technique observation.

---

## Phase A — Foundation, Application Shell, and Guided Coach

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

## Phase B — Shared Audio Runtime, Guitar Analysis, and Recording

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

- [ ] **Step 1: Write failing hand-derived fixtures** for 82.41, 110, 220, and 440 Hz plus ±25-cent offsets; silence/noise/clipping/low-confidence must be insufficient with explicit reasons.
- [ ] **Step 2: Verify RED**, then implement windowing and autocorrelation/YIN-style difference scoring with bounded frequency search and no dependency.
- [ ] **Step 3: Write failing feature tests** for RMS, clipping ratio, onset refractory behavior, spectral-flux/high-band separation, and finite output for zero input.
- [ ] **Step 4: Implement minimal pure features, run targeted/full tests; commit** with `feat: add confidence-gated guitar signal features`.

### Task 9: Implement Performance Measurements

**Files:**
- Create: `src/js/performance-analyser.js`
- Create: `tests/performance-analyser.test.mjs`

**Interfaces:**
- Produces `PerformanceAnalyser.sustain(frames)`, `.bend(frames, targetCents)`, `.vibrato(frames)`, `.timing(onsets, scheduledTimes)`, `.noiseFloor(frames)`, and `.stringNoise(frames)`.
- Every result is `{ status: 'valid'|'insufficient', confidence, reason, ...rawMeasurements }`.

- [ ] **Step 1: Write failing literal frame fixtures** for stable sustain, 100-cent bend with/without overshoot, 5 Hz/60-cent vibrato, early/late onsets, calibrated noise floor, and broadband transients outside note windows.
- [ ] **Step 2: Verify RED**, then implement median/percentile and zero-crossing measurements using the frozen acceptance contracts.
- [ ] **Step 3: Add suppression tests** for too-short notes, fewer than three vibrato cycles, out-of-band rates, clipping, missing calibration, and low confidence.
- [ ] **Step 4: Run targeted/full tests; commit** with `feat: measure bends vibrato timing and signal clarity`.

### Task 10: Implement Explicit Guitar-Input Lifecycle and Calibration UI

**Files:**
- Create: `src/js/input-manager.js`
- Create: `src/js/analysis-controller.js`
- Create: `src/js/guitar-input-view.js`
- Modify: `src/js/studio-view.js`
- Modify: `src/js/app.js`
- Create: `tests/input-manager.test.mjs`
- Create: `tests/analysis-controller.test.mjs`

**Interfaces:**
- `InputManager.create({ mediaDevices, runtime, raf })` owns streams/tracks; `connect`, `selectDevice`, `disconnect`, `setMonitoring` expose typed states.
- Monitoring defaults disconnected/muted; recording may borrow a stream without owning/stopping it.

- [ ] **Step 1: Write failing media-device tests** proving mount makes zero permission calls, permission denied/no device/busy/disappeared states are isolated, and every track stops on disconnect, route change, pagehide, ended, and analysis failure.
- [ ] **Step 2: Verify RED**, implement explicit connect/select/calibrate/disconnect lifecycle and complete cleanup.
- [ ] **Step 3: Write controller tests** for GP-200 guidance, level/clipping/noise status, clean-preset advice, frame-throttled visual updates, non-chattering live regions, and rejected-score explanations.
- [ ] **Step 4: Implement Studio input lab and text-equivalent metric tiles.** Never connect input to destination unless the user enables warned monitoring.
- [ ] **Step 5: Run tests/build/verify; commit** with `feat: add private local guitar analysis lab`.

### Task 11: Implement Recording Store and A/B Comparison

**Files:**
- Create: `src/js/recording-store.js`
- Create: `src/js/recording-controller.js`
- Create: `src/js/recording-view.js`
- Modify: `src/js/studio-view.js`
- Modify: `src/js/progress-transfer.js`
- Create: `tests/recording-store.test.mjs`
- Create: `tests/recording-controller.test.mjs`

**Interfaces:**
- `RecordingStore.create(repository, storageManager)` stores blobs separately and reports usage pressure.
- `RecordingController.create({ MediaRecorder, clock, urlApi, store })` supports countdown, max-60-second take, stop, playback, export, confirmed delete, and sequential compare.

- [ ] **Step 1: Write failing store tests** for metadata/blob separation, 80%/50 MB warnings, quota failure, recording-reference export, and delete requiring confirmed intent.
- [ ] **Step 2: Verify RED**, then implement storage operations and never mutate blobs during progress import.
- [ ] **Step 3: Write failing controller tests** for unsupported recorder, MIME choice and actual returned MIME, countdown, manual/hard stop, borrowed-stream ownership, URL revocation, and sequential A/B playback.
- [ ] **Step 4: Implement local Recording Lab**, visible recording state, per-take audio export, attempt metadata, analysis summary, and reflection prompts.
- [ ] **Step 5: Run tests/build/verify; commit** with `feat: add local recording and comparison lab`.

---

## Phase C — Fretboard, Ear Training, and Backing Lab 2

### Task 12: Implement Fretboard and Review Engines

**Files:**
- Create: `src/js/fretboard-engine.js`
- Create: `src/js/review-scheduler.js`
- Create: `src/js/fretboard-view.js`
- Modify: `src/js/studio-view.js`
- Modify: `src/js/music-theory.js`
- Create: `tests/fretboard-engine.test.mjs`
- Create: `tests/review-scheduler.test.mjs`

**Interfaces:**
- Produces 78 standard-tuning positions with stable string/fret IDs and note/MIDI data; maps intervals, triads, sevenths, and current chord tones.
- Review scheduler accepts injected clock and fixed intervals `[1,3,7,14,30]` days.

- [ ] **Step 1: Write failing tests** for all 78 positions, open/12th octave invariants, enharmonic spelling, interval roots, triads, sevenths, thirds/sevenths, and current-backing overlays.
- [ ] **Step 2: Verify RED**, then implement the pure fretboard mapping and expose needed pitch-class helpers from MusicTheory.
- [ ] **Step 3: Write failing scheduler tests** for seeded quiz determinism, miss reset, correct interval advancement, due order, and immediate feedback explanations.
- [ ] **Step 4: Implement Learn/Quiz UI**, keyboard-accessible string/fret grid, visible/revealed modes, review queue, and non-color answer states.
- [ ] **Step 5: Run tests/build/verify; commit** with `feat: add interactive fretboard trainer`.

### Task 13: Implement Ear Training and Optional Pitch Matching

**Files:**
- Create: `src/js/ear-training-engine.js`
- Create: `src/js/ear-training-view.js`
- Modify: `src/js/studio-view.js`
- Create: `tests/ear-training-engine.test.mjs`

**Interfaces:**
- Produces deterministic note matching, interval, triad-quality, chord-tone singing, and short call-response prompts.
- Playback uses the shared runtime; answer flow always permits self-confirmation when input is unavailable.

- [ ] **Step 1: Write failing seeded tests** for prompt ranges, interval/triad answers, replay limits, answer explanations, and review-item creation.
- [ ] **Step 2: Verify RED**, implement pure prompt generation and answer evaluation.
- [ ] **Step 3: Implement generated-tone UI** with explicit Play, self-confirm fallback, and optional confidence-gated pitch matching.
- [ ] **Step 4: Run tests/build/verify; commit** with `feat: add adaptive ear training`.

### Task 14: Replace Beat Math with Explicit Meter and Progression Validation

**Files:**
- Modify: `src/js/player-timeline.js`
- Create: `src/js/progression-engine.js`
- Modify: `src/js/course-data.js`
- Modify: `tests/player-timeline.test.mjs`
- Create: `tests/progression-engine.test.mjs`

**Interfaces:**
- Timeline uses `PPQ=96` ticks and normalized meter `{ numerator, denominator, groups, tempoUnit }`.
- Progression engine validates curated/custom presets, loops, imports, and success-triggered tempo ramps.

- [ ] **Step 1: Write failing timeline tests** proving 7/8 `[2,2,3]` has 48 ticks/pulse, 336 ticks/bar, and 3.5 seconds/bar at eighth-note BPM 120; add 3/4, 5/4, grouping positions, right-open loops, and 40/240 boundaries.
- [ ] **Step 2: Verify RED**, implement integer-tick meter/timeline conversion while preserving compatibility for current tracks.
- [ ] **Step 3: Write failing progression tests** for bounds, supported qualities/grooves/meters, full-bar total, valid `Em7:2 Cmaj7:2 D:3` in 7/8, section/bar loops, no-mutation invalid import, and ramp/undo only after clean or valid timing evidence.
- [ ] **Step 4: Implement normalization and migrate curated tracks** to stable groove IDs, meters, groupings, tempo units, and seeds.
- [ ] **Step 5: Compile every curated track in tests; run full suite; commit** with `feat: add custom progressions and exact odd meter`.

### Task 15: Compile Musical Voicings, Bass Lines, and Eight Grooves

**Files:**
- Modify: `src/js/music-theory.js`
- Create: `src/js/voicing-engine.js`
- Create: `src/js/bass-arranger.js`
- Create: `src/js/groove-patterns.js`
- Create: `src/js/groove-engine.js`
- Create: `tests/voicing-engine.test.mjs`
- Create: `tests/bass-arranger.test.mjs`
- Create: `tests/groove-engine.test.mjs`

**Interfaces:**
- `MusicTheory.describeChord(symbol)` returns pitch classes and musical roles.
- Groove compiler emits sorted semantic events `{ tick, lane, instrument, durationTicks, notes, velocity, offsetSeconds, sourceEventIndex }`.

- [ ] **Step 1: Write failing chord/voicing tests** for Cmaj7-Am7-Dm7-G7 guide tones, range MIDI 48-76, deterministic cyclic voice-leading, common-tone retention, C13 priority, sus/power/diminished handling, and lower motion than root positions.
- [ ] **Step 2: Verify RED**, implement bounded candidate generation and cyclic dynamic-programming selection.
- [ ] **Step 3: Write failing bass tests** for range MIDI 28-52, slash-bass downbeats, group anchors, chromatic approaches, loop-first targeting, and bounded leaps; then implement.
- [ ] **Step 4: Write failing groove fixtures** for fusion, funk, rock, ballad, neo-soul, ambient, changes, and metronome-only; assert lane presence, canonical ticks, deterministic four-bar variation, 7/8 group accents, bounded swing/jitter, exact downbeats/chord boundaries, clipped fills, and no event beyond loop end.
- [ ] **Step 5: Implement data-driven grooves** with capped jitter `min(12 ms, 3% subdivision)`, ±5% velocity variation, exact structural events, and seeded output.
- [ ] **Step 6: Run targeted/full tests; commit** with `feat: compile musical backing arrangements`.

### Task 16: Render Rich Procedural Backing and Ship Backing Lab 2 UI

**Files:**
- Create: `src/js/synth-voices.js`
- Create: `src/js/backing-lab-view.js`
- Create: `tests/helpers/fake-audio-context.mjs`
- Modify: `src/js/audio-engine.js`
- Modify: `src/js/studio-view.js`
- Modify: `src/templates/index.html`
- Modify: `tests/audio-state.test.mjs`
- Create: `tests/synth-voices.test.mjs`

**Interfaces:**
- Synth voices render semantic events; AudioEngine schedules/loops/pauses/stops only and contains no harmony/groove decisions.
- Backing Lab editor supports custom progression, meter/grouping, eight grooves, section/bar loop, clean-triggered ramp, overlays, local presets, import/export, and mixer.

- [ ] **Step 1: Extend the fake audio context** to record node type, frequency, routing, automation, start/stop time, and buffers; write failing renderer tests for cached noise, bus routing, safe exponential values, voice normalization, feature fallback, and source cap.
- [ ] **Step 2: Verify RED**, implement cached procedural kick/snare/hats/click/tom, bass, pad/keys, optional short-room send, 25 Hz high-pass, conservative compressor/ceiling, smoothed mixer, and bounded cleanup.
- [ ] **Step 3: Write failing transport tests** for grouped count-in, one count-in per start/resume, loop boundary uniqueness, tempo update only at boundary, bar-safe resume, faded stop, immediate pagehide stop, and no background backlog burst.
- [ ] **Step 4: Refactor AudioEngine to consume compiled events**, preserving original curated play behavior through normalized presets.
- [ ] **Step 5: Implement the full Backing Lab 2 editor and overlays**, including correction messages and portable custom preset JSON.
- [ ] **Step 6: Run tests/build/verify and low-volume audible QA across grooves/meters; commit** with `feat: deliver Backing Lab 2 musical engine`.

---

## Phase D — Progress, Gear, Offline Integration, and Release

### Task 17: Implement Skill Model and Adaptive Progress Dashboard

**Files:**
- Create: `src/js/skill-model.js`
- Create: `src/js/progress-controller.js`
- Modify: `src/js/progress-view.js`
- Modify: `src/js/recommendation-engine.js`
- Create: `tests/skill-model.test.mjs`
- Create: `tests/progress-controller.test.mjs`

**Interfaces:**
- Skill model summarizes technique, rhythm, ear, harmony, improvisation, repertoire, and performance with evidence counts, confidence, latest, and 28-day rollup.
- Dashboard projections include text-equivalent tables for every visual trend.

- [ ] **Step 1: Write failing literal tests** for recency, evidence confidence, one-failure low-confidence behavior, baseline/latest, tempo-cleanliness and valid bend/vibrato/timing trends.
- [ ] **Step 2: Verify RED**, implement transparent weighting: self-rating 50%, assessment 30%, valid signal evidence 20%, with missing categories re-normalized rather than treated as zero.
- [ ] **Step 3: Write controller tests** for due reviews, unfinished repertoire, recommendation evidence, accept/edit/postpone/reject history, and accessible textual chart data.
- [ ] **Step 4: Implement Progress UI** with restrained charts, honest confidence labels, A/B links, and no streak/leaderboard/shame language.
- [ ] **Step 5: Run tests/build/verify; commit** with `feat: add transparent adaptive progress dashboard`.

### Task 18: Replace the Model-Specific Landing Area with Gear & Setup Lab

**Files:**
- Create: `src/js/gear-profile.js`
- Modify: `src/js/roadmap-view.js`
- Modify: `src/templates/index.html`
- Create: `content/12-gear-and-setup/used-guitar-inspection.md`
- Create: `content/12-gear-and-setup/floating-tremolo-setup.md`
- Create: `content/12-gear-and-setup/action-relief-intonation.md`
- Create: `content/12-gear-and-setup/string-gauge-changes.md`
- Create: `content/12-gear-and-setup/signal-noise-and-grounding.md`
- Create: `content/12-gear-and-setup/maintenance-and-storage.md`
- Create: `tests/gear-profile.test.mjs`
- Modify: `tests/content.test.mjs`

**Interfaces:**
- Public content is generic; existing RG8570 files remain archived examples.
- Optional local gear profile validates bounded text and exports only by deliberate progress export.

- [ ] **Step 1: Write failing profile/content tests** for validation, privacy-safe fields, export inclusion, generic public landing, and retained archived model links.
- [ ] **Step 2: Verify RED**, implement profile and focused educational guides without transaction/seller/private details.
- [ ] **Step 3: Render the Gear & Setup Lab** inside Roadmap with quick diagnostic paths and technician/safety boundaries.
- [ ] **Step 4: Run tests/build/privacy scan; commit** with `feat: add generic gear and setup lab`.

### Task 19: Complete Privacy, Accessibility, Offline, and Responsive Release Gates

**Files:**
- Modify: `scripts/lib/privacy.mjs`
- Modify: `scripts/verify.mjs`
- Modify: `src/templates/sw.js`
- Modify: `src/manifest.webmanifest`
- Modify: `src/assets/*.css`
- Modify: `README.md`
- Modify: `SECURITY.md`
- Modify: `tests/privacy.test.mjs`
- Modify: `tests/offline.test.mjs`
- Modify: `tests/build.test.mjs`
- Create: `tests/accessibility-contracts.test.mjs`
- Modify: `.github/workflows/validate.yml`

**Interfaces:**
- Publication gate runs tests, build, offline package, verification, privacy checks, and browser QA server checks.

- [ ] **Step 1: Write failing privacy tests** that scan application JS for unallowlisted `fetch`, XHR, WebSocket, sendBeacon, analytics domains/SDKs, uploads, automatic `getUserMedia`, bootstrap `MediaRecorder`, and audio serialization; allow only same-origin service-worker fetch behavior.
- [ ] **Step 2: Implement the scanner and correct findings** without blocking the service worker or explicit local file exports.
- [ ] **Step 3: Write failing accessibility/build tests** for five route landmarks, route H1/focus, native labelled controls, reduced motion, forced colors, live-region throttling, chart text equivalents, separate reset boundaries, all scripts precached, and no user-data/blob cache paths.
- [ ] **Step 4: Implement remaining responsive/a11y/offline corrections** and document that install/PWA/media support requires HTTP(S), while file ZIP keeps lessons/planning/self-rating/backing fallbacks.
- [ ] **Step 5: Run `npm.cmd test`, `npm.cmd run build`, `npm.cmd run package:offline`, and `npm.cmd run verify`; inspect exit codes and outputs.**
- [ ] **Step 6: Run desktop 1440×900, tablet 1024×768, phone 390×844, and compact phone 320×568 browser QA** for navigation, keyboard, focus, overflow, session distraction mode, denied media, storage fallback, offline reload, and conservative audio start.
- [ ] **Step 7: Commit** with `chore: enforce Practice Coach v2 release gates`.

### Task 20: Final Review and GitHub Publication

**Files:**
- Review: all changes from `origin/main` through branch HEAD.

**Interfaces:**
- Produces a reviewed branch, pushed remote branch, and ready pull request into `main`.

- [ ] **Step 1: Generate a complete diff/review package** and request an independent spec-compliance and code-quality review.
- [ ] **Step 2: Fix every Critical/Important finding with a failing regression test first**, rerun scoped/full verification, and request a scoped re-review.
- [ ] **Step 3: Re-read the approved spec line by line** and map each requirement to implementation evidence or report any honest limitation.
- [ ] **Step 4: Run the full publication gate fresh** and record exact test/build/verify results.
- [ ] **Step 5: Push `codex/practice-coach-v2` and open a ready pull request** summarizing features, privacy, verification, manual GP-200 checks still requiring the user's hardware, and rollback boundaries.
