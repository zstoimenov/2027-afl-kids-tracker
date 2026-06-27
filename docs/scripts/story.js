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

function shell(lang, title, backHash) {
  const isEn = lang === 'en';
  const app  = document.getElementById('app');
  app.innerHTML = `
    <div class="story-screen">
      <header class="screen-header">
        <button class="back-btn" id="story-back" aria-label="${isEn ? 'Back' : 'Назад'}">‹</button>
        <div class="screen-header__mid">
          <div class="screen-header__club">Hammond Park Blue</div>
          <h1 class="screen-header__title">${title}</h1>
        </div>
        <div style="width:40px"></div>
      </header>
      <div class="story-body" id="story-body">
        <div class="screen-loading">${isEn ? 'Loading…' : 'Зарежда се…'}</div>
      </div>
    </div>`;
  document.getElementById('story-back').addEventListener('click', () => {
    window.location.hash = backHash;
  });
  return document.getElementById('story-body');
}

/* ---- Season picker: choose which season's story to read ---- */

export async function renderSeasonPicker(lang) {
  const isEn = lang === 'en';
  const body = shell(lang, isEn ? 'Stories' : 'Истории', `#/${lang}`);

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
  const body = shell(lang, `${isEn ? 'Season' : 'Сезон'} ${year}`, `#/${lang}/seasons`);

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
  const body = shell(lang, isEn ? 'Season Story' : 'Историята на сезона', `#/${lang}`);

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
