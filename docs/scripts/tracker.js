import { saveGame, loadToken, saveToken, clearToken } from './github.js';

const BASE_SEASON = 2026;

/* ---- State ---- */

let G = null;
let _lang = 'en';

function initState(date, round, opponent, homeAway, season) {
  return {
    date, round, season,
    opponent: opponent || 'Opponent',
    homeAway: homeAway || 'home',
    quarter: 1,
    status: 'live',
    position: null,
    mood: null,
    score: { hp: { goals: 0, behinds: 0 }, opp: { goals: 0, behinds: 0 } },
    stats: {
      disposals: 0, disposalsOk: 0,
      tackles: 0,   tacklesOk: 0,
      marks: 0,     marksOk: 0,
      goals: 0,     behinds: 0,
    },
    log: [],
  };
}

function calcTotal(s) { return s.goals * 6 + s.behinds; }

/* ---- Persistence ---- */

function lsKey(date) { return `afl.tracker.${date}`; }

function saveState() {
  try { localStorage.setItem(lsKey(G.date), JSON.stringify(G)); } catch { /* */ }
}

function loadState(date) {
  try {
    const raw = localStorage.getItem(lsKey(date));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/* ---- DOM updates ---- */

function updateScore() {
  const hp = G.score.hp, opp = G.score.opp;
  document.getElementById('hp-goals').textContent    = hp.goals;
  document.getElementById('hp-behinds').textContent  = hp.behinds;
  document.getElementById('hp-total').textContent    = `(${calcTotal(hp)})`;
  document.getElementById('opp-goals').textContent   = opp.goals;
  document.getElementById('opp-behinds').textContent = opp.behinds;
  document.getElementById('opp-total').textContent   = `(${calcTotal(opp)})`;
}

function updateStats() {
  const s = G.stats;
  document.getElementById('stat-disp-count').textContent = s.disposals;
  document.getElementById('stat-disp-ok').textContent    = `${s.disposalsOk} ✓`;
  document.getElementById('stat-tack-count').textContent = s.tackles;
  document.getElementById('stat-tack-ok').textContent    = `${s.tacklesOk} ✓`;
  document.getElementById('stat-mark-count').textContent = s.marks;
  document.getElementById('stat-mark-ok').textContent    = `${s.marksOk} ✓`;
  document.getElementById('alek-goals').textContent      = s.goals;
  document.getElementById('alek-behinds').textContent    = s.behinds;
}

function updateQuarter() {
  document.querySelectorAll('.q-btn').forEach(btn => {
    const q = parseInt(btn.dataset.q, 10);
    btn.classList.toggle('q-btn--active', q === G.quarter);
    btn.classList.toggle('q-btn--done',   q < G.quarter);
  });
  const hq = document.getElementById('header-q');
  if (hq) hq.textContent = G.quarter > 4 ? 'FT' : `Q${G.quarter}`;
}

function updatePosition() {
  document.querySelectorAll('.pos-btn').forEach(btn =>
    btn.classList.toggle('pos-btn--active', btn.dataset.pos === G.position));
}

function updateUndo() {
  const btn = document.getElementById('undo-btn');
  if (btn) btn.disabled = G.log.length === 0;
}

function fullUpdate() {
  updateScore();
  updateStats();
  updateQuarter();
  updatePosition();
  updateUndo();
}

/* ---- Haptics ---- */

function vibe(pattern) { try { navigator.vibrate?.(pattern); } catch { /* */ } }

/* ---- Actions ---- */

function recordStat(stat, ok) {
  G.stats[stat]++;
  if (ok) G.stats[`${stat}Ok`]++;
  G.log.push({ type: 'stat', stat, ok });
  saveState();
  fullUpdate();
}

function recordScore(team, scorer, kind) {
  if (team === 'hp') {
    if (kind === 'goal') G.score.hp.goals++; else G.score.hp.behinds++;
    if (scorer === 'alek') {
      if (kind === 'goal') G.stats.goals++; else G.stats.behinds++;
    }
  } else {
    if (kind === 'goal') G.score.opp.goals++; else G.score.opp.behinds++;
  }
  G.log.push({ type: 'score', team, scorer, kind });
  saveState();
  fullUpdate();
  vibe([40, 30, 100]);
}

function advanceQuarter(q) {
  const prev = G.quarter;
  G.quarter = q;
  G.log.push({ type: 'quarter', from: prev, to: q });
  if (q > 4) G.status = 'final';
  saveState();
  updateQuarter();
  updateUndo();
  vibe([20, 10, 40]);
  if (q > 4) showMoodPicker();
}

function setPosition(pos) {
  const prev = G.position;
  G.position = G.position === pos ? null : pos;
  G.log.push({ type: 'position', prev, next: G.position });
  saveState();
  updatePosition();
  updateUndo();
}

function undoLast() {
  const last = G.log.pop();
  if (!last) return;
  switch (last.type) {
    case 'stat':
      G.stats[last.stat]--;
      if (last.ok) G.stats[`${last.stat}Ok`]--;
      break;
    case 'score':
      if (last.team === 'hp') {
        if (last.kind === 'goal') G.score.hp.goals--; else G.score.hp.behinds--;
        if (last.scorer === 'alek') {
          if (last.kind === 'goal') G.stats.goals--; else G.stats.behinds--;
        }
      } else {
        if (last.kind === 'goal') G.score.opp.goals--; else G.score.opp.behinds--;
      }
      break;
    case 'quarter':
      G.quarter = last.from;
      if (G.quarter <= 4) G.status = 'live';
      break;
    case 'position':
      G.position = last.prev;
      break;
  }
  saveState();
  fullUpdate();
  vibe(20);
}

/* ---- Score fork (bottom sheet) ---- */

let _fork = {};

function openFork(team) {
  _fork = { team, step: team === 'hp' ? 'who' : 'kind', scorer: null };
  renderForkStep();
  document.getElementById('score-fork').removeAttribute('hidden');
}

function renderForkStep() {
  const isEn  = _lang === 'en';
  const sheet = document.getElementById('fork-sheet');

  if (_fork.step === 'who') {
    sheet.innerHTML = `
      <div class="fork-hint">${isEn ? 'WHO SCORED?' : 'КОЙ БА?'}</div>
      <div class="fork-btns">
        <button class="fork-btn fork-btn--alek" data-v="alek">
          ${isEn ? 'ALEK' : 'АЛЕК'} <span class="fork-pts">#13</span>
        </button>
        <button class="fork-btn" data-v="teammate">
          ${isEn ? 'TEAMMATE' : 'ОТБОРНИК'}
        </button>
      </div>`;
  } else {
    sheet.innerHTML = `
      <div class="fork-hint">${isEn ? 'SCORE TYPE?' : 'ВИД?'}</div>
      <div class="fork-btns">
        <button class="fork-btn fork-btn--goal" data-v="goal">
          ${isEn ? 'GOAL' : 'ГОЛ'} <span class="fork-pts">6</span>
        </button>
        <button class="fork-btn fork-btn--behind" data-v="behind">
          ${isEn ? 'BEHIND' : 'ЗАД'} <span class="fork-pts">1</span>
        </button>
      </div>`;
  }

  sheet.querySelectorAll('.fork-btn').forEach(btn =>
    btn.addEventListener('click', () => onForkPick(btn.dataset.v)));
}

function onForkPick(value) {
  if (_fork.step === 'who') {
    _fork.scorer = value;
    _fork.step   = 'kind';
    renderForkStep();
  } else {
    closeFork();
    recordScore(_fork.team, _fork.scorer, value);
  }
}

function closeFork() {
  document.getElementById('score-fork').setAttribute('hidden', '');
  _fork = {};
}

/* ---- Long-press / double-tap handler ---- */

function attachScorePress(el, onActivate) {
  let timer = null;
  let lastTap = 0;
  let fired = false;

  function activate() {
    fired = true;
    vibe([40, 20, 80]);
    el.classList.add('tracker-score-btn--pressed');
    setTimeout(() => el.classList.remove('tracker-score-btn--pressed'), 300);
    onActivate();
  }

  function down() {
    fired = false;
    timer = setTimeout(activate, 480);
  }

  function up() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (fired) return;
    const now = Date.now();
    if (now - lastTap < 350) { lastTap = 0; activate(); }
    else lastTap = now;
  }

  function cancel() { if (timer) { clearTimeout(timer); timer = null; } }

  el.addEventListener('touchstart',  down,   { passive: true });
  el.addEventListener('touchend',    up,     { passive: true });
  el.addEventListener('touchcancel', cancel, { passive: true });
  el.addEventListener('mousedown',   down);
  el.addEventListener('mouseup',     up);
  el.addEventListener('mouseleave',  cancel);
}

/* ---- Stat button handler ---- */

function attachStatPress(el, stat) {
  let timer = null;
  let fired = false;
  let startX = 0, startY = 0;

  el.addEventListener('touchstart', e => {
    e.preventDefault();
    fired = false;
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    vibe(15);
    timer = setTimeout(() => {
      fired = true;
      vibe([30, 20, 70]);
      el.classList.add('stat-card--flash-ok');
      setTimeout(() => el.classList.remove('stat-card--flash-ok'), 380);
      recordStat(stat, true);
    }, 450);
  }, { passive: false });

  el.addEventListener('touchmove', e => {
    if (!timer) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) {
      clearTimeout(timer); timer = null;
    }
  }, { passive: true });

  el.addEventListener('touchend', () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (fired) return;
    el.classList.add('stat-card--flash');
    setTimeout(() => el.classList.remove('stat-card--flash'), 240);
    recordStat(stat, false);
  }, { passive: true });

  el.addEventListener('touchcancel', () => {
    if (timer) { clearTimeout(timer); timer = null; }
  });

  el.addEventListener('mousedown', () => {
    fired = false;
    timer = setTimeout(() => {
      fired = true;
      el.classList.add('stat-card--flash-ok');
      setTimeout(() => el.classList.remove('stat-card--flash-ok'), 380);
      recordStat(stat, true);
    }, 450);
  });

  el.addEventListener('mouseup', () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (fired) return;
    el.classList.add('stat-card--flash');
    setTimeout(() => el.classList.remove('stat-card--flash'), 240);
    recordStat(stat, false);
  });

  el.addEventListener('mouseleave', () => {
    if (timer) { clearTimeout(timer); timer = null; }
  });
}

/* ---- Mood picker ---- */

function showMoodPicker() {
  const isEn   = _lang === 'en';
  const picker = document.getElementById('mood-picker');
  picker.querySelector('.mood-question').textContent =
    isEn ? "How did Alek play?" : "Как игра Алек?";
  picker.removeAttribute('hidden');
  picker.querySelectorAll('.mood-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      G.mood = parseInt(btn.dataset.mood, 10);
      saveState();
      picker.setAttribute('hidden', '');
      showSummary();
    }));
  picker.querySelector('#mood-skip').addEventListener('click', () => {
    picker.setAttribute('hidden', '');
    showSummary();
  });
}

/* ---- Export ---- */

function buildExportJson() {
  const hp = G.score.hp, opp = G.score.opp;
  const hpT = calcTotal(hp), oppT = calcTotal(opp);
  return {
    date: G.date, round: G.round, season: G.season,
    opponent: G.opponent, homeAway: G.homeAway,
    status: 'final',
    score: {
      hammondPark: { goals: hp.goals, behinds: hp.behinds, score: hpT },
      opposition:  { goals: opp.goals, behinds: opp.behinds, score: oppT },
      winner: hpT > oppT ? 'hammondPark' : oppT > hpT ? 'opposition' : 'draw',
    },
    player: { number: 13, position: G.position, mood: G.mood },
    stats: {
      disposals: G.stats.disposals, successfulDisposals: G.stats.disposalsOk,
      tackles:   G.stats.tackles,   successfulTackles:   G.stats.tacklesOk,
      marks:     G.stats.marks,     successfulMarks:     G.stats.marksOk,
      goals: G.stats.goals, behinds: G.stats.behinds,
    },
  };
}

function copyExport(btnId) {
  const text = JSON.stringify(buildExportJson(), null, 2);
  const isEn = _lang === 'en';
  navigator.clipboard?.writeText(text).then(() => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = isEn ? '✓ COPIED!' : '✓ КОПИРАНО!';
    setTimeout(() => { if (document.getElementById(btnId)) btn.textContent = orig; }, 2000);
  }).catch(() => {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;height:40vh;z-index:9999;font-size:11px;background:#0d2e1a;color:#fff;border:none;padding:12px;';
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.addEventListener('blur', () => area.remove());
  });
}

/* ---- GitHub save section ---- */

function renderSaveSection(state) {
  const el = document.getElementById('github-save-section');
  if (!el) return;

  if (state.type === 'idle') {
    el.innerHTML = `
      <button class="github-save-btn" id="gh-save-btn">↑ SAVE TO GITHUB</button>`;
    document.getElementById('gh-save-btn').addEventListener('click', onSaveClick);

  } else if (state.type === 'no-token') {
    el.innerHTML = `
      <div class="github-token-form">
        <input class="github-token-input" id="gh-token-input" type="password"
               placeholder="ghp_…" autocomplete="off" autocorrect="off" spellcheck="false" />
        <button class="github-token-save-btn" id="gh-token-save-btn">SET</button>
      </div>
      <p class="github-token-hint">
        GitHub token with <strong>contents:write</strong> access
      </p>`;
    document.getElementById('gh-token-save-btn').addEventListener('click', () => {
      const val = (document.getElementById('gh-token-input')?.value || '').trim();
      if (!val) return;
      saveToken(val);
      onSaveClick();
    });
    document.getElementById('gh-token-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('gh-token-save-btn')?.click();
    });

  } else if (state.type === 'saving') {
    el.innerHTML = `
      <button class="github-save-btn github-save-btn--loading" disabled>SAVING…</button>`;

  } else if (state.type === 'success') {
    el.innerHTML = `
      <div class="github-save-status github-save-status--ok">✓ SAVED TO GITHUB</div>`;

  } else if (state.type === 'error') {
    el.innerHTML = `
      <div class="github-save-status github-save-status--err">${state.msg || 'Save failed'}</div>
      <button class="github-save-btn" id="gh-save-btn" style="margin-top:6px">RETRY</button>`;
    document.getElementById('gh-save-btn').addEventListener('click', onSaveClick);
  }
}

async function onSaveClick() {
  if (!loadToken()) {
    renderSaveSection({ type: 'no-token' });
    return;
  }
  renderSaveSection({ type: 'saving' });
  try {
    await saveGame(buildExportJson());
    try { localStorage.removeItem(lsKey(G.date)); } catch { /* */ }
    renderSaveSection({ type: 'success' });
  } catch (err) {
    if (err.code === 'NO_TOKEN' || err.code === 'AUTH_FAILED') {
      clearToken();
      renderSaveSection({ type: 'no-token' });
    } else {
      renderSaveSection({ type: 'error', msg: err.message || 'Save failed' });
    }
  }
}

/* ---- Summary ---- */

function showSummary() {
  const isEn  = _lang === 'en';
  const hp    = G.score.hp, opp = G.score.opp;
  const hpT   = calcTotal(hp), oppT = calcTotal(opp);
  const s     = G.stats;
  const hpWon = hpT > oppT, oppWon = oppT > hpT;
  const result = hpWon ? (isEn ? 'WIN' : 'ПОБЕДА') : oppWon ? (isEn ? 'LOSS' : 'ЗАГУБА') : (isEn ? 'DRAW' : 'РАВЕНСТВО');
  const chipCls = hpWon ? 'win' : oppWon ? 'loss' : 'draw';
  const moods   = ['😤','😐','🙂','😄','🔥'];
  const moodStr = G.mood ? moods[G.mood - 1] : '—';
  const oppName = (G.opponent || 'Opponent').toUpperCase().substring(0, 11);

  document.getElementById('app').innerHTML = `
    <div class="screen summary-screen">
      <header class="tracker-header">
        <button class="back-btn" id="sum-back">‹</button>
        <div class="tracker-header__info">
          <span class="tracker-header__rd">${isEn ? 'FULL TIME' : 'КРАЙ НА МАЧА'}</span>
        </div>
        <div></div>
      </header>

      <div class="summary-scoreline">
        <div class="summary-team">
          <div class="summary-team__name">HP BLUE</div>
          <div class="summary-team__score">${hp.goals}.${hp.behinds} (${hpT})</div>
        </div>
        <span class="result-chip result-chip--${chipCls} summary-result-chip">${result}</span>
        <div class="summary-team summary-team--right">
          <div class="summary-team__name">${oppName}</div>
          <div class="summary-team__score">${opp.goals}.${opp.behinds} (${oppT})</div>
        </div>
      </div>

      <div class="summary-player-row">
        <div class="summary-mood-col">
          <div class="summary-section-lbl">${isEn ? "ALEK'S GAME" : 'АЛЕК'}</div>
          <div class="summary-mood-emoji">${moodStr}</div>
          ${G.position ? `<div class="summary-pos">${G.position.toUpperCase()}</div>` : ''}
        </div>
        <div class="summary-alek-scores">
          <div class="summary-alek-item">
            <span class="summary-alek-val">${s.goals}</span>
            <span class="summary-alek-lbl">${isEn ? 'Goals' : 'Гола'}</span>
          </div>
          <div class="summary-alek-item">
            <span class="summary-alek-val">${s.behinds}</span>
            <span class="summary-alek-lbl">${isEn ? 'Behinds' : 'Зад'}</span>
          </div>
        </div>
      </div>

      <div class="summary-stats">
        <div class="summary-stat-row">
          <span class="summary-stat-lbl">${isEn ? 'Disposals' : 'Наминавания'}</span>
          <span class="summary-stat-val">${s.disposals} <em>${s.disposalsOk} ✓</em></span>
        </div>
        <div class="summary-stat-row">
          <span class="summary-stat-lbl">${isEn ? 'Tackles' : 'Такъли'}</span>
          <span class="summary-stat-val">${s.tackles} <em>${s.tacklesOk} ✓</em></span>
        </div>
        <div class="summary-stat-row">
          <span class="summary-stat-lbl">${isEn ? 'Marks' : 'Хвърляния'}</span>
          <span class="summary-stat-val">${s.marks} <em>${s.marksOk} ✓</em></span>
        </div>
      </div>

      <div class="summary-footer">
        <div id="github-save-section"></div>
        <button class="summary-copy-btn" id="sum-export">📋 ${isEn ? 'COPY JSON' : 'КОПИРАЙ'}</button>
        <button class="summary-done-btn" id="sum-done">${isEn ? 'BACK TO FIXTURES' : 'КЪМ МАЧОВЕТЕ'}</button>
      </div>
    </div>`;

  document.getElementById('sum-back').addEventListener('click',   () => { window.location.hash = `#/${_lang}`; });
  document.getElementById('sum-done').addEventListener('click',   () => { window.location.hash = `#/${_lang}`; });
  document.getElementById('sum-export').addEventListener('click', () => copyExport('sum-export'));

  renderSaveSection({ type: 'idle' });
}

/* ---- Date label ---- */

function fmtShortDate(d) {
  if (!d) return '';
  const [, m, day] = d.split('-').map(Number);
  return `${day} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][m-1]}`;
}

/* ---- Entry point ---- */

export async function renderTracker(lang, round) {
  _lang = lang;
  const app   = document.getElementById('app');
  const isEn  = lang === 'en';
  const today = new Date().toISOString().split('T')[0];

  // Load fixture info
  let info = { round: round || null, opponent: 'Opponent', homeAway: 'home', season: BASE_SEASON };
  try {
    const data = await fetch('./data/fixtures.json').then(r => r.json());
    info.season = data.season;
    const match = round
      ? data.rounds.find(r => r.round === round)
      : data.rounds.find(r => r.date === today);
    if (match) {
      info.round    = match.round;
      info.opponent = (match.homeAway === 'home' ? match.awayTeam : match.homeTeam) || 'Opponent';
      info.homeAway = match.homeAway || 'home';
    }
  } catch { /* use defaults */ }

  // Resume or start fresh
  const existing = loadState(today);
  if (existing) {
    G = existing;
    if (!G.log) G.log = [];
    if (G.status === 'final') { showSummary(); return; }
  } else {
    G = initState(today, info.round, info.opponent, info.homeAway, info.season);
  }

  const oppShort = (G.opponent || 'Opponent').toUpperCase().substring(0, 10);
  const rdLabel  = G.round
    ? `${isEn ? 'RD' : 'КР'} ${G.round} · ${G.homeAway === 'home' ? (isEn ? 'HOME' : 'У ДОМА') : (isEn ? 'AWAY' : 'ГОСТИ')}`
    : (isEn ? 'GAME' : 'МАЧ');

  app.innerHTML = `
    <div class="screen tracker-screen">
      <header class="tracker-header">
        <button class="back-btn" id="tracker-back">‹</button>
        <div class="tracker-header__info">
          <span class="tracker-header__rd">${rdLabel}</span>
          <span class="tracker-header__date">${fmtShortDate(today)}</span>
        </div>
        <div class="tracker-header__q" id="header-q">Q1</div>
      </header>

      <section class="tracker-scoreboard">
        <div class="tracker-team">
          <div class="tracker-team__name">HP BLUE</div>
          <button class="tracker-score-btn" id="score-hp-btn" aria-label="${isEn ? 'Hold to score' : 'Задръж'}">
            <span id="hp-goals">0</span><span class="tracker-score__sep">.</span><span id="hp-behinds">0</span>
            <span class="tracker-score__total" id="hp-total">(0)</span>
          </button>
        </div>
        <div class="tracker-score-vs">·</div>
        <div class="tracker-team tracker-team--right">
          <div class="tracker-team__name">${oppShort}</div>
          <button class="tracker-score-btn" id="score-opp-btn" aria-label="${isEn ? 'Hold to score' : 'Задръж'}">
            <span id="opp-goals">0</span><span class="tracker-score__sep">.</span><span id="opp-behinds">0</span>
            <span class="tracker-score__total" id="opp-total">(0)</span>
          </button>
        </div>
      </section>

      <p class="tracker-score-hint">${isEn ? 'hold or double-tap score to record' : 'задръж или двоен тап за резултат'}</p>

      <nav class="quarter-bar">
        <button class="q-btn" data-q="1">Q1</button>
        <button class="q-btn" data-q="2">Q2</button>
        <button class="q-btn" data-q="3">Q3</button>
        <button class="q-btn" data-q="4">Q4</button>
        <button class="q-btn q-btn--final" data-q="5">${isEn ? 'FINAL' : 'КРАЙ'}</button>
      </nav>

      <div class="position-row">
        <button class="pos-btn" data-pos="fwd">${isEn ? 'FWD' : 'НАП'}</button>
        <button class="pos-btn" data-pos="mid">${isEn ? 'MID' : 'СРЕ'}</button>
        <button class="pos-btn" data-pos="def">${isEn ? 'DEF' : 'ЗАЩ'}</button>
        <button class="pos-btn" data-pos="ruc">${isEn ? 'RUC' : 'РАК'}</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card" id="stat-disposal">
          <div class="stat-card__label">${isEn ? 'DISPOSAL' : 'НАМИНАВ.'}</div>
          <div class="stat-card__count" id="stat-disp-count">0</div>
          <div class="stat-card__ok" id="stat-disp-ok">0 ✓</div>
          <div class="stat-card__hint">${isEn ? 'tap · hold=✓' : 'tap · задръж=✓'}</div>
        </div>
        <div class="stat-card" id="stat-tackle">
          <div class="stat-card__label">${isEn ? 'TACKLE' : 'ТАКЪЛ'}</div>
          <div class="stat-card__count" id="stat-tack-count">0</div>
          <div class="stat-card__ok" id="stat-tack-ok">0 ✓</div>
          <div class="stat-card__hint">${isEn ? 'tap · hold=✓' : 'tap · задръж=✓'}</div>
        </div>
        <div class="stat-card" id="stat-mark">
          <div class="stat-card__label">${isEn ? 'MARK' : 'ХВЪ.'}</div>
          <div class="stat-card__count" id="stat-mark-count">0</div>
          <div class="stat-card__ok" id="stat-mark-ok">0 ✓</div>
          <div class="stat-card__hint">${isEn ? 'tap · hold=✓' : 'tap · задръж=✓'}</div>
        </div>
      </div>

      <div class="tracker-footer">
        <button class="undo-btn" id="undo-btn" disabled>↩ ${isEn ? 'UNDO' : 'ОТМЕНИ'}</button>
        <div class="tracker-alek-tally">
          <span class="alek-badge" id="alek-goals">0</span><span class="alek-badge-lbl">G</span>
          <span class="alek-badge alek-badge--b" id="alek-behinds">0</span><span class="alek-badge-lbl">B</span>
        </div>
        <button class="export-live-btn" id="live-export" aria-label="${isEn ? 'Copy JSON' : 'Копирай'}">📋</button>
      </div>
    </div>

    <div class="score-fork" id="score-fork" hidden>
      <div class="score-fork__backdrop" id="fork-backdrop"></div>
      <div class="score-fork__sheet" id="fork-sheet"></div>
    </div>

    <div class="mood-picker" id="mood-picker" hidden>
      <div class="mood-picker__backdrop"></div>
      <div class="mood-picker__sheet">
        <p class="mood-question"></p>
        <div class="mood-row">
          <button class="mood-btn" data-mood="1">😤</button>
          <button class="mood-btn" data-mood="2">😐</button>
          <button class="mood-btn" data-mood="3">🙂</button>
          <button class="mood-btn" data-mood="4">😄</button>
          <button class="mood-btn" data-mood="5">🔥</button>
        </div>
        <button class="mood-skip" id="mood-skip">${isEn ? 'Skip' : 'Пропусни'}</button>
      </div>
    </div>`;

  document.getElementById('tracker-back').addEventListener('click', () => {
    window.location.hash = `#/${lang}`;
  });

  attachScorePress(document.getElementById('score-hp-btn'),  () => { closeFork(); openFork('hp'); });
  attachScorePress(document.getElementById('score-opp-btn'), () => { closeFork(); openFork('opp'); });

  attachStatPress(document.getElementById('stat-disposal'), 'disposals');
  attachStatPress(document.getElementById('stat-tackle'),   'tackles');
  attachStatPress(document.getElementById('stat-mark'),     'marks');

  document.querySelectorAll('.q-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      const q = parseInt(btn.dataset.q, 10);
      if (q > G.quarter) advanceQuarter(q);
    }));

  document.querySelectorAll('.pos-btn').forEach(btn =>
    btn.addEventListener('click', () => setPosition(btn.dataset.pos)));

  document.getElementById('undo-btn').addEventListener('click', undoLast);
  document.getElementById('live-export').addEventListener('click', () => copyExport('live-export'));
  document.getElementById('fork-backdrop').addEventListener('click', closeFork);

  fullUpdate();
}
