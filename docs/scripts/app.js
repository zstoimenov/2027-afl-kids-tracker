import { renderFixtures } from './fixtures.js';
import { renderTracker }  from './tracker.js';
import { renderStory }    from './story.js';

const LANDING_HTML = document.getElementById('app').innerHTML;

function renderLanding() {
  const app = document.getElementById('app');
  app.innerHTML = LANDING_HTML;
  app.querySelectorAll('.flag').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = `#/${btn.dataset.lang}`;
    });
  });
  const trackBtn = app.querySelector('#track-btn');
  if (trackBtn) trackBtn.addEventListener('click', () => {
    window.location.hash = '#/en/tracker';
  });
}

const ROUTES = {
  '':    renderLanding,
  '/':   renderLanding,
  '/en': () => renderFixtures('en'),
  '/bg': () => renderFixtures('bg'),
};

function route() {
  const hash = window.location.hash.replace(/^#/, '') || '/';

  if (hash.startsWith('/en/tracker')) {
    const seg = hash.split('/')[3];
    renderTracker('en', seg ? parseInt(seg, 10) : null);
    return;
  }
  if (hash.startsWith('/bg/tracker')) {
    const seg = hash.split('/')[3];
    renderTracker('bg', seg ? parseInt(seg, 10) : null);
    return;
  }

  if (hash.startsWith('/bg/story')) {
    const seg = hash.split('/')[3] || 'prologue';
    renderStory('bg', seg);
    return;
  }

  (ROUTES[hash] ?? renderLanding)();
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}
