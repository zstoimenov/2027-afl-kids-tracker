/* =========================================================
   Milestones & Challenges.

   Rewards the things Alek can control — effort, work-rate,
   versatility — over a ROLLING 3-GAME WINDOW, so he focuses on
   his own recent form rather than a season total he can't move.

   A chip is GOLD when the challenge is currently met across his
   last 3 (tracked) games, GREY when it isn't, and PENDING (a
   muted "not yet tracked" state) when the data needed to judge it
   doesn't exist yet — e.g. the events stream, which only future
   games carry.

   Pure client-side: reads the same game JSON the rest of the app
   does. No build step.
   ========================================================= */

import { icon } from './icons.js';
import { menuButtonHtml, attachMenu } from './menu.js';
import { getConfig, teamName } from './config.js';

/* ---- Tunable thresholds — adjust these in one place ---- */
export const THRESHOLDS = {
  tacklesPerGame:   7,     // Pressure Machine: avg successful tackles / game
  disposalEff:      0.70,  // Safe Hands: successful ÷ attempts over the window
  disposalsPerGame: 6,     // Chain Linker: avg successful disposals / game
};

const WINDOW = 3;          // rolling window size (games)

/* ---- data loaders (mirror story.js; those aren't exported) ---- */

async function loadGameIndexDates() {
  try {
    const resp = await fetch('./data/games/index.json');
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data.games) ? data.games : [];
  } catch { return []; }
}

async function loadGame(date) {
  try {
    const resp = await fetch(`./data/games/game-${date}.json`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

// All saved games for a season, sorted by date ascending. Optionally only
// games up to and including `asOfDate` (used by the match-report placement).
export async function loadTrackedGames(year, asOfDate = null) {
  const dates = (await loadGameIndexDates())
    .filter(d => String(d).startsWith(`${year}-`))
    .filter(d => !asOfDate || d <= asOfDate)
    .sort();
  const games = await Promise.all(dates.map(loadGame));
  return games.filter(Boolean);
}

/* ---- window helpers ---- */

// Historical rounds 1–2 (2026) have empty quarters and all-zero detail stats —
// they never tracked tackles/disposals, so they must not drag a rolling
// average. A game that tracked effort stats has quarters.
const hasEffortData = g => (g.quarters || []).length > 0;
const hasEvents     = g => (g.events || []).length > 0;

function lastN(games, n) {
  return games.slice(Math.max(0, games.length - n));
}

// Sum the nested {attempts, successful} effort stats over a window of games.
function windowAggregate(games) {
  const a = { n: games.length, tackOk: 0, tackAtt: 0, dispOk: 0, dispAtt: 0 };
  for (const g of games) {
    const s = g.totals?.aleksStats || {};
    a.tackOk  += s.tackles?.successful   || 0;
    a.tackAtt += s.tackles?.attempts     || 0;
    a.dispOk  += s.disposals?.successful || 0;
    a.dispAtt += s.disposals?.attempts   || 0;
  }
  return a;
}

// Total Footballer: in a single game, a positive involvement (ok mark /
// disposal / tackle) in all three zones AND a goal.
function totalFootballerGame(g) {
  const events = g.events || [];
  if (!events.length) return false;
  const goal = events.some(e => e.scorer === 'alek' && e.action === 'goal');
  if (!goal) return false;
  const zones = new Set();
  for (const e of events) {
    if (e.ok && ['marks', 'disposals', 'tackles'].includes(e.action) &&
        ['def', 'mid', 'fwd'].includes(e.position)) {
      zones.add(e.position);
    }
  }
  return zones.has('def') && zones.has('mid') && zones.has('fwd');
}

/* ---- challenge definitions ---- */
// status: 'gold' (met) | 'grey' (not met) | 'pending' (data not available yet)
// Each evaluate() receives the full season game list (ascending) and returns a
// { status, value, target } where value/target are short display strings.

export const CHALLENGES = [
  {
    id: 'pressure',
    ic: 'pressure',
    label: { en: 'Pressure Machine', bg: 'Машина за натиск' },
    how: {
      en: `Average ${THRESHOLDS.tacklesPerGame}+ successful tackles a game across your last 3 games. Chase, lay it on, win the ball back.`,
      bg: `Средно ${THRESHOLDS.tacklesPerGame}+ успешни такъла на мач през последните 3 мача. Гони, притискай и връщай топката.`,
    },
    evaluate(games) {
      const w = lastN(games.filter(hasEffortData), WINDOW);
      if (!w.length) return { status: 'pending' };
      const a = windowAggregate(w);
      const avg = a.tackOk / a.n;
      return {
        status: avg >= THRESHOLDS.tacklesPerGame ? 'gold' : 'grey',
        value: `${avg.toFixed(1)}/game`,
        target: `${THRESHOLDS.tacklesPerGame}+/game`,
      };
    },
  },
  {
    id: 'safehands',
    ic: 'hands',
    label: { en: 'Safe Hands', bg: 'Сигурни ръце' },
    how: {
      en: `Keep your disposal efficiency at ${Math.round(THRESHOLDS.disposalEff * 100)}%+ over your last 3 games. Clean, smart use of the ball under pressure.`,
      bg: `Задръж ефективността на подаванията над ${Math.round(THRESHOLDS.disposalEff * 100)}% през последните 3 мача. Чисто и умно използване на топката под натиск.`,
    },
    evaluate(games) {
      const w = lastN(games.filter(hasEffortData), WINDOW);
      if (!w.length) return { status: 'pending' };
      const a = windowAggregate(w);
      if (!a.dispAtt) return { status: 'pending' };
      const eff = a.dispOk / a.dispAtt;
      return {
        status: eff >= THRESHOLDS.disposalEff ? 'gold' : 'grey',
        value: `${Math.round(eff * 100)}%`,
        target: `${Math.round(THRESHOLDS.disposalEff * 100)}%+`,
      };
    },
  },
  {
    id: 'chainlinker',
    ic: 'chain',
    label: { en: 'Chain Linker', bg: 'Свързващо звено' },
    how: {
      en: `Average ${THRESHOLDS.disposalsPerGame}+ successful disposals a game across your last 3 games. Link the play and hit a teammate.`,
      bg: `Средно ${THRESHOLDS.disposalsPerGame}+ успешни подавания на мач през последните 3 мача. Свързвай играта и намирай съотборник.`,
    },
    evaluate(games) {
      const w = lastN(games.filter(hasEffortData), WINDOW);
      if (!w.length) return { status: 'pending' };
      const a = windowAggregate(w);
      const avg = a.dispOk / a.n;
      return {
        status: avg >= THRESHOLDS.disposalsPerGame ? 'gold' : 'grey',
        value: `${avg.toFixed(1)}/game`,
        target: `${THRESHOLDS.disposalsPerGame}+/game`,
      };
    },
  },
  {
    id: 'totalfooty',
    ic: 'compass',
    label: { en: 'Total Footballer', bg: 'Тотален футболист' },
    how: {
      en: 'In one of your last 3 games, get involved in all three zones — defence, midfield and forward — and kick a goal.',
      bg: 'В един от последните 3 мача се включи и в трите зони — защита, полузащита и нападение — и отбележи гол.',
    },
    needsEvents: true,
    evaluate(games) {
      const w = lastN(games.filter(hasEvents), WINDOW);
      if (!w.length) return { status: 'pending' };
      return { status: w.some(totalFootballerGame) ? 'gold' : 'grey' };
    },
  },
];

// Evaluate every challenge against a season's games (ascending order).
export function evaluateChallenges(games) {
  return CHALLENGES.map(def => ({ def, ...def.evaluate(games) }));
}

/* ---- rendering ---- */

// A row of compact chips — reused by the results strip and the match report.
export function chipRowHtml(statuses, lang) {
  const isEn = lang === 'en';
  return `<div class="challenge-row">${statuses.map(s => {
    const cls = s.status === 'gold' ? 'challenge-chip--gold' : 'challenge-chip--grey';
    return `<span class="challenge-chip ${cls}">${icon(s.def.ic)}<span>${s.def.label[isEn ? 'en' : 'bg']}</span></span>`;
  }).join('')}</div>`;
}

// Load + evaluate + render a chip row into a container (the results strip).
export async function injectChipStrip(containerId, lang, year, asOfDate = null) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const games = await loadTrackedGames(year, asOfDate);
  el.innerHTML = chipRowHtml(evaluateChallenges(games), lang);
}

/* ---- dedicated Challenges screen ---- */

export async function renderChallenges(lang) {
  const isEn = lang === 'en';
  const app  = document.getElementById('app');
  const cfg  = await getConfig();
  const club = teamName(cfg);
  const title = isEn ? 'Challenges' : 'Предизвикателства';

  app.innerHTML = `
    <div class="screen">
      <header class="screen-header">
        <button class="back-btn" id="ch-back" aria-label="${isEn ? 'Back' : 'Назад'}">${icon('back')}</button>
        <div class="screen-header__mid">
          <div class="screen-header__club">${club}</div>
          <h1 class="screen-header__title">${title}</h1>
        </div>
        ${menuButtonHtml(lang, 'challenges')}
      </header>
      <div class="challenges-screen" id="challenges-screen">
        <div class="screen-loading">${isEn ? 'Loading…' : 'Зарежда се…'}</div>
      </div>
    </div>`;

  document.getElementById('ch-back').addEventListener('click', () => {
    window.location.hash = `#/${lang}`;
  });
  attachMenu(lang);

  const year = parseInt(new Date().toISOString().slice(0, 4), 10);
  const games = await loadTrackedGames(year);
  const statuses = evaluateChallenges(games);

  const intro = isEn
    ? 'Earned over your last 3 games. A chip lights up gold while you keep it up.'
    : 'Печелят се през последните 3 мача. Чипът свети в златно, докато Алек поддържа формата.';

  const pendingLbl = isEn ? 'Not tracked yet' : 'Все още не се следи';

  const cards = statuses.map(s => {
    const cls = s.status === 'gold' ? 'challenge-card--gold'
      : s.status === 'pending' ? 'challenge-card--pending' : 'challenge-card--grey';
    const chipCls = s.status === 'gold' ? 'challenge-chip--gold' : 'challenge-chip--grey';
    const progress = s.status === 'pending'
      ? `<span class="challenge-card__pending">${pendingLbl}</span>`
      : (s.value
          ? `<span class="challenge-card__metric"><strong>${s.value}</strong> <span class="challenge-card__target">/ ${s.target}</span></span>`
          : '');
    return `
      <div class="challenge-card ${cls}">
        <div class="challenge-card__top">
          <span class="challenge-chip ${chipCls}">${icon(s.def.ic)}<span>${s.def.label[isEn ? 'en' : 'bg']}</span></span>
          ${progress}
        </div>
        <p class="challenge-card__how">${s.def.how[isEn ? 'en' : 'bg']}</p>
      </div>`;
  }).join('');

  const screen = document.getElementById('challenges-screen');
  screen.innerHTML = `
    <p class="challenges-screen__intro">${intro}</p>
    <div class="challenge-cards">${cards}</div>`;
}
