/* =========================================================
   Shared header menu (top-right on every page).
   Lists only the OTHER pages — the current page and "Home" are
   omitted (the back button covers going home).
   ========================================================= */

const PAGES = {
  en: [
    { key: 'tracker',  href: '#/en/tracker', label: '📊 Track a Game' },
    { key: 'reports',  href: '#/en/reports', label: '🏆 Match Reports' },
    { key: 'fixtures', href: '#/en',         label: '📅 Fixtures &amp; Results' },
  ],
  bg: [
    { key: 'fixtures', href: '#/bg',         label: '📅 Мачове &amp; Резултати' },
    { key: 'stories',  href: '#/bg/seasons', label: '📖 Истории' },
  ],
};

const INSTALL_LABEL = { en: '📲 Install App', bg: '📲 Инсталирай приложението' };

// Header markup for the menu, excluding the page you're on (currentKey).
export function menuButtonHtml(lang, currentKey) {
  const items = (PAGES[lang] || []).filter(it => it.key !== currentKey);
  const links = items
    .map(it => `<button class="header-menu__item" data-href="${it.href}">${it.label}</button>`)
    .join('');
  const install = `<button class="header-menu__item" data-action="install">${INSTALL_LABEL[lang] || INSTALL_LABEL.en}</button>`;
  const ariaLabel = lang === 'bg' ? 'Меню' : 'Menu';
  return `
    <div class="header-menu-wrap">
      <button class="menu-btn" id="menu-btn" aria-label="${ariaLabel}" aria-expanded="false" aria-haspopup="true">☰</button>
      <nav class="header-menu" id="header-menu" hidden>${links}${install}</nav>
    </div>`;
}

// Wire open/close + navigation. Call after the header is in the DOM.
export function attachMenu(lang) {
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
      if (action === 'install') { showInstallSheet(lang); return; }
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
