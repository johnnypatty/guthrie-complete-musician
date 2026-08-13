(function () {
  'use strict';

  const STORAGE_KEY = 'gcm-progress-v3';
  const stateStore = LocalStateStore.create(localStorage, STORAGE_KEY);

  function init() {
    const article = document.querySelector('[data-lesson-slug]');
    const checkbox = document.querySelector('#lesson-complete');
    const progressBar = document.querySelector('#reading-progress-bar');
    const printButton = document.querySelector('#print-lesson');
    if (!article || !checkbox || !progressBar) return;

    const slug = article.dataset.lessonSlug;
    let state = stateStore.load();
    checkbox.checked = Boolean(state.lessons[slug]);
    article.classList.toggle('is-complete', checkbox.checked);

    checkbox.addEventListener('change', () => {
      state = stateStore.patch({ lessons: { [slug]: checkbox.checked } });
      article.classList.toggle('is-complete', checkbox.checked);
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
