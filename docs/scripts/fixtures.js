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
    // AWST (UTC+8) → EEST (UTC+3): subtract 5 hours
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

/* ---- LocalStorage helpers ---- */

function lsKey(type, season) { return `afl.${type}.${season}`; }

function loadOverrides(season) {
  try {
    const results  = JSON.parse(localStorage.getItem(lsKey('results',  season)) || '{}');
    const fixtures = JSON.parse(localStorage.getItem(lsKey('fixtures', season)) || '{}');
    return { results, fixtures };
  } catch { return { results: {}, fixtures: {} }; }
}

function saveResultOverride(season, round, result) {
  try {
    const key  = lsKey('results', season);
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data[round] = result;
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* storage unavailable */ }
}

function saveFixtureOverride(season, round, fixture) {
  try {
    const key  = lsKey('fixtures', season);
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data[round] = fixture;
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* storage unavailable */ }
}

function applyOverrides(rounds, season) {
  const { results, fixtures } = loadOverrides(season);
  return rounds.map(r => {
    const out = { ...r };
    if (results[r.round])  out.result = { ...r.result, ...results[r.round] };
    if (fixtures[r.round]) Object.assign(out, fixtures[r.round]);
    return out;
  });
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

function scoreRow(round, lang) {
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
  const oppName   = (opponent(round) || 'OPP').toUpperCase().substring(0, 11);

  return `
    <div class="score-row">
      <div class="score-team">
        <span class="score-team__name">HP BLUE</span>
        <span class="score-team__value">${fmtScore(hp)}</span>
      </div>
      <div class="score-mid">
        <span class="score-sep">·</span>
        <span class="result-chip result-chip--${chipClass}">${chip}</span>
      </div>
      <div class="score-team score-team--right">
        <span class="score-team__name">${oppName}</span>
        <span class="score-team__value">${fmtScore(opp)}</span>
      </div>
    </div>`;
}

/* ---- Full card ---- */

function buildCard(round, lang, today, editMode) {
  const state   = gameState(round, today);
  const classes = ['fixture-card'];
  if (state === 'today')     classes.push('fixture-card--today');
  else if (state === 'past') classes.push('fixture-card--past');
  else if (state === 'tbd')  classes.push('fixture-card--tbd');

  const inner = lang === 'bg' ? cardBg(round, state) : cardEn(round, state);

  const editBtn = editMode
    ? `<button class="card-edit-btn" data-round="${round.round}" aria-label="Edit round ${round.round}">✎</button>`
    : '';

  return `
    <article class="${classes.join(' ')}" data-round="${round.round}" data-state="${state}">
      ${editBtn}
      ${inner}
      ${scoreRow(round, lang)}
    </article>`;
}

/* ---- Edit modal (module-level state for cross-function access) ---- */

let _editMeta = {};

function openEditModal(round, lang, season, today, onSave) {
  const state = gameState(round, today);
  _editMeta = { round, lang, season, state, onSave };

  const isEn     = lang === 'en';
  const modal    = document.getElementById('edit-modal');
  const isResult = state === 'past' || state === 'today';
  const rdLabel  = isEn ? `Round ${round.round}` : `Кръг ${round.round}`;
  const title    = isResult
    ? (isEn ? 'Edit Result' : 'Резултат')
    : (isEn ? 'Edit Fixture' : 'Редакция');

  let formHtml;
  if (isResult) {
    const hp  = round.result?.hammondPark || { goals: 0, behinds: 0 };
    const opp = round.result?.opposition  || { goals: 0, behinds: 0 };
    const oppName = (opponent(round) || 'Opposition').substring(0, 14).toUpperCase();
    formHtml = `
      <div class="edit-score-grid">
        <div class="edit-team">
          <div class="edit-team__label">HP BLUE</div>
          <div class="edit-score-inputs">
            <label class="edit-score-lbl">${isEn ? 'Goals' : 'Гола'}
              <input type="number" min="0" id="hp-goals" value="${hp.goals}">
            </label>
            <label class="edit-score-lbl">${isEn ? 'Behinds' : 'Зад'}
              <input type="number" min="0" id="hp-behinds" value="${hp.behinds}">
            </label>
          </div>
        </div>
        <div class="edit-vs">vs</div>
        <div class="edit-team">
          <div class="edit-team__label">${oppName}</div>
          <div class="edit-score-inputs">
            <label class="edit-score-lbl">${isEn ? 'Goals' : 'Гола'}
              <input type="number" min="0" id="opp-goals" value="${opp.goals}">
            </label>
            <label class="edit-score-lbl">${isEn ? 'Behinds' : 'Зад'}
              <input type="number" min="0" id="opp-behinds" value="${opp.behinds}">
            </label>
          </div>
        </div>
      </div>`;
  } else {
    const oppVal = opponent(round) || '';
    formHtml = `
      <div class="edit-fixture-form">
        <label class="edit-field">
          <span>${isEn ? 'Date (YYYY-MM-DD)' : 'Дата (ГГГГ-ММ-ДД)'}</span>
          <input type="text" id="fix-date" value="${round.date || ''}" placeholder="2026-08-01">
        </label>
        <label class="edit-field">
          <span>${isEn ? 'Time AWST (e.g. 8:30 am)' : 'Час AWST (напр. 8:30 am)'}</span>
          <input type="text" id="fix-time" value="${round.time || ''}" placeholder="8:30 am">
        </label>
        <label class="edit-field">
          <span>${isEn ? 'Venue' : 'Стадион'}</span>
          <input type="text" id="fix-ground" value="${round.ground || ''}" placeholder="Frankland Park">
        </label>
        <label class="edit-field">
          <span>${isEn ? 'Opponent' : 'Противник'}</span>
          <input type="text" id="fix-opponent" value="${oppVal}" placeholder="Team Name">
        </label>
        <label class="edit-field">
          <span>${isEn ? 'Home / Away' : 'У дома / Гости'}</span>
          <select id="fix-homeaway">
            <option value="home" ${round.homeAway === 'home' ? 'selected' : ''}>${isEn ? 'Home' : 'У дома'}</option>
            <option value="away" ${round.homeAway === 'away' ? 'selected' : ''}>${isEn ? 'Away' : 'На гости'}</option>
          </select>
        </label>
      </div>`;
  }

  modal.innerHTML = `
    <div class="edit-modal__backdrop" id="edit-backdrop"></div>
    <div class="edit-modal__sheet" role="dialog" aria-modal="true">
      <div class="edit-modal__header">
        <span class="edit-modal__rd">${rdLabel}</span>
        <h2 class="edit-modal__title">${title}</h2>
        <button class="edit-modal__close" id="edit-close" aria-label="${isEn ? 'Close' : 'Затвори'}">✕</button>
      </div>
      <div class="edit-modal__body">${formHtml}</div>
      <div class="edit-modal__footer">
        <button class="edit-modal__save" id="edit-save">${isEn ? 'Save' : 'Запази'}</button>
      </div>
    </div>`;

  modal.removeAttribute('hidden');
  modal.querySelector('#edit-backdrop').addEventListener('click', closeEditModal);
  modal.querySelector('#edit-close').addEventListener('click', closeEditModal);
  modal.querySelector('#edit-save').addEventListener('click', commitEdit);
}

function closeEditModal() {
  const modal = document.getElementById('edit-modal');
  if (modal) modal.setAttribute('hidden', '');
}

function commitEdit() {
  const { round, season, state, onSave } = _editMeta;

  if (state === 'past' || state === 'today') {
    const hpG  = parseInt(document.getElementById('hp-goals').value,    10) || 0;
    const hpB  = parseInt(document.getElementById('hp-behinds').value,  10) || 0;
    const oppG = parseInt(document.getElementById('opp-goals').value,   10) || 0;
    const oppB = parseInt(document.getElementById('opp-behinds').value, 10) || 0;
    const hpS  = hpG * 6 + hpB;
    const oppS = oppG * 6 + oppB;
    const winner = hpS > oppS ? 'hammondPark' : oppS > hpS ? 'opposition' : 'draw';
    saveResultOverride(season, round.round, {
      hammondPark: { goals: hpG, behinds: hpB, score: hpS },
      opposition:  { goals: oppG, behinds: oppB, score: oppS },
      winner,
    });
  } else {
    const ha     = document.getElementById('fix-homeaway').value;
    const oppVal = document.getElementById('fix-opponent').value.trim();
    saveFixtureOverride(season, round.round, {
      date:     document.getElementById('fix-date').value.trim(),
      time:     document.getElementById('fix-time').value.trim(),
      ground:   document.getElementById('fix-ground').value.trim(),
      homeAway: ha,
      homeTeam: ha === 'home' ? 'Hammond Park Blue' : oppVal,
      awayTeam: ha === 'home' ? oppVal : 'Hammond Park Blue',
    });
  }

  closeEditModal();
  onSave?.();
}

/* ---- Screen entry point ---- */

export async function renderFixtures(lang) {
  const app   = document.getElementById('app');
  const isEn  = lang === 'en';
  const today = new Date().toISOString().split('T')[0];

  app.innerHTML = `
    <div class="screen">
      <header class="screen-header">
        <button class="back-btn" id="back-btn" aria-label="${isEn ? 'Back' : 'Назад'}">‹</button>
        <div class="screen-header__mid">
          <div class="screen-header__club">Hammond Park Blue</div>
          <h1 class="screen-header__title">${isEn ? 'Fixtures &amp; Results' : 'Мачове &amp; Резултати'}</h1>
        </div>
        <button class="edit-toggle-btn" id="edit-toggle"
          aria-label="${isEn ? 'Edit mode' : 'Редакция'}" aria-pressed="false">✎</button>
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
    </div>
    <div class="edit-modal" id="edit-modal" hidden></div>`;

  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.hash = '#/';
  });

  let selectedYear  = parseInt(today.slice(0, 4), 10);
  let editMode      = false;
  let currentRounds = [];
  let currentSeason = selectedYear;

  function rerender() { loadAndRender(selectedYear); }

  function attachEditListeners() {
    document.querySelectorAll('.card-edit-btn').forEach(btn => {
      const rnd = parseInt(btn.dataset.round, 10);
      btn.addEventListener('click', () => {
        const r = currentRounds.find(x => x.round === rnd);
        if (r) openEditModal(r, lang, currentSeason, today, rerender);
      });
    });
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

      currentSeason = data.season;
      currentRounds = applyOverrides(data.rounds, currentSeason);
      list.innerHTML = currentRounds.map(r => buildCard(r, lang, today, editMode)).join('');
      attachEditListeners();

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

  document.getElementById('edit-toggle').addEventListener('click', () => {
    editMode = !editMode;
    const btn = document.getElementById('edit-toggle');
    btn.setAttribute('aria-pressed', String(editMode));
    btn.classList.toggle('edit-toggle-btn--active', editMode);
    if (currentRounds.length) {
      const list = document.getElementById('fixtures-list');
      list.innerHTML = currentRounds.map(r => buildCard(r, lang, today, editMode)).join('');
      attachEditListeners();
    }
  });

  loadAndRender(selectedYear);
}
