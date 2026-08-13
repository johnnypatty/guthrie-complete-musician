(function (root) {
  'use strict';

  const PRIMARY_ROUTES = Object.freeze({
    today: { title: 'Today' },
    session: { title: 'Session' },
    studio: { title: 'Studio' },
    progress: { title: 'Progress' },
    roadmap: { title: 'Roadmap' }
  });
  const STUDIO_ROUTES = new Set(['input', 'recording', 'backing', 'fretboard', 'chords']);
  const LEGACY_ROUTES = Object.freeze({
    '#top': ['today', null],
    '#today': ['today', null],
    '#backing-lab': ['studio', 'backing'],
    '#chord-lab': ['studio', 'chords'],
    '#roadmap': ['roadmap', null],
    '#library': ['roadmap', 'library'],
    '#guitar': ['roadmap', 'gear']
  });

  function route(name, subroute) {
    const suffix = subroute ? `/${subroute}` : '';
    return {
      name,
      subroute: subroute || null,
      hash: `#/${name}${suffix}`,
      title: PRIMARY_ROUTES[name].title
    };
  }

  function parseHash(value) {
    const hash = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (LEGACY_ROUTES[hash]) return route(...LEGACY_ROUTES[hash]);
    const match = /^#\/(today|session|studio|progress|roadmap)(?:\/([a-z-]+))?\/?$/.exec(hash);
    if (!match) return route('today');
    const [, name, subroute = null] = match;
    if (name === 'studio' && subroute && STUDIO_ROUTES.has(subroute)) return route(name, subroute);
    if (subroute) return route('today');
    return route(name);
  }

  function create(options) {
    const browserWindow = options?.window;
    const document = options?.document;
    if (!browserWindow || !document) throw new TypeError('HashRouter requires window and document');
    let activeRoute = null;

    function reducedMotion() {
      return Boolean(browserWindow.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    }

    function focusAndScroll(target, section = null) {
      const focusTarget = section?.querySelector('h2') || target?.querySelector('h1');
      focusTarget?.focus({ preventScroll: true });
      const behavior = reducedMotion() ? 'auto' : 'smooth';
      if (section) section.scrollIntoView({ behavior, block: 'start' });
      else browserWindow.scrollTo?.({ top: 0, left: 0, behavior });
    }

    function skipToContent(event) {
      event?.preventDefault?.();
      if (!activeRoute) return;
      const activeView = [...document.querySelectorAll('[data-route-view]')]
        .find((view) => view.dataset.routeView === activeRoute.name);
      focusAndScroll(activeView);
    }

    function render() {
      const nextRoute = parseHash(browserWindow.location.hash);
      const views = [...document.querySelectorAll('[data-route-view]')];
      const links = [...document.querySelectorAll('[data-route-link]')];
      const sectionLinks = [...document.querySelectorAll('[data-route-section-link]')];

      if (activeRoute && activeRoute.name !== nextRoute.name) options.onDeactivate?.(activeRoute, nextRoute);

      for (const view of views) view.hidden = view.dataset.routeView !== nextRoute.name;
      for (const link of links) {
        if (link.dataset.routeLink === nextRoute.name) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
      for (const link of sectionLinks) {
        const selected = nextRoute.name === 'studio' && link.dataset.routeSectionLink === nextRoute.subroute;
        if (selected) {
          link.dataset.selected = 'true';
          link.setAttribute('aria-current', 'location');
        } else {
          delete link.dataset.selected;
          link.removeAttribute('aria-current');
        }
      }

      document.title = `${nextRoute.title} | Guthrie Complete Musician`;
      if (document.body?.dataset) {
        document.body.dataset.route = nextRoute.name;
        document.body.dataset.subroute = nextRoute.subroute || '';
      }

      const activeView = views.find((view) => view.dataset.routeView === nextRoute.name);
      const section = nextRoute.subroute
        ? activeView?.querySelector(`[data-route-section="${nextRoute.subroute}"]`)
        : null;
      focusAndScroll(activeView, section);
      activeRoute = nextRoute;
      return nextRoute;
    }

    function start() {
      browserWindow.addEventListener('hashchange', render);
      document.querySelector('[data-skip-link]')?.addEventListener('click', skipToContent);
      return render();
    }

    function stop() {
      browserWindow.removeEventListener('hashchange', render);
      document.querySelector('[data-skip-link]')?.removeEventListener('click', skipToContent);
    }

    return { start, stop, render, getRoute: () => activeRoute };
  }

  root.HashRouter = Object.freeze({ create, parseHash });
})(globalThis);
