# Practice Coach v2 Design

**Status:** Approved direction, written specification pending final review

**Date:** 2026-08-11
**Repository:** `johnnypatty/guthrie-complete-musician`

## 1. Goal

Turn Guthrie Complete Musician from a course and collection of practice tools into a calm, local-first practice coach. The application must guide an entire session, listen to a monophonic guitar signal from a GP-200 or microphone, help the player compare recordings, train fretboard and ear skills, recommend weak-area work, and preserve the existing course, Backing Lab, offline package, privacy guarantees, and static GitHub Pages deployment.

The coach supports musical independence rather than rewarding screen time. Recommendations prioritize timing, ear, phrasing, rests, motifs, call-and-response, transcription, target notes, clean technique, and tension-free playing.

## 2. Success Criteria

Practice Coach v2 is successful when a player can:

1. Open the app and start a 30, 60, 90, or 120 minute guided session in no more than three deliberate actions.
2. Complete the session one block at a time with clear instructions, tempo, optional Backing Lab configuration, rest cues, and self-ratings.
3. Select a GP-200 or microphone input only after pressing a permission button and see a useful monophonic pitch analysis without uploading audio.
4. Measure tuning, sustained-note stability, bend target error, vibrato rate/width/consistency, note-on timing, input noise floor, and a clearly labelled experimental string-noise indicator.
5. Record short attempts locally, compare two attempts, and attach tempo, exercise, and self-rating metadata.
6. Practise notes, intervals, triads, and chord tones on an E A D G B E fretboard through fret 12 in Learn and Quiz modes.
7. Create a custom progression, choose a supported groove and meter, loop a section, ramp tempo, and view chord tones on the fretboard.
8. Review a transparent skill dashboard and accept, edit, or reject the next recommended session.
9. Export and import portable progress JSON while recordings remain separate, explicitly exported audio files.
10. Install and use the core application offline after its first successful load.

## 3. Chosen Product Direction

### Coach-first home with complete Studio and Roadmap

The default route is **Today**. It presents one primary recommendation, a short reason for that recommendation, a Resume/Start action, and the most recent review item. The coach proposes; the player remains in control and may edit duration, focus, tempo, or exercises before accepting.

The other primary destinations are:

- **Session:** the focused, full-screen guided-session runner.
- **Studio:** Guitar Input, Recording Lab, Backing Lab 2, Fretboard & Ear Trainer, and Chord Lab.
- **Progress:** skill matrix, attempt history, comparisons, weekly trends, and review queue.
- **Roadmap:** the existing 24-week course, searchable lesson library, assessments, and Gear & Setup Lab.

Desktop uses a compact top/side navigation. Small screens use a bottom navigation and a distraction-free session runner. The current static lesson URLs remain valid.

## 4. Architecture

The implementation remains a dependency-light static application built with Node.js scripts and browser JavaScript. No server, account, analytics service, cloud model, or mandatory network API is introduced.

New behavior is split into focused modules:

- `session-planner`: creates editable plans from duration, course week, goals, recent ratings, and weak skills.
- `session-runner`: owns block order, timers, rests, pause/resume, ratings, and recovery after reload.
- `recommendation-engine`: scores candidate skills using recent attempts, due reviews, course phase, and user choices; it returns human-readable reasons.
- `input-manager`: requests permission, lists available audio inputs after permission, chooses a device, manages tracks, and stops every track when analysis ends.
- `pitch-detector`: converts analyser frames into fundamental frequency, note, and cents with confidence gating.
- `performance-analyser`: derives sustain, bend, vibrato, onset-timing, noise-floor, and experimental string-noise metrics from time-stamped pitch/amplitude frames.
- `recording-store`: stores recording blobs and metadata in IndexedDB, reports quota failures, supports playback/comparison, and deletes only after confirmation.
- `fretboard-engine`: maps standard tuning and frets 0-12 to notes, intervals, triads, and chord tones and schedules missed prompts.
- `progression-engine`: validates custom chord events, meters, sections, loops, grooves, and tempo ramps before passing them to the existing audio engine.
- `skill-model`: normalizes attempts and calculates transparent, bounded skill summaries.
- `gear-profile`: stores optional personal instrument/setup notes locally and keeps public course content generic.

Pure calculation modules use the existing UMD-style pattern so Node's built-in test runner can exercise the real browser-independent code. Browser capability modules receive Web Audio, media, storage, clock, and timer dependencies through small interfaces so failures can be tested without pretending a real GP-200 exists in CI.

## 5. Guided Session

### Planning

The player selects duration, current week, and up to two goals. Supported first-release goals are technique, rhythm, ear, harmony, improvisation, repertoire, and performance. The planner proposes blocks whose minutes add exactly to the selected duration, including short rests for sessions of 60 minutes or longer.

The recommendation engine uses:

- the lowest recent skill confidence;
- exercises rated `shaky` or `failed`;
- review items whose due date has arrived;
- the active four-week course cycle;
- the player's selected goals;
- a diversity penalty so the same block is not repeated unnecessarily.

Every recommendation includes a plain-language reason such as, “Bend accuracy was shaky twice this week, so today begins with slow target bends.” There are no opaque scores, streak punishments, or claims that the software can replace a teacher.

### Running

Only one block is active at a time. A block contains a title, outcome, concise instructions, duration, tempo, backing configuration, analysis mode, and safety cue. Controls are Start, Pause, Resume, Skip, Restart block, and End session.

The runner announces the final ten seconds visually, moves into scheduled rests, and never auto-starts microphone access or loud audio. Page reload restores an unfinished session from its most recent completed block; it does not resume a running timer or microphone automatically.

After each block the player selects `clean`, `shaky`, or `failed`, may add a short note, and answers a tension/pain check. Any pain response ends speed-ramping recommendations for the rest of that session and presents a stop/rest message rather than medical advice.

The final review shows planned versus completed minutes, ratings, tempos, analysis summaries, recordings, one improvement, and one next-session recommendation.

## 6. Local Guitar Input and Analysis

### Permission and calibration

Input begins only after the player presses **Connect guitar input**. The app explains that browser permission is required, recommends selecting the GP-200's USB input, and provides microphone fallback instructions. It displays the chosen input, input level, clipping status, noise floor, and a calibration step using one clean sustained note.

The app never routes the live input to speakers by default, preventing feedback. Monitoring may be enabled explicitly with a warning and starts muted. Every media track is stopped on Disconnect, route change, page hide, or analysis failure.

### Analysis scope

The first release analyses one clearly played note at a time. It does not claim reliable polyphonic chord transcription, amp-tone grading, musical-taste grading, or note-name accuracy under heavy distortion, octave effects, delay, chorus, or loud backing audio.

The interface asks the player to use a clean or lightly driven GP-200 preset, disable time-based effects, and keep backing audio out of the analysed input. Low-confidence frames are shown as “No stable note” rather than forced into a misleading answer.

Metrics are:

- **Tuning:** detected note and cents offset after confidence and level gates.
- **Sustain stability:** median absolute cents deviation during the stable portion of a note.
- **Bend accuracy:** final stable pitch error from a selected 50, 100, 150, or 200 cent target; overshoot and settling time are also reported.
- **Vibrato:** median rate in hertz, peak-to-peak width in cents, and cycle consistency after the note centre is removed.
- **Timing:** nearest metronome subdivision error in milliseconds for detected note onsets, with early/late direction.
- **Noise floor:** calibrated RMS level when the player is not intentionally playing.
- **String-noise indicator:** an experimental ratio of short broadband transients outside intended note windows. It is presented as a clue to review the recording, not a definitive technique score.

Scores are never shown when input confidence, duration, or calibration quality is insufficient. The raw measurement and why a measurement was rejected remain visible.

## 7. Recording and Comparison Lab

Recording uses `MediaRecorder` when the browser supports the selected input format. A recording starts only after an explicit button press and visible countdown. The default maximum take is 60 seconds; the player may stop earlier.

Each saved attempt contains:

- a generated local identifier and timestamp;
- exercise/block identifier and optional lesson link;
- duration, tempo, key, and backing-track identifier;
- self-rating and note;
- available analysis summary;
- browser-selected audio MIME type and blob.

Metadata and blobs are stored in IndexedDB. The app shows estimated local storage use, warns before quota pressure, and offers explicit deletion and per-take audio export. Progress JSON contains recording metadata references but never embeds audio blobs. Importing progress cannot overwrite recordings silently.

Comparison mode supports two local takes with independent play buttons, common metadata, pitch/timing summaries, and reflection prompts. Playback is sequential rather than simultaneous to avoid volume and phase confusion.

If `MediaRecorder`, IndexedDB, or microphone permission is unavailable, the rest of the course, guided session, self-ratings, and Backing Lab remain usable.

## 8. Fretboard and Ear Trainer

The trainer renders standard tuning E A D G B E from open strings through fret 12. It has two top-level modes:

- **Learn:** reveal note names, intervals from a chosen root, triad tones, seventh-chord tones, or current Backing Lab chord tones.
- **Quiz:** click a requested position, name a displayed position, locate all instances of a target note/interval, or target the third/seventh of the current chord.

Quiz answers provide immediate feedback and a short musical explanation. Missed prompts enter a local review queue with increasing intervals after correct reviews. The scheduler is deterministic, simple, and inspectable rather than branded as scientifically exact spaced repetition.

Ear exercises cover note matching, interval direction/quality, triad quality, chord-tone singing, and short call-and-response. Generated tones use the existing Web Audio foundation. Microphone pitch matching is optional; every exercise remains possible by self-confirmation when input analysis is unavailable.

## 9. Backing Lab 2

The existing original synthesized backing engine remains the sound source. Backing Lab 2 adds:

- a progression editor with chord, beats, and section fields;
- validation through the existing chord parser and supported qualities;
- 4/4, 3/4, 5/4, and 7/8 meters;
- fusion, funk, rock, ballad, neo-soul, ambient, changes, and metronome-only grooves;
- full, section, or selected-bar looping;
- optional tempo ramps after a chosen number of successful repetitions;
- fretboard overlays for roots, all chord tones, thirds/sevenths, or a chosen scale color;
- local save, duplicate, rename, JSON export, and JSON import for custom progressions.

Custom data is sanitized text and bounded numbers. The editor rejects unknown chord qualities, empty progressions, non-positive beat counts, unsupported meters, excessively long progressions, and tempo outside 40-240 BPM with a specific correction message.

Tempo never increases solely because time elapsed. It increases only when the player marks the repetition clean or an enabled, confidence-qualified timing exercise meets its threshold. The player can undo a ramp immediately.

## 10. Progress and Adaptation

Progress schema v3 adds session history, attempt summaries, skill observations, review items, custom progression metadata, accepted/rejected recommendations, and a local gear profile while preserving migration from schemas 1 and 2.

The seven skill areas are technique, rhythm, ear, harmony, improvisation, repertoire, and performance. Each displayed skill summary combines recent self-ratings, completed assessments, valid signal measurements, and recency. It includes its evidence count and a confidence label so one failed exercise cannot masquerade as a precise verdict.

The dashboard shows:

- the latest and four-week rolling view for each skill;
- baseline versus latest assessment;
- tempo and cleanliness trends for repeated exercises;
- bend, vibrato, and timing trends when enough valid samples exist;
- due reviews and unfinished repertoire;
- recommendation reasons and controls to accept, edit, postpone, or reject.

The system does not use competitive leaderboards, public profiles, streak loss, or shame language.

## 11. Gear & Setup Lab

The public RG8570-specific landing section becomes **Gear & Setup Lab**. It links to generic, reusable guides for:

- inspecting a new or used guitar;
- floating-tremolo string changes and balance;
- action, relief, intonation, pickup height, and when to use a technician;
- string-gauge changes and setup consequences;
- signal-chain noise and grounding troubleshooting;
- instrument maintenance and safe storage.

Existing RG8570 articles may remain as archived model examples, but they are not the public application's assumed instrument. Personal Charvel, Ibanez, nylon-string, string-gauge, setup, purchase, and collection notes live in the optional local gear profile and are included only when the player deliberately exports progress.

## 12. Data, Privacy, and Safety

GitHub Pages serves static application files only. The default application performs no telemetry, analytics, account creation, cloud sync, audio upload, external AI request, or background microphone activation.

- Small preferences and resumable session state use `localStorage`.
- Session history, skill observations, review items, and custom progressions use IndexedDB.
- Audio blobs use a separate IndexedDB store.
- Service-worker caches contain only public application assets.
- Export requires explicit action and clearly states whether the file contains progress metadata or audio.
- Reset has separate choices for progress, recordings, custom progressions, gear profile, or all local data.

The application uses supportive educational language. Pain prompts advise stopping and consulting a qualified adult or health professional when appropriate; they do not diagnose injuries. Hearing guidance recommends conservative levels and breaks without claiming to measure safe headphone loudness.

## 13. Accessibility and Offline Behavior

All features are keyboard-operable and expose visible focus, labelled controls, live-region updates that do not chatter on every audio frame, reduced-motion support, high-contrast measurement states, and text equivalents for graphs. Color is never the only pass/fail signal.

The guided runner and analysis views adapt to small screens, but input-analysis copy notes that mobile browser/device support varies. Unsupported features fail individually and leave the rest of the PWA functional.

Static lessons, session planning, self-rated guided sessions, theory engines, saved metadata, and generated Backing Lab audio work offline after first cache. Browser installation, microphone permission, and device enumeration follow platform requirements and cannot be promised on every embedded browser.

## 14. Error Handling

Errors are local, actionable, and scoped:

- Permission denied: explain how to retry and keep non-input practice available.
- Input disconnected: stop analysis, preserve completed measurements, and offer reconnect.
- Low confidence/clipping: suppress scores and show setup corrections.
- Recording unsupported or quota exceeded: preserve metadata when possible and offer export/delete actions.
- Corrupt imported JSON: reject it without mutating current data and identify the invalid section.
- Interrupted session: restore the last completed block and ask before resuming.
- Audio engine failure: stop scheduled sources/timers and return controls to a safe idle state.

No error automatically deletes history or recordings.

## 15. Testing and Verification

Every new behavior follows red-green-refactor with Node's built-in test runner. Pure modules receive direct unit tests. Browser-facing modules receive dependency-injected fakes for media streams, audio frames, MediaRecorder, IndexedDB, clocks, and timers. Tests cover both supported and unsupported browser paths.

Required automated coverage includes:

- exact-duration plans, rest insertion, ratings, interruption recovery, and pain-stop behavior;
- transparent recommendation ranking and user overrides;
- frequency/note/cents conversion, confidence rejection, bend/vibrato/timing fixtures, and metric suppression;
- device lifecycle and complete media-track shutdown;
- recording metadata, quota failure, deletion confirmation boundary, and export separation;
- fretboard positions, interval/chord-tone answers, review scheduling, and Backing Lab synchronization;
- progression validation, odd-meter timelines, looping, tempo ramps, and imports;
- schema 1/2 to 3 migration, invalid import immutability, skill summaries, and recommendation evidence;
- privacy scans proving no network analytics/upload path and no audio in progress JSON;
- build, offline cache, ZIP package, broken-link verification, keyboard semantics, and reduced-motion behavior.

Release verification runs the complete test suite, production build, offline package, site verifier, and browser QA against desktop and narrow viewports. Real-device manual checks cover GP-200 selection, clean-note detection, disconnect/reconnect, recording playback/export, denied permissions, offline reload, and storage reset.

## 16. Delivery Sequence

The work is divided into independently testable releases on one v2 branch:

1. Foundation: new navigation shell, schema v3, IndexedDB boundary, and migration.
2. Guided Coach: planner, recommendation reasons, runner, rests, ratings, recovery, and review.
3. Guitar Input: permission/device lifecycle, calibration, pitch detection, and measurement lab.
4. Recording Lab: local recording store, playback, export, and A/B comparison.
5. Fretboard & Ear Trainer: Learn/Quiz, review queue, target-tone integration, and optional pitch matching.
6. Backing Lab 2: custom progressions, meters, grooves, loops, ramps, overlays, and portable presets.
7. Progress Dashboard: skill model, trends, assessments, and adaptive next-session recommendations.
8. Gear & Setup Lab: generic public guides and optional local personal profile.
9. Integration and release: offline behavior, accessibility, responsive QA, documentation, privacy scan, and GitHub Pages deployment.

Each release leaves the existing course usable. No later subsystem is allowed to make an earlier subsystem depend on microphone permission, recording support, or a network service.

## 17. Explicit Non-Goals for v2

- Reliable polyphonic chord transcription from a processed guitar signal.
- Automatic judgement of tone quality, emotion, creativity, or whether playing “sounds like Guthrie Govan.”
- Cloud accounts, cross-device sync, social feeds, public recordings, leaderboards, or teacher marketplaces.
- Copyrighted tabs, songs, commercial backing tracks, or artist audio.
- Medical diagnosis, guaranteed hearing-safety measurement, or replacement for an in-person teacher/technician.
- A mandatory machine-learning model or external AI API.

These boundaries keep v2 private, understandable, offline-capable, and achievable while leaving room for future optional experiments.
