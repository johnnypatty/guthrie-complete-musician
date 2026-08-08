(function () {
  'use strict';

  const STORAGE_KEY = 'gcm-progress-v2';
  const LEGACY_STORAGE_KEY = 'gcm-progress-v1';

  function loadState() {
    for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        return ProgressStore.normalize(JSON.parse(raw));
      } catch (_error) {
        // Continue to the legacy key or defaults.
      }
    }
    return ProgressStore.normalize(null);
  }

  function init() {
    const article = document.querySelector('[data-lesson-slug]');
    const checkbox = document.querySelector('#lesson-complete');
    const progressBar = document.querySelector('#reading-progress-bar');
    const printButton = document.querySelector('#print-lesson');
    if (!article || !checkbox || !progressBar) return;

    const slug = article.dataset.lessonSlug;
    const state = loadState();
    checkbox.checked = Boolean(state.lessons[slug]);
    article.classList.toggle('is-complete', checkbox.checked);

    checkbox.addEventListener('change', () => {
      state.lessons[slug] = checkbox.checked;
      article.classList.toggle('is-complete', checkbox.checked);
      localStorage.setItem(STORAGE_KEY, ProgressStore.exportJson(state));
    });

    printButton?.addEventListener('click', () => window.print());

    let scheduled = false;
    const updateReadingProgress = () => {
      scheduled = false;
      const percent = ProgressStore.readingPercent(window.scrollY, document.documentElement.scrollHeight, window.innerHeight);
      progressBar.style.width = `${percent}%`;
    };
    const scheduleReadingProgress = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(updateReadingProgress);
    };
    addEventListener('scroll', scheduleReadingProgress, { passive: true });
    addEventListener('resize', scheduleReadingProgress, { passive: true });
    updateReadingProgress();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
