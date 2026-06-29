/* =========================================================
   Shared header menu (top-right on every page).
   Lists only the OTHER pages — the current page and "Home" are
   omitted (the back button covers going home).
   ========================================================= */

import { icon } from './icons.js';

const PAGES = {
  en: [
    { key: 'tracker',  href: '#/en/tracker', ic: 'track',    label: 'Track a Game' },
    { key: 'reports',  href: '#/en/reports', ic: 'reports',  label: 'Match Reports' },
    { key: 'challenges', href: '#/en/challenges', ic: 'trophy', label: 'Challenges' },
    { key: 'season',   href: '#/en/arc',     ic: 'season',   label: 'Season Summary' },
    { key: 'fixtures', href: '#/en',         ic: 'fixtures', label: 'Fixtures &amp; Results' },
  ],
  bg: [
    { key: 'fixtures', href: '#/bg',         ic: 'fixtures', label: 'Мачове &amp; Резултати' },
    { key: 'stories',  href: '#/bg/seasons', ic: 'stories',  label: 'Истории' },
    { key: 'challenges', href: '#/bg/challenges', ic: 'trophy', label: 'Предизвикателства' },
    { key: 'season',   href: '#/bg/arc',     ic: 'season',   label: 'Сезонен преглед' },
  ],
};

// Header markup for the menu, excluding the page you're on (currentKey).
// `extras` are screen-specific action items (e.g. New Game on the tracker).
export function menuButtonHtml(lang, currentKey, extras = []) {
  const items = (PAGES[lang] || []).filter(it => it.key !== currentKey);
  const extraHtml = extras
    .map(e => `<button class="header-menu__item header-menu__item--action" data-action="${e.action}">${icon(e.ic)}<span>${e.label}</span></button>`)
    .join('');
  const links = items
    .map(it => `<button class="header-menu__item" data-href="${it.href}">${icon(it.ic)}<span>${it.label}</span></button>`)
    .join('');
  const ariaLabel = lang === 'bg' ? 'Меню' : 'Menu';
  return `
    <div class="header-menu-wrap">
      <button class="menu-btn" id="menu-btn" aria-label="${ariaLabel}" aria-expanded="false" aria-haspopup="true">${icon('menu')}</button>
      <nav class="header-menu" id="header-menu" hidden>${extraHtml}${links}</nav>
    </div>`;
}

// Wire open/close + navigation. onAction(actionName) handles extra items.
export function attachMenu(lang, onAction) {
  const menuBtn = document.getElementById('menu-btn');
  const menuNav = document.getElementById('header-menu');
  if (!menuBtn || !menuNav) return;

  function closeMenu() {
    menuNav.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onOutside);
  }
  function onOutside(e) { if (!e.target.closest('.header-menu-wrap')) closeMenu(); }

  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    const open = menuNav.hidden;
    menuNav.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) document.addEventListener('click', onOutside);
    else document.removeEventListener('click', onOutside);
  });

  menuNav.querySelectorAll('.header-menu__item').forEach(item => {
    item.addEventListener('click', () => {
      const { href, action } = item.dataset;
      closeMenu();
      if (action) { onAction?.(action); return; }
      if (href && href !== window.location.hash) window.location.hash = href;
    });
  });
}

/* ---- PWA install instructions ---- */

export function showInstallSheet(lang) {
  const isEn = lang === 'en';
  const ua   = navigator.userAgent || '';
  const isIOS     = /iPad|iPhone|iPod/.test(ua) ||
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);

  const iosSteps = isEn
    ? ['Open this page in <strong>Safari</strong>.',
       'Tap the <strong>Share</strong> button — a square with an upward arrow.',
       'Scroll down and tap <strong>Add to Home Screen</strong>.',
       'Tap <strong>Add</strong> — the app icon appears on your home screen.']
    : ['Отворете тази страница в <strong>Safari</strong>.',
       'Натиснете бутона <strong>Споделяне</strong> — квадратче със стрелка нагоре.',
       'Превъртете надолу и изберете <strong>Към началния екран</strong>.',
       'Натиснете <strong>Добави</strong> — иконата ще се появи на началния екран.'];

  const androidSteps = isEn
    ? ['Open this page in <strong>Chrome</strong>.',
       'Tap the <strong>⋮</strong> menu (top-right).',
       'Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).',
       'Confirm — the app icon appears on your home screen.']
    : ['Отворете тази страница в <strong>Chrome</strong>.',
       'Натиснете менюто <strong>⋮</strong> (горе вдясно).',
       'Изберете <strong>Инсталиране на приложението</strong> (или <strong>Добавяне към началния екран</strong>).',
       'Потвърдете — иконата ще се появи на началния екран.'];

  const block = (title, steps, primary) => `
    <div class="install-block${primary ? ' install-block--primary' : ''}">
      <div class="install-block__title">${title}</div>
      <ol class="install-steps">${steps.map(s => `<li>${s}</li>`).join('')}</ol>
    </div>`;

  const ios = block('iPhone / iPad (Safari)', iosSteps, isIOS);
  const and = block('Android (Chrome)', androidSteps, isAndroid);
  const finalBlocks = isAndroid ? and + ios : ios + and;

  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `
    <div class="sheet install-sheet">
      <div class="sheet-title">${isEn ? 'Install the App' : 'Инсталиране на приложението'}</div>
      <div class="sheet-hint">${isEn
        ? 'Add it to your home screen — opens full-screen, works offline.'
        : 'Добавете я на началния екран — отваря се на цял екран и работи офлайн.'}</div>
      <div class="install-blocks">${finalBlocks}</div>
      <button class="sheet-cancel" id="install-close">${isEn ? 'CLOSE' : 'ЗАТВОРИ'}</button>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#install-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (!e.target.closest('.install-sheet')) close(); });
}
