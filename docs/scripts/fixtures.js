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

/* ---- Full card ---- */

const STORY_ROUNDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

function buildCard(round, lang, today) {
  const state   = gameState(round, today);
  const classes = ['fixture-card'];
  if (state === 'today')     classes.push('fixture-card--today');
  else if (state === 'past') classes.push('fixture-card--past');
  else if (state === 'tbd')  classes.push('fixture-card--tbd');

  const inner = lang === 'bg' ? cardBg(round, state) : cardEn(round, state);

  const storyBtn = lang === 'bg' && (state === 'past' || (state === 'today' && hasResult(round))) && STORY_ROUNDS.has(round.round)
    ? `<button class="card-story-btn" data-round="${round.round}">📖 Прочети историята</button>`
    : '';

  return `
    <article class="${classes.join(' ')}" data-round="${round.round}" data-state="${state}">
      ${inner}
      ${scoreRow(round, lang, state)}
      ${storyBtn}
    </article>`;
}

/* ---- Screen entry point ---- */

export async function renderFixtures(lang) {
  const app   = document.getElementById('app');
  const isEn  = lang === 'en';
  const today = new Date().toISOString().split('T')[0];

  // Header menu — only links to pages that exist, per language.
  const menuItems = isEn
    ? [
        { href: '#/en/tracker', label: '📊 Track a Game' },
        { href: '#/en',         label: '📅 Fixtures &amp; Results', current: true },
        { href: '#/',           label: '🏠 Home' },
      ]
    : [
        { href: '#/bg',                 label: '📅 Мачове &amp; Резултати', current: true },
        { href: '#/bg/story/prologue',  label: '📖 Историята' },
        { href: '#/',                   label: '🏠 Начало' },
      ];

  const menuHtml = menuItems.map(it =>
    `<button class="header-menu__item${it.current ? ' header-menu__item--current' : ''}" data-href="${it.href}">${it.label}</button>`
  ).join('');

  app.innerHTML = `
    <div class="screen">
      <header class="screen-header">
        <button class="back-btn" id="back-btn" aria-label="${isEn ? 'Back' : 'Назад'}">‹</button>
        <div class="screen-header__mid">
          <div class="screen-header__club">Hammond Park Blue</div>
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
      const href = item.dataset.href;
      closeMenu();
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
        window.location.hash = `#/bg/story/${btn.dataset.round}`;
      });
    });
    const prologueCard = document.getElementById('prologue-card');
    if (prologueCard) {
      prologueCard.addEventListener('click', () => {
        window.location.hash = '#/bg/story/prologue';
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

      const prologueHtml = lang === 'bg' ? `
        <button class="prologue-card" id="prologue-card" type="button">
          <div class="prologue-card__text">
            <div class="prologue-card__label">Пролог</div>
            <div class="prologue-card__title">Оранжевите бутонки</div>
          </div>
          <span class="prologue-card__arrow">›</span>
        </button>` : '';

      list.innerHTML = prologueHtml + currentRounds.map(r => buildCard(r, lang, today)).join('');
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
