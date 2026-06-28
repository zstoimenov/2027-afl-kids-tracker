import { getConfig, teamName, playerInfo } from './config.js';
import { menuButtonHtml, attachMenu } from './menu.js';
import { icon } from './icons.js';

const BASE_SEASON = 2026;

/* ---- helpers ---- */

function paragraphs(body) {
  return (body || '')
    .split('\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.trim()}</p>`)
    .join('');
}

async function loadSeason(year) {
  const resp = await fetch(`./data/stories/${year}.json`);
  if (!resp.ok) throw Object.assign(new Error(resp.statusText), { status: resp.status });
  return resp.json();
}

function shell(lang, title, backHash, club = 'Hammond Park Blue', menuKey = '') {
  const isEn = lang === 'en';
  const app  = document.getElementById('app');
  app.innerHTML = `
    <div class="story-screen">
      <header class="screen-header">
        <button class="back-btn" id="story-back" aria-label="${isEn ? 'Back' : 'Назад'}">‹</button>
        <div class="screen-header__mid">
          <div class="screen-header__club">${club}</div>
          <h1 class="screen-header__title">${title}</h1>
        </div>
        ${menuButtonHtml(lang, menuKey)}
      </header>
      <div class="story-body" id="story-body">
        <div class="screen-loading">${isEn ? 'Loading…' : 'Зарежда се…'}</div>
      </div>
    </div>`;
  document.getElementById('story-back').addEventListener('click', () => {
    window.location.hash = backHash;
  });
  attachMenu(lang);
  return document.getElementById('story-body');
}

/* ---- Season picker: choose which season's story to read ---- */

export async function renderSeasonPicker(lang) {
  const isEn = lang === 'en';
  const club = teamName(await getConfig());
  const body = shell(lang, isEn ? 'Stories' : 'Истории', `#/${lang}`, club, 'stories');

  // Probe which seasons have a story file (auto-discovers future seasons).
  // Always probe at least one season ahead, regardless of the device clock.
  const maxYear    = Math.max(new Date().getFullYear() + 1, BASE_SEASON + 1);
  const candidates = [];
  for (let y = BASE_SEASON; y <= maxYear; y++) candidates.push(y);

  const results = await Promise.all(candidates.map(async year => {
    try { return { year, data: await loadSeason(year) }; }
    catch { return null; }
  }));
  const seasons = results.filter(Boolean).sort((a, b) => b.year - a.year);

  if (!seasons.length) {
    body.innerHTML = `<div class="story-empty">${isEn ? 'No seasons available yet.' : 'Все още няма налични сезони.'}</div>`;
    return;
  }

  const intro = isEn
    ? 'Pick a season to read the full story.'
    : 'Изберете сезон, за да прочетете цялата история.';

  body.innerHTML = `
    <div class="story-content">
      <p class="season-picker__intro">${intro}</p>
      <div class="season-list">
        ${seasons.map(({ year, data }) => {
          const chapters = data.rounds?.length || 0;
          const sub = isEn
            ? `Prologue + ${chapters} ${chapters === 1 ? 'chapter' : 'chapters'}`
            : `Пролог + ${chapters} ${chapters === 1 ? 'глава' : 'глави'}`;
          return `
            <button class="season-card" data-year="${year}" type="button">
              <div class="season-card__text">
                <div class="season-card__label">${isEn ? 'Season' : 'Сезон'}</div>
                <div class="season-card__title">${year}</div>
                <div class="season-card__sub">${sub}</div>
              </div>
              <span class="season-card__arrow">›</span>
            </button>`;
        }).join('')}
      </div>
    </div>`;

  body.querySelectorAll('.season-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.hash = `#/${lang}/season/${card.dataset.year}`;
    });
  });
}

/* ---- Full season story: prologue + every chapter, one read ---- */

export async function renderSeasonStory(lang, year) {
  const isEn = lang === 'en';
  const club = teamName(await getConfig());
  const body = shell(lang, `${isEn ? 'Season' : 'Сезон'} ${year}`, `#/${lang}/seasons`, club, 'stories');

  let data;
  try {
    data = await loadSeason(year);
  } catch {
    body.innerHTML = `<div class="story-empty">${isEn ? 'Story not available.' : 'Историята не е налична.'}</div>`;
    return;
  }

  const chapters = [];
  if (data.prologue) chapters.push(data.prologue);
  (data.rounds || []).slice().sort((a, b) => a.round - b.round).forEach(r => chapters.push(r));

  if (!chapters.length) {
    body.innerHTML = `<div class="story-empty">${isEn ? 'This season is coming soon.' : 'Този сезон предстои.'}</div>`;
    return;
  }

  body.innerHTML = `
    <div class="story-content">
      ${chapters.map(ch => `
        <article class="story-chapter">
          <h2 class="story-title">${ch.title}</h2>
          <div class="story-text">${paragraphs(ch.body)}</div>
        </article>`).join('')}
    </div>`;
}

/* ---- Single chapter (linked from a fixture card) ---- */

export async function renderStory(lang, id, year = BASE_SEASON) {
  const isEn = lang === 'en';
  const club = teamName(await getConfig());
  const body = shell(lang, isEn ? 'Season Story' : 'Историята на сезона', `#/${lang}`, club, 'stories');

  let data;
  try {
    data = await loadSeason(year);
  } catch {
    body.innerHTML = `<div class="story-empty">${isEn ? 'Story not available.' : 'Историята не е налична.'}</div>`;
    return;
  }

  let entry = null;
  if (id === 'prologue') {
    entry = data.prologue;
  } else {
    const rnd = parseInt(id, 10);
    if (!isNaN(rnd)) entry = data.rounds?.find(r => r.round === rnd) ?? null;
  }

  if (!entry) {
    body.innerHTML = `<div class="story-empty">${isEn ? 'This chapter is coming soon.' : 'Тази глава предстои.'}</div>`;
    return;
  }

  body.innerHTML = `
    <div class="story-content">
      <h2 class="story-title">${entry.title}</h2>
      <div class="story-text">${paragraphs(entry.body)}</div>
    </div>`;
}

/* ---- Match Reports: per-game stats + commentator + coach ---- */

async function loadStoryIndex() {
  try {
    const resp = await fetch('./data/stories/index.json');
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data.stories) ? data.stories : [];
  } catch { return []; }
}

async function loadGameIndexDates() {
  try {
    const resp = await fetch('./data/games/index.json');
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data.games) ? data.games : [];
  } catch { return []; }
}

async function loadGameStory(date) {
  try {
    const resp = await fetch(`./data/stories/story-${date}.json`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

async function loadGame(date) {
  try {
    const resp = await fetch(`./data/games/game-${date}.json`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

const MOOD_ICON = { motivated: 'moodUp', neutral: 'moodFlat', tired: 'moodDown' };
const POS_LBL_S = { def: 'DEF', mid: 'MID', fwd: 'FWD' };

// Match Reports list — every game that has stats and/or a story.
export async function renderReports(lang) {
  const isEn = lang === 'en';
  const club = teamName(await getConfig());
  const body = shell(lang, isEn ? 'Match Reports' : 'Репортажи', `#/${lang}`, club, 'reports');

  const [storyEntries, gameDates] = await Promise.all([loadStoryIndex(), loadGameIndexDates()]);
  const byDate = new Map();
  storyEntries.forEach(e => byDate.set(e.date, { date: e.date, round: e.round }));
  gameDates.forEach(d => { if (!byDate.has(d)) byDate.set(d, { date: d, round: null }); });
  const entries = [...byDate.values()].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (!entries.length) {
    body.innerHTML = `
      <div class="story-content">
        <div class="reports-empty">
          <div class="reports-empty__icon">${icon('reports')}</div>
          <div class="reports-empty__title">${isEn ? 'No match reports yet' : 'Все още няма репортажи'}</div>
          <div class="reports-empty__hint">${isEn
            ? 'A report appears here after each game is tracked and saved.'
            : 'Репортаж се появява тук след всеки изигран мач.'}</div>
        </div>
      </div>`;
    return;
  }

  const cards = await Promise.all(entries.map(async e => {
    const s = await loadGameStory(e.date);
    const headline = s?.english?.headline || (isEn ? "Alek's game" : 'Мачът на Алек');
    const round = e.round ?? s?.round ?? '';
    return `
      <button class="report-card" data-date="${e.date}" type="button">
        <div class="report-card__meta">${round ? `${isEn ? 'Round' : 'Кръг'} ${round} · ` : ''}${e.date}</div>
        <div class="report-card__headline">${headline}</div>
        <span class="report-card__arrow">${icon('chevron')}</span>
      </button>`;
  }));

  body.innerHTML = `<div class="story-content"><div class="report-list">${cards.join('')}</div></div>`;
  body.querySelectorAll('.report-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.hash = `#/${lang}/report/${card.dataset.date}`;
    });
  });
}

/* ---- stats rendering ---- */

function xy(o) {
  return `${o?.successful || 0}<span class="rstat__den">/${o?.attempts || 0}</span>`;
}

function statTile(ic, value, label) {
  return `
    <div class="rstat">
      <span class="rstat__icon">${icon(ic)}</span>
      <span class="rstat__val">${value}</span>
      <span class="rstat__label">${label}</span>
    </div>`;
}

function statsBlock(game, isEn, player) {
  const a   = game.totals?.aleksStats || {};
  const sc  = a.scoring || {};
  const ts  = game.totals?.teamScore || {};
  const hp  = ts.hammondPark || { goals: 0, behinds: 0, score: 0 };
  const opp = ts.opposition  || { goals: 0, behinds: 0, score: 0 };
  const isHome = game.homeAway === 'home';
  const hpWon = hp.score > opp.score, oppWon = opp.score > hp.score;
  const result  = hpWon ? (isEn ? 'WIN' : 'ПОБЕДА') : oppWon ? (isEn ? 'LOSS' : 'ЗАГУБА') : (isEn ? 'DRAW' : 'РАВЕНСТВО');
  const chipCls = hpWon ? 'win' : oppWon ? 'loss' : 'draw';
  const oppName = (game.opponent || 'OPP').toUpperCase().substring(0, 12);
  const points  = a.points ?? ((sc.goals || 0) * 6 + (sc.behinds || 0));

  const teamBlock = (name, t) =>
    `<div class="rscore__team"><div class="rscore__name">${name}</div><div class="rscore__val">${t.goals || 0}.${t.behinds || 0} <em>(${t.score || 0})</em></div></div>`;
  const hpBlock  = teamBlock('HP BLUE', hp);
  const oppBlock = teamBlock(oppName, opp);

  const quarters = (game.quarters || []).map(q => {
    const qa = q.aleksStats || {};
    const bits = [
      qa.scoring?.goals   && `${qa.scoring.goals}G`,
      qa.scoring?.behinds && `${qa.scoring.behinds}B`,
      qa.marks?.successful     && `${qa.marks.successful}M`,
      qa.disposals?.successful && `${qa.disposals.successful}D`,
      qa.tackles?.successful   && `${qa.tackles.successful}T`,
    ].filter(Boolean).join(' · ') || '—';
    return `
      <div class="rquarter">
        <span class="rquarter__q">Q${q.quarter}</span>
        <span class="rquarter__mood">${q.mood ? icon(MOOD_ICON[q.mood]) : ''}</span>
        <span class="rquarter__pos">${POS_LBL_S[q.position] || ''}</span>
        <span class="rquarter__stats">${bits}</span>
      </div>`;
  }).join('');

  return `
    <div class="rscore">
      ${isHome ? hpBlock : oppBlock}
      <span class="result-chip result-chip--${chipCls} rscore__chip">${result}</span>
      ${isHome ? oppBlock : hpBlock}
    </div>

    <div class="rplayer">${icon('star', 'rplayer__star')}<span>${player.name.toUpperCase()} #${player.number}</span></div>

    <div class="rstat-grid">
      ${statTile('goal',     sc.goals || 0,        isEn ? 'Goals' : 'Голове')}
      ${statTile('behind',   sc.behinds || 0,      isEn ? 'Behinds' : 'Бихайнди')}
      ${statTile('shot',     sc.goalAttempts || 0, isEn ? 'Shots' : 'Удари')}
      ${statTile('mark',     xy(a.marks),          isEn ? 'Marks' : 'Маркове')}
      ${statTile('disposal', xy(a.disposals),      isEn ? 'Disposals' : 'Подавания')}
      ${statTile('tackle',   xy(a.tackles),        isEn ? 'Tackles' : 'Такъли')}
    </div>

    <div class="rpoints">
      <span class="rpoints__label">${isEn ? 'Total points' : 'Общо точки'}</span>
      <span class="rpoints__val">${points}</span>
    </div>

    ${quarters ? `
    <div class="report-section">
      <div class="report-section__label">${isEn ? 'By quarter' : 'По четвъртини'}</div>
      <div class="rquarters">${quarters}</div>
    </div>` : ''}`;
}

// A single game: stats + commentator + coach.
export async function renderReport(lang, date) {
  const isEn = lang === 'en';
  const cfg  = await getConfig();
  const club = teamName(cfg);
  const player = playerInfo(cfg);
  const body = shell(lang, isEn ? 'Match Report' : 'Репортаж', `#/${lang}/reports`, club, 'reports');

  const [game, s] = await Promise.all([loadGame(date), loadGameStory(date)]);
  if (!game && !s) {
    body.innerHTML = `<div class="story-empty">${isEn ? 'Report not available.' : 'Репортажът не е наличен.'}</div>`;
    return;
  }

  const story = isEn ? s?.english : s?.bulgarian;
  const round = s?.round ?? game?.round ?? '';

  const statsHtml = game ? statsBlock(game, isEn, player) : '';

  let narrativeHtml = '';
  if (story) {
    narrativeHtml = `
      ${story.headline ? `<h2 class="story-title report-headline">${story.headline}</h2>` : ''}
      ${story.commentator ? `
      <div class="report-section">
        <div class="report-section__label">${isEn ? 'The Call' : 'Репортаж'}</div>
        <div class="story-text">${paragraphs(story.commentator)}</div>
      </div>` : ''}
      ${story.coach ? `
      <div class="report-section">
        <div class="report-section__label">${isEn ? "Coach's Notes" : 'Бележки от треньора'}</div>
        <div class="story-text">${paragraphs(story.coach)}</div>
      </div>` : ''}`;
  } else if (game) {
    narrativeHtml = `
      <div class="report-section">
        <div class="report-soon">${isEn ? 'The match story is coming soon.' : 'Историята на мача предстои.'}</div>
      </div>`;
  }

  body.innerHTML = `
    <div class="story-content">
      <div class="report-meta">${round ? `${isEn ? 'Round' : 'Кръг'} ${round} · ` : ''}${date}</div>
      ${statsHtml}
      ${narrativeHtml}
    </div>`;
}
