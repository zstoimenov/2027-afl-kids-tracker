import { renderFixtures } from './fixtures.js';
import { renderTracker }  from './tracker.js';
import { renderStory, renderSeasonPicker, renderSeasonStory, renderReports, renderReport, renderSeasonArc } from './story.js';
import { isUnlocked, renderLock } from './auth.js';
import { showInstallSheet } from './menu.js';
import { icon } from './icons.js';
import { getConfig, teamName } from './config.js';

const LANDING_HTML = document.getElementById('app').innerHTML;

function renderLanding() {
  const app = document.getElementById('app');
  app.innerHTML = LANDING_HTML;
  app.querySelectorAll('.flag').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = `#/${btn.dataset.lang}`;
    });
  });
  // Install prompt lives only on the home screen, in Bulgarian.
  const installBtn = app.querySelector('#install-btn');
  if (installBtn) {
    installBtn.innerHTML = `${icon('install')}<span>Инсталирай приложението</span>`;
    installBtn.addEventListener('click', () => showInstallSheet('bg'));
  }
  // Team name and season come from season-config.json so they roll over each
  // year without touching the markup.
  getConfig().then(cfg => {
    const title = app.querySelector('.landing__title');
    const sub   = app.querySelector('.landing__subtitle');
    if (title) title.textContent = teamName(cfg);
    if (sub) {
      const season = cfg && cfg.season ? cfg.season : new Date().getFullYear();
      sub.textContent = `AFL Junior League · Season ${season}`;
    }
  });
}

// Gate a render behind the side's password (whole EN side / whole BG side).
// Once unlocked, it stays unlocked for the rest of the session.
function guard(side, render) {
  if (isUnlocked(side)) render();
  else renderLock(side, render);
}

function route() {
  const hash = window.location.hash.replace(/^#/, '') || '/';

  if (hash.startsWith('/en/tracker')) {
    const seg = hash.split('/')[3];
    guard('en', () => renderTracker('en', seg ? parseInt(seg, 10) : null));
    return;
  }
  if (hash.startsWith('/en/report/')) {
    const date = hash.split('/')[3];
    guard('en', () => renderReport('en', date));
    return;
  }
  if (hash.startsWith('/en/reports')) {
    guard('en', () => renderReports('en'));
    return;
  }
  if (hash.startsWith('/bg/seasons')) {
    guard('bg', () => renderSeasonPicker('bg'));
    return;
  }
  if (hash.startsWith('/bg/season/')) {
    const year = parseInt(hash.split('/')[3], 10);
    guard('bg', () => renderSeasonStory('bg', year));
    return;
  }
  if (hash.startsWith('/bg/story')) {
    // Forms: /bg/story/<id>  or  /bg/story/<year>/<id>
    const parts = hash.split('/').filter(Boolean); // ['bg','story', a, b?]
    guard('bg', () => {
      if (parts.length >= 4) {
        const year = parseInt(parts[2], 10);
        renderStory('bg', parts[3], Number.isNaN(year) ? undefined : year);
      } else {
        renderStory('bg', parts[2] || 'prologue');
      }
    });
    return;
  }
  if (hash === '/en/arc') { guard('en', () => renderSeasonArc('en')); return; }
  if (hash === '/bg/arc') { guard('bg', () => renderSeasonArc('bg')); return; }
  if (hash === '/en') { guard('en', () => renderFixtures('en')); return; }
  if (hash === '/bg') { guard('bg', () => renderFixtures('bg')); return; }

  renderLanding();
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
