# Guitar Reference Delivery Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each linked plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved Guitar Reference redesign as a sequence of independently testable, reversible releases without losing Practice Coach data or weakening the project's privacy, offline, accessibility, and evidence standards.

**Architecture:** Retain the dependency-light static-site architecture: browser IIFEs expose frozen `globalThis` APIs, pure modules own musical and search logic, Node 22 build modules validate and generate public indexes, and browser adapters own storage, Web Audio, media input, and routing. The work is split into a safe product foundation followed by research, theory, backing-track, guitarist, gear, and integration plans; each plan must leave a working static site and pass its own release gate.

**Tech Stack:** Node.js 22+, Node built-in test runner, static HTML/CSS/JavaScript, Web Audio API, MediaDevices, MediaRecorder, IndexedDB, localStorage, service worker, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-13-guitar-reference-redesign.md`

## Global Constraints

- The public product name is **Guitar Reference** and the exact credit line is *An open guitar toolkit by johnnypatty*.
- The product is a neutral toolkit and reference, not a coach; no adaptive plans, prescribed sessions, streaks, weakness rankings, or judgement language may remain on active routes.
- Primary navigation is **Tools**, **Backing Tracks**, **Guitarists**, **Gear**, and **Theory**; Home is reachable through the brand and universal search.
- Preserve every current `lessons/<slug>.html` URL and convert its chrome to an unguided reference article.
- Preserve existing recordings, custom progressions, gear/setup notes, meaningful settings, and raw Practice Coach source data until the user explicitly deletes a verified legacy archive.
- Never rename, upgrade, clear, or duplicate the `gcm-private-v3` recording database during the Foundation migration.
- No mandatory account, analytics, telemetry, cloud sync, background microphone activation, or audio upload.
- Live YouTube discovery is optional, browser-local, visibly unverified, and must never expose a key in generated files, logs, exports, or repository data.
- No YouTube ripping or copyrighted backing-track download feature; download links require a recorded legitimate creator/rights-holder source.
- Public research claims require claim-level source metadata and review state; unknown and disputed values remain explicit.
- Images require documented provenance, compatible reuse permission, attribution, responsive derivatives, and sufficient native resolution.
- Theory output is formula-derived, letter-aware, ambiguity-preserving, and exhaustively tested across supported tonics and instrument settings.
- Both Modern Luthier themes target WCAG 2.2 AA, full keyboard operation, visible focus, reduced motion, text-equivalent musical diagrams, 44px primary mobile targets, and no page overflow at 320 CSS pixels.
- The application remains a static GitHub Pages site and a useful `file://` offline package with no runtime dependency requirement.
- `public/**` is generated output: never hand-edit it; regenerate it through the build and package commands.
- Never stage the untracked `.superpowers/` visual-workshop directory.
- Every behavior change follows red-green-refactor and ends with focused tests, the full suite, build, offline package, verifier, `git diff --check`, and an intentional commit.

---

## Plan Sequence

### Plan 00 — Product Foundation

**Plan:** `docs/superpowers/plans/2026-08-13-guitar-reference-foundation.md`

**Goal:** Preserve all local data, establish Guitar Reference storage and legacy archive boundaries, deliver the Modern Luthier shell and themes, remount neutral tools, remove active coach behavior, convert existing lessons to reference articles, add the first universal-search contract, and close identity/offline/Pages compatibility.

**Prerequisites:** Approved redesign specification at `docs/superpowers/specs/2026-08-13-guitar-reference-redesign.md`.

**Exit gate:** A complete neutral Guitar Reference foundation is deployable; all legacy URLs and active user data are preserved; coach history is read-only/exportable; the original source storage remains untouched by default; all release commands pass.

### Plan 01 — Research Data Contracts and Static Indexes

**Planned file:** `docs/superpowers/plans/2026-08-13-01-research-platform.md`

**Goal:** Define and validate versioned source, claim, media, correction, entity, relationship, and review-state records, then generate deterministic offline JSON and JavaScript indexes.

**Core outputs:**

- `scripts/lib/research-schema.mjs`
- `scripts/lib/research-index.mjs`
- `content/data/manifest.json`
- `content/data/sources/`, `media/`, and `corrections/`
- `public/data/reference-index.json`
- `public/js/reference-index.js` exposing frozen `globalThis.GuitarReferenceData`

**Prerequisites:** Plan 00.

**Exit gate:** Duplicate/missing IDs, broken relationships, reviewed claims without sufficient source metadata, and media without rights metadata fail with exact record/field paths. No editorial count is hard-coded before records validate.

### Plan 02 — Theory Engine, Workspace, and Core Tools

**Planned file:** `docs/superpowers/plans/2026-08-13-02-theory-workspace.md`

**Goal:** Build the letter-aware pitch/formula model, configurable instruments/fretboard, identifiers, harmony analysis, candidate fingerings, unified semantic audio, connected Theory Workspace, standalone metronome, and neutral tuner/measurement tools.

**Required reviewer-sized gates inside the detailed plan:**

1. Pure `PitchModel`/`TheoryFormulas` plus compatibility `MusicTheory` facade.
2. `InstrumentSettings`, generalized `FretboardEngine`, and candidate fingerings.
3. Neutral `ProgressionModel`/compatibility `ProgressionEngine`, identifiers, and harmony analysis with explicit ambiguity; progression output shares the same pitch/formula spelling contracts used by search and audio.
4. One shared audio transport: `AudioEngine.create({ runtime, rendererFactory })`, `TheoryAudio`, and semantic event scheduling that preserves `PlayerTimeline`/`GrooveEngine` behavior and proves one context plus complete shutdown.
5. Connected Theory Workspace state/view.
6. Standalone metronome, sample-rate-correct tuner/input measurement, and neutral recording metadata.

Each gate gets its own detailed-plan task/commit and can be reviewed or rejected independently; Plan 02 is a workstream label, not permission for one oversized implementation task.

**Prerequisites:** Plan 00. Research Plan 01 may run in parallel because the pure theory engine does not consume editorial claims.

**Exit gate:** Property tests cover every supported tonic, accidental requirement, formula, 4–9 strings, 12–36 frets, custom tuning, capo, handedness/orientation, diagram/audio MIDI agreement, ambiguity, constraints, metronome grouping, tuner sample rate, and lifecycle shutdown.

### Plan 03 — Reference Library, Sources, and Corrections

**Planned file:** `docs/superpowers/plans/2026-08-13-03-reference-library.md`

**Goal:** Connect the 53 preserved URLs and Foundation governance placeholders to the research platform, populate/validate source, media-attribution, correction, privacy, and license records, fact-check substantive theory/artist/setup claims, and keep citations beside the facts they support.

**Prerequisites:** Plans 00 and 01. General source/media/correction work can proceed after these; theory claims cannot reach `reviewed` until the relevant Plan 02 pure theory/progression gate passes.

**Exit gate:** Every old URL remains; public article metadata is neutral; source, attribution, and corrections pages work offline; reviewed claims cannot be rendered without valid records.

### Plan 04 — Hybrid Backing Track Finder

**Planned file:** `docs/superpowers/plans/2026-08-13-04-backing-track-finder.md`

**Goal:** Separate the offline generated Backing Lab from a search-first verified external-track index, add structured musical filters and natural-language inference, add a dated Backing Track Sources directory, and provide direct YouTube search before any optional API mode.

**Required reviewer-sized gates inside the detailed plan:**

1. Neutral local `BackingData`/Backing Lab over Plan 02's injected audio transport; preserve IDs and musical event data while reviewing editorial claims.
2. Versioned external track/source schemas, coverage report, and filters consuming Plan 02's pure pitch/formula/progression contracts for keys, modes, enharmonics, and chord events.
3. `BackingTrackSearch.parseQuery()/filter()`, accessible Finder UI, and exact `canonicalYouTubeQueryUrl()` fallback.
4. Optional isolated `YouTubeDiscovery` only after the no-key finder is complete.

**Prerequisites:** Plans 00 and 01. Local audio consumes the Plan 02 shared-audio gate; track schema/search consumes the Plan 02 pure theory/progression gates without waiting for its full UI.

**Exit gate:** Every specified filter and evidence state is tested; unknown data is excluded rather than invented; built-in results remain available offline; legitimate downloads require validated permission; live results stay visibly separate and unverified.

### Plan 05 — Guitarist Directory and Source-Led Profiles

**Planned file:** `docs/superpowers/plans/2026-08-13-05-guitarist-directory.md`

**Goal:** Build transparent directory search and profile pages with review states, dated rig/instrument/accessory snapshots, technique/media references, disputes, licensed imagery, and a balanced reviewed launch cohort.

**Required reviewer-sized gates:** directory/entity contracts and search; one fully sourced profile UI; reviewed launch cohort expansion. Do not combine schema, profile chrome, and a large editorial cohort in one task.

**Prerequisites:** Plans 00, 01, and 03.

**Exit gate:** Unknown fields never mean non-use; profiles never merge incompatible eras into fictitious rigs; at least one complete reviewed profile demonstrates claim-level citations, dated context, dispute handling, and media attribution before cohort expansion.

### Plan 06 — Gear Records, Artist-Use Claims, and Comparison

**Planned file:** `docs/superpowers/plans/2026-08-13-06-gear-explorer.md`

**Goal:** Model product specifications separately from time-qualified artist-use claims, then deliver category filters, signature/prototype relationships, artist-use timelines, factual details, and comparison.

**Required reviewer-sized gates:** gear/source record validation; artist-use relationship validation; Explorer/filter/detail UI; factual comparison UI. Each is a separate detailed-plan task/commit.

**Prerequisites:** Plans 00 and 01; artist-use relationships require Plan 05 profile contracts.

**Exit gate:** Specifications never imply artist use, use claims require date/context/source, unknown/disputed values are honest, and the UI contains no retailer ranking, price urgency, affiliate behavior, or unsupported endorsement.

### Plan 07 — Universal Integration, Accessibility, Offline, and Release

**Planned file:** `docs/superpowers/plans/2026-08-13-07-integration-release.md`

**Goal:** Aggregate finished tools, theory entities, tracks, articles, guitarists, and gear under one local universal search; complete cross-domain themes/accessibility; verify migration/privacy; and close the production release.

**Prerequisites:** Required portions of Plans 01–06. Optional live YouTube discovery and later content cohorts may remain deferred without blocking a complete offline-first release.

**Exit gate:**

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run package:offline
npm.cmd run verify
git diff --check
```

Manual QA must also confirm both themes and keyboard behavior at 320px, tablet, desktop, and ultrawide sizes; repository base-path routing; direct legacy article URLs; microphone/recording shutdown; cached offline behavior; and extracted ZIP behavior through `START HERE.html`.

---

## Dependency Graph

```text
00 Foundation
├── 01 Research Platform ──┬── 03 Reference Library
│                          ├── 04 Backing Track Finder
│                          ├── 05 Guitarists ──┐
│                          └───────────────────┼── 06 Gear
├── 02 Theory Workspace ─────── 04 Backing Lab audio integration
└──────────────────────────────────────────────┐

01 + 02 + 03 + 04 + 05 + 06 ──────────────── 07 Integration and Release
```

## Planning Rule for Later Workstreams

Before implementing Plans 01–07, write the named plan as a complete `superpowers:writing-plans` document with exact files, interfaces, literal tests, red/green commands, and commit boundaries. Do not expand a workstream directly from this roadmap: the roadmap fixes dependency and scope boundaries, while each detailed plan fixes its implementation contract.
