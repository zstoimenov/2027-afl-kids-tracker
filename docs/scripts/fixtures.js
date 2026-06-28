import { getConfig, teamName } from './config.js';

const MONTHS_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MONTHS_BG = ['ЯНУ','ФЕВ','МАР','АПР','МАЙ','ЮНИ','ЮЛИ','АВГ','СЕП','ОКТ','НОЕ','ДЕК'];
const BASE_SEASON = 2026;

/* ---- Time conversion (AWST UTC+8 → 24h display) ---- */

function parseAWST(str) {
  if (!str) return null;
  const m = str.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toLowerCase();
  if (ap === 'am' && h === 12) h = 0;
  if (ap === 'pm' && h !== 12) h += 12;
  return { h, min };
}

function displayTime(str, lang) {
  const t = parseAWST(str);
  if (!t) return '';
  if (lang === 'bg') {
    const h = (t.h - 5 + 24) % 24;
    return `${String(h).padStart(2, '0')}:${String(t.min).padStart(2, '0')}`;
  }
  return `${String(t.h).padStart(2, '0')}:${String(t.min).padStart(2, '0')} AWST`;
}

/* ---- Date formatting ---- */

function fmtDate(dateStr, lang) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d} ${(lang === 'bg' ? MONTHS_BG : MONTHS_EN)[m - 1]}`;
}

function fmtScore(t) {
  if (t.goals === 0 && t.behinds === 0 && t.score > 0) return `${t.score}`;
  if (t.goals === 0 && t.behinds === 0) return '—';
  return `${t.goals}.${t.behinds} (${t.score})`;
}

/* ---- Round helpers ---- */

function hasResult(round) {
  return round.result && round.result.winner !== '';
}

function opponent(round) {
  if (!round.homeAway) return '';
  return round.homeAway === 'home' ? round.awayTeam : round.homeTeam;
}

function gameState(round, today) {
  if (!round.date) return 'tbd';
  if (round.date === today) return 'today';
  if (round.date < today) return 'past';
  return 'upcoming';
}

/* ---- Game data pipeline: results come from saved game files ---- */

// index.json lists which dates have a game-YYYY-MM-DD.json saved.
async function loadGameIndex() {
  try {
    const resp = await fetch('./data/games/index.json');
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data.games) ? data.games : [];
  } catch { return []; }
}

// Derive a fixtures-shaped result from a saved game file's totals.
async function loadGameResult(date) {
  try {
    const resp = await fetch(`./data/games/game-${date}.json`);
    if (!resp.ok) return null;
    const ts = (await resp.json()).totals?.teamScore;
    if (!ts || !ts.hammondPark || !ts.opposition) return null;
    const hp = ts.hammondPark, opp = ts.opposition;
    const winner = hp.score > opp.score ? 'hammondPark'
                 : opp.score > hp.score ? 'opposition' : 'draw';
    return { hammondPark: hp, opposition: opp, winner };
  } catch { return null; }
}

// Build a date -> result map for the given season (overrides fixtures.json).
async function loadSeasonResults(year) {
  const dates = (await loadGameIndex()).filter(d => d.startsWith(`${year}-`));
  const map = {};
  await Promise.all(dates.map(async d => {
    const r = await loadGameResult(d);
    if (r) map[d] = r;
  }));
  return map;
}

/* ---- English card ---- */

function cardEn(round, state) {
  const opp = opponent(round) || 'TBD';
  const ha  = round.homeAway;

  const haChip = ha
    ? `<span class="ha-chip ha-chip--${ha}">${ha === 'home' ? 'HOME' : 'AWAY'}</span>`
    : '';

  const todayPill = state === 'today' ? `<span class="today-dot">TODAY</span>` : '';
  const timeStr   = displayTime(round.time, 'en');

  return `
    <div class="fixture-card__top">
      <span class="round-label">RD ${round.round}</span>
      <div class="fixture-card__top-mid">
        <span class="date-label">${fmtDate(round.date, 'en') || 'TBD'}</span>
        ${todayPill}
      </div>
      ${haChip}
    </div>
    <div class="fixture-card__opponent">${opp}</div>
    <div class="fixture-card__venue">
      <span class="venue-name">${round.ground || 'Venue TBD'}</span>
      ${timeStr ? `<span class="venue-time">${timeStr}</span>` : ''}
    </div>`;
}

/* ---- Bulgarian card ---- */

function bgNarrative(round, state) {
  const opp = opponent(round);
  if (!opp) return 'Предстои уточняване';
  const ha = round.homeAway;

  if (state === 'today') {
    return ha === 'home'
      ? `Алек посреща <strong>${opp}</strong> у дома`
      : `Алек играе на гости срещу <strong>${opp}</strong>`;
  }
  if (state === 'past') {
    return ha === 'home'
      ? `Алек посрещна <strong>${opp}</strong> у дома`
      : `Алек пътува до ${round.ground || 'гостите'} срещу <strong>${opp}</strong>`;
  }
  return ha === 'home'
    ? `Алек ще посрещне <strong>${opp}</strong> у дома`
    : `Алек ще пътува до ${round.ground || 'гостите'} срещу <strong>${opp}</strong>`;
}

function cardBg(round, state) {
  const ha = round.homeAway;

  const haChip = ha
    ? `<span class="ha-chip ha-chip--${ha}">${ha === 'home' ? 'У ДОМА' : 'НА ГОСТИ'}</span>`
    : '';

  const todayPill = state === 'today' ? `<span class="today-dot">ДНЕС</span>` : '';
  const timeStr   = displayTime(round.time, 'bg');

  return `
    <div class="fixture-card__top">
      <span class="round-label">КР ${round.round}</span>
      <div class="fixture-card__top-mid">
        <span class="date-label">${fmtDate(round.date, 'bg') || 'ПРЕДСТОИ'}</span>
        ${todayPill}
      </div>
      ${haChip}
    </div>
    <div class="fixture-card__narrative">${bgNarrative(round, state)}</div>
    <div class="fixture-card__venue">
      <span class="venue-name">${round.ground || 'Стадионът предстои'}</span>
      ${timeStr ? `<span class="venue-time">${timeStr}</span>` : ''}
    </div>`;
}

/* ---- Score row ---- */

function scoreRow(round, lang, state) {
  const isEn = lang === 'en';

  if (!hasResult(round)) {
    if (state === 'today' && isEn) {
      return `<div class="score-dash score-dash--track">
        <button class="card-track-btn" data-round="${round.round}" data-lang="${lang}">
          ▶ TRACK GAME
        </button>
      </div>`;
    }
    return `<div class="score-dash">— · —</div>`;
  }

  const hp  = round.result.hammondPark;
  const opp = round.result.opposition;
  const w   = round.result.winner;

  const hpWon  = w === 'hammondPark';
  const oppWon = w === 'opposition';

  const chip = hpWon
    ? (isEn ? 'WIN' : 'ПОБЕДА')
    : oppWon
      ? (isEn ? 'LOSS' : 'ЗАГУБА')
      : (isEn ? 'DRAW' : 'РАВЕНСТВО');

  const chipClass = hpWon ? 'win' : oppWon ? 'loss' : 'draw';
  const oppName   = (opponent(round) || 'OPP').toUpperCase().substring(0, 11);

  // Home team always renders on the LEFT.
  const isHome   = round.homeAway === 'home';
  const hpBlock  = `<span class="score-team__name">HP BLUE</span>
        <span class="score-team__value">${fmtScore(hp)}</span>`;
  const oppBlock = `<span class="score-team__name">${oppName}</span>
        <span class="score-team__value">${fmtScore(opp)}</span>`;
  const leftBlock  = isHome ? hpBlock : oppBlock;
  const rightBlock = isHome ? oppBlock : hpBlock;

  return `
    <div class="score-row">
      <div class="score-team">
        ${leftBlock}
      </div>
      <div class="score-mid">
        <span class="score-sep">·</span>
        <span class="result-chip result-chip--${chipClass}">${chip}</span>
      </div>
      <div class="score-team score-team--right">
        ${rightBlock}
      </div>
    </div>`;
}

/* ---- Story metadata (which rounds have a story, for the viewed season) ---- */

async function loadStoryMeta(year) {
  try {
    const resp = await fetch(`./data/stories/${year}.json`);
    if (!resp.ok) return { rounds: new Set(), prologue: null };
    const data = await resp.json();
    return {
      rounds:   new Set((data.rounds || []).map(r => r.round)),
      prologue: data.prologue || null,
    };
  } catch {
    return { rounds: new Set(), prologue: null };
  }
}

// "Пролог — Оранжевите бутонки" → "Оранжевите бутонки"
function prologueShort(title) {
  return (title || '').replace(/^Пролог\s*[—–-]\s*/i, '').trim() || title || 'Пролог';
}

/* ---- Full card ---- */

function buildCard(round, lang, today, year, storyRounds) {
  const state   = gameState(round, today);
  const classes = ['fixture-card'];
  if (state === 'today')     classes.push('fixture-card--today');
  else if (state === 'past') classes.push('fixture-card--past');
  else if (state === 'tbd')  classes.push('fixture-card--tbd');
  if (round.homeAway === 'home')      classes.push('fixture-card--home');
  else if (round.homeAway === 'away') classes.push('fixture-card--away');

  const inner = lang === 'bg' ? cardBg(round, state) : cardEn(round, state);

  const storyBtn = lang === 'bg' && (state === 'past' || (state === 'today' && hasResult(round))) && storyRounds.has(round.round)
    ? `<button class="card-story-btn" data-round="${round.round}" data-year="${year}">📖 Прочети историята</button>`
    : '';

  return `
    <article class="${classes.join(' ')}" data-round="${round.round}" data-state="${state}">
      ${inner}
      ${scoreRow(round, lang, state)}
      ${storyBtn}
    </article>`;
}

/* ---- PWA install instructions ---- */

function showInstallSheet(lang) {
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

  const iosTitle = 'iPhone / iPad (Safari)';
  const andTitle = 'Android (Chrome)';
  const ios = block(iosTitle, iosSteps, isIOS);
  const and = block(andTitle, androidSteps, isAndroid);
  // Show the detected platform first; on desktop show both, unhighlighted.
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

/* ---- Screen entry point ---- */

export async function renderFixtures(lang) {
  const app   = document.getElementById('app');
  const isEn  = lang === 'en';
  const today = new Date().toISOString().split('T')[0];
  const club  = teamName(await getConfig());

  // Header menu — only links to pages that exist, per language.
  const menuItems = isEn
    ? [
        { href: '#/en/tracker', label: '📊 Track a Game' },
        { href: '#/en',         label: '📅 Fixtures &amp; Results', current: true },
        { action: 'install',    label: '📲 Install App' },
        { href: '#/',           label: '🏠 Home' },
      ]
    : [
        { href: '#/bg',          label: '📅 Мачове &amp; Резултати', current: true },
        { href: '#/bg/seasons',  label: '📖 Истории' },
        { action: 'install',     label: '📲 Инсталирай приложението' },
        { href: '#/',            label: '🏠 Начало' },
      ];

  const menuHtml = menuItems.map(it =>
    it.action
      ? `<button class="header-menu__item" data-action="${it.action}">${it.label}</button>`
      : `<button class="header-menu__item${it.current ? ' header-menu__item--current' : ''}" data-href="${it.href}">${it.label}</button>`
  ).join('');

  app.innerHTML = `
    <div class="screen">
      <header class="screen-header">
        <button class="back-btn" id="back-btn" aria-label="${isEn ? 'Back' : 'Назад'}">‹</button>
        <div class="screen-header__mid">
          <div class="screen-header__club">${club}</div>
          <h1 class="screen-header__title">${isEn ? 'Fixtures &amp; Results' : 'Мачове &amp; Резултати'}</h1>
        </div>
        <div class="header-menu-wrap">
          <button class="menu-btn" id="menu-btn" aria-label="${isEn ? 'Menu' : 'Меню'}" aria-expanded="false" aria-haspopup="true">☰</button>
          <nav class="header-menu" id="header-menu" hidden>${menuHtml}</nav>
        </div>
      </header>

      <div class="year-bar">
        <button class="year-btn year-btn--prev" id="year-prev"
          aria-label="${isEn ? 'Previous season' : 'Предишен сезон'}">‹</button>
        <span class="year-label" id="year-label">—</span>
        <button class="year-btn year-btn--next" id="year-next"
          aria-label="${isEn ? 'Next season' : 'Следващ сезон'}">›</button>
      </div>

      <div class="fixtures-list" id="fixtures-list">
        <div class="screen-loading">${isEn ? 'Loading…' : 'Зарежда се…'}</div>
      </div>
    </div>`;

  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.hash = '#/';
  });

  // ---- Header menu ----
  const menuBtn  = document.getElementById('menu-btn');
  const menuNav  = document.getElementById('header-menu');

  function closeMenu() {
    menuNav.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onOutside);
  }
  function onOutside(e) {
    if (!e.target.closest('.header-menu-wrap')) closeMenu();
  }
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
      // Navigating to the page we're already on won't fire hashchange — just close.
      if (href !== window.location.hash) window.location.hash = href;
    });
  });

  let selectedYear  = parseInt(today.slice(0, 4), 10);
  let currentRounds = [];

  function attachListeners() {
    document.querySelectorAll('.card-track-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        window.location.hash = `#/${btn.dataset.lang}/tracker/${btn.dataset.round}`;
      });
    });
    // EN only: tapping today's fixture card opens the tracker, ready to start.
    if (isEn) {
      document.querySelectorAll('.fixture-card--today').forEach(card => {
        card.classList.add('fixture-card--tappable');
        card.addEventListener('click', () => {
          window.location.hash = `#/en/tracker/${card.dataset.round}`;
        });
      });
    }
    document.querySelectorAll('.card-story-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.hash = `#/bg/story/${btn.dataset.year}/${btn.dataset.round}`;
      });
    });
    const prologueCard = document.getElementById('prologue-card');
    if (prologueCard) {
      prologueCard.addEventListener('click', () => {
        window.location.hash = `#/bg/story/${prologueCard.dataset.year}/prologue`;
      });
    }
  }

  async function loadAndRender(year) {
    const list = document.getElementById('fixtures-list');
    list.innerHTML = `<div class="screen-loading">${isEn ? 'Loading…' : 'Зарежда се…'}</div>`;
    document.getElementById('year-label').textContent = year;
    document.getElementById('year-prev').disabled = year <= BASE_SEASON;

    try {
      const url  = year === BASE_SEASON ? './data/fixtures.json' : `./data/fixtures-${year}.json`;
      const resp = await fetch(url);
      if (!resp.ok) throw Object.assign(new Error(resp.statusText), { status: resp.status });
      const data = await resp.json();

      currentRounds = data.rounds;

      // Game data pipeline: where a game file is saved, its result overrides
      // whatever is hard-coded in fixtures.json (single source of truth = the game).
      const results = await loadSeasonResults(year);
      currentRounds.forEach(r => {
        if (r.date && results[r.date]) r.result = results[r.date];
      });

      // Discover which rounds (and prologue) have a story for THIS season.
      const story = lang === 'bg'
        ? await loadStoryMeta(year)
        : { rounds: new Set(), prologue: null };

      const prologueHtml = (lang === 'bg' && story.prologue) ? `
        <button class="prologue-card" id="prologue-card" data-year="${year}" type="button">
          <div class="prologue-card__text">
            <div class="prologue-card__label">Пролог</div>
            <div class="prologue-card__title">${prologueShort(story.prologue.title)}</div>
          </div>
          <span class="prologue-card__arrow">›</span>
        </button>` : '';

      list.innerHTML = prologueHtml + currentRounds.map(r => buildCard(r, lang, today, year, story.rounds)).join('');
      attachListeners();

      const todayCard = list.querySelector('[data-state="today"]');
      if (todayCard) requestAnimationFrame(() =>
        todayCard.scrollIntoView({ behavior: 'smooth', block: 'center' }));

    } catch (err) {
      if (err.status === 404) {
        list.innerHTML = `
          <div class="screen-coming-soon">
            <div class="coming-soon__icon">📅</div>
            <div class="coming-soon__text">${
              isEn ? `${year} season coming soon` : `Сезон ${year} предстои`
            }</div>
          </div>`;
      } else {
        list.innerHTML = `<div class="screen-error">${
          isEn ? 'Could not load fixtures.' : 'Грешка при зареждане.'
        }</div>`;
      }
    }
  }

  document.getElementById('year-prev').addEventListener('click', () => {
    if (selectedYear > BASE_SEASON) { selectedYear--; loadAndRender(selectedYear); }
  });

  document.getElementById('year-next').addEventListener('click', () => {
    selectedYear++;
    loadAndRender(selectedYear);
  });

  loadAndRender(selectedYear);
}
