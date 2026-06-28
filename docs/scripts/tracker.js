import { getConfig, playerInfo } from './config.js';

const BASE_SEASON  = 2026;
const POSITIONS    = [null, 'def', 'mid', 'fwd'];
const POS_LBL      = { 'null': '—', def: 'DEF', mid: 'MID', fwd: 'FWD' };
const MOODS        = ['motivated', 'neutral', 'tired'];
const MOOD_EMOJI   = { motivated: '🔥', neutral: '😐', tired: '😮‍💨' };
const MONTHS       = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

let G         = null;
let _lang     = 'en';
let _timerIv  = null;

// Player identity comes from season-config.json (number may change each season).
let _player   = { name: 'Alek', number: 13 };

async function loadPlayerConfig() {
  _player = playerInfo(await getConfig());
}

/* ---- helpers ---- */

function calcTotal(s)  { return s.goals * 6 + s.behinds; }
function fmtGB(s)      { return `${s.goals}.${s.behinds}`; }
function vibe(p)       { try { navigator.vibrate?.(p); } catch { /**/ } }
function setTxt(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
function lsKey(date)   { return `afl.tracker.${date}`; }

function fmtTimer(sec) {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.floor(Math.max(0, sec) % 60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function fmtDate(d) {
  if (!d) return '';
  const [,m,day] = d.split('-').map(Number);
  return `${day} ${MONTHS[m-1]}`;
}

/* ---- state factories ---- */

function freshQ() {
  return {
    position: null, mood: null, notes: '',
    stats: {
      disposals: 0, disposalsOk: 0,
      tackles:   0, tacklesOk:   0,
      marks:     0, marksOk:     0,
      goals: 0, behinds: 0, goalAttempts: 0,
    },
    scoreAtEnd: null,
  };
}

function initState(date, round, opponent, homeAway, season) {
  return {
    date, round, season,
    opponent:        opponent  || 'Opponent',
    homeAway:        homeAway  || 'home',
    quarterDuration: 900,
    gameStarted:     false,
    quarter:         1,
    status:          'idle',   // idle | running | paused | done
    timerRemaining:  900,
    timerEndTime:    null,
    score: { hp: { goals: 0, behinds: 0 }, opp: { goals: 0, behinds: 0 } },
    quarters: [],
    current:  freshQ(),
    log:      [],
    debrief:  { didWell: '', workOn: '' },
  };
}

/* ---- persistence ---- */

function saveState() {
  try { localStorage.setItem(lsKey(G.date), JSON.stringify(G)); } catch { /**/ }
}

function loadState(date) {
  try { const r = localStorage.getItem(lsKey(date)); return r ? JSON.parse(r) : null; }
  catch { return null; }
}

/* ---- totals ---- */

function getTotals() {
  const t = { disposals:0, disposalsOk:0, tackles:0, tacklesOk:0, marks:0, marksOk:0, goals:0, behinds:0, goalAttempts:0 };
  [...G.quarters, G.current].forEach(q => {
    if (!q?.stats) return;
    for (const k of Object.keys(t)) t[k] += (q.stats[k] || 0);
  });
  return t;
}

/* ---- timer ---- */

function startTimer() {
  if (_timerIv) clearInterval(_timerIv);
  G.gameStarted  = true;
  G.status       = 'running';
  G.timerEndTime = Date.now() + G.timerRemaining * 1000;
  saveState();
  _timerIv = setInterval(tickTimer, 500);
  updateGameBar();
}

function pauseTimer() {
  if (_timerIv) { clearInterval(_timerIv); _timerIv = null; }
  G.status      = 'paused';
  G.timerEndTime = null;
  saveState();
  updateGameBar();
}

function tickTimer() {
  if (!G.timerEndTime) return;
  G.timerRemaining = Math.max(0, (G.timerEndTime - Date.now()) / 1000);
  setTxt('timer-display', fmtTimer(G.timerRemaining));
  if (G.timerRemaining <= 0) {
    clearInterval(_timerIv); _timerIv = null;
    G.status = 'paused'; G.timerEndTime = null;
    saveState(); updateGameBar();
    vibe([60, 40, 60, 40, 120]);
  }
}

function resumeTimerIfNeeded() {
  if (G.status === 'running' && G.timerEndTime) {
    G.timerRemaining = Math.max(0, (G.timerEndTime - Date.now()) / 1000);
    if (G.timerRemaining > 0) {
      _timerIv = setInterval(tickTimer, 500);
    } else {
      G.status = 'paused'; G.timerRemaining = 0; G.timerEndTime = null;
    }
  }
}

/* ---- DOM updates ---- */

function updateScore() {
  setTxt('hp-pts',  calcTotal(G.score.hp));
  setTxt('hp-gb',   fmtGB(G.score.hp));
  setTxt('opp-pts', calcTotal(G.score.opp));
  setTxt('opp-gb',  fmtGB(G.score.opp));
}

function updateAlekStrip() {
  const t = getTotals();
  const parts = [];
  // Order: Goals · Behinds · Shots, Marks, Disposals, Tackles
  if (t.goals || t.behinds || t.goalAttempts)
    parts.push(`${t.goals}G ${t.behinds}B ${t.goalAttempts}S`);
  if (t.marks)     parts.push(`${t.marksOk}/${t.marks}M`);
  if (t.disposals) parts.push(`${t.disposalsOk}/${t.disposals}D`);
  if (t.tackles)   parts.push(`${t.tacklesOk}/${t.tackles}T`);
  setTxt('alek-stats', parts.length ? parts.join(' · ') : '—');
}

function updateStatBtns() {
  const s = G.current.stats;
  setTxt('val-disposal', `${s.disposalsOk}/${s.disposals}`);
  setTxt('val-tackle',   `${s.tacklesOk}/${s.tackles}`);
  setTxt('val-mark',     `${s.marksOk}/${s.marks}`);
}

function updateGameBar() {
  setTxt('q-label',       G.quarter > 4 ? 'FT' : `Q${G.quarter}`);
  setTxt('pos-label',     POS_LBL[String(G.current.position)] ?? '—');
  setTxt('timer-display', fmtTimer(G.timerRemaining));

  const runBtn = document.getElementById('run-btn');
  if (runBtn) {
    runBtn.textContent = !G.gameStarted
      ? '▶ START'
      : G.status === 'running' ? '⏸ RUNNING' : '▶ PAUSED';
    runBtn.classList.toggle('game-bar__run--live', G.status === 'running');
  }

  const timerEl = document.getElementById('timer-display');
  if (timerEl) timerEl.classList.toggle('game-bar__timer--edit', !G.gameStarted);

  const undoBtn = document.getElementById('undo-btn');
  if (undoBtn) undoBtn.disabled = G.log.length === 0;
}

function fullUpdate() {
  updateScore();
  updateAlekStrip();
  updateStatBtns();
  updateGameBar();
}

/* ---- actions ---- */

function recordShotAttempt() {
  G.current.stats.goalAttempts++;
  G.log.push({ type: 'shot' });
  saveState();
  updateAlekStrip();
}

function recordStat(stat, ok) {
  G.current.stats[stat]++;
  if (ok) G.current.stats[`${stat}Ok`]++;
  G.log.push({ type: 'stat', stat, ok });
  saveState();
  updateStatBtns();
  updateAlekStrip();
}

function recordScore(team, scorer, kind) {
  const side = team === 'hp' ? G.score.hp : G.score.opp;
  if (kind === 'goal') side.goals++; else side.behinds++;
  if (team === 'hp' && scorer === 'alek') {
    if (kind === 'goal') G.current.stats.goals++; else G.current.stats.behinds++;
    G.current.stats.goalAttempts++;
  }
  G.log.push({ type: 'score', team, scorer, kind });
  saveState();
  fullUpdate();
  vibe(kind === 'goal' ? [50, 30, 120, 30, 80] : [40, 30, 60]);
}

function undoLast() {
  const last = G.log.pop();
  if (!last) return;
  switch (last.type) {
    case 'shot':
      G.current.stats.goalAttempts--;
      break;
    case 'stat':
      G.current.stats[last.stat]--;
      if (last.ok) G.current.stats[`${last.stat}Ok`]--;
      break;
    case 'score': {
      const side = last.team === 'hp' ? G.score.hp : G.score.opp;
      if (last.kind === 'goal') side.goals--; else side.behinds--;
      if (last.team === 'hp' && last.scorer === 'alek') {
        if (last.kind === 'goal') G.current.stats.goals--; else G.current.stats.behinds--;
        G.current.stats.goalAttempts--;
      }
      break;
    }
  }
  saveState();
  fullUpdate();
  vibe(20);
}

/* ---- position ---- */

function cyclePosition() {
  const idx = POSITIONS.indexOf(G.current.position);
  G.current.position = POSITIONS[(idx + 1) % POSITIONS.length];
  saveState();
  setTxt('pos-label', POS_LBL[String(G.current.position)] ?? '—');
}

/* ---- pre-game timer edit ---- */

function openTimerEdit() {
  if (G.gameStarted) return;
  const cur = Math.round(G.quarterDuration / 60);
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `
    <div class="sheet">
      <div class="sheet-title">QUARTER DURATION</div>
      <div class="sheet-hint">Locked once the game starts</div>
      <div class="timer-presets">
        ${[10, 12, 15, 20].map(m => `
          <button class="timer-preset${m === cur ? ' timer-preset--active' : ''}" data-min="${m}">
            ${m}<span class="timer-preset__unit">min</span>
          </button>`).join('')}
      </div>
      <button class="sheet-cancel" id="timer-cancel">CANCEL</button>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.timer-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const min = parseInt(btn.dataset.min, 10);
      G.quarterDuration  = min * 60;
      G.timerRemaining   = G.quarterDuration;
      saveState();
      setTxt('timer-display', fmtTimer(G.timerRemaining));
      overlay.remove();
    });
  });
  document.getElementById('timer-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

/* ---- quarter notes / end-quarter popup ---- */

function openQuarterNotes() {
  if (G.status === 'running') pauseTimer();
  const q = G.quarter;
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `
    <div class="sheet">
      <div class="sheet-title">Q${q} RECAP</div>
      <div class="mood-row">
        ${MOODS.map(m => `
          <button class="mood-btn${G.current.mood === m ? ' mood-btn--active' : ''}" data-mood="${m}">
            ${MOOD_EMOJI[m]}
          </button>`).join('')}
      </div>
      <textarea class="notes-area" id="qnotes" placeholder="Notes on ${_player.name}'s quarter…">${G.current.notes}</textarea>
      <button class="sheet-primary" id="end-q-btn">${q >= 4 ? '🏁 FULL TIME' : `END Q${q} →`}</button>
      <button class="sheet-cancel" id="qnotes-cancel">CANCEL</button>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      G.current.mood = btn.dataset.mood;
      overlay.querySelectorAll('.mood-btn').forEach(b => b.classList.toggle('mood-btn--active', b === btn));
    });
  });

  document.getElementById('end-q-btn').addEventListener('click', () => {
    G.current.notes = document.getElementById('qnotes')?.value || '';
    overlay.remove();
    endQuarter();
  });

  document.getElementById('qnotes-cancel').addEventListener('click', () => {
    overlay.remove();
  });
}

function endQuarter() {
  G.current.scoreAtEnd = {
    hammondPark: { ...G.score.hp, score: calcTotal(G.score.hp) },
    opposition:  { ...G.score.opp, score: calcTotal(G.score.opp) },
  };
  G.quarters.push({ ...G.current, stats: { ...G.current.stats } });

  if (G.quarter >= 4) {
    G.status = 'done';
    if (_timerIv) { clearInterval(_timerIv); _timerIv = null; }
    saveState();
    showSummary();
    return;
  }

  G.quarter++;
  G.current        = freshQ();
  G.timerRemaining = G.quarterDuration;
  G.status         = 'paused';
  G.timerEndTime   = null;
  saveState();
  fullUpdate();
}

/* ---- fork popup ---- */

function openFork(team, kind) {
  if (team === 'opp') {
    recordScore('opp', null, kind);
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'fork-overlay';
  overlay.innerHTML = `
    <div class="fork-sheet">
      <div class="fork-hint">${kind === 'goal' ? '⚽ GOAL — WHO?' : 'BEHIND — WHO?'}</div>
      <div class="fork-btns">
        <button class="fork-btn fork-btn--alek" data-v="alek">
          ${_player.name.toUpperCase()} <span class="fork-pts">#${_player.number}</span>
        </button>
        <button class="fork-btn" data-v="teammate">TEAMMATE</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.fork-btn').forEach(btn => {
    btn.addEventListener('click', () => { overlay.remove(); recordScore('hp', btn.dataset.v, kind); });
  });
  overlay.addEventListener('click', e => { if (!e.target.closest('.fork-sheet')) overlay.remove(); });
}

/* ---- scoreboard: single / double / long-press handler ---- */

function attachScoreInteraction(el, onSingle, onDouble, onLong) {
  let tapCount = 0, tapTimer = null, pressTimer = null;
  let longFired = false, pressed = false;

  function down(e) {
    if (e.cancelable) e.preventDefault();
    longFired = false; pressed = true;
    pressTimer = setTimeout(() => {
      if (!pressed) return;
      longFired = true;
      clearTimeout(tapTimer); tapCount = 0;
      onLong();
    }, 480);
  }

  function up() {
    clearTimeout(pressTimer);
    if (!pressed || longFired) { pressed = false; return; }
    pressed = false;
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => {
      const n = tapCount; tapCount = 0;
      if (n >= 2) onDouble(); else onSingle();
    }, 280);
  }

  function cancel() {
    clearTimeout(pressTimer); clearTimeout(tapTimer);
    tapCount = 0; pressed = false;
  }

  el.addEventListener('touchstart',  down,   { passive: false });
  el.addEventListener('touchend',    up,     { passive: true  });
  el.addEventListener('touchcancel', cancel, { passive: true  });
  el.addEventListener('mousedown',   down);
  el.addEventListener('mouseup',     up);
  el.addEventListener('mouseleave',  cancel);
}

/* ---- stat button: tap = attempt, long press = successful ---- */

function attachStatPress(el, stat) {
  let timer = null, fired = false, sx = 0, sy = 0;

  el.addEventListener('touchstart', e => {
    e.preventDefault();
    fired = false;
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY;
    vibe(15);
    timer = setTimeout(() => {
      fired = true;
      vibe([30, 20, 80]);
      el.classList.add('stat-btn--ok');
      setTimeout(() => el.classList.remove('stat-btn--ok'), 350);
      recordStat(stat, true);
    }, 450);
  }, { passive: false });

  el.addEventListener('touchmove', e => {
    if (!timer) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) {
      clearTimeout(timer); timer = null;
    }
  }, { passive: true });

  el.addEventListener('touchend', () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (fired) return;
    el.classList.add('stat-btn--tap');
    setTimeout(() => el.classList.remove('stat-btn--tap'), 220);
    recordStat(stat, false);
  }, { passive: true });

  el.addEventListener('touchcancel', () => { if (timer) { clearTimeout(timer); timer = null; } });

  el.addEventListener('mousedown', () => {
    fired = false;
    timer = setTimeout(() => {
      fired = true;
      el.classList.add('stat-btn--ok');
      setTimeout(() => el.classList.remove('stat-btn--ok'), 350);
      recordStat(stat, true);
    }, 450);
  });
  el.addEventListener('mouseup', () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (fired) return;
    el.classList.add('stat-btn--tap');
    setTimeout(() => el.classList.remove('stat-btn--tap'), 220);
    recordStat(stat, false);
  });
  el.addEventListener('mouseleave', () => { if (timer) { clearTimeout(timer); timer = null; } });
}

/* ---- long press helper ---- */

function attachLongPress(el, cb) {
  let t = null;
  const start = () => { t = setTimeout(() => { vibe(40); cb(); }, 600); };
  const stop  = () => { if (t) { clearTimeout(t); t = null; } };
  el.addEventListener('touchstart',  start, { passive: true });
  el.addEventListener('touchend',    stop,  { passive: true });
  el.addEventListener('touchcancel', stop,  { passive: true });
  el.addEventListener('mousedown',   start);
  el.addEventListener('mouseup',     stop);
  el.addEventListener('mouseleave',  stop);
}

/* ---- export JSON ---- */

function buildExportJson() {
  const t    = getTotals();
  const hpT  = calcTotal(G.score.hp);
  const oppT = calcTotal(G.score.opp);
  const allQ = G.status === 'done' ? G.quarters : [...G.quarters, G.current];

  return {
    date: G.date, round: G.round, season: G.season,
    opponent: G.opponent, homeAway: G.homeAway,
    quarters: allQ.map((q, i) => ({
      quarter:   i + 1,
      position:  q.position,
      mood:      q.mood,
      notes:     q.notes || '',
      aleksStats: {
        scoring:   { goals: q.stats.goals, behinds: q.stats.behinds, goalAttempts: q.stats.goalAttempts },
        marks:     { attempts: q.stats.marks,      successful: q.stats.marksOk     },
        disposals: { attempts: q.stats.disposals,  successful: q.stats.disposalsOk },
        tackles:   { attempts: q.stats.tackles,    successful: q.stats.tacklesOk   },
      },
      teamScore: q.scoreAtEnd || {
        hammondPark: { goals: G.score.hp.goals,  behinds: G.score.hp.behinds,  score: hpT  },
        opposition:  { goals: G.score.opp.goals, behinds: G.score.opp.behinds, score: oppT },
      },
    })),
    totals: {
      aleksStats: {
        scoring:   { goals: t.goals, behinds: t.behinds, goalAttempts: t.goalAttempts },
        marks:     { attempts: t.marks,     successful: t.marksOk     },
        disposals: { attempts: t.disposals, successful: t.disposalsOk },
        tackles:   { attempts: t.tackles,   successful: t.tacklesOk   },
        points:    t.goals * 6 + t.behinds,
      },
      teamScore: {
        hammondPark: { goals: G.score.hp.goals,  behinds: G.score.hp.behinds,  score: hpT  },
        opposition:  { goals: G.score.opp.goals, behinds: G.score.opp.behinds, score: oppT },
      },
    },
    debrief: {
      didWell: G.debrief?.didWell || '',
      workOn:  G.debrief?.workOn  || '',
    },
  };
}

function copyJson(btnId) {
  const text = JSON.stringify(buildExportJson(), null, 2);
  navigator.clipboard?.writeText(text).then(() => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = '✓ COPIED!';
    setTimeout(() => { if (document.getElementById(btnId)) btn.textContent = orig; }, 2000);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;height:40vh;z-index:9999;font-size:11px;background:#0d2e1a;color:#fff;border:none;padding:12px;';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    ta.addEventListener('blur', () => ta.remove());
  });
}

/* ---- summary screen ---- */

function showSummary() {
  const t    = getTotals();
  const hp   = G.score.hp, opp = G.score.opp;
  const hpT  = calcTotal(hp), oppT = calcTotal(opp);
  const hpWon = hpT > oppT, oppWon = oppT > hpT;
  const result  = hpWon ? 'WIN' : oppWon ? 'LOSS' : 'DRAW';
  const chipCls = hpWon ? 'win' : oppWon ? 'loss' : 'draw';
  const oppName = (G.opponent || 'Opponent').toUpperCase().substring(0, 11);

  // Home team always renders on the LEFT.
  const isHome  = G.homeAway === 'home';
  const hpTeam  = `
    <div class="summary-team__name">HP BLUE</div>
    <div class="summary-team__score">${hp.goals}.${hp.behinds} (${hpT})</div>`;
  const oppTeam = `
    <div class="summary-team__name">${oppName}</div>
    <div class="summary-team__score">${opp.goals}.${opp.behinds} (${oppT})</div>`;
  const leftTeam  = isHome ? hpTeam : oppTeam;
  const rightTeam = isHome ? oppTeam : hpTeam;

  document.getElementById('app').innerHTML = `
    <div class="screen summary-screen">
      <header class="tracker-header">
        <button class="back-btn" id="sum-back">‹</button>
        <div class="tracker-header__info">
          <span class="tracker-header__rd">FULL TIME · ${fmtDate(G.date)}</span>
        </div>
        <div></div>
      </header>

      <div class="summary-scoreline">
        <div class="summary-team">${leftTeam}</div>
        <span class="result-chip result-chip--${chipCls} summary-result-chip">${result}</span>
        <div class="summary-team summary-team--right">${rightTeam}</div>
      </div>

      <div class="summary-quarters">
        ${G.quarters.map((q, i) => `
          <div class="summary-q">
            <span class="summary-q__qnum">Q${i + 1}</span>
            <span class="summary-q__mood">${MOOD_EMOJI[q.mood] || '—'}</span>
            <span class="summary-q__pos">${POS_LBL[String(q.position)] ?? '—'}</span>
            <span class="summary-q__stats">
              ${[
                q.stats.goals        && `${q.stats.goals}G`,
                q.stats.behinds      && `${q.stats.behinds}B`,
                q.stats.goalAttempts && `${q.stats.goalAttempts}S`,
                q.stats.marksOk      && `${q.stats.marksOk}M`,
                q.stats.disposalsOk  && `${q.stats.disposalsOk}D`,
                q.stats.tacklesOk    && `${q.stats.tacklesOk}T`,
              ].filter(Boolean).join(' · ') || '—'}
            </span>
            ${q.notes ? `<span class="summary-q__note">${q.notes}</span>` : ''}
          </div>`).join('')}
      </div>

      <div class="summary-stats">
        <div class="debrief-card">
          <div class="debrief-field">
            <label class="debrief-label">✅ WHAT WENT WELL</label>
            <textarea class="notes-area" id="debrief-well" placeholder="What ${_player.name} did well today…">${G.debrief?.didWell || ''}</textarea>
          </div>
          <div class="debrief-field">
            <label class="debrief-label">🎯 WORK ON</label>
            <textarea class="notes-area" id="debrief-work" placeholder="One thing to improve next game…">${G.debrief?.workOn || ''}</textarea>
          </div>
        </div>
        <div class="summary-stat-row">
          <span class="summary-stat-lbl">Goals · Behinds · Shots</span>
          <span class="summary-stat-val">${t.goals}G · ${t.behinds}B · ${t.goalAttempts}S</span>
        </div>
        <div class="summary-stat-row">
          <span class="summary-stat-lbl">Marks</span>
          <span class="summary-stat-val">${t.marks} <em>${t.marksOk} ✓</em></span>
        </div>
        <div class="summary-stat-row">
          <span class="summary-stat-lbl">Disposals</span>
          <span class="summary-stat-val">${t.disposals} <em>${t.disposalsOk} ✓</em></span>
        </div>
        <div class="summary-stat-row">
          <span class="summary-stat-lbl">Tackles</span>
          <span class="summary-stat-val">${t.tackles} <em>${t.tacklesOk} ✓</em></span>
        </div>
      </div>

      <div class="summary-footer">
        <div class="game-export-card">
          <div class="game-export-card__label">NEW FILE IN GITHUB MOBILE</div>
          <div class="game-export-card__path">docs/data/games/game-${G.date}.json</div>
          <div class="game-export-card__hint">Add file → Create new file → paste</div>
          <button class="summary-copy-btn" id="sum-export">📋 COPY JSON</button>
          <div class="game-export-card__hint">Then add <strong>"${G.date}"</strong> to <span class="game-export-card__path">docs/data/games/index.json</span> so the result shows on Fixtures.</div>
        </div>
        <div class="summary-footer__row">
          <button class="summary-new-btn" id="sum-new">+ NEW GAME</button>
          <button class="summary-done-btn" id="sum-done">FIXTURES</button>
        </div>
      </div>
    </div>`;

  document.getElementById('sum-back').addEventListener('click', () => { window.location.hash = `#/${_lang}`; });
  document.getElementById('sum-done').addEventListener('click', () => { window.location.hash = `#/${_lang}`; });
  document.getElementById('sum-export').addEventListener('click', () => copyJson('sum-export'));

  document.getElementById('debrief-well').addEventListener('input', e => {
    G.debrief.didWell = e.target.value; saveState();
  });
  document.getElementById('debrief-work').addEventListener('input', e => {
    G.debrief.workOn = e.target.value; saveState();
  });

  document.getElementById('sum-new').addEventListener('click', () => {
    try { localStorage.removeItem(lsKey(G.date)); } catch { /**/ }
    renderTracker(_lang, null);
  });
}

/* ---- entry point ---- */

export async function renderTracker(lang, round) {
  _lang = lang;
  if (_timerIv) { clearInterval(_timerIv); _timerIv = null; }

  const app   = document.getElementById('app');
  const today = new Date().toISOString().split('T')[0];

  await loadPlayerConfig();

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
  } catch { /**/ }

  const saved = loadState(today);
  if (saved) {
    G = saved;
    if (!G.log)                   G.log             = [];
    if (!G.current)               G.current         = freshQ();
    if (!G.quarters)              G.quarters        = [];
    if (G.quarterDuration == null) G.quarterDuration = 900;
    if (G.timerRemaining  == null) G.timerRemaining  = G.quarterDuration;
    if (!G.debrief)               G.debrief         = { didWell: '', workOn: '' };
    if (G.status === 'done') { showSummary(); return; }
    resumeTimerIfNeeded();
  } else {
    G = initState(today, info.round, info.opponent, info.homeAway, info.season);
  }

  const isHome   = G.homeAway === 'home';
  const hpHA     = isHome ? 'HOME' : 'AWAY';
  const oppHA    = isHome ? 'AWAY' : 'HOME';
  const oppShort = (G.opponent || 'Opponent').toUpperCase().substring(0, 10);
  const rdLabel  = G.round ? `RD ${G.round} · ${hpHA}` : 'GAME';

  // Home team always renders on the LEFT, away team on the RIGHT.
  const hpSide = `
    <div class="scoreboard__side scoreboard__side--hp scoreboard__side--${isHome ? 'left' : 'right'}">
      <div class="scoreboard__ha">${hpHA}</div>
      <div class="scoreboard__name">HP BLUE</div>
      <button class="scoreboard__btn scoreboard__btn--hp" id="score-hp-btn">
        <div class="scoreboard__pts" id="hp-pts">${calcTotal(G.score.hp)}</div>
        <div class="scoreboard__gb"  id="hp-gb">${fmtGB(G.score.hp)}</div>
      </button>
    </div>`;
  const oppSide = `
    <div class="scoreboard__side scoreboard__side--opp scoreboard__side--${isHome ? 'right' : 'left'}">
      <div class="scoreboard__ha">${oppHA}</div>
      <div class="scoreboard__name">${oppShort}</div>
      <button class="scoreboard__btn" id="score-opp-btn">
        <div class="scoreboard__pts" id="opp-pts">${calcTotal(G.score.opp)}</div>
        <div class="scoreboard__gb"  id="opp-gb">${fmtGB(G.score.opp)}</div>
      </button>
    </div>`;
  const leftSide  = isHome ? hpSide : oppSide;
  const rightSide = isHome ? oppSide : hpSide;

  app.innerHTML = `
    <div class="screen tracker-screen">

      <div class="ctrl-bar">
        <button class="ctrl-back" id="back-btn">‹</button>
        <div class="ctrl-fixture">
          <span class="ctrl-fixture__rd">${rdLabel}</span>
          <span class="ctrl-fixture__opp">${oppShort}</span>
        </div>
        <button class="ctrl-undo" id="undo-btn" disabled>↩ UNDO</button>
      </div>

      <div class="game-bar">
        <button class="game-bar__q" id="q-label">Q${G.quarter}</button>
        <button class="game-bar__pos" id="pos-btn">
          <span id="pos-label">${POS_LBL[String(G.current.position)] ?? '—'}</span>
        </button>
        <div class="game-bar__sep">|</div>
        <div class="game-bar__timer${!G.gameStarted ? ' game-bar__timer--edit' : ''}" id="timer-display">${fmtTimer(G.timerRemaining)}</div>
        <div class="game-bar__sep">|</div>
        <button class="game-bar__run${G.status === 'running' ? ' game-bar__run--live' : ''}" id="run-btn">
          ${!G.gameStarted ? '▶ START' : G.status === 'running' ? '⏸ RUNNING' : '▶ PAUSED'}
        </button>
      </div>

      <section class="scoreboard">
        ${leftSide}
        <div class="scoreboard__div">:</div>
        ${rightSide}
      </section>

      <div class="alek-strip">
        <span class="alek-strip__name">⭐ ${_player.name.toUpperCase()} #${_player.number}</span>
        <span class="alek-strip__stats" id="alek-stats">—</span>
      </div>

      <div class="stat-btns">
        <button class="stat-btn" id="btn-mark">
          <span class="stat-btn__icon">🏉</span>
          <span class="stat-btn__label">MARK</span>
          <span class="stat-btn__val" id="val-mark">0/0</span>
        </button>
        <button class="stat-btn" id="btn-disposal">
          <span class="stat-btn__icon">🤲</span>
          <span class="stat-btn__label">DISPOSAL</span>
          <span class="stat-btn__val" id="val-disposal">0/0</span>
        </button>
        <button class="stat-btn" id="btn-tackle">
          <span class="stat-btn__icon">🤼</span>
          <span class="stat-btn__label">TACKLE</span>
          <span class="stat-btn__val" id="val-tackle">0/0</span>
        </button>
      </div>

    </div>`;

  document.getElementById('back-btn').addEventListener('click', () => {
    if (_timerIv) { clearInterval(_timerIv); _timerIv = null; }
    window.location.hash = `#/${lang}`;
  });

  document.getElementById('undo-btn').addEventListener('click', undoLast);
  document.getElementById('pos-btn').addEventListener('click', cyclePosition);

  const runBtn = document.getElementById('run-btn');
  runBtn.addEventListener('click', () => {
    if (!G.gameStarted || G.status === 'paused') startTimer();
    else if (G.status === 'running') pauseTimer();
  });

  document.getElementById('timer-display').addEventListener('click', () => {
    if (!G.gameStarted) openTimerEdit();
  });

  attachLongPress(document.getElementById('q-label'), openQuarterNotes);

  attachScoreInteraction(
    document.getElementById('score-hp-btn'),
    () => { vibe(15); recordShotAttempt(); },
    () => { vibe([30, 20, 60]); openFork('hp', 'behind'); },
    () => { vibe([60, 30, 120]); openFork('hp', 'goal'); }
  );
  attachScoreInteraction(
    document.getElementById('score-opp-btn'),
    () => { /* single tap opp = no-op */ },
    () => { vibe([30, 20, 60]); openFork('opp', 'behind'); },
    () => { vibe([60, 30, 120]); openFork('opp', 'goal'); }
  );

  attachStatPress(document.getElementById('btn-disposal'), 'disposals');
  attachStatPress(document.getElementById('btn-tackle'),   'tackles');
  attachStatPress(document.getElementById('btn-mark'),     'marks');

  fullUpdate();
}
