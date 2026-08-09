# Guthrie Complete Musician

A free, original 24-week guitar-musicianship course for players who want technique, time, ears, harmony, improvisation, repertoire, expression, and personality to grow together.

**Live course:** https://johnnypatty.github.io/guthrie-complete-musician/

This is an unofficial educational project inspired by broad musicianship principles associated with Guthrie Govan. It is not affiliated with, approved by, or endorsed by Guthrie Govan.

## What is included

- 47 searchable lessons organized into a six-phase, 24-week path
- 90-minute and two-hour practice-session builders
- an original Web Audio Backing Lab with tempo, section loops, count-in, chord timeline, and target-tone guidance
- a Chord Lab for constructing chords from formulas
- ear-training, transcription, fretboard, rhythm, technique, improvisation, repertoire, performance, and musical-humor work
- local completion tracking, reading progress, and JSON progress export/import
- printable lesson pages and CSV practice/repertoire templates
- an installable web app plus a complete downloadable offline ZIP

## Privacy by design

There are no accounts, analytics, advertisements, cookies, tracking pixels, remote fonts, or external runtime scripts. Practice and lesson progress stays browser-local on the current device unless the user deliberately exports a JSON backup. Imported progress is parsed and normalized locally.

The repository has automated privacy checks. Personal seller conversations, contact information, payment details, transaction dates, and private notes are excluded from the public source, generated site, and offline archive.

## Content policy

The project contains original explanations, exercises, generated accompaniment, and graphics. No copyrighted backing tracks, commercial recordings, copied tabs, notation, books, or paywalled lesson material are distributed. Song names may appear only as study suggestions or factual references; users should obtain recordings and licensed notation from legitimate sources.

## Use it offline

Visit the live course once to let the browser cache the static course. For a portable file version, download `guthrie-complete-musician-offline.zip` from the site, extract it, and open `START HERE.html`. The ZIP includes the generated site, public lesson Markdown, and CSV templates; it never includes private notes or repository history.

Because some browsers restrict advanced features on `file://` pages, Backing Lab audio is most reliable on the hosted site or through a small local web server.

## Run and verify locally

Requirements: Node.js 22 or newer.

```sh
npm ci
npm test
npm run build
npm run package:offline
npm run verify
```

The deployable output is written to `public/`. To preview it after completing Task 7's local server:

```sh
node scripts/serve.mjs --root public --port 4173
```

## Accessibility

The course uses semantic headings and landmarks, a skip link, keyboard-operable controls, visible focus, reduced-motion support, responsive layouts, live status regions, and print-specific lesson styling. Audio never starts automatically. Please report an accessibility problem through the repository issue tracker.

## Limitations

- This is a practice system, not a substitute for a good teacher, careful listening, rest, or medical guidance.
- Web Audio synthesis provides musically useful original accompaniment, not a studio-band recording.
- Browser storage can be cleared by the browser or user; export a progress backup if the data matters.
- The course cannot make someone “be Guthrie.” Its goal is to develop the underlying abilities while protecting the player's own voice.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing content or code. For a security vulnerability, follow [SECURITY.md](SECURITY.md) and do not post secrets or private personal data in a public issue.

## Licenses

- Website, build, test, and tooling code: [MIT License](LICENSE-CODE)
- Original course prose and original static visuals: [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](LICENSE-CONTENT) (CC BY-NC-SA 4.0)

Third-party names and trademarks belong to their respective owners. The dual licenses do not grant rights to third-party music, trademarks, publicity rights, or material merely referenced by the course.
