/* =========================================================
   2027 AFL Kids Tracker — PWA shell entry point.
   Phase 1: landing page language selection + SW registration.
   Screens (tracker, reports, fixtures, stories) arrive in
   later phases; this file just wires up the shell.
   ========================================================= */

const STATUS = document.getElementById('status');

const MESSAGES = {
  en: 'English side coming soon — tracker, reports & fixtures.',
  bg: 'Българската страница идва скоро — истории и резултати.',
};

/**
 * Remember the chosen language and route to the relevant side.
 * Routing targets are placeholders until later phases add screens.
 */
function selectLanguage(lang) {
  try {
    localStorage.setItem('afl.lang', lang);
  } catch (_) {
    /* storage may be unavailable (private mode) — non-fatal */
  }
  if (STATUS) STATUS.textContent = MESSAGES[lang] || '';
  // Reflect the choice in the URL hash so later phases can deep-link.
  window.location.hash = `#/${lang}`;
}

document.querySelectorAll('.flag').forEach((button) => {
  button.addEventListener('click', () => {
    selectLanguage(button.dataset.lang);
  });
});

/* ---------------- PWA: service worker ---------------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
