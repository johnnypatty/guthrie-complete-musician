# Guthrie Complete Musician — GitHub Pages Publishing Design

**Date:** 2026-08-08  
**Repository:** `guthrie-complete-musician`  
**Visibility:** Public  
**Primary deliverables:** A live GitHub Pages course, a public source repository, and a synchronized improved local Desktop version.

## 1. Objective

Publish the existing Guthrie-inspired complete-musician course as a polished, accessible, privacy-safe static website. Preserve every useful local lesson and interactive feature while improving web navigation, lesson readability, offline installation, mobile usability, deployment reliability, and public documentation.

The project is an unofficial educational fan project. It must not claim endorsement by, affiliation with, or authorship by Guthrie Govan. It will not distribute copyrighted tabs, notation, recordings, backing tracks, lyrics, book chapters, or paid course material.

## 2. Chosen Approach

Use a framework-free static site for the browser experience and a small build step that converts trusted Markdown course sources into static HTML lesson pages. End users need no installation, account, server, or third-party service. The same generated public folder works on GitHub Pages and can be downloaded for local use.

This approach is preferred over Jekyll because the interactive player and file-version behavior remain under direct control. It is preferred over Astro/Vite because a framework and client bundle would add maintenance without improving the core learning experience.

## 3. Repository Architecture

```text
guthrie-complete-musician/
├── content/                         # Public Markdown lesson sources
│   ├── 01-daily-practice/
│   ├── 02-technique/
│   ├── 03-rhythm-and-groove/
│   ├── 04-ear-training/
│   ├── 05-fretboard-theory-chords/
│   ├── 06-improvisation-phrasing/
│   ├── 07-repertoire-covers/
│   ├── 08-personality-humour/
│   ├── 09-assessments/
│   ├── 10-templates-trackers/
│   ├── 11-learning-resources/
│   └── 12-rg8570-buying-guide/     # Sanitized generic public guide
├── src/
│   ├── assets/                      # Styles and original visual assets
│   ├── js/                          # App, theory, schedule, timeline, audio modules
│   └── templates/                   # Main and lesson-page HTML templates
├── scripts/
│   ├── build.mjs                    # Generates public pages and lesson index
│   ├── package-offline.mjs          # Creates downloadable offline archive
│   └── verify.mjs                   # Validates output, links, privacy markers, and structure
├── public/                          # Generated GitHub Pages artifact
│   ├── index.html
│   ├── lessons/*.html
│   ├── assets/*
│   ├── js/*
│   ├── downloads/*
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── 404.html
│   └── .nojekyll
├── tests/                           # Node tests for theory, schedule, timeline and build output
├── .github/workflows/
│   ├── test.yml
│   └── pages.yml
├── docs/superpowers/                # Design and implementation plans
├── package.json
├── package-lock.json
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE-CODE
└── LICENSE-CONTENT
```

The existing Desktop folder remains user-friendly rather than developer-oriented. Its top level will contain `START HERE.html`, the generated web application, readable Markdown sources, worksheets, and a `Private Notes` folder excluded from Git.

## 4. Public/Private Boundary

Before any public content commit:

- Move the original seller-specific RG8570 verdict and messages into the Desktop-only `Private Notes` folder.
- Add `Private Notes/` and equivalent private-source paths to `.gitignore`.
- Replace the public RG8570 material with a generic model evaluation and in-person inspection guide.
- Remove the seller's name, conversation excerpts, travel dates, location plans, and any other transaction-specific details from all tracked files.
- Run a case-insensitive privacy scan over tracked and generated text before the first content commit and again in CI.

The user's musical favourites may remain as a curated study ladder because the user explicitly asked to publish the course and those titles are not private contact/payment data. Wording will change from “your personal list” to “curated advanced repertoire ladder” for public readers.

## 5. Hosted-Site Improvements

### Entry and navigation

- Make `public/index.html` the canonical entry point.
- Keep `START HERE.html` in the downloadable/local package as a friendly redirect.
- Add a responsive navigation bar, current-section cues, Skip to content, keyboard-visible focus, and reduced-motion support.
- Add a mobile menu that does not require precise pointer movement.

### Lesson reader

- Generate a formatted HTML page for every Markdown lesson and worksheet.
- Include course breadcrumb, previous/next lesson, category, reading progress, local completion checkbox, print action, and return-to-dashboard link.
- Add search and category filtering over title, summary, skill tags, and phase.
- Keep source Markdown accessible in the repository but never send hosted readers to raw Markdown.

### Dashboard and progress

- Preserve the 90/120-minute session generator, 24-week phase map, timer, chord lab, constraints, and localStorage progress.
- Version the localStorage schema and recover safely from invalid/old data.
- Add export/import of progress as a small JSON file only through explicit user actions; no network transmission.
- Add an “offline available” status after the service worker has cached the public course.

### Backing Lab

- Preserve twelve original, locally synthesized progressions with synchronized chord highlighting.
- Add a clear current bar/section readout, progress indicator, count-in option, metronome level, and a master volume control.
- Keep tempo between 50 and 220 BPM and maintain loop-relative position on tempo changes.
- Improve error messages for unsupported/suspended audio and guarantee immediate silence on Stop/page exit.
- Show chord tones and suggested target tones for the current chord without replacing ear training.

### Presentation and discoverability

- Add original favicon/icon assets, theme colors, descriptive metadata, canonical URL after repository creation, Open Graph/social-preview metadata, and a human-readable 404 page.
- Add a concise accessibility statement, privacy statement, copyright/resource disclaimer, and unofficial-project notice.
- No analytics, cookies, accounts, advertisements, remote fonts, or external runtime scripts.

## 6. Offline/PWA Behavior

- The live HTTPS site registers `sw.js` after load.
- The service worker precaches the app shell, lesson index, generated lesson pages, and essential assets using a versioned cache name.
- Navigation uses cached content when offline and falls back to a dedicated offline/404 page.
- Service-worker failures never block normal online use.
- The downloadable archive includes all generated files and works through ordinary local file navigation. Features unavailable on `file://`—such as service-worker installation—are labelled rather than treated as errors.

## 7. Build and Data Flow

1. Trusted Markdown files contain simple front matter: title, category, phase, difficulty, tags, and summary.
2. `build.mjs` validates metadata, converts Markdown to HTML, creates lesson navigation/search data, copies static assets/modules, and writes the dashboard/lesson pages to `public/`.
3. `package-offline.mjs` copies `public/` plus local source/worksheets into a temporary package tree, adds `START HERE.html`, and creates a deterministic ZIP in `public/downloads/` without private files.
4. `verify.mjs` checks required output, duplicate slugs, unresolved local links, private markers, unsupported placeholder text, and service-worker manifest coverage.
5. Tests run before deployment. GitHub Pages receives only `public/`.

## 8. Error Handling

- A malformed content file fails the build with the exact path and missing/invalid field.
- A broken local link, missing generated page, duplicate slug, or privacy marker fails verification and CI.
- Corrupt localStorage falls back to defaults without deleting lesson files.
- Audio errors display a plain-language message and leave controls recoverable.
- Service-worker registration/caching errors are nonfatal and visible only as an offline-status warning.
- Export/import rejects unknown schema versions or invalid JSON without altering current progress.

## 9. Testing and Publication Gates

### Automated

- Existing theory, schedule and player-timeline tests remain green.
- Add tests for all course chord symbols, lesson metadata/slug uniqueness, 90/120-minute totals, progress schema migration, loop/tempo boundaries, build output and privacy scanning.
- Run script syntax checks and link verification.
- CI must pass before Pages deployment.

### Manual before push

- Inspect desktop and narrow/mobile layouts.
- Verify keyboard navigation, visible focus, search/filter, lesson previous/next, print view and progress persistence.
- Test Play/Stop, count-in, tempo change, section loop, mix controls and chord targeting in a real browser.
- Confirm no sound before an intentional user click.

### Live after deployment

- Open the GitHub Pages URL, inspect the home page and at least three lesson categories, test a backing track, verify mobile layout, refresh/offline behavior, and download/open the offline archive.
- Check GitHub Actions and Pages status before declaring publication complete.

## 10. GitHub Publication

- Create a new public repository named `guthrie-complete-musician` in the connected personal GitHub account.
- Default branch: `main`.
- Repository description: “A 24-week Guthrie Govan-inspired complete guitar musicianship course with original offline backing tracks, chord tools, ear training, and practice tracking.”
- Topics: `guitar`, `music-theory`, `ear-training`, `improvisation`, `practice`, `web-audio`, `offline-first`, `github-pages` where supported.
- Publish Pages through the official GitHub Pages Actions workflow using least-privilege permissions.
- Create releases only later if the user asks; the current offline ZIP remains downloadable from Pages.

## 11. Licensing

- Website/build/test code: MIT License (`LICENSE-CODE`).
- Original written course content and original static visual assets: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 (`LICENSE-CONTENT`).
- Third-party artist/song/book names remain the property of their respective owners and are used only for identification/commentary. No third-party music or notation is relicensed.

## 12. Completion Criteria

The publishing task is complete only when:

- the public repository exists with sanitized history and documentation;
- all approved improvements are present in source and generated output;
- automated local and GitHub Actions checks pass;
- GitHub Pages reports successful deployment;
- the live URL loads and core interactions are manually verified;
- the downloadable offline archive opens and contains no private files;
- the improved Desktop folder is synchronized without losing the seller-specific private guide;
- the user receives direct repository, live-site, local-launch, and offline-download links.

