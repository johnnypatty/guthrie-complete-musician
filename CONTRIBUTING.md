# Contributing

Thanks for helping make the course more useful, accurate, accessible, and private.

## Before opening a change

1. Keep exercises and explanations original. Do not submit copied tabs, notation, lyrics, book pages, commercial audio, isolated copyrighted stems, or downloaded backing tracks.
2. Remove personal data. Never include private conversations, names tied to transactions, contact details, travel plans, receipts, payment information, credentials, or private seller notes.
3. For a new lesson, use all required front-matter fields: `title`, `category`, `phase`, `difficulty`, `tags`, and `summary`.
4. Prefer plain language, specific practice instructions, and a clear musical reason for each exercise.
5. Preserve keyboard access, visible focus, semantic structure, sufficient contrast, reduced-motion behavior, and the no-autoplay rule.

## Required local gate

```sh
npm ci
npm test
npm run build
npm run package:offline
npm run verify
```

The privacy scan, generated-link check, service-worker cache check, and offline-package tests must remain clean. Add a failing regression test before fixing a defect. Do not commit generated temporary folders or private notes.

By contributing code, you agree to license it under MIT. By contributing original course prose or original static visuals, you agree to license them under CC BY-NC-SA 4.0.
