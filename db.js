// Kortbord database (SQLite, built into Node 22 – no extra install).
// Stores community games, play counts (one per room and round) and reports.
// File location: env KORTBORD_DB, default data/kortbord.db
// Optional cloud copy: with TURSO_URL + TURSO_TOKEN (free at turso.tech) everything is also saved
// there, and loaded from there when the server starts. Use it on hosts whose disk is wiped on
// restart (e.g. Render's free plan). The local file then works as a fast copy.
const fs = require('fs');
const path = require('path');

// node:sqlite prints an "experimental" warning on load; hide only that one.
const emit = process.emitWarning;
process.emitWarning = (w, ...rest) => { if (String(w && w.message || w).includes('SQLite')) return; return emit.call(process, w, ...rest); };
const { DatabaseSync } = require('node:sqlite');
process.emitWarning = emit;

const FILE = process.env.KORTBORD_DB || path.join(__dirname, 'data', 'kortbord.db');
fs.mkdirSync(path.dirname(FILE), { recursive: true });
const db = new DatabaseSync(FILE);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY, data TEXT NOT NULL, author_hash TEXT, public INTEGER NOT NULL DEFAULT 1,
    created INTEGER NOT NULL, hidden INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS plays (
    game_id TEXT NOT NULL, room TEXT NOT NULL, round INTEGER NOT NULL, ts INTEGER NOT NULL,
    PRIMARY KEY (game_id, room, round));
  CREATE TABLE IF NOT EXISTS reports (
    game_id TEXT NOT NULL, reporter TEXT NOT NULL, reason TEXT, ts INTEGER NOT NULL,
    PRIMARY KEY (game_id, reporter));
`);
const HIDE_AFTER_REPORTS = 3;
const DDL = [
  'CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, data TEXT NOT NULL, author_hash TEXT, public INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL, hidden INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS plays (game_id TEXT NOT NULL, room TEXT NOT NULL, round INTEGER NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY (game_id, room, round))',
  'CREATE TABLE IF NOT EXISTS reports (game_id TEXT NOT NULL, reporter TEXT NOT NULL, reason TEXT, ts INTEGER NOT NULL, PRIMARY KEY (game_id, reporter))',
];

/* ---------- cloud copy (Turso, over its HTTP API – no extra package) ---------- */
const TURSO_URL = (process.env.TURSO_URL || '').replace(/^libsql:\/\//, 'https://').replace(/\/+$/, '');
const TURSO_TOKEN = process.env.TURSO_TOKEN || '';
const cloud = !!(TURSO_URL && TURSO_TOKEN);
const arg = v => (v == null ? { type: 'null' } : Number.isInteger(v) ? { type: 'integer', value: String(v) } : { type: 'text', value: String(v) });
async function tursoRun(stmts) { // [[sql, args]] → results (rows as objects)
  const res = await fetch(TURSO_URL + '/v2/pipeline', {
    method: 'POST', headers: { Authorization: 'Bearer ' + TURSO_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [...stmts.map(([sql, args = []]) => ({ type: 'execute', stmt: { sql, args: args.map(arg) } })), { type: 'close' }] }),
  });
  if (!res.ok) throw new Error('Turso ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const out = await res.json();
  return out.results.slice(0, stmts.length).map(r => {
    if (r.type !== 'ok') throw new Error('Turso: ' + JSON.stringify(r.error || r).slice(0, 200));
    const { cols, rows } = r.response.result;
    return rows.map(row => Object.fromEntries(row.map((c, i) => [cols[i].name, c.type === 'integer' ? Number(c.value) : c.type === 'null' ? null : c.value])));
  });
}
// writes go to the cloud in order, in the background; a failed write is retried a few times
let queue = Promise.resolve();
function toCloud(sql, args) {
  if (!cloud) return;
  queue = queue.then(async () => {
    for (let i = 0; i < 4; i++) {
      try { await tursoRun([[sql, args]]); return; } catch (e) { if (i === 3) console.error('could not save to Turso:', e.message); else await new Promise(r => setTimeout(r, 500 * 2 ** i)); }
    }
  });
}
// on start: fill the local copy from the cloud
const ready = !cloud ? Promise.resolve() : (async () => {
  await tursoRun(DDL.map(sql => [sql]));
  const [games, plays, reports] = await tursoRun([['SELECT * FROM games'], ['SELECT * FROM plays'], ['SELECT * FROM reports']]);
  if (!games.length && !plays.length) { // empty cloud: copy what we already have here up to it (first start)
    const local = { games: db.prepare('SELECT * FROM games').all(), plays: db.prepare('SELECT * FROM plays').all(), reports: db.prepare('SELECT * FROM reports').all() };
    const stmts = [
      ...local.games.map(r => ['INSERT OR IGNORE INTO games (id, data, author_hash, public, created, hidden) VALUES (?, ?, ?, ?, ?, ?)', [r.id, r.data, r.author_hash, r.public, r.created, r.hidden]]),
      ...local.plays.map(r => [SQL.play, [r.game_id, r.room, r.round, r.ts]]),
      ...local.reports.map(r => [SQL.report, [r.game_id, r.reporter, r.reason, r.ts]]),
    ];
    for (let i = 0; i < stmts.length; i += 200) await tursoRun(stmts.slice(i, i + 200));
    console.log(`Turso var tom – laddade upp ${local.games.length} spel och ${local.plays.length} spelningar`);
    return;
  }
  db.exec('BEGIN; DELETE FROM games; DELETE FROM plays; DELETE FROM reports;');
  try {
    const g = db.prepare('INSERT INTO games (id, data, author_hash, public, created, hidden) VALUES (?, ?, ?, ?, ?, ?)');
    for (const r of games) g.run(r.id, r.data, r.author_hash, r.public, r.created, r.hidden);
    const p = db.prepare('INSERT OR IGNORE INTO plays (game_id, room, round, ts) VALUES (?, ?, ?, ?)');
    for (const r of plays) p.run(r.game_id, r.room, r.round, r.ts);
    const rp = db.prepare('INSERT OR IGNORE INTO reports (game_id, reporter, reason, ts) VALUES (?, ?, ?, ?)');
    for (const r of reports) rp.run(r.game_id, r.reporter, r.reason, r.ts);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  console.log(`Turso: hämtade ${games.length} spel, ${plays.length} spelningar, ${reports.length} rapporter`);
})();

const SQL = { // the writes, also sent as-is to the cloud copy
  upsert: 'INSERT INTO games (id, data, author_hash, public, created) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, public = excluded.public',
  del: 'DELETE FROM games WHERE id = ? AND author_hash = ?',
  play: 'INSERT OR IGNORE INTO plays (game_id, room, round, ts) VALUES (?, ?, ?, ?)',
  report: 'INSERT OR IGNORE INTO reports (game_id, reporter, reason, ts) VALUES (?, ?, ?, ?)',
  hide: 'UPDATE games SET hidden = 1 WHERE id = ?',
};
const q = {
  allGames: db.prepare('SELECT id, data, author_hash, public, created, hidden FROM games'),
  upsert: db.prepare(SQL.upsert), del: db.prepare(SQL.del), play: db.prepare(SQL.play), report: db.prepare(SQL.report), hide: db.prepare(SQL.hide),
  counts: db.prepare('SELECT game_id, COUNT(*) AS n FROM plays GROUP BY game_id'),
  reportCount: db.prepare('SELECT COUNT(*) AS n FROM reports WHERE game_id = ?'),
};

// one-time import of games saved by the earlier JSON-file version
(function migrate() {
  const old = path.join(__dirname, 'data', 'templates.json');
  if (q.allGames.all().length || !fs.existsSync(old)) return;
  try {
    for (const t of JSON.parse(fs.readFileSync(old, 'utf8'))) if (t && t.id && t.zones) saveGame(t, true);
  } catch { /* unreadable old file – ignore */ }
})();

function allGames() {
  return q.allGames.all().map(r => Object.assign(JSON.parse(r.data), { id: r.id, authorHash: r.author_hash, public: !!r.public, created: r.created, hidden: !!r.hidden }));
}
function saveGame(t, localOnly) {
  const { authorHash, hidden, ...data } = t;
  const args = [t.id, JSON.stringify(data), authorHash || null, t.public ? 1 : 0, t.created || Date.now()];
  q.upsert.run(...args);
  if (!localOnly) toCloud(SQL.upsert, args);
}
function deleteGame(id, authorHash) {
  const gone = q.del.run(id, authorHash).changes > 0;
  if (gone) toCloud(SQL.del, [id, authorHash]);
  return gone;
}
// returns true if this (room, round) had not been counted before
function countPlay(gameId, room, round) {
  const args = [gameId, room, round, Date.now()];
  const isNew = q.play.run(...args).changes > 0;
  if (isNew) toCloud(SQL.play, args);
  return isNew;
}
function playCounts() { const m = new Map(); for (const r of q.counts.all()) m.set(r.game_id, r.n); return m; }
// returns true if the game got hidden because enough people reported it
function report(gameId, reporter, reason) {
  const args = [gameId, reporter, String(reason || '').slice(0, 200), Date.now()];
  q.report.run(...args);
  toCloud(SQL.report, args);
  const n = q.reportCount.get(gameId).n;
  if (n >= HIDE_AFTER_REPORTS) { q.hide.run(gameId); toCloud(SQL.hide, [gameId]); return true; }
  return false;
}
module.exports = { allGames, saveGame, deleteGame, countPlay, playCounts, report, FILE, ready, cloud };
