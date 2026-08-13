(function (root) {
  'use strict';

  function create(context) {
    const { document } = context;
    const $ = (selector) => document.querySelector(selector);
    const { escapeHtml } = UiComponents;

    function lessonIndex() {
      return Array.isArray(root.GcmLessonIndex) ? root.GcmLessonIndex : CourseData.lessons;
    }

    function renderRoadmap() {
      $('#roadmap-grid').innerHTML = CourseData.phases.map((phase) => {
        const current = context.state.week >= phase.start && context.state.week <= phase.end;
        return `<article class="phase-card${current ? ' is-current' : ''}">
          <p class="week-range">Weeks ${phase.start}–${phase.end}</p>
          <h3>${escapeHtml(phase.name)}</h3>
          <p>${escapeHtml(phase.focus)}</p>
        </article>`;
      }).join('');
    }

    function renderLibrary() {
      const allLessons = lessonIndex();
      const lessons = LessonSearch.filter(allLessons, {
        query: $('#lesson-search')?.value || '',
        category: $('#lesson-category')?.value || 'all',
        phase: $('#lesson-phase')?.value || 'all'
      });
      $('#library-grid').innerHTML = lessons.map((lesson) =>
        `<a class="library-link${context.state.lessons[lesson.slug] ? ' is-complete' : ''}" href="${lesson.slug ? `lessons/${encodeURIComponent(lesson.slug)}.html` : encodeURI(lesson.path)}"><small>${escapeHtml(lesson.category || lesson.group)}</small><strong>${escapeHtml(lesson.title)}</strong><span>${escapeHtml(lesson.summary || 'Open lesson')} →</span>${context.state.lessons[lesson.slug] ? '<b class="completion-badge">Completed</b>' : ''}</a>`
      ).join('');
      if ($('#lesson-result-count')) $('#lesson-result-count').textContent = `${lessons.length} of ${allLessons.length} lessons`;
      if ($('#lesson-no-results')) $('#lesson-no-results').hidden = lessons.length !== 0;
    }

    function populateLessonFilters() {
      const lessons = lessonIndex();
      $('#lesson-category').innerHTML = '<option value="all">All categories</option>' + LessonSearch.options(lessons, 'category')
        .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
      $('#lesson-phase').innerHTML = '<option value="all">All phases</option>' + LessonSearch.options(lessons, 'phase')
        .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
    }

    function init() {
      populateLessonFilters();
      renderLibrary();
      renderRoadmap();
      $('#lesson-search').addEventListener('input', renderLibrary);
      $('#lesson-category').addEventListener('change', renderLibrary);
      $('#lesson-phase').addEventListener('change', renderLibrary);
    }

    return { init, renderRoadmap, renderLibrary };
  }

  root.RoadmapView = Object.freeze({ create });
})(globalThis);
