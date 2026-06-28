import { getConfig, teamName } from './config.js';
import { menuButtonHtml, attachMenu } from './menu.js';

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

/* ---- Match Reports (per-game stories: headline / commentator / coach) ---- */

async function loadStoryIndex() {
  try {
    const resp = await fetch('./data/stories/index.json');
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data.stories) ? data.stories : [];
  } catch { return []; }
}

async function loadGameStory(date) {
  try {
    const resp = await fetch(`./data/stories/story-${date}.json`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

// Match Reports list (English, kid-facing).
export async function renderReports(lang) {
  const isEn = lang === 'en';
  const club = teamName(await getConfig());
  const body = shell(lang, isEn ? 'Match Reports' : 'Репортажи', `#/${lang}`, club, 'reports');

  const entries = (await loadStoryIndex())
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (!entries.length) {
    body.innerHTML = `
      <div class="story-content">
        <div class="reports-empty">
          <div class="reports-empty__icon">🏆</div>
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
    const headline = s?.english?.headline || (isEn ? 'Match report' : 'Репортаж');
    const round = e.round ?? s?.round ?? '';
    return `
      <button class="report-card" data-date="${e.date}" type="button">
        <div class="report-card__meta">${isEn ? 'Round' : 'Кръг'} ${round} · ${e.date}</div>
        <div class="report-card__headline">${headline}</div>
        <span class="report-card__arrow">›</span>
      </button>`;
  }));

  body.innerHTML = `<div class="story-content"><div class="report-list">${cards.join('')}</div></div>`;
  body.querySelectorAll('.report-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.hash = `#/${lang}/report/${card.dataset.date}`;
    });
  });
}

// A single match report.
export async function renderReport(lang, date) {
  const isEn = lang === 'en';
  const club = teamName(await getConfig());
  const body = shell(lang, isEn ? 'Match Report' : 'Репортаж', `#/${lang}/reports`, club, 'reports');

  const s = await loadGameStory(date);
  const story = isEn ? s?.english : s?.bulgarian;
  if (!story) {
    body.innerHTML = `<div class="story-empty">${isEn ? 'Report not available.' : 'Репортажът не е наличен.'}</div>`;
    return;
  }

  body.innerHTML = `
    <div class="story-content">
      <div class="report-meta">${isEn ? 'Round' : 'Кръг'} ${s.round ?? ''} · ${s.game ?? date}</div>
      <h2 class="story-title">${story.headline || ''}</h2>
      <div class="report-section">
        <div class="report-section__label">${isEn ? 'The Call' : 'Репортаж'}</div>
        <div class="story-text">${paragraphs(story.commentator)}</div>
      </div>
      <div class="report-section">
        <div class="report-section__label">${isEn ? "Coach's Notes" : 'Бележки от треньора'}</div>
        <div class="story-text">${paragraphs(story.coach)}</div>
      </div>
    </div>`;
}
