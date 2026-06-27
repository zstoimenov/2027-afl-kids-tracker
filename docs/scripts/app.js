import { renderFixtures } from './fixtures.js';
import { renderTracker }  from './tracker.js';
import { renderStory, renderSeasonPicker, renderSeasonStory } from './story.js';

const LANDING_HTML = document.getElementById('app').innerHTML;

function renderLanding() {
  const app = document.getElementById('app');
  app.innerHTML = LANDING_HTML;
  app.querySelectorAll('.flag').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = `#/${btn.dataset.lang}`;
    });
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
  if (hash.startsWith('/bg/seasons')) {
    renderSeasonPicker('bg');
    return;
  }
  if (hash.startsWith('/bg/season/')) {
    const year = parseInt(hash.split('/')[3], 10);
    renderSeasonStory('bg', year);
    return;
  }
  if (hash.startsWith('/bg/story')) {
    // Forms: /bg/story/<id>  or  /bg/story/<year>/<id>
    const parts = hash.split('/').filter(Boolean); // ['bg','story', a, b?]
    if (parts.length >= 4) {
      const year = parseInt(parts[2], 10);
      renderStory('bg', parts[3], Number.isNaN(year) ? undefined : year);
    } else {
      renderStory('bg', parts[2] || 'prologue');
    }
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
