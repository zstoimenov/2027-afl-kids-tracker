const OWNER  = 'zstoimenov';
const REPO   = '2027-afl-kids-tracker';
/* branch that GitHub Pages serves — update when merging to main */
const BRANCH = 'claude/phase-1-project-setup-ofhvai';
const API    = 'https://api.github.com';
const TOKEN_KEY = 'afl.gh.token';

export function loadToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

export function saveToken(tok) {
  try { localStorage.setItem(TOKEN_KEY, tok.trim()); } catch { /* */ }
}

export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* */ }
}

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function ghFetch(method, path, body, token) {
  const resp = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (resp.status === 401 || resp.status === 403) {
    const e = new Error('Auth failed — check token permissions');
    e.code = 'AUTH_FAILED';
    throw e;
  }
  return resp;
}

async function getFile(path, token) {
  const resp = await ghFetch('GET', `/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`, null, token);
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`GET ${path}: ${resp.status}`);
  const data = await resp.json();
  return { sha: data.sha, content: fromBase64(data.content) };
}

async function putFile(path, content, message, token, sha) {
  const body = { message, content: toBase64(content), branch: BRANCH };
  if (sha) body.sha = sha;
  const resp = await ghFetch('PUT', `/repos/${OWNER}/${REPO}/contents/${path}`, body, token);
  if (!resp.ok) {
    const e = new Error(`Save failed (${resp.status})`);
    e.code = 'SAVE_FAILED';
    throw e;
  }
  return resp.json();
}

export async function saveGame(gameJson) {
  const token = loadToken();
  if (!token) {
    const e = new Error('No token');
    e.code = 'NO_TOKEN';
    throw e;
  }

  // Save game file
  const gamePath = `docs/data/games/game-${gameJson.date}.json`;
  const existing = await getFile(gamePath, token);
  await putFile(
    gamePath,
    JSON.stringify(gameJson, null, 2),
    `game: R${gameJson.round} ${gameJson.date} vs ${gameJson.opponent}`,
    token,
    existing?.sha ?? null,
  );

  // Patch fixtures.json with the result
  const fixturesPath = 'docs/data/fixtures.json';
  const fixturesFile = await getFile(fixturesPath, token);
  if (fixturesFile) {
    const fixtures = JSON.parse(fixturesFile.content);
    const idx = fixtures.rounds.findIndex(r => r.round === gameJson.round);
    if (idx >= 0) fixtures.rounds[idx].result = gameJson.score;
    await putFile(
      fixturesPath,
      JSON.stringify(fixtures, null, 2),
      `fixtures: R${gameJson.round} result recorded`,
      token,
      fixturesFile.sha,
    );
  }
}
