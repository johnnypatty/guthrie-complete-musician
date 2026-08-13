import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

async function loadRouter() {
  const source = await readFile(resolve(import.meta.dirname, '../src/js/hash-router.js'), 'utf8');
  const context = { globalThis: null };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'hash-router.js' });
  return context.HashRouter;
}

function fakeElement(dataset = {}) {
  const attributes = new Map();
  const listeners = new Map();
  return {
    dataset,
    hidden: false,
    focusOptions: [],
    setAttribute(name, value) { attributes.set(name, String(value)); },
    removeAttribute(name) { attributes.delete(name); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    focus(options) { this.focusOptions.push(options); },
    scrollOptions: [],
    scrollIntoView(options) { this.scrollOptions.push(options); },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); },
    dispatch(name, event = {}) { listeners.get(name)?.(event); },
    querySelector() { return null; }
  };
}

function browserFixture(hash = '') {
  const listeners = new Map();
  const views = ['today', 'session', 'studio', 'progress', 'roadmap'].map((name) => fakeElement({ routeView: name }));
  const headings = new Map(views.map((view) => [view.dataset.routeView, fakeElement()]));
  const studioSections = new Map(['input', 'recording', 'backing', 'fretboard', 'chords'].map((name) => {
    const section = fakeElement({ routeSection: name });
    section.heading = fakeElement();
    section.querySelector = (selector) => selector === 'h2' ? section.heading : null;
    return [name, section];
  }));
  views.forEach((view) => {
    view.querySelector = (selector) => {
      if (selector === 'h1') return headings.get(view.dataset.routeView);
      const match = /^\[data-route-section="([a-z-]+)"\]$/.exec(selector);
      return view.dataset.routeView === 'studio' && match ? studioSections.get(match[1]) : null;
    };
  });
  const links = ['today', 'session', 'studio', 'progress', 'roadmap'].map((name) => fakeElement({ routeLink: name }));
  const sectionLinks = [...studioSections.keys()].map((name) => fakeElement({ routeSectionLink: name }));
  const skipLink = fakeElement();
  const body = { dataset: {} };
  const document = {
    title: '', body,
    querySelector(selector) { return selector === '[data-skip-link]' ? skipLink : null; },
    querySelectorAll(selector) {
      if (selector === '[data-route-view]') return views;
      if (selector === '[data-route-link]') return links;
      if (selector === '[data-route-section-link]') return sectionLinks;
      return [];
    }
  };
  const scrollCalls = [];
  const window = {
    location: { hash },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); },
    matchMedia() { return { matches: false }; },
    scrollTo(options) { scrollCalls.push(options); }
  };
  return { document, headings, links, listeners, scrollCalls, sectionLinks, skipLink, studioSections, views, window };
}

test('parseHash defaults empty and unknown locations to Today', async () => {
  const { parseHash } = await loadRouter();
  for (const hash of ['', '#', '#/not-a-route', '#/studio/not-a-lab']) {
    assert.deepEqual(JSON.parse(JSON.stringify(parseHash(hash))), {
      name: 'today', subroute: null, hash: '#/today', title: 'Today'
    });
  }
});

test('parseHash maps every legacy anchor to its v2 destination', async () => {
  const { parseHash } = await loadRouter();
  const cases = {
    '#top': ['today', null],
    '#today': ['today', null],
    '#backing-lab': ['studio', 'backing'],
    '#chord-lab': ['studio', 'chords'],
    '#roadmap': ['roadmap', null],
    '#library': ['roadmap', 'library'],
    '#guitar': ['roadmap', 'gear']
  };
  for (const [hash, [name, subroute]] of Object.entries(cases)) {
    const route = parseHash(hash);
    assert.equal(route.name, name, hash);
    assert.equal(route.subroute, subroute, hash);
  }
});

test('parseHash accepts the supported nested Studio routes', async () => {
  const { parseHash } = await loadRouter();
  for (const subroute of ['input', 'recording', 'backing', 'fretboard', 'chords']) {
    assert.deepEqual(JSON.parse(JSON.stringify(parseHash(`#/studio/${subroute}`))), {
      name: 'studio', subroute, hash: `#/studio/${subroute}`, title: 'Studio'
    });
  }
});

test('browser router updates on hash history changes and exposes one current destination', async () => {
  const HashRouter = await loadRouter();
  const fixture = browserFixture('#/today');
  const router = HashRouter.create({ window: fixture.window, document: fixture.document });
  router.start();

  fixture.window.location.hash = '#/progress';
  fixture.listeners.get('hashchange')();

  assert.equal(fixture.views.find((view) => view.dataset.routeView === 'progress').hidden, false);
  assert.equal(fixture.views.filter((view) => view.hidden).length, 4);
  assert.deepEqual(fixture.links.map((link) => link.getAttribute('aria-current')), [null, null, null, 'page', null]);
  assert.equal(fixture.document.title, 'Progress | Guthrie Complete Musician');
  assert.equal(fixture.document.body.dataset.route, 'progress');
  assert.deepEqual(JSON.parse(JSON.stringify(fixture.headings.get('progress').focusOptions)), [{ preventScroll: true }]);
});

test('browser router uses instant scrolling when reduced motion is requested', async () => {
  const HashRouter = await loadRouter();
  const fixture = browserFixture('#/roadmap');
  fixture.window.matchMedia = () => ({ matches: true });
  HashRouter.create({ window: fixture.window, document: fixture.document }).start();

  assert.deepEqual(JSON.parse(JSON.stringify(fixture.scrollCalls)), [{ top: 0, left: 0, behavior: 'auto' }]);
});

test('browser router scrolls legacy deep links to their matching section', async () => {
  const HashRouter = await loadRouter();
  const fixture = browserFixture('#backing-lab');
  const backingSection = fixture.studioSections.get('backing');

  HashRouter.create({ window: fixture.window, document: fixture.document }).start();

  assert.deepEqual(JSON.parse(JSON.stringify(backingSection.scrollOptions)), [
    { behavior: 'smooth', block: 'start' }
  ]);
  assert.equal(fixture.scrollCalls.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(backingSection.heading.focusOptions)), [{ preventScroll: true }]);
});

test('skip navigation focuses and scrolls the current route without changing it', async () => {
  const HashRouter = await loadRouter();
  for (const name of ['studio', 'progress', 'session']) {
    const fixture = browserFixture(`#/${name}`);
    const router = HashRouter.create({ window: fixture.window, document: fixture.document });
    router.start();
    fixture.headings.get(name).focusOptions.length = 0;
    fixture.scrollCalls.length = 0;
    let prevented = false;

    fixture.skipLink.dispatch('click', { preventDefault() { prevented = true; } });

    assert.equal(prevented, true, name);
    assert.equal(fixture.window.location.hash, `#/${name}`, name);
    assert.equal(router.getRoute().name, name);
    assert.deepEqual(JSON.parse(JSON.stringify(fixture.headings.get(name).focusOptions)), [{ preventScroll: true }], name);
    assert.deepEqual(JSON.parse(JSON.stringify(fixture.scrollCalls)), [{ top: 0, left: 0, behavior: 'smooth' }], name);
  }
});

test('browser router deactivates the current controller before hiding its view', async () => {
  const HashRouter = await loadRouter();
  const fixture = browserFixture('#/studio/backing');
  const observations = [];
  const router = HashRouter.create({
    window: fixture.window,
    document: fixture.document,
    onDeactivate(route) {
      observations.push({ name: route.name, hidden: fixture.views.find((view) => view.dataset.routeView === route.name).hidden });
    }
  });
  router.start();

  fixture.window.location.hash = '#/progress';
  fixture.listeners.get('hashchange')();

  assert.deepEqual(JSON.parse(JSON.stringify(observations)), [{ name: 'studio', hidden: false }]);
});

test('every nested Studio route scrolls and focuses its matching selected section', async () => {
  const HashRouter = await loadRouter();
  for (const subroute of ['input', 'recording', 'backing', 'fretboard', 'chords']) {
    const fixture = browserFixture(`#/studio/${subroute}`);
    HashRouter.create({ window: fixture.window, document: fixture.document }).start();
    const section = fixture.studioSections.get(subroute);
    const selected = fixture.sectionLinks.filter((link) => link.dataset.selected === 'true');

    assert.deepEqual(JSON.parse(JSON.stringify(section.scrollOptions)), [{ behavior: 'smooth', block: 'start' }], subroute);
    assert.deepEqual(JSON.parse(JSON.stringify(section.heading.focusOptions)), [{ preventScroll: true }], subroute);
    assert.equal(selected.length, 1, subroute);
    assert.equal(selected[0].dataset.routeSectionLink, subroute);
    assert.equal(selected[0].getAttribute('aria-current'), 'location');
  }
});
