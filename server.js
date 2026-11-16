// Free Deck (Kortbord) – multiplayer server.
// The server owns the true state of every room. Clients send intents ("move this card",
// "press the Hit button"), the server applies them and sends each player a *redacted* copy:
//  • every player has a private hand – other players never receive those cards at all
//  • face-down cards on the table are sent without their face
// The table uses fixed "board units" (1000×600); each client scales it to its screen.
// Games can define buttons ("actions") made of simple steps (deal, flip, next turn …).
// Published games are stored in data/templates.json.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const db = require('./db');
const engineRoom = require('./engine-room');

const PORT = process.env.PORT || 5178;
const BW = 1000, BH = 600;
const SUITS = [['♠', 0], ['♥', 1], ['♣', 0], ['♦', 1]];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_ORDER = { A: 14, K: 13, Q: 12, J: 11, JOKER: 15 };
const COLORS = ['#f2a93b', '#3bb3f2', '#f2607e', '#5fcf6a', '#a97bff', '#ff7a3b', '#2fd6b4', '#e3c34a'];
const LAYOUTS = ['stack', 'fan', 'column'];
const FELTS = ['green', 'blue', 'red', 'purple', 'wood', 'night'];
const BACKS = ['red', 'blue', 'green', 'black', 'purple', 'gold'];
const FACES = ['classic', 'big'];
const CHIPS = ['white', 'red', 'blue', 'green', 'black', 'purple'];
const STEP_KINDS = ['collect', 'shuffle', 'deal', 'flip', 'drawTo', 'moveAll', 'next', 'turnFirst', 'chips'];
const TARGET_WORDS = ['hands', 'me', 'seats', 'mySeat', 'deck'];
const MUTATING = new Set(['giveChips', 'move', 'moveMany', 'draw', 'play', 'flip', 'flipAll', 'takeAll', 'moveZone', 'shuffle', 'collect',
  'deal', 'action', 'chipAdd', 'chipMove', 'chipDel', 'zone', 'zoneDel', 'theme', 'deckCfg', 'useTemplate', 'reveal', 'fold',
  'sortHand', 'setTurn', 'score', 'claim', 'leave', 'actions', 'settings']);

const rid = () => crypto.randomBytes(6).toString('base64url');
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const str = (v, max = 40) => String(v ?? '').slice(0, max);
const hash = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const sleep = ms => new Promise(res => setTimeout(res, ms));
const defaultDeal = () => ({ count: 2, hands: true, zones: [], face: 'down', fresh: true });
const defaultTheme = () => ({ felt: 'green', back: 'red', face: 'classic' });
const defaultSettings = () => ({ deckTap: 'hand', playTo: null, discard: null, startChips: 0 });

/* ---------------- Sandbox games ----------------
   The rule-based games live in engines/. The free table ("Fritt bord") and games people build
   with the tools are sandbox games stored in the database (db.js). Zone refs in templates are "#<index>". */
const BUILTINS = [
  { id: 'b-free', name: 'Fritt bord', emoji: '🃏', desc: 'Bara en kortlek – spela vad du vill eller bygg ett eget spel!', rules: '',
    decks: 1, theme: defaultTheme(), min: 1, max: 8, kids: true,
    zones: [{ name: 'Lek', x: 435, y: 210, w: 130, h: 170, layout: 'stack', faceUp: false, deck: true }], chips: [], actions: [],
    settings: defaultSettings() },
];
BUILTINS.forEach(t => Object.assign(t, { builtin: true, author: 'Free Deck', public: true, jokers: false }));

let templates = db.allGames();
const findTpl = id => BUILTINS.find(t => t.id === id) || templates.find(t => t.id === id && !t.hidden);
function tplView(t, ws, counts) {
  return { id: t.id, name: t.name, emoji: t.emoji || '🃏', desc: t.desc || '', rules: t.rules || '', author: t.author,
    builtin: !!t.builtin, public: !!t.public, plays: counts.get(t.id) || 0, created: t.created || 0, theme: t.theme,
    min: t.min || 1, max: t.max || 8, kids: !!t.kids,
    mine: !t.builtin && !!ws.authorHash && t.authorHash === ws.authorHash,
    zones: t.zones.map(z => ({ x: z.x, y: z.y, w: z.w, h: z.h, deck: !!z.deck, seat: !!z.seat })),
    chips: (t.chips || []).map(c => ({ x: c.x, y: c.y, color: c.color })) };
}
function listFor(ws) {
  const counts = db.playCounts();
  const own = t => ws.authorHash && t.authorHash === ws.authorHash;
  const user = templates.filter(t => !t.hidden && (t.public || own(t)));
  return [...BUILTINS, ...user].map(t => tplView(t, ws, counts));
}
const pick = (x, lang) => (x && typeof x === 'object' ? x[lang] || x.en || x.sv : x);
function engineList(lang) {
  const counts = db.playCounts();
  return Object.values(engineRoom.engines).map(e => ({ id: e.meta.id, engine: true, builtin: true, name: pick(e.meta.name, lang), emoji: e.meta.emoji,
    desc: pick(e.meta.desc, lang), rules: pick(e.meta.rules, lang), min: e.meta.min, max: e.meta.max, kids: !!e.meta.kids, plays: counts.get(e.meta.id) || 0 }));
}
const sendLists = ws => send(ws, { t: 'templates', list: listFor(ws), engines: engineList(ws.lang) });
const cleanLang = l => (String(l || '').toLowerCase().startsWith('sv') ? 'sv' : 'en');

/* ---------------- Simple content check before publishing ---------------- */
const BAD_WORDS = ['fan', 'jävla', 'javla', 'jävlar', 'helvete', 'hora', 'fitta', 'kuk', 'knulla', 'knull', 'bög', 'neger', 'nigger', 'fuck', 'fucking', 'shit',
  'bitch', 'cunt', 'dick', 'porn', 'porr', 'nazi', 'nazist', 'hitler', 'slut', 'whore', 'hore', 'cp', 'idiot', 'cancer', 'mongo'];
function moderate(...texts) {
  const t = texts.join(' ').toLowerCase();
  if (/(https?:\/\/|www\.|\b[\w-]+\.(com|se|net|org|io)\b)/.test(t)) return 'Länkar är inte tillåtna i namn, beskrivning eller regler.';
  const words = t.replace(/[^\p{L}\d]+/gu, ' ').split(' ');
  if (words.some(w => BAD_WORDS.includes(w))) return 'Texten innehåller ord som inte är tillåtna. Försök med andra ord.';
  return null;
}

/* ---------------- Rooms ---------------- */
const rooms = new Map();
function newState() {
  return { zones: [], cards: [], chips: [], hands: {}, decks: 1, jokers: false, ztop: 0, turn: null, scores: {},
    actions: [], settings: defaultSettings(), theme: defaultTheme(), dealCfg: defaultDeal(),
    meta: { name: '', emoji: '🃏', rules: '', desc: '', templateId: null } };
}
function getRoom(code) {
  let r = rooms.get(code);
  if (!r) { r = { code, uid: code + '-' + rid(), round: 0, mode: 'sandbox', clients: new Set(), players: new Map(), runId: 0, history: [], cleanup: null, S: newState() }; rooms.set(code, r); }
  clearTimeout(r.cleanup);
  return r;
}

/* ---------------- Model helpers ---------------- */
const zoneById = (S, id) => S.zones.find(z => z.id === id);
const cardById = (S, id) => S.cards.find(c => c.id === id);
const deckZone = S => S.zones.find(z => z.deck);
const handKey = pid => 'h:' + pid;
const isHand = zone => typeof zone === 'string' && zone.startsWith('h:');
const mySeat = (S, pid) => S.zones.find(z => z.seat && z.owner === pid);

function mkZone(o) {
  return Object.assign({ id: 'z' + rid(), name: 'Plats', x: 350, y: 220, w: 300, h: 160, layout: 'fan',
    faceUp: null, sum: false, deck: false, seat: false, owner: null, cards: [] }, o);
}
function cleanZone(o, base) {
  const z = base || mkZone({});
  if ('name' in o) z.name = str(o.name, 24) || 'Plats';
  if ('w' in o) z.w = Math.round(clamp(num(o.w, z.w), 92, BW));
  if ('h' in o) z.h = Math.round(clamp(num(o.h, z.h), 130, BH));
  if ('x' in o) z.x = Math.round(clamp(num(o.x, z.x), 0, BW - z.w));
  if ('y' in o) z.y = Math.round(clamp(num(o.y, z.y), 0, BH - z.h));
  if (LAYOUTS.includes(o.layout)) z.layout = o.layout;
  if ('faceUp' in o) z.faceUp = o.faceUp === true ? true : o.faceUp === false ? false : null;
  if ('sum' in o) z.sum = !!o.sum;
  if ('seat' in o) { z.seat = !!o.seat; if (!z.seat) z.owner = null; }
  return z;
}
function cleanTheme(o, base) {
  const t = base || defaultTheme();
  if (o && FELTS.includes(o.felt)) t.felt = o.felt;
  if (o && BACKS.includes(o.back)) t.back = o.back;
  if (o && FACES.includes(o.face)) t.face = o.face;
  return t;
}
// A zone reference in a step/setting is a zone id (in a room), "#n" (in a template) or a keyword.
const validRef = (S, v, words = TARGET_WORDS) => (words.includes(v) || (typeof v === 'string' && !!zoneById(S, v)) ? v : null);
function cleanStep(S, s) {
  if (!s || !STEP_KINDS.includes(s.k)) return null;
  const o = { k: s.k };
  if (s.k === 'deal') {
    o.n = s.n === 'all' ? 'all' : clamp(Math.floor(num(s.n, 1)), 1, 52);
    o.to = validRef(S, s.to, ['hands', 'me', 'seats', 'mySeat']); if (!o.to) return null;
    o.face = s.face === 'up' ? 'up' : 'down'; o.lastUp = !!s.lastUp;
  } else if (s.k === 'flip') { o.zone = validRef(S, s.zone, []); if (!o.zone) return null; o.face = s.face === 'down' ? 'down' : 'up'; }
  else if (s.k === 'drawTo') { o.zone = validRef(S, s.zone, ['mySeat']); if (!o.zone) return null; o.target = clamp(Math.floor(num(s.target, 17)), 1, 40); }
  else if (s.k === 'moveAll') {
    o.from = validRef(S, s.from, ['mySeat']); o.to = validRef(S, s.to, ['deck', 'me', 'mySeat']);
    if (!o.from || !o.to) return null; o.keepTop = !!s.keepTop; o.face = ['up', 'down'].includes(s.face) ? s.face : null;
  } else if (s.k === 'shuffle') { o.zone = s.zone ? validRef(S, s.zone, []) : null; }
  else if (s.k === 'chips') { o.amount = clamp(Math.floor(num(s.amount, 100)), 1, 100000); o.replace = !!s.replace; }
  return o;
}
function cleanActions(S, list) {
  return (Array.isArray(list) ? list : []).slice(0, 12).map(a => ({
    id: str(a.id, 20) || 'a' + rid(), label: str(a.label, 24).trim() || 'Knapp', emoji: str(a.emoji, 8) || '⭐',
    steps: (Array.isArray(a.steps) ? a.steps : []).slice(0, 20).map(s => cleanStep(S, s)).filter(Boolean),
  }));
}
function cleanSettings(S, o, base) {
  const t = base || defaultSettings();
  if (o && 'deckTap' in o) t.deckTap = validRef(S, o.deckTap, ['hand', 'mySeat']) || 'hand';
  if (o && 'playTo' in o) t.playTo = o.playTo ? validRef(S, o.playTo, []) : null;
  if (o && 'discard' in o) t.discard = o.discard ? validRef(S, o.discard, []) : null;
  if (o && 'startChips' in o) t.startChips = clamp(Math.floor(num(o.startChips, 0)), 0, 100000);
  return t;
}

/* ---------------- Chips as money ---------------- */
const CHIP_VALUE = { white: 1, red: 5, blue: 10, green: 25, black: 100, purple: 500 };
const VALUE_COLOR = Object.fromEntries(Object.entries(CHIP_VALUE).map(([c, v]) => [v, c]));
const MAX_CHIPS = 800;
const chipInZone = (c, z) => c.x + 22 >= z.x && c.x + 22 <= z.x + z.w && c.y + 22 >= z.y && c.y + 22 <= z.y + z.h;
// Turn an amount into a playable mix: a few small chips first, then the rest in big ones.
function breakdown(amount) {
  const out = {}; let rem = amount;
  for (const [d, max] of [[1, 5], [5, 6], [10, 6], [25, 6], [100, 8]]) {
    const k = Math.min(max, Math.floor((rem * 0.25) / d)); if (k > 0) { out[d] = k; rem -= k * d; }
  }
  for (const d of [500, 100, 25, 10, 5, 1]) { const k = Math.floor(rem / d); if (k) { out[d] = (out[d] || 0) + k; rem -= k * d; } }
  return out;
}
// Put chips worth `amount` in a spot, one stack per value along its bottom edge.
function giveChips(S, z, amount, replace) {
  if (replace) S.chips = S.chips.filter(c => !chipInZone(c, z));
  const parts = Object.entries(breakdown(amount)).map(([v, n]) => [VALUE_COLOR[v], n]).filter(([c]) => c);
  const step = parts.length > 1 ? Math.min(50, (z.w - 56) / (parts.length - 1)) : 0;
  parts.forEach(([color, n], i) => {
    const x = Math.round(z.x + 6 + i * step), y = Math.round(z.y + z.h - 50);
    for (let k = 0; k < n && S.chips.length < MAX_CHIPS; k++) S.chips.push({ id: 'c' + rid(), color, x, y, z: ++S.ztop });
  });
}
const chipSeats = S => { const all = S.zones.filter(z => z.seat), owned = all.filter(z => z.owner); return owned.length ? owned : all; };
function buildCards(S) {
  const cards = [];
  for (let d = 0; d < S.decks; d++) {
    for (const [s, red] of SUITS) for (const r of RANKS) cards.push({ id: 'k' + rid(), s, r, red: !!red });
    if (S.jokers) for (let j = 0; j < 2; j++) cards.push({ id: 'k' + rid(), s: '★', r: 'JOKER', red: j === 1 });
  }
  cards.forEach(c => Object.assign(c, { up: false, zone: null, x: 0, y: 0, z: 0 }));
  S.cards = cards; S.hands = {};
}
function ensureDeck(S) {
  let d = deckZone(S);
  if (!d) { d = mkZone({ name: 'Lek', x: 435, y: 210, w: 130, h: 170, layout: 'stack', faceUp: false, deck: true }); S.zones.unshift(d); }
  return d;
}
function collectAll(S) {
  const d = ensureDeck(S);
  S.zones.forEach(z => (z.cards = []));
  S.hands = {};
  S.cards.forEach(c => { c.zone = d.id; c.up = false; });
  d.cards = S.cards.map(c => c.id);
}
// Shuffle by permuting card *contents* among the card objects, so ids can't be tracked through a shuffle.
function shuffleZone(S, z) {
  const cs = z.cards.map(id => cardById(S, id));
  const faces = cs.map(c => ({ s: c.s, r: c.r, red: c.red }));
  for (let i = faces.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [faces[i], faces[j]] = [faces[j], faces[i]]; }
  cs.forEach((c, i) => Object.assign(c, faces[i]));
  return z.cards.slice();
}
function detach(S, c) {
  if (isHand(c.zone)) { const pid = c.zone.slice(2); S.hands[pid] = (S.hands[pid] || []).filter(id => id !== c.id); }
  else if (c.zone) { const z = zoneById(S, c.zone); if (z) z.cards = z.cards.filter(id => id !== c.id); }
  c.zone = null;
}
function placeInZone(c, z, index) {
  const idx = Number.isInteger(index) ? clamp(index, 0, z.cards.length) : z.cards.length;
  z.cards.splice(idx, 0, c.id);
  c.zone = z.id;
  if (z.faceUp === true) c.up = true; else if (z.faceUp === false) c.up = false;
}
function placeInHand(S, c, pid, index) {
  const h = (S.hands[pid] = S.hands[pid] || []);
  h.splice(Number.isInteger(index) ? clamp(index, 0, h.length) : h.length, 0, c.id);
  c.zone = handKey(pid); c.up = false;
}
const lockedFor = (c, pid) => isHand(c.zone) && c.zone !== handKey(pid);
function bjValue(S, z) {
  let t = 0, a = 0;
  for (const id of z.cards) { const c = cardById(S, id); if (!c.up || c.r === 'JOKER') continue;
    if (c.r === 'A') { t += 1; a++; } else t += ['J', 'Q', 'K'].includes(c.r) ? 10 : +c.r; }
  if (a && t + 10 <= 21) t += 10;
  return t;
}
// Turn order: players sitting in seats (seat order), otherwise everyone online (join order).
function turnOrder(r) {
  const S = r.S, online = new Set([...r.players.values()].filter(p => p.conns > 0).map(p => p.pid));
  const seated = S.zones.filter(z => z.seat && z.owner && online.has(z.owner)).map(z => z.owner);
  return seated.length ? [...new Set(seated)] : [...online];
}
function nextTurn(r) {
  const order = turnOrder(r), S = r.S;
  if (!order.length) { S.turn = null; return; }
  const i = order.indexOf(S.turn);
  S.turn = S.turn == null || i < 0 ? order[0] : order[i + 1] ?? null; // after the last player: nobody (round over)
}

// Zone refs ↔ template indexes ("#n").
const refToId = (zones, v) => (typeof v === 'string' && v.startsWith('#') ? (zones[+v.slice(1)] || {}).id || null : v);
const idToRef = (zones, v) => { const i = zones.findIndex(z => z.id === v); return i >= 0 ? '#' + i : v; };
function mapRefs(obj, fn) {
  const o = { ...obj };
  for (const k of ['to', 'from', 'zone', 'deckTap', 'playTo', 'discard']) if (k in o && o[k] != null) o[k] = fn(o[k]);
  return o;
}

function applyTemplate(S, t) {
  S.zones = t.zones.map(src => { const z = cleanZone(src); z.deck = !!src.deck; z.seat = !!src.seat; return z; });
  S.chips = (t.chips || []).slice(0, MAX_CHIPS).map((c, i) => ({ id: 'c' + rid(), color: CHIPS.includes(c.color) ? c.color : 'red',
    x: Math.round(clamp(num(c.x), 0, BW - 44)), y: Math.round(clamp(num(c.y), 0, BH - 44)), z: i }));
  S.decks = clamp(Math.floor(num(t.decks, 1)), 1, 8); S.jokers = !!t.jokers;
  S.theme = cleanTheme(t.theme);
  S.actions = cleanActions(S, (t.actions || []).map(a => ({ ...a, steps: a.steps.map(s => mapRefs(s, v => refToId(S.zones, v))) })));
  S.settings = cleanSettings(S, mapRefs(t.settings || {}, v => refToId(S.zones, v)));
  S.dealCfg = defaultDeal(); S.turn = null; S.scores = {};
  S.meta = { name: t.name, emoji: t.emoji || '🃏', rules: t.rules || '', desc: t.desc || '', templateId: t.id };
  S.ztop = S.chips.length;
  buildCards(S);
  collectAll(S);
  shuffleZone(S, deckZone(S));
}

/* ---------------- Sending ---------------- */
function redact(S, pid) {
  const mine = handKey(pid), handCounts = {};
  for (const [p, ids] of Object.entries(S.hands)) handCounts[p] = ids.length;
  return {
    ...S, hands: undefined, handCounts, myHand: S.hands[pid] || [],
    cards: S.cards.filter(c => !isHand(c.zone) || c.zone === mine).map(c => {
      const o = { id: c.id, up: c.up, zone: c.zone, x: c.x, y: c.y, z: c.z };
      if (c.up || c.zone === mine) Object.assign(o, { s: c.s, r: c.r, red: c.red });
      return o;
    }),
  };
}
function playerList(r) {
  return [...r.players.values()].map(p => ({ pid: p.pid, name: p.name, color: p.color, online: p.conns > 0 }));
}
function send(ws, m) { if (ws.readyState === 1) ws.send(JSON.stringify(m)); }
function broadcast(r) {
  const players = playerList(r);
  for (const ws of r.clients) send(ws, { t: 'state', S: redact(r.S, ws.pid), players, you: ws.pid, canUndo: r.history.length > 0 });
}
function relay(r, from, m) { for (const ws of r.clients) if (ws !== from) send(ws, m); }
function fx(r, ids) { for (const c of r.clients) send(c, { t: 'fx', ids }); }
const oops = (ws, msg) => send(ws, { t: 'error', msg });

/* ---------------- Play counting (one per room and round, see db.js) ---------------- */
function countSandboxPlay(r, force) {
  const id = r.S.meta && r.S.meta.templateId; if (!id) return;
  if (!force && Date.now() - (r.lastCount || 0) < 60000) return; // a new round at most once a minute
  r.lastCount = Date.now(); r.round = (r.round || 0) + 1;
  try { db.countPlay(id, r.uid, r.round); } catch (e) { console.error('could not count play', e.message); }
}

/* ---------------- Running buttons (steps) ---------------- */
function stopRun(r) { r.runId++; r.gen = (r.gen || 0) + 1; }
// Button presses run one after another (a press during a deal waits for it instead of cutting it off).
function queueSteps(r, steps, ws) {
  const gen = r.gen || 0;
  r.chain = (r.chain || Promise.resolve()).then(() => (gen === (r.gen || 0) ? runSteps(r, steps, ws) : null)).catch(e => console.error('steps failed', e));
}
// Resolve who/where a deal goes. Returns a list of {pid} / {zid}, or a string error.
function resolveTargets(r, to, pid) {
  const S = r.S;
  if (to === 'hands') { // everyone online – seated players first, in seat order
    const order = turnOrder(r), rest = [...r.players.values()].filter(p => p.conns > 0 && !order.includes(p.pid)).map(p => p.pid);
    return [...order, ...rest].map(p => ({ pid: p }));
  }
  if (to === 'me') return [{ pid }];
  if (to === 'seats') {
    const all = S.zones.filter(z => z.seat), owned = all.filter(z => z.owner);
    return (owned.length ? owned : all).map(z => ({ zid: z.id }));
  }
  if (to === 'mySeat') { const z = mySeat(S, pid); return z ? [{ zid: z.id }] : 'Ta en plats först – tryck "Sitt här" på en spelarplats.'; }
  return zoneById(S, to) ? [{ zid: to }] : 'Platsen finns inte längre.';
}
function dealOne(S, target, up) {
  const d = deckZone(S); if (!d || !d.cards.length) return false;
  const c = cardById(S, d.cards[d.cards.length - 1]); detach(S, c);
  if (target.pid) placeInHand(S, c, target.pid, null);
  else { const z = zoneById(S, target.zid); if (!z) return false; placeInZone(c, z, null); c.up = up; }
  return true;
}
async function runSteps(r, steps, ws) {
  const S = r.S, pid = ws.pid, token = ++r.runId, alive = () => token === r.runId;
  for (const st of steps) {
    if (!alive()) return;
    switch (st.k) {
      case 'collect': collectAll(S); fx(r, shuffleZone(S, deckZone(S))); S.turn = null; countSandboxPlay(r); broadcast(r); await sleep(450); break;
      case 'shuffle': { const z = st.zone ? zoneById(S, st.zone) : deckZone(S); if (z) { fx(r, shuffleZone(S, z)); broadcast(r); await sleep(350); } break; }
      case 'deal': {
        const targets = resolveTargets(r, st.to, pid);
        if (typeof targets === 'string') { oops(ws, targets); return; }
        if (!targets.length) { oops(ws, 'Ingen att dela ut till.'); return; }
        const deck = deckZone(S); if (!deck) return;
        const n = st.n === 'all' ? Math.floor(deck.cards.length / targets.length) : st.n;
        const total = n * targets.length, step = total > 40 ? 40 : total > 16 ? 80 : total > 3 ? 110 : 150;
        for (let i = 0; i < n; i++) for (const t of targets) {
          if (!alive()) return;
          if (!dealOne(S, t, st.lastUp && i === n - 1 ? true : st.face === 'up')) { broadcast(r); oops(ws, 'Leken är slut.'); return; }
          broadcast(r); await sleep(step);
        }
        break;
      }
      case 'flip': { const z = zoneById(S, st.zone); if (z) { z.cards.forEach(id => (cardById(S, id).up = st.face !== 'down')); broadcast(r); await sleep(400); } break; }
      case 'drawTo': {
        const z = st.zone === 'mySeat' ? mySeat(S, pid) : zoneById(S, st.zone); if (!z) break;
        let guard = 0;
        while (alive() && bjValue(S, z) < st.target && guard++ < 20) { if (!dealOne(S, { zid: z.id }, true)) break; broadcast(r); await sleep(600); }
        break;
      }
      case 'moveAll': {
        const from = st.from === 'mySeat' ? mySeat(S, pid) : zoneById(S, st.from); if (!from) break;
        let ids = from.cards.slice(); if (st.keepTop) ids = ids.slice(0, -1);
        if (st.to === 'me') { ids.forEach(id => { const c = cardById(S, id); detach(S, c); placeInHand(S, c, pid, null); }); }
        else {
          const to = st.to === 'deck' ? deckZone(S) : st.to === 'mySeat' ? mySeat(S, pid) : zoneById(S, st.to);
          if (!to) { if (st.to === 'mySeat') oops(ws, 'Ta en plats först – tryck "Sitt här".'); break; }
          if (to.deck) ids.reverse(); // turning a pile over onto the deck reverses it
          ids.forEach(id => { const c = cardById(S, id); detach(S, c); placeInZone(c, to, null); if (to.deck) c.up = false; else if (st.face) c.up = st.face === 'up'; });
        }
        broadcast(r); await sleep(300); break;
      }
      case 'next': nextTurn(r); break;
      case 'turnFirst': S.turn = turnOrder(r)[0] || null; break;
      case 'chips': { const seats = chipSeats(S); if (!seats.length) { oops(ws, 'Lägg till spelarplatser först.'); return; } seats.forEach(z => giveChips(S, z, st.amount, st.replace)); broadcast(r); await sleep(300); break; }
    }
  }
  if (alive()) broadcast(r);
}

/* ---------------- Intents ---------------- */
function handle(r, ws, m) {
  const S = r.S, pid = ws.pid;
  if (MUTATING.has(m.t)) { r.history.push(JSON.stringify(S)); if (r.history.length > 30) r.history.shift(); }
  switch (m.t) {
    case 'drag': { // ephemeral: show other players what is being dragged
      if (m.kind === 'chip') { if (S.chips.some(c => c.id === m.id)) relay(r, ws, { t: 'drag', kind: 'chip', id: m.id, x: num(m.x), y: num(m.y), by: pid }); return; }
      const c = cardById(S, m.id);
      if (c && !isHand(c.zone)) relay(r, ws, { t: 'drag', kind: 'card', id: c.id, x: num(m.x), y: num(m.y), by: pid });
      return;
    }
    case 'undo': {
      const prev = r.history.pop(); if (!prev) break;
      stopRun(r); r.S = JSON.parse(prev); break;
    }
    case 'move': case 'moveMany': {
      const ids = (m.t === 'move' ? [m.id] : Array.isArray(m.ids) ? m.ids.slice(0, 60) : []).map(id => cardById(S, id)).filter(c => c && !lockedFor(c, pid));
      if (!ids.length) break;
      let index = Number.isInteger(m.index) ? m.index : null;
      for (const [i, c] of ids.entries()) {
        const fromHand = isHand(c.zone);
        if (m.to === 'hand' || isHand(m.to)) { // my hand, or give to another player's hand
          const target = m.to === 'hand' ? pid : m.to.slice(2);
          if (!r.players.has(target)) break;
          detach(S, c); placeInHand(S, c, target, target === pid && index != null ? index + i : null); continue;
        }
        const to = m.to && zoneById(S, m.to);
        detach(S, c);
        if (to) { if (fromHand) c.up = true; placeInZone(c, to, index != null ? index + i : null); }
        else { c.x = Math.round(clamp(num(m.x), -20, BW - 50)); c.y = Math.round(clamp(num(m.y) + i * 24, -20, BH - 70)); c.z = ++S.ztop; if (fromHand) c.up = true; }
      }
      break;
    }
    case 'draw': { // tap on the deck
      const d = deckZone(S); if (!d || !d.cards.length) { oops(ws, 'Leken är tom.'); r.history.pop(); return; }
      const tap = S.settings.deckTap;
      if (tap === 'hand') dealOne(S, { pid }, false);
      else if (tap === 'mySeat') { const z = mySeat(S, pid); if (!z) { oops(ws, 'Ta en plats först – tryck "Sitt här".'); r.history.pop(); return; } dealOne(S, { zid: z.id }, true); }
      else if (zoneById(S, tap)) dealOne(S, { zid: tap }, true);
      else dealOne(S, { pid }, false);
      break;
    }
    case 'play': { // double-tap a card in my hand
      const c = cardById(S, m.id), z = S.settings.playTo && zoneById(S, S.settings.playTo);
      if (!c || c.zone !== handKey(pid) || !z) { r.history.pop(); return; }
      detach(S, c); placeInZone(c, z, null); c.up = true; break;
    }
    case 'reveal': { // show my hand: to my seat, else face up on the table
      const ids = (S.hands[pid] || []).slice(); if (!ids.length) { r.history.pop(); return; }
      const z = mySeat(S, pid);
      ids.forEach((id, i) => { const c = cardById(S, id); detach(S, c);
        if (z) { placeInZone(c, z, null); c.up = true; } else { c.up = true; c.x = 400 + i * 28; c.y = 430; c.z = ++S.ztop; } });
      break;
    }
    case 'fold': { // throw away my hand face down
      const ids = (S.hands[pid] || []).slice(); if (!ids.length) { r.history.pop(); return; }
      const z = (S.settings.discard && zoneById(S, S.settings.discard)) || deckZone(S);
      ids.forEach(id => { const c = cardById(S, id); detach(S, c); if (z.deck) z.cards.unshift(id), (c.zone = z.id); else placeInZone(c, z, null); c.up = false; });
      break;
    }
    case 'sortHand': {
      const h = S.hands[pid] || [], si = c => SUITS.findIndex(s => s[0] === c.s), rv = c => RANK_ORDER[c.r] || +c.r;
      const by = m.by === 'rank' ? (a, b) => rv(a) - rv(b) || si(a) - si(b) : (a, b) => si(a) - si(b) || rv(a) - rv(b);
      S.hands[pid] = h.map(id => cardById(S, id)).sort(by).map(c => c.id);
      break;
    }
    case 'flip': {
      const c = cardById(S, m.id); if (!c || isHand(c.zone)) break;
      c.up = !c.up; break;
    }
    case 'flipAll': {
      const z = zoneById(S, m.zone); if (!z) break;
      const cs = z.cards.map(id => cardById(S, id)), anyDown = cs.some(c => !c.up);
      cs.forEach(c => (c.up = anyDown));
      if (z.layout === 'stack') z.cards.reverse(); // turning a pile over reverses it
      break;
    }
    case 'takeAll': {
      const z = zoneById(S, m.zone); if (!z) break;
      z.cards.slice().forEach(id => { const c = cardById(S, id); detach(S, c); placeInHand(S, c, pid, null); });
      break;
    }
    case 'moveZone': { // move all cards from one spot to another
      const from = zoneById(S, m.from), to = m.to === 'deck' ? deckZone(S) : zoneById(S, m.to); if (!from || !to || from === to) break;
      const ids = from.cards.slice(); if (to.deck) ids.reverse();
      ids.forEach(id => { const c = cardById(S, id); detach(S, c); placeInZone(c, to, null); if (to.deck) c.up = false; });
      break;
    }
    case 'shuffle': {
      const z = m.zone ? zoneById(S, m.zone) : deckZone(S); if (!z) break;
      const ids = shuffleZone(S, z); broadcast(r); fx(r, ids);
      return;
    }
    case 'collect': stopRun(r); collectAll(S); S.turn = null; fx(r, deckZone(S).cards); break;
    case 'deal': { // the free "Dela ut" dialog
      const cfg = { count: clamp(Math.floor(num(m.count, 2)), 1, 52), hands: !!m.hands, face: m.face === 'up' ? 'up' : 'down',
        fresh: !!m.fresh, zones: (Array.isArray(m.zones) ? m.zones : []).filter(id => zoneById(S, id)).slice(0, 30) };
      S.dealCfg = cfg;
      const steps = [];
      if (cfg.fresh) steps.push({ k: 'collect' });
      for (let i = 0; i < cfg.count; i++) {
        if (cfg.hands) steps.push({ k: 'deal', n: 1, to: 'hands', face: 'down' });
        cfg.zones.forEach(z => steps.push({ k: 'deal', n: 1, to: z, face: cfg.face }));
      }
      queueSteps(r, steps, ws); return;
    }
    case 'action': { const a = S.actions.find(o => o.id === m.id); if (!a) { r.history.pop(); return; } queueSteps(r, a.steps, ws); return; }
    case 'setTurn': S.turn = m.pid && r.players.has(m.pid) ? m.pid : null; break;
    case 'score': { if (!r.players.has(m.pid)) break; S.scores[m.pid] = clamp((S.scores[m.pid] || 0) + Math.round(num(m.d)), -9999, 9999); break; }
    case 'claim': {
      const z = zoneById(S, m.zone); if (!z || !z.seat || z.owner) break;
      S.zones.forEach(o => { if (o.owner === pid && o.seat) o.owner = null; }); z.owner = pid;
      if (S.settings.startChips > 0 && !S.chips.some(c => chipInZone(c, z))) giveChips(S, z, S.settings.startChips, false); // starting money
      break;
    }
    case 'giveChips': { // { amounts: { zoneId: amount }, replace }
      const am = m.amounts && typeof m.amounts === 'object' ? m.amounts : {};
      for (const [zid, a] of Object.entries(am).slice(0, 30)) { const z = zoneById(S, zid), n = clamp(Math.floor(num(a, 0)), 0, 100000); if (z && (n > 0 || m.replace)) giveChips(S, z, n, !!m.replace); }
      break;
    }
    case 'leave': { const z = zoneById(S, m.zone); if (z && z.owner === pid) z.owner = null; break; }
    case 'chipAdd': {
      if (!CHIPS.includes(m.color)) break;
      const n = clamp(Math.floor(num(m.count, 5)), 1, 20);
      const x = Math.round(clamp(num(m.x, 478), 0, BW - 44)), y = Math.round(clamp(num(m.y, 278), 0, BH - 44));
      for (let i = 0; i < n && S.chips.length < MAX_CHIPS; i++) S.chips.push({ id: 'c' + rid(), color: m.color, x, y, z: ++S.ztop });
      break;
    }
    case 'chipMove': {
      const ids = Array.isArray(m.ids) ? m.ids : [m.id];
      ids.slice(0, 100).forEach(id => { const c = S.chips.find(o => o.id === id); if (!c) return;
        c.x = Math.round(clamp(num(m.x), 0, BW - 44)); c.y = Math.round(clamp(num(m.y), 0, BH - 44)); c.z = ++S.ztop; });
      break;
    }
    case 'chipDel': { const ids = new Set(Array.isArray(m.ids) ? m.ids : [m.id]); S.chips = S.chips.filter(o => !ids.has(o.id)); break; }
    case 'zone': { // add or update a table spot (tools)
      if (!m.zone || typeof m.zone !== 'object') break;
      let z = m.zone.id && zoneById(S, m.zone.id);
      if (!z) {
        if (S.zones.length >= 30) break;
        z = cleanZone(m.zone);
        if (/^z[\w-]{4,20}$/.test(m.zone.newId || '') && !zoneById(S, m.zone.newId)) z.id = m.zone.newId; // lets the client refer to it right away
        S.zones.push(z);
      } else cleanZone(m.zone, z);
      if (m.top) S.zones = S.zones.filter(o => o !== z).concat(z);
      break;
    }
    case 'zoneDel': {
      const z = zoneById(S, m.id); if (!z || z.deck) break;
      const d = deckZone(S);
      z.cards.forEach(id => { const c = cardById(S, id); d.cards.unshift(id); c.zone = d.id; c.up = false; });
      S.zones = S.zones.filter(o => o !== z);
      // drop references to the removed spot
      S.actions = cleanActions(S, S.actions);
      S.settings = cleanSettings(S, S.settings, S.settings);
      S.dealCfg.zones = S.dealCfg.zones.filter(id => id !== z.id);
      break;
    }
    case 'actions': S.actions = cleanActions(S, m.actions); break;
    case 'settings': S.settings = cleanSettings(S, m.settings, S.settings); break;
    case 'theme': S.theme = cleanTheme(m.theme, S.theme); break;
    case 'deckCfg': {
      const decks = clamp(Math.floor(num(m.decks, S.decks)), 1, 8), jokers = !!m.jokers;
      if (decks !== S.decks || jokers !== S.jokers) { stopRun(r); S.decks = decks; S.jokers = jokers; buildCards(S); collectAll(S); shuffleZone(S, deckZone(S)); }
      break;
    }

    /* ----- games (templates) ----- */
    case 'useTemplate': {
      const t = findTpl(str(m.id, 40)); if (!t) break;
      const same = S.meta && S.meta.templateId === t.id;
      stopRun(r); applyTemplate(S, t); r.history = []; countSandboxPlay(r, !same); // restarting the same game right away is not a new play
      break;
    }
    case 'publish': {
      const name = str(m.name, 40).trim(), desc = str(m.desc, 200).trim(), rules = str(m.rules, 3000).trim();
      if (name.length < 3 || !ws.authorHash) { oops(ws, 'Ge spelet ett namn med minst 3 bokstäver.'); return; }
      const bad = moderate(name, desc, rules); if (bad) { oops(ws, bad); return; }
      if (templates.filter(t => t.authorHash === ws.authorHash).length >= 50) { oops(ws, 'Du har för många spel. Ta bort något först.'); return; }
      const toRef = v => idToRef(S.zones, v);
      const min = clamp(Math.floor(num(m.min, 1)), 1, 8), max = clamp(Math.floor(num(m.max, 4)), min, 8);
      const t = { v: 4, id: 't' + rid(), name, emoji: str(m.emoji, 8) || '🃏', desc, rules, min, max, kids: !!m.kids,
        author: (r.players.get(pid) || {}).name || 'Okänd', authorHash: ws.authorHash, public: !!m.public,
        created: Date.now(), decks: S.decks, jokers: S.jokers, theme: { ...S.theme },
        zones: S.zones.map(z => ({ name: z.name, x: z.x, y: z.y, w: z.w, h: z.h, layout: z.layout, faceUp: z.faceUp, sum: z.sum, deck: z.deck, seat: z.seat })),
        chips: S.chips.map(c => ({ color: c.color, x: c.x, y: c.y })),
        actions: S.actions.map(a => ({ label: a.label, emoji: a.emoji, steps: a.steps.map(s => mapRefs(s, toRef)) })),
        settings: mapRefs(S.settings, toRef) };
      db.saveGame(t); templates = db.allGames();
      S.meta = { name: t.name, emoji: t.emoji, rules: t.rules, desc: t.desc, templateId: t.id };
      send(ws, { t: 'published', id: t.id, public: t.public, name: t.name });
      break;
    }
    default: return;
  }
  broadcast(r);
}
// messages that work the same in every kind of room (and on the start page)
function handleCommon(r, ws, m) {
  switch (m.t) {
    case 'listTemplates': sendLists(ws); return true;
    case 'deleteTemplate':
      if (ws.authorHash && db.deleteGame(str(m.id, 40), ws.authorHash)) templates = db.allGames();
      sendLists(ws); return true;
    case 'report': {
      const id = str(m.id, 40);
      if (!ws.authorHash || !templates.some(t => t.id === id)) return true;
      if (db.report(id, ws.authorHash, m.reason)) templates = db.allGames();
      send(ws, { t: 'error', msg: 'Tack! Vi har tagit emot din rapport.' }); sendLists(ws); return true;
    }
    case 'switchGame': { // change game inside a room
      if (!r) return true;
      const id = str(m.id, 40);
      if (engineRoom.engines[id]) {
        stopRun(r);
        if (r.mode !== 'engine') r.seats = [...r.players.values()].filter(p => p.conns > 0).map(p => ({ pid: p.pid, bot: false }));
        engineRoom.setup(r, id); engineRoom.broadcast(r);
      } else {
        const t = findTpl(id); if (!t) return true;
        r.mode = 'sandbox'; r.G = null; stopRun(r); applyTemplate(r.S, t); r.history = []; countSandboxPlay(r, true); broadcast(r);
      }
      return true;
    }
  }
  return false;
}

/* ---------------- HTTP + WebSocket ---------------- */
const PUBLIC = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file = path.join(PUBLIC, rel);
  const type = TYPES[path.extname(file)];
  if (!file.startsWith(PUBLIC + path.sep) || !type) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(buf);
  });
});

engineRoom.init({ send });
const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });
wss.on('connection', ws => {
  let r = null;
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    try {
      if (m.t === 'lobby') { ws.authorHash = m.author ? hash(str(m.author, 64)) : null; ws.lang = cleanLang(m.lang); sendLists(ws); return; } // start page
      if (handleCommon(r, ws, m)) return;
      if (!r) {
        if (m.t !== 'hello') return;
        const code = str(m.room, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!code) return;
        r = getRoom(code);
        ws.pid = str(m.pid, 30) || rid();
        ws.authorHash = m.author ? hash(str(m.author, 64)) : null;
        ws.lang = cleanLang(m.lang);
        const fresh = !r.players.size && !r.S.zones.length && r.mode !== 'engine';
        let p = r.players.get(ws.pid);
        if (!p) { p = { pid: ws.pid, name: 'Spelare', color: COLORS[r.players.size % COLORS.length], conns: 0 }; r.players.set(ws.pid, p); }
        p.name = str(m.name, 20) || p.name; p.conns++;
        r.clients.add(ws);
        if (fresh && m.want) { // the first person decides which game the room plays
          const want = str(m.want, 40);
          if (engineRoom.engines[want]) engineRoom.setup(r, want);
          else { const t = findTpl(want); if (t) { applyTemplate(r.S, t); countSandboxPlay(r, true); } }
        }
        if (r.mode === 'engine') { engineRoom.join(r, ws.pid); engineRoom.broadcast(r); engineRoom.schedule(r); }
        else broadcast(r);
        return;
      }
      if (r.mode === 'engine') engineRoom.handle(r, ws, m); else handle(r, ws, m);
    } catch (e) { console.error('message failed', m && m.t, e); }
  });
  ws.on('close', () => {
    if (!r) return;
    r.clients.delete(ws);
    const p = r.players.get(ws.pid); if (p) p.conns--;
    if (r.mode === 'engine') engineRoom.left(r); else broadcast(r);
    if (!r.clients.size) r.cleanup = setTimeout(() => { stopRun(r); clearTimeout(r.botT); clearTimeout(r.autoT); rooms.delete(r.code); }, 60 * 60 * 1000);
  });
});

// with a cloud database (Turso) the saved games are loaded from there before we open the doors
db.ready.then(() => {
  templates = db.allGames();
  server.listen(PORT, () => console.log(`Free Deck kör på http://localhost:${PORT} (databas: ${db.FILE}${db.cloud ? ' + Turso' : ''})`));
}).catch(e => { console.error('Kunde inte läsa databasen i molnet (Turso):', e.message); process.exit(1); });
