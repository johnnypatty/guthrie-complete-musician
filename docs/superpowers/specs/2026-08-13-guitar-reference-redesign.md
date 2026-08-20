# Guitar Reference Redesign

**Status:** Approved product and visual direction; written specification for final user review

**Date:** 2026-08-13

**Repository:** `johnnypatty/guthrie-complete-musician`

**Public product name:** **Guitar Reference**

**Credit line:** *An open guitar toolkit by johnnypatty*

## 1. Purpose

Replace the current Practice Coach product with a neutral, professional guitar toolkit and source-led reference website.

Guitar Reference must help a guitarist:

- explore chords, scales, arpeggios, progressions, intervals, tunings, and fretboard relationships;
- find useful backing tracks by musical properties rather than by browsing playlists;
- research guitarists and their era-specific instruments, rigs, accessories, techniques, and media;
- search equipment and follow documented relationships between players and gear;
- use practical tools such as a tuner, metronome, recorder, signal analysis, and locally generated backing tracks;
- inspect the evidence behind editorial claims and correct errors openly.

The product is not a coach. It must not prescribe practice, generate adaptive plans, shame missed work, score taste, or pretend to know what a player should learn next.

## 2. Success Criteria

The redesign succeeds when:

1. The default page presents one universal search and gets a visitor to any primary tool or reference area in one deliberate action.
2. No primary route, heading, empty state, notification, or metadata describes the product as a coach or presents a recommended practice plan.
3. A visitor can find a backing track by key, mode, progression, BPM, meter, style, mood, duration, difficulty, channel, or guitarist inspiration.
4. A visitor can distinguish built-in verified track metadata from unverified live YouTube discovery.
5. A visitor can explore a chord, scale, arpeggio, or progression across a configurable fretboard and see its notes, intervals, spellings, relationships, and audio.
6. The theory engine handles contextual sharps/flats, optional forced spelling, custom tunings, capo, 4-9 strings, and 12-36 frets without relying on a copied chord-shape database.
7. Guitarist profiles separate equipment by date, tour, record, or project and never merge incompatible rigs into a fictitious single pedalboard.
8. Every public editorial claim exposes at least one source, source type, publication/access date, and review state.
9. Every displayed photograph or video exposes its origin, creator/publisher, and permitted use or embed basis.
10. Unknown or disputed information is labelled as such instead of being guessed.
11. Light and dark themes both meet accessibility contrast requirements and preserve the approved Modern Luthier identity.
12. Existing user-created recordings, progressions, notes, and settings survive the migration or can be exported before deliberate deletion.
13. The application remains deployable as a static GitHub Pages site and the offline package remains useful without external media.

## 3. Product Identity and Information Architecture

### 3.1 Name and voice

The permanent identity is:

> **Guitar Reference**
>
> *An open guitar toolkit by johnnypatty*

The writing style is concise, factual, calm, and independent. It should feel like a well-edited reference publication combined with professional musical tools.

The site must avoid:

- coach, mentor, streak, daily task, weakness, failure, or prescribed-practice language;
- exaggerated claims such as "every guitarist," "perfect accuracy," or "the only correct scale";
- implied endorsement by featured artists or manufacturers;
- affiliate-style urgency or retailer copy.

### 3.2 Primary navigation

The desktop navigation is:

1. **Tools**
2. **Backing Tracks**
3. **Guitarists**
4. **Gear**
5. **Theory**

Global search, theme selection, About, sources, GitHub, and privacy remain accessible without competing with these primary routes.

Small screens use a compact top navigation plus an accessible menu. The application must not reserve a permanent bottom bar if it reduces the working area for the fretboard, tuner, or recorder.

### 3.3 Homepage

The homepage contains:

- the identity and short independent-project statement;
- one universal search across tools, theory entities, tracks, guitarists, gear, and reference articles;
- direct tool cards for Theory Workspace, Backing Track Finder, Tuner/Input, Metronome, and Recorder/Audio;
- entry points to Guitarists and Gear;
- a short trust/methodology section;
- the global project footer.

Search examples may demonstrate query syntax, but they are not recommendations.

### 3.4 Existing lessons and guides

Existing authored lessons remain available as unguided reference articles so valid static URLs do not break. Weekly ordering, adaptive recommendations, coach prompts, and completion pressure are removed.

Generic setup, signal-noise, floating-tremolo, intonation, action, string-gauge, and maintenance guides remain searchable under Tools/Guides. Model-specific articles may remain as clearly labelled examples.

## 4. Visual and Interaction Design

### 4.1 Modern Luthier visual system

The approved visual direction uses:

- mineral white and soft grey-green surfaces in light mode;
- a deep green-black canvas in dark mode;
- muted brass/gold as the restrained signal color;
- editorial serif display typography and highly readable sans-serif interface typography;
- generous whitespace, fine borders, shallow elevation, and photography-led reference pages;
- minimal motion and no decorative effects that obscure data.

Light and dark modes are individually designed rather than generated by simply inverting colors. The default follows `prefers-color-scheme`; a user override is stored locally.

### 4.2 Typography

Use locally bundled, open-licensed fonts where their licenses permit redistribution. If bundling is not suitable, use a documented system-font stack with no external font request.

Actual application text, unlike scaled visual mockups, uses these minimum targets:

- body text: 16px desktop and mobile;
- form controls: 14px minimum, 16px on mobile inputs where needed to prevent browser zoom;
- labels and metadata: 12px minimum;
- primary navigation: 13-14px;
- comfortable line height of at least 1.45 for prose.

Large editorial headings use responsive `clamp()` sizing and do not grow so large that they push tools below the first viewport unnecessarily.

### 4.3 Width and responsive behavior

Desktop workspaces use approximately 92-94% of the viewport with a maximum content width near 1,800px. Extra width is assigned to the musical canvas, comparison view, or search results rather than decorative sidebars.

For the Theory Workspace:

- the construction controls keep a bounded readable width;
- the central fretboard/progression canvas receives most available width;
- the settings drawer keeps a bounded readable width and becomes an overlay/collapsible panel on narrower screens;
- no horizontal page overflow is permitted; only intentionally scrollable musical canvases may scroll horizontally.

### 4.4 Project footer

The global footer contains:

- a concise project description;
- `johnnypatty` credit;
- GitHub account and repository links;
- Sources & Methodology;
- Media Attributions;
- Corrections History and Report an Error;
- code, content, and third-party licenses;
- privacy/local-data explanation;
- contribution links;
- application version and last-updated date;
- an independent/unaffiliated disclaimer.

Citations remain beside the facts they support. The footer is an index, not a place to hide attribution.

## 5. Neutral Tools

### 5.1 Tool inventory

The neutral Tools area contains:

- Tuner and local input level/noise information;
- Metronome with tap tempo, subdivisions, accents, and odd meters;
- Local Recorder with playback, comparison, metadata, and explicit export;
- Locally generated Backing Lab;
- optional pitch/timing/bend/vibrato measurement views;
- reusable setup and signal-troubleshooting guides;
- legacy user-data export.

These tools report measurements and state. They do not convert measurements into a judgement about musicianship or prescribe exercises.

### 5.2 Removal of coach behavior

Remove from public routes and product copy:

- Today and "Your coach recommends";
- adaptive session-plan generation;
- accepted/rejected recommendation flows;
- guided-session prescriptions and automatic next-session choices;
- skill weakness ranking and coach scoring;
- recommendation reasons and practice-pressure messaging.

Reusable primitives such as a timer, manual checklist, local recordings, progressions, and signal measurement may remain as independent tools.

## 6. Hybrid Backing Track Finder

### 6.1 Chosen approach

The Backing Track Finder is search-first, not collection-first.

It combines:

1. a built-in, versioned index whose musical metadata has an explicit evidence state; and
2. optional live YouTube discovery for results outside the built-in index.

There are no editorial playlist shelves on the primary track page. A user's local favorites and recent searches may exist as private conveniences, but they do not replace search.

### 6.2 Search and filters

Supported filters are:

- content type: backing track, lesson, performance, tone/recording reference;
- tonic/key and enharmonic spelling;
- mode or scale;
- chord progression and section changes;
- BPM or tempo range;
- time signature and grouping;
- style/genre;
- mood;
- difficulty;
- techniques or improvisational focus;
- guitarist/style inspiration;
- duration;
- creator/channel;
- source/provider;
- access type: stream, creator download, licensed download, or external service;
- metadata confidence;
- legitimate download availability.

Natural-language search maps phrases to these structured filters and always exposes the filters it inferred.

### 6.3 Indexed track record

Each indexed record includes:

- stable local ID;
- YouTube video ID and canonical URL;
- title, channel name/ID, duration, and publication date when available;
- content type;
- tonic/key, mode, BPM, meter/grouping, genre, mood, and difficulty;
- chord events or section progression when reliably known;
- inspired-by artist/style tags stated as editorial descriptors, not endorsements;
- creator-provided metadata and source location;
- per-field confidence and verification notes;
- legitimate download URL, license/permission basis, and access conditions when supplied by the creator;
- last-checked date and record review state.

Track metadata states are:

- **Creator confirmed:** stated by the original publisher in title, description, chart, or linked material.
- **Manually verified:** checked against the audio/chart by an editor and documented.
- **Estimated:** detected or inferred and visibly marked, never silently treated as confirmed.
- **Unknown:** left blank and excluded from that filter.

### 6.4 Live YouTube discovery

No public YouTube API secret is embedded in the static site.

The default live-search action opens the exact query on YouTube. An advanced user may optionally supply a YouTube Data API key that is stored only in that browser and used directly for in-site discovery. The UI explains quota, privacy, and revocation consequences before storage.

Live results:

- are visibly separated from verified index results;
- do not receive invented BPM/key/progression fields;
- may show creator-stated metadata parsed from result text with an unverified label;
- do not become public indexed records because a visitor clicked or saved them;
- follow YouTube embed, thumbnail, branding, and terms requirements.

### 6.5 Downloads and copyright

Guitar Reference never provides ripping, extraction, or "download from YouTube" functionality.

A download action appears only when the original creator or rights holder provides a legitimate download and the record stores the relevant permission/license basis. Otherwise the action is Play/Open on YouTube or visit the creator's official page.

The finder also includes a searchable **Backing Track Sources** directory for external creator sites and services. Each source record states what it offers, whether access is free/freemium/paid, whether downloads are supplied by the provider, account requirements, supported musical metadata, geographic restrictions when known, and the date those details were last checked. A listing is informational, not an endorsement, and no service is described as free when only a trial or limited tier is free.

### 6.6 Initial seed material

The user's pasted backing-track list is research input, not a public collection. Clear backing tracks may seed the index after their exact URLs and metadata are verified. Lessons, performances, and tone videos are classified separately.

Additional channels and tracks are researched to cover all common tonics, modes, tempo ranges, meters, and major guitar styles. Coverage is measured by searchable musical properties, not by a vanity track count.

## 7. Theory Workspace

### 7.1 Connected workspace

The Theory Workspace contains:

- Chord Explorer;
- Chord Identifier;
- Scale Explorer;
- Scale Identifier;
- Arpeggio Explorer;
- Chord-to-Scale and Scale-to-Chord compatibility views;
- Progression Builder and Analyzer;
- Circle of Fifths;
- Metronome;
- Tuner.

Changing a tonic, formula, spelling, tuning, or fret range updates the fretboard, keyboard, formula, audio, compatible harmony, and progression context through shared theory primitives.

### 7.2 Instrument and display settings

Settings include:

- note spelling: contextual, forced sharps, forced flats, or both;
- optional theoretical double accidentals;
- 4-9 strings;
- guitar and bass presets plus arbitrary custom tunings;
- 12-36 frets and an independent visible start/end range;
- capo position;
- right- or left-handed orientation;
- horizontal, vertical, and compact fretboard views;
- full-neck, position, CAGED, three-notes-per-string, chord-tone, and interval-map views where musically applicable;
- independent overlays for note names, intervals, scale degrees, roots, guide tones, chord tones, octave numbers, and candidate fingerings;
- color-blind-safe markers and high-contrast diagrams;
- playback sound, direction, speed, octave range, loop, and strum/arpeggiate mode;
- local reset and persistence.

### 7.3 Theory engine and spelling

The engine represents pitches using letter-aware spellings plus pitch class. It must not reduce every note to an arbitrary sharp name.

Contextual spelling follows the tonic/key/formula and preserves scale-degree letters. Examples include F sharp major containing E sharp and E flat minor containing C flat. Forced sharp/flat display modes are presentation overrides and may display an enharmonic simplification warning when they obscure the theoretical spelling.

The engine supports:

- interval formulas and compound intervals;
- triads, seventh chords, extensions, alterations, suspensions, additions, omissions, slash basses, and inversions;
- common scale/mode formulas and aliases;
- a custom interval-formula builder for less common structures;
- Roman-numeral and Nashville-number analysis with key-aware spelling;
- pitch-set comparison without claiming that one compatible scale is always the musical answer.

Names that are enharmonically or functionally ambiguous return multiple analyses with context notes. The UI labels alternatives instead of asserting a false absolute.

### 7.4 Chord voicings and candidate fingerings

Voicings are generated from formulas and instrument geometry, then filtered by explicit constraints:

- visible fret range;
- maximum fret span;
- maximum fretted-note/finger count;
- allowed open strings;
- required bass note;
- required or omitted chord tones;
- mute allowance;
- barre allowance;
- voicing family such as close, drop, shell, rootless, triad set, or user-defined.

Generated shapes are called **candidate voicings/fingerings**. The software may rank for simple mechanical properties but must not claim universal human playability. Impossible duplicate finger assignments, notes outside the instrument, and violated constraints are rejected.

### 7.5 Identifiers and relationships

The Chord Identifier accepts clicked fretboard/keyboard notes and optional bass/context. It returns candidates ranked by formula completeness, bass/inversion, spelling, and key context. It shows omitted tones and ambiguity.

The Scale Identifier compares selected pitch classes against known formulas and returns exact matches before subset/superset relationships.

Chord/scale relationships expose:

- shared and conflicting pitch classes;
- chord tones and tensions;
- avoid-note terminology only when a cited theoretical convention applies;
- diatonic function within a selected key;
- alternate parent scales and uncertainty.

### 7.6 Audio

Audio is synthesized locally. Chord, scale, arpeggio, and progression playback must use the same MIDI/pitch mapping as the diagrams. External samples are not required.

## 8. Guitarist Directory and Profiles

### 8.1 Honest coverage model

The directory is expandable and may contain hundreds of names, but it never claims to contain every guitarist.

Profile states are:

- **Reviewed:** claim-level citations complete and editorial review passed.
- **Developing:** useful sourced material exists but coverage is incomplete.
- **Needs sources:** identity/basic discovery record only; uncertain equipment is not shown as fact.
- **Disputed:** one or more claims have unresolved credible contradictions.

Only reviewed claim fields participate in detailed equipment filters or definitive search answers. Developing profiles remain discoverable with their status visible.

The initial public release should prioritize broad genre, geography, era, and gender representation rather than only modern virtuoso rock. Exact launch counts are produced by validated content and must not be hard-coded into the interface as aspirational numbers.

### 8.2 Directory search

Search and filters include:

- name, project/band, country, active era, genre, and musical vocabulary;
- technique and articulation descriptors;
- signature instruments and manufacturers;
- guitar type, strings, pickup configuration, bridge, scale length, and tuning;
- amps, cabinets, modelers, effects, picks, slides, straps, and accessories;
- source/review state.

A record is excluded from a filter when that field is unknown. Absence of data is never interpreted as "does not use."

### 8.3 Profile structure

Each full profile can contain:

- concise biography and project chronology;
- licensed hero photograph with attribution;
- musical-language and technique analysis;
- signature instruments and official specifications;
- non-signature primary instruments;
- pickups, amps, cabinets, modelers, pedalboards, effects, and signal chains;
- strings/gauges, picks/material/thickness, straps, slides, capos, and accessories;
- tunings and instrument-specific setup details where documented;
- dated rig snapshots tied to tour, project, record, or performance;
- official performances, interviews, manufacturer demonstrations, and rig videos;
- related guitarists, gear records, theory concepts, and backing tracks;
- claim-level sources, review date, corrections, and disagreements.

The interface never combines equipment from different eras into a single implied rig unless a dated source documents that exact combination.

### 8.4 Gear records and use claims

Gear specifications and artist use are separate entities.

- A **gear record** describes a product/model and its source-backed specifications.
- A **use claim** links a guitarist to a gear record for a date range/project/context.
- Manufacturer product copy may verify specifications but does not prove that an artist used the retail product.
- A signature model may differ from an artist's prototype or personal instrument; those records remain separate and explicitly related.

### 8.5 Research standard

Source preference order is:

1. official artist statements, official technical documentation, and manufacturer specifications;
2. direct artist interviews and complete, dated rig rundowns from reputable publishers;
3. named-author reporting from established music publications;
4. licensed photographs/video used only for qualified visual identification;
5. retailer pages for availability or product metadata only, never artist-use proof;
6. community databases, forums, Reddit, fan sites, and wikis as research leads only.

Unusually specific, disputed, or surprising claims require two independent credible sources or remain explicitly disputed/unconfirmed.

Each claim stores:

- normalized value and display text;
- subject and predicate;
- applicable date range, project, tour, record, or performance;
- one or more source references;
- source type and evidence strength;
- editor note and last-reviewed date;
- state: confirmed, qualified, visually identified, disputed, or unknown.

Direct quotations are short, necessary, and attributed. Editorial text is original.

### 8.6 Media and attribution

Images must be:

- original project media;
- official press/manufacturer media whose reuse terms permit the intended use;
- Wikimedia Commons or equivalent media with a compatible license; or
- replaced with a designed neutral placeholder.

Arbitrary search-engine images, social-media reposts, and hotlinked copyrighted editorial photography are prohibited.

Every local media asset stores creator, source URL, license, required attribution, modification/crop note, and access date. Responsive derivatives retain that metadata in the attribution directory.

Images must be sharp at their intended display size, use responsive `srcset` derivatives, avoid enlarging a low-resolution source, and preserve an uncropped attribution preview where a crop could obscure context. A visually attractive image is never used when its provenance or reuse permission is unclear.

Videos use original-publisher links or compliant embeds. Video titles, channels, and source links remain visible.

## 9. Gear Explorer

The Gear Explorer provides product-centered discovery across reviewed gear records and use claims.

It supports:

- categories: guitars, pickups, amps, cabinets, modelers, pedals/effects, strings, picks, straps, slides/capos, and accessories;
- technical filters appropriate to each category;
- signature-model relationships;
- artist-use timelines;
- specification-source and use-claim source separation;
- compare view for compatible records;
- official manufacturer links;
- clear discontinued/current state with a dated source.

Guitar Reference is not a marketplace. Pricing, stock, affiliate ranking, and purchasing recommendations are outside this redesign unless separately specified later.

## 10. Universal Search

Universal search indexes:

- tool routes and capabilities;
- chord, scale, arpeggio, interval, and tuning entities;
- built-in backing tracks;
- reviewed guitarist claims plus basic developing-profile identity fields;
- gear specifications and reviewed use claims;
- reference articles.

Results are grouped by type and expose status/source context. Search must not flatten an estimated track BPM and a confirmed manufacturer specification into identical-looking facts.

The initial static implementation uses a build-generated local search index. Live YouTube discovery remains inside the Backing Track Finder and is not silently mixed into global search.

## 11. Data Model and Content Pipeline

### 11.1 Versioned content

Public reference data lives in version-controlled, human-reviewable files separated by domain:

- theory formulas/aliases;
- tracks and track metadata claims;
- people/projects;
- gear records;
- artist-use claims;
- sources;
- media licenses/attributions;
- correction records.

Schemas are validated at build time. IDs are stable and relationships reference IDs rather than duplicated prose.

### 11.2 Source record

A source record includes:

- stable ID;
- title, publisher, author/interviewer when known;
- source type;
- canonical URL and optional archive URL;
- publication date and access date;
- language;
- short scope note describing what it can support;
- availability/broken-link state.

### 11.3 Review workflow

Content moves through:

1. research lead;
2. claim extraction;
3. source validation;
4. contradiction check;
5. media-license check;
6. editorial review;
7. reviewed/public status;
8. later correction or re-review.

A build cannot grant "reviewed" status when required claim citations, dates, or media rights metadata are missing.

## 12. Local Data, Migration, and Privacy

### 12.1 Local-only defaults

There is no mandatory account, analytics service, telemetry, cloud sync, background microphone activation, or audio upload.

- theme, instrument display settings, and small preferences use local browser storage;
- recordings and larger user objects use IndexedDB;
- local favorites/recent searches are private to the browser;
- microphone and recording begin only after explicit action;
- live YouTube/API usage is visibly external and optional.

### 12.2 Migration from Practice Coach v2

The migration must preserve:

- recordings and their metadata;
- custom progressions;
- gear profile/setup notes;
- general settings that remain meaningful;
- existing lesson URLs and authored content.

Coach-specific recommendation history, session plans, and skill observations are moved into a read-only **Legacy Practice Data** export/archive. They are not used to drive the new interface. The application never silently deletes this data.

The user may explicitly export or delete the legacy archive. Import validation remains transactional: invalid data cannot partially overwrite current data.

### 12.3 Offline behavior

Offline after a successful cache includes:

- shell/navigation;
- theory tools and local audio;
- locally generated backing tracks;
- built-in track metadata and outbound links;
- included guitarist/gear text data and licensed local thumbnails;
- reference guides;
- local recordings and user data.

Live YouTube results, remote videos, external full-resolution media, and external source pages require a network connection. Offline UI states say so clearly.

## 13. Accessibility

The release target is WCAG 2.2 AA for application-owned pages and controls.

Requirements include:

- full keyboard operation and visible focus;
- semantic headings, landmarks, forms, tables, and dialogs;
- skip navigation and route focus management;
- color never being the only status signal;
- text equivalents for fretboard colors, charts, signal paths, and confidence states;
- high-contrast and color-blind-safe diagram modes;
- reduced-motion support;
- accessible names for musical symbols;
- no live-region updates on every audio frame;
- 44px touch targets for primary mobile controls;
- no horizontal page overflow at 320 CSS pixels.

## 14. Error Handling and Honest States

Errors and uncertainty are scoped and actionable:

- unknown theory name: preserve selected notes and show candidate/custom formula options;
- ambiguous chord/scale: show multiple analyses and missing/context notes;
- invalid custom tuning/fret range: identify the exact invalid field without resetting other settings;
- live YouTube unavailable/quota exhausted: keep the built-in index usable and offer direct YouTube search;
- broken external source: retain citation metadata, show availability state, and use an archive URL when legally/technically available;
- missing media license: show a placeholder rather than the image;
- incomplete guitarist field: show unknown/not documented and exclude it from that filter;
- contradictory claims: show the disagreement and sources, not a fabricated resolution;
- input/recording unsupported: leave all non-input tools functional;
- corrupt import: reject transactionally and preserve existing local data.

## 15. Testing and Release Gates

### 15.1 Theory correctness

Automated tests cover:

- interval arithmetic and compound intervals;
- pitch-class and letter-aware spelling in every tonic;
- contextual sharps/flats and required double accidentals;
- chord/scale formula construction and aliases;
- inversions, slash basses, omissions, and alterations;
- identifier exact/ambiguous/subset results;
- Roman/Nashville analysis;
- fretboard mapping for every supported string/fret count, custom tuning, capo, and handedness;
- candidate voicing constraints and pitch agreement;
- diagram/audio MIDI agreement;
- regression fixtures independently checked against reputable theory references.

Property tests iterate supported formulas across all tonics rather than testing only C major examples.

### 15.2 Content integrity

Build validation rejects:

- duplicate or missing IDs;
- reviewed claims without sources/review dates;
- use claims without time/context qualification where the source is era-specific;
- detailed filter fields sourced only from unreviewed community leads;
- media without rights/attribution metadata;
- track downloads without an explicit legitimate source/permission basis;
- invalid YouTube IDs/URLs, BPM, meters, durations, chord events, or dates;
- broken internal relationships;
- aspirational hard-coded profile/claim counts.

Periodic network link checks report external drift without making an unrelated temporary outage corrupt the build.

### 15.3 Application quality

Tests cover:

- route and universal-search behavior;
- built-in/live track-result separation;
- filters excluding unknown/unreviewed data appropriately;
- theme persistence and contrast tokens;
- local API-key lifecycle without plaintext exposure in exports/logs;
- migration and preservation of v2 local data;
- offline cache boundaries;
- microphone/recorder lifecycle and track shutdown;
- keyboard, dialog, focus, reduced-motion, and mobile behavior;
- responsive visual QA in both themes at phone, tablet, desktop, and ultrawide sizes;
- production build, offline package, internal links, source index, and GitHub Pages base-path behavior.

No feature is described as complete until its tests, build, offline package, verifier, and proportional browser/manual checks pass.

## 16. Delivery Decomposition

This redesign contains several independently testable systems. It will be implemented as coordinated workstreams, each with its own detailed plan and review gate, rather than one unreviewable bulk rewrite.

1. **Identity and neutral shell**

   Rename/retheme, new navigation/home/footer, coach removal, legacy-data archive, stable lesson routes, shared responsive components.

2. **Theory Workspace**

   Shared music model, spelling, formulas, fretboard settings, identifiers, voicings, progressions, circle, metronome/tuner integration, exhaustive tests.

3. **Hybrid Backing Track Finder**

   Track schema/index, search/filter UI, evidence states, direct YouTube search, optional local API-key discovery, legitimate-download rules, seed validation.

4. **Research and content platform**

   Source/claim/media schemas, validation, corrections, review workflow, build-generated search index, attribution pages.

5. **Guitarist Directory and Profiles**

   Directory/filter UI, profile/era/rig views, initial balanced records, reviewed-profile gates, licensed media pipeline.

6. **Gear Explorer**

   Product records, technical filters, artist-use timelines, signature/prototype relationships, comparison view.

7. **Integration and release**

   Universal search, full themes, accessibility, offline package, migration, privacy review, responsive QA, documentation, and deployment.

Research content can continue expanding after the software release without changing the schemas or pretending unfinished profiles are reviewed.

## 17. Explicit Non-Goals

This redesign does not include:

- AI coaching or adaptive practice plans;
- accounts, social profiles, public streaks, or leaderboards;
- copyrighted backing-track downloads or YouTube ripping;
- automatic polyphonic transcription;
- a retailer marketplace, affiliate ranking, or live price comparison;
- claims of endorsement by artists/manufacturers;
- publishing unlicensed photographs;
- accepting community-submitted facts without editorial/source review;
- claiming exhaustive coverage of every guitarist or every historical rig;
- replacing human musical context with a single "correct" chord-scale answer.

## 18. Approved Design References

The persisted brainstorming mockups under `.superpowers/brainstorm/` record the approved direction for:

- Modern Luthier light/dark visual language;
- search-first Hybrid Backing Track Finder;
- connected and configurable Theory Workspace;
- wide desktop canvas and project footer;
- source-led Guthrie Govan profile example;
- transparent Guitarist Directory;
- Guitar Reference homepage and navigation.

Mockup data and counts are illustrative. Implementation and public content must use validated records only.
