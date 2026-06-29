import { getConfig, teamName } from './config.js';
import { menuButtonHtml, attachMenu } from './menu.js';
import { icon } from './icons.js';
import { injectChipStrip } from './challenges.js';

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

// For recorded games, the card shows the match-report headline (the "story
// title") instead of the bare opponent line. Build a date -> headline map.
async function loadStoryHeadlines(dates, lang) {
  const map = {};
  await Promise.all(dates.map(async d => {
    try {
      const resp = await fetch(`./data/stories/story-${d}.json`);
      if (!resp.ok) return;
      const data = await resp.json();
      const headline = (lang === 'bg' ? data.bulgarian : data.english)?.headline;
      if (headline) map[d] = headline;
    } catch { /* no story for this date */ }
  }));
  return map;
}

/* ---- English card ---- */

function cardEn(round, state, headline) {
  const opp = opponent(round) || 'TBD';
  const ha  = round.homeAway;

  const haChip = ha
    ? `<span class="ha-chip ha-chip--${ha}">${ha === 'home' ? 'HOME' : 'AWAY'}</span>`
    : '';

  const todayPill = state === 'today' ? `<span class="today-dot">TODAY</span>` : '';
  const timeStr   = displayTime(round.time, 'en');

  // Recorded games show the match-report headline; otherwise the opponent name.
  const title = headline
    ? `<div class="fixture-card__story">${headline}</div>`
    : `<div class="fixture-card__opponent">${opp}</div>`;

  return `
    <div class="fixture-card__top">
      <span class="round-label">RD ${round.round}</span>
      <div class="fixture-card__top-mid">
        <span class="date-label">${fmtDate(round.date, 'en') || 'TBD'}</span>
        ${todayPill}
      </div>
      ${haChip}
    </div>
    ${title}
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

function cardBg(round, state, headline) {
  const ha = round.homeAway;

  const haChip = ha
    ? `<span class="ha-chip ha-chip--${ha}">${ha === 'home' ? 'ДОМАКИН' : 'ГОСТ'}</span>`
    : '';

  const todayPill = state === 'today' ? `<span class="today-dot">ДНЕС</span>` : '';
  const timeStr   = displayTime(round.time, 'bg');

  // Recorded games show the match-report headline; otherwise the narrative line.
  const title = headline
    ? `<div class="fixture-card__story">${headline}</div>`
    : `<div class="fixture-card__narrative">${bgNarrative(round, state)}</div>`;

  return `
    <div class="fixture-card__top">
      <span class="round-label">КРЪГ ${round.round}</span>
      <div class="fixture-card__top-mid">
        <span class="date-label">${fmtDate(round.date, 'bg') || 'ПРЕДСТОИ'}</span>
        ${todayPill}
      </div>
      ${haChip}
    </div>
    ${title}
    <div class="fixture-card__venue">
      <span class="venue-name">${round.ground || 'Стадионът предстои'}</span>
      ${timeStr ? `<span class="venue-time">${timeStr}</span>` : ''}
    </div>`;
}

/* ---- Score row ---- */

function scoreRow(round, lang, state) {
  const isEn = lang === 'en';

  if (!hasResult(round)) {
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
  const oppName   = (opponent(round) || 'OPP').toUpperCase();

  // Home team always renders on the LEFT. Total score is dominant; the
  // goals.behinds breakdown is secondary underneath.
  const scoreValue = (t, isHp) => (t.goals === 0 && t.behinds === 0 && t.score === 0)
    ? `<span class="score-team__total score-team__total--none">—</span>`
    : `<span class="score-team__total${isHp ? ' score-team__total--hp' : ''}">${t.score}</span><span class="score-team__gb">${t.goals}.${t.behinds}</span>`;
  const isHome   = round.homeAway === 'home';
  const hpBlock  = `<span class="score-team__name score-team__name--hp">Hammond Park Blue</span>${scoreValue(hp, true)}`;
  const oppBlock = `<span class="score-team__name">${oppName}</span>${scoreValue(opp, false)}`;
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
    if (!resp.ok) return { rounds: new Set(), titles: {}, prologue: null };
    const data = await resp.json();
    const titles = {};
    (data.rounds || []).forEach(r => { if (r.title) titles[r.round] = chapterShort(r.title); });
    return {
      rounds:   new Set((data.rounds || []).map(r => r.round)),
      titles,
      prologue: data.prologue || null,
    };
  } catch {
    return { rounds: new Set(), titles: {}, prologue: null };
  }
}

// "Пролог — Оранжевите бутонки" → "Оранжевите бутонки"
function prologueShort(title) {
  return (title || '').replace(/^Пролог\s*[—–-]\s*/i, '').trim() || title || 'Пролог';
}

// "Глава 1 — Първата стъпка" → "Първата стъпка"
function chapterShort(title) {
  return (title || '').replace(/^Глава\s*\d+\s*[—–-]\s*/i, '').trim() || title || '';
}

/* ---- Full card ---- */

function buildCard(round, lang, today, year, storyRounds, storyTitles, gameDates, headlines) {
  const state   = gameState(round, today);
  const isEn    = lang === 'en';
  const classes = ['fixture-card'];
  if (state === 'today')     classes.push('fixture-card--today');
  else if (state === 'past') classes.push('fixture-card--past');
  else if (state === 'tbd')  classes.push('fixture-card--tbd');
  if (round.homeAway === 'home')      classes.push('fixture-card--home');
  else if (round.homeAway === 'away') classes.push('fixture-card--away');

  // Story title once the game is recorded. EN uses the per-game match-report
  // headline; BG uses the season chapter title (its per-game headlines are
  // empty, and the chapter title is already the BG "story title").
  let headline = null;
  if (round.date && gameDates.has(round.date)) {
    headline = isEn ? (headlines[round.date] || null) : (storyTitles[round.round] || null);
  }
  const inner = lang === 'bg' ? cardBg(round, state, headline) : cardEn(round, state, headline);

  // Tapping the whole card opens the relevant screen — no buttons.
  let tap = '', hint = '';
  const hasGame  = round.date && gameDates.has(round.date);
  const hasStory = storyRounds.has(round.round);
  if (isEn) {
    if (hasGame && (state === 'past' || state === 'today')) {
      tap = `report:${round.date}`;   // whole card taps through; no hint label
    } else if (state === 'today' && !hasResult(round)) {
      tap = `tracker:${round.round}`;
      hint = 'Tap to track this game';
    }
  } else if (hasStory && (state === 'past' || (state === 'today' && hasResult(round)))) {
    tap = `story:${year}:${round.round}`;
    hint = 'Натиснете, за да прочетете историята';
  }
  if (tap) classes.push('fixture-card--tappable');

  const hintHtml = hint
    ? `<div class="fixture-card__hint${isEn ? '' : ' fixture-card__hint--bg'}">${hint} ${icon('chevron', 'fixture-card__hint-arr')}</div>`
    : '';

  return `
    <article class="${classes.join(' ')}" data-round="${round.round}" data-state="${state}"${tap ? ` data-tap="${tap}"` : ''}>
      ${inner}
      ${scoreRow(round, lang, state)}
      ${hintHtml}
    </article>`;
}

/* ---- Screen entry point ---- */

export async function renderFixtures(lang) {
  const app   = document.getElementById('app');
  const isEn  = lang === 'en';
  const today = new Date().toISOString().split('T')[0];
  const club  = teamName(await getConfig());

  app.innerHTML = `
    <div class="screen">
      <header class="screen-header">
        <button class="back-btn" id="back-btn" aria-label="${isEn ? 'Back' : 'Назад'}">${icon('back')}</button>
        <div class="screen-header__mid">
          <div class="screen-header__club">${club}</div>
          <h1 class="screen-header__title">${isEn ? 'Fixtures &amp; Results' : 'Мачове &amp; Резултати'}</h1>
        </div>
        ${menuButtonHtml(lang, 'fixtures')}
      </header>

      <button class="challenge-strip" id="challenge-strip" type="button"
        aria-label="${isEn ? 'Open challenges' : 'Отвори предизвикателствата'}">
        <span class="challenge-strip__label">${isEn ? 'Last 3 games' : 'Последни 3 мача'}</span>
        <div class="challenge-strip__chips" id="challenge-strip-chips"></div>
        <span class="challenge-strip__arrow">${icon('chevron')}</span>
      </button>

      <div class="year-bar">
        <button class="year-btn year-btn--prev" id="year-prev"
          aria-label="${isEn ? 'Previous season' : 'Предишен сезон'}">${icon('back')}</button>
        <span class="year-label" id="year-label">—</span>
        <button class="year-btn year-btn--next" id="year-next"
          aria-label="${isEn ? 'Next season' : 'Следващ сезон'}">${icon('chevron')}</button>
      </div>

      <div class="fixtures-list" id="fixtures-list">
        <div class="screen-loading">${isEn ? 'Loading…' : 'Зарежда се…'}</div>
      </div>
    </div>`;

  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.hash = '#/';
  });

  document.getElementById('challenge-strip').addEventListener('click', () => {
    window.location.hash = `#/${lang}/challenges`;
  });

  attachMenu(lang);

  let selectedYear  = parseInt(today.slice(0, 4), 10);
  let currentRounds = [];

  function attachListeners() {
    // Whole-card tap → tracker / report / story, per the card's data-tap.
    document.querySelectorAll('.fixture-card--tappable').forEach(card => {
      card.addEventListener('click', () => {
        const tap = card.dataset.tap;
        if (!tap) return;
        const [type, a, b] = tap.split(':');
        if (type === 'report')       window.location.hash = `#/en/report/${a}`;
        else if (type === 'tracker') window.location.hash = `#/en/tracker/${a}`;
        else if (type === 'story')   window.location.hash = `#/bg/story/${a}/${b}`;
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

    // Challenge chips reflect the rolling last-3 games of the selected season.
    injectChipStrip('challenge-strip-chips', lang, year);

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
        : { rounds: new Set(), titles: {}, prologue: null };

      // Which dates have a saved game file (→ tappable report / story title).
      const gameDates = new Set(Object.keys(results));

      // Recorded games show the match-report headline as the card title.
      const headlines = await loadStoryHeadlines([...gameDates], lang);

      const prologueHtml = (lang === 'bg' && story.prologue) ? `
        <button class="prologue-card" id="prologue-card" data-year="${year}" type="button">
          <div class="prologue-card__text">
            <div class="prologue-card__label">Пролог</div>
            <div class="prologue-card__title">${prologueShort(story.prologue.title)}</div>
          </div>
          <span class="prologue-card__arrow">${icon('chevron')}</span>
        </button>` : '';

      list.innerHTML = prologueHtml + currentRounds.map(r => buildCard(r, lang, today, year, story.rounds, story.titles, gameDates, headlines)).join('');
      attachListeners();

      // On open, jump to today's game if there is one, otherwise the most
      // recent played round (the latest result), so the newest action is in view.
      const focusCard = list.querySelector('[data-state="today"]')
        || [...list.querySelectorAll('[data-state="past"]')].pop();
      if (focusCard) requestAnimationFrame(() =>
        focusCard.scrollIntoView({ behavior: 'smooth', block: 'center' }));

    } catch (err) {
      if (err.status === 404) {
        list.innerHTML = `
          <div class="screen-coming-soon">
            <div class="coming-soon__icon">${icon('fixtures')}</div>
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
