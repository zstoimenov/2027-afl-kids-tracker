/* =========================================================
   Shared season-config loader.
   Single source of truth for player + team identity, read from
   data/season-config.json. Fetched once and memoised.
   ========================================================= */

let _cfgPromise = null;

export function getConfig() {
  if (!_cfgPromise) {
    _cfgPromise = fetch('./data/season-config.json')
      .then(r => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return _cfgPromise;
}

// Full team name for headers, from the official `team` field.
// `seasonTeamName` stays reserved for a future rename (not used yet), so the
// header keeps showing the current official name.
export function teamName(cfg) {
  return (cfg && cfg.team && cfg.team.trim()) || 'Hammond Park Blue';
}

export function playerInfo(cfg) {
  const p = (cfg && cfg.player) || {};
  return { name: p.name || 'Alek', number: p.number ?? 13 };
}
