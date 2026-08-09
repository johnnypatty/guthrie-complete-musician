const CACHE_NAME = "gcm-static-4658263f7b74";
const PRECACHE_URLS = [
  "./404.html",
  "./assets/icon.svg",
  "./assets/social-preview.svg",
  "./assets/style.css",
  "./data/lessons.json",
  "./downloads/Practice Log.csv",
  "./downloads/Repertoire Tracker.csv",
  "./index.html",
  "./js/app.js",
  "./js/audio-engine.js",
  "./js/course-data.js",
  "./js/lesson-index.js",
  "./js/lesson-page.js",
  "./js/lesson-search.js",
  "./js/music-theory.js",
  "./js/player-timeline.js",
  "./js/practice-engine.js",
  "./js/progress-store.js",
  "./lessons/2-hour-session.html",
  "./lessons/24-week-final-performance.html",
  "./lessons/90-minute-core.html",
  "./lessons/arrangement-and-performance-checklist.html",
  "./lessons/baseline-test.html",
  "./lessons/bending-vibrato-dynamics-and-harmonics.html",
  "./lessons/build-your-own-vocabulary.html",
  "./lessons/clean-speed-system.html",
  "./lessons/cover-rules-no-tabs.html",
  "./lessons/develop-your-own-voice.html",
  "./lessons/famous-short-melodies-and-riffs.html",
  "./lessons/fretboard-freedom.html",
  "./lessons/funk-and-muted-articulation.html",
  "./lessons/future-stainless-refret-notes.html",
  "./lessons/guthrie-study-map.html",
  "./lessons/hearing-chords-and-bass-lines.html",
  "./lessons/how-chords-are-built.html",
  "./lessons/how-scales-are-built.html",
  "./lessons/in-person-inspection-checklist.html",
  "./lessons/legato-and-tapping.html",
  "./lessons/long-day-blocks.html",
  "./lessons/modes-harmony-and-playing-through-changes.html",
  "./lessons/monthly-tests.html",
  "./lessons/motif-development.html",
  "./lessons/natural-stage-banter.html",
  "./lessons/odd-meter-and-rhythmic-displacement.html",
  "./lessons/personal-cover-ladder.html",
  "./lessons/picking-and-synchronization.html",
  "./lessons/recording-review-checklist.html",
  "./lessons/resource-guide.html",
  "./lessons/rest-and-injury-prevention.html",
  "./lessons/rg8570-long-term-evaluation.html",
  "./lessons/seventh-chords-extensions-and-alterations.html",
  "./lessons/solo-analysis-worksheet.html",
  "./lessons/source-notes.html",
  "./lessons/storytelling-timing-and-callbacks.html",
  "./lessons/sweeping-string-skipping-and-muting.html",
  "./lessons/target-notes-and-chord-changes.html",
  "./lessons/tension-release-and-outside-playing.html",
  "./lessons/the-musical-sentence.html",
  "./lessons/the-no-tabs-method.html",
  "./lessons/time-subdivisions-and-metronome.html",
  "./lessons/transcription-ladder.html",
  "./lessons/transcription-worksheet.html",
  "./lessons/triads-inversions-and-voice-leading.html",
  "./lessons/weekly-review.html",
  "./lessons/weekly-schedule.html",
  "./manifest.webmanifest"
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(
    names.filter((name) => name.startsWith('gcm-static-') && name !== CACHE_NAME).map((name) => caches.delete(name))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
