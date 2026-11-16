// Rooms that play one of the rule-based games (engines/).
// A room has seats (people or computer players). Before the game starts it is in the "lobby":
// people sit down, add computer players and press Start. During the game the server runs the
// engine, plays for computer players and for people who lost their connection, and sends every
// person their own view (their hand, legal moves, whose turn it is).
const engines = require('./engines');
const db = require('./db');
const { M, tr, add } = require('./engines/i18n');
add({
  sv: { 'rm.sitHint': 'Tryck på "+ Sätt dig här" för att vara med.', 'rm.bots1': 'Bjud in vänner – eller tryck "Starta spelet" så spelar en dator med dig.',
    'rm.botsN': 'Bjud in vänner – eller tryck "Starta spelet" så spelar {n} datorer med dig.', 'rm.ready': 'Alla är på plats – tryck "Starta spelet"!', 'rm.addBot': 'Lägg till dator', 'rm.start': 'Starta spelet',
    'rm.taken': 'Platsen är upptagen.', 'rm.onlyBot': 'Du kan bara ta över en dators plats.', 'rm.hasSeat': 'Du har redan en plats.', 'rm.notStarted': 'Spelet har inte startat än.',
    'rm.watching': 'Du tittar på. Tryck på en dators plats för att ta över den.', 'rm.full': 'Alla platser är tagna.', 'rm.others': 'de andra', 'rm.computer': 'Dator', 'rm.player': 'Spelare' },
  en: { 'rm.sitHint': 'Press "+ Sit here" to join.', 'rm.bots1': 'Invite friends – or press "Start game" and a computer player joins you.',
    'rm.botsN': 'Invite friends – or press "Start game" and {n} computer players join you.', 'rm.ready': 'Everyone is here – press "Start game"!', 'rm.addBot': 'Add computer', 'rm.start': 'Start game',
    'rm.taken': 'That seat is taken.', 'rm.onlyBot': 'You can only take over a computer player\'s seat.', 'rm.hasSeat': 'You already have a seat.', 'rm.notStarted': 'The game has not started yet.',
    'rm.watching': 'You are watching. Tap a computer player\'s seat to take it over.', 'rm.full': 'All seats are taken.', 'rm.others': 'the others', 'rm.computer': 'Computer', 'rm.player': 'Player' },
});
const pickLang = (x, lang) => (x && typeof x === 'object' ? x[lang] || x.en || x.sv : x);

const BOT_NAMES = ['Robo-Rut', 'Data-Dan', 'Bot-Bea', 'Pixel-Per', 'Chip-Cia', 'Kod-Kalle', 'Bit-Britt', 'Logik-Leo'];
const BOT_COLOR = '#9aa7b8';
const BOT_DELAY = [750, 1150], AWAY_DELAY = 2500; // people who dropped out get a moment to come back
const NEXT_ROUND_MS = 1500, NEXT_GAME_MS = 3000; // the next round starts by itself after the result has been shown
const TURN_MS = 30000; // with other people at the table, nobody can stall the game: the computer moves for you after this long (engines may set a shorter idle(G))

let send = () => {};
const init = fns => { send = fns.send; };
const online = (r, pid) => (r.players.get(pid) || {}).conns > 0;
const seatOf = (r, pid) => r.seats.findIndex(s => s && s.pid === pid);
const nameOf = (r, i) => { const s = r.seats[i]; return !s ? '' : s.bot ? s.name : (r.players.get(s.pid) || {}).name || 'Player'; };
const colorOf = (r, i) => { const s = r.seats[i]; return !s ? '#ccc' : s.bot ? BOT_COLOR : (r.players.get(s.pid) || {}).color || '#ccc'; };
const isBotLike = (r, i) => { const s = r.seats[i]; return !s || s.bot || !online(r, s.pid); };

function cancelIdle(r) { clearTimeout(r.idleT); r.idleT = null; r.idleAt = 0; r.idleKey = ''; }
function cancelNext(r) { clearTimeout(r.nextT); r.nextT = null; r.nextAt = 0; cancelIdle(r); }
function nextRound(r) { // start the next round (or a new game after a final result)
  cancelNext(r);
  const e = engines[r.engine];
  r.G = e.start(r.seats.length, r.G); r.botErrors = 0; countPlay(r);
}
function setup(r, id) {
  cancelNext(r);
  const e = engines[id];
  const people = (r.seats || []).filter(s => s && !s.bot).map(s => s.pid);
  r.mode = 'engine'; r.engine = id; r.G = null;
  r.seats = Array(e.meta.max).fill(null);
  people.slice(0, e.meta.max).forEach((pid, i) => (r.seats[i] = { pid, bot: false }));
}
function join(r, pid) { // sit down automatically if there is room and the game has not started
  if (r.G || seatOf(r, pid) >= 0) return;
  const i = r.seats.findIndex(s => !s);
  if (i >= 0) r.seats[i] = { pid, bot: false };
}
function addBot(r) {
  const i = r.seats.findIndex(s => !s); if (i < 0) return false;
  const used = new Set(r.seats.filter(s => s && s.bot).map(s => s.name));
  r.seats[i] = { bot: true, name: BOT_NAMES.find(n => !used.has(n)) || 'Bot' };
  return true;
}
function countPlay(r) {
  r.round = (r.round || 0) + 1;
  try { db.countPlay(r.engine, r.uid, r.round); } catch (e) { console.error('could not count play', e.message); }
}
function startGame(r) {
  const e = engines[r.engine];
  const people = r.seats.filter(s => s && !s.bot).length;
  if (!e.meta.solo) {
    const want = Math.max(e.meta.min, Math.min(e.meta.max, Math.max(r.seats.filter(Boolean).length, e.meta.fill)));
    while (r.seats.filter(Boolean).length < want && addBot(r));
  }
  r.seats = r.seats.filter(Boolean);
  if (!r.seats.length && people === 0) r.seats = [{ bot: true, name: 'Bot' }];
  r.G = e.start(Math.max(1, r.seats.length), null);
  r.botErrors = 0;
  countPlay(r);
}
function toLobby(r) {
  cancelNext(r);
  const e = engines[r.engine];
  r.G = null;
  const kept = r.seats.filter(s => s && (s.bot || r.players.has(s.pid)));
  r.seats = Array(e.meta.max).fill(null).map((_, i) => kept[i] || null);
}

/* ---------- names in texts: "{0} vann" → "Du vann" / "Anna vann" / "You won" ---------- */
function subst(text, r, me, turn, waitingFor, lang) {
  if (text == null || text === '') return text;
  const en = lang !== 'sv';
  return String(text).replace(/\{(\d+|turn|other)\}(s(?![\p{L}]))?/gu, (m, key, poss, idx, str) => {
    let seats = key === 'turn' ? [turn] : key === 'other' ? (waitingFor || []).filter(s => s !== me) : [+key];
    seats = seats.filter(s => s != null && s >= 0 && r.seats[s]);
    if (!seats.length) return tr(lang, M('rm.others'));
    const subject = /(^|[.!?…]\s+)[^\p{L}\d]*$/u.test(str.slice(0, idx));
    const name = s => {
      if (s === me) return poss ? (en ? (subject ? 'Your' : 'your') : (subject ? 'Dina' : 'dina')) : en ? (subject ? 'You' : 'you') : (subject ? 'Du' : 'dig');
      return nameOf(r, s) + (poss ? (en ? "'s" : 's') : '');
    };
    return seats.map(name).join(en ? ' and ' : ' och ');
  });
}

/* ---------- what one person sees ---------- */
function view(r, pid, lang = 'en') {
  const e = engines[r.engine], me = seatOf(r, pid);
  const meta = { id: e.meta.id, name: pickLang(e.meta.name, lang), emoji: e.meta.emoji, rules: pickLang(e.meta.rules, lang), min: e.meta.min, max: e.meta.max, solo: !!e.meta.solo };
  const seats = r.seats.map((s, i) => (s ? { name: nameOf(r, i), bot: !!s.bot, away: !s.bot && !online(r, s.pid), color: colorOf(r, i), me: s.pid === pid } : null));
  const watchers = [...r.players.values()].filter(p => p.conns > 0 && seatOf(r, p.pid) < 0).length;
  const base = { mode: 'engine', code: r.code, meta, me, seats, watchers, round: r.round || 0 };
  if (!r.G) {
    const filled = seats.filter(Boolean).length, empty = r.seats.length - filled;
    const buttons = [];
    if (!e.meta.solo && empty > 0) buttons.push({ id: 'addBot', label: tr(lang, M('rm.addBot')), icon: 'bot' });
    buttons.push({ id: 'start', label: tr(lang, M('rm.start')), icon: 'play', primary: true });
    const autoBots = e.meta.solo ? 0 : Math.max(0, Math.max(e.meta.min, Math.min(e.meta.max, Math.max(filled, e.meta.fill))) - filled);
    return { ...base, phase: 'lobby', buttons,
      hint: tr(lang, me < 0 ? M('rm.sitHint') : autoBots ? (autoBots === 1 ? M('rm.bots1') : M('rm.botsN', { n: autoBots })) : M('rm.ready')) };
  }
  const v = e.view(r.G, e.meta.solo ? Math.max(0, me) : me);
  const waitingFor = e.waiting(r.G);
  const S = t => subst(tr(lang, t), r, me, v.turn, waitingFor, lang);
  const res = r.G.result ? { ...r.G.result, nextIn: r.nextAt ? Math.max(0, r.nextAt - Date.now()) : null, title: S(r.G.result.title), note: S(r.G.result.note),
    lines: r.G.result.lines.map(l => ({ ...l, name: l.seat >= 0 ? (l.seat === me ? (lang === 'sv' ? 'Du' : 'You') : nameOf(r, l.seat)) : '', color: l.seat >= 0 ? colorOf(r, l.seat) : '', text: S(l.text) })) } : null;
  return { ...base, phase: 'game', turn: v.turn ?? null, turnName: v.turn != null && v.turn >= 0 ? (v.turn === me ? (lang === 'sv' ? 'Du' : 'You') : nameOf(r, v.turn)) : '', you: me >= 0 && lang !== 'sv' ? 'You' : 'Du',
    hint: S(v.hint), msg: S(v.msg), priv: S(v.priv), handLabel: S(v.handLabel), layout: v.layout || 'table', pot: v.pot, moves: v.moves,
    seats: seats.map((s, i) => (s ? { ...s, ...(v.seats[i] || {}), label: S((v.seats[i] || {}).label) } : null)),
    center: v.center.map(c => ({ ...c, label: S(c.label) })),
    hand: v.hand, handTap: !!v.handTap, ...(v.board ? { board: v.board, flip: !!v.flip, last: v.last, check: v.check } : {}), buttons: (v.buttons || []).map(b => ({ ...b, label: S(b.label) })),
    idleIn: r.idleAt && me >= 0 && waitingFor.includes(me) ? Math.max(0, r.idleAt - Date.now()) : null,
    result: res };
}
function broadcast(r) { for (const ws of r.clients) send(ws, { t: 'eng', v: view(r, ws.pid, ws.lang) }); }

/* ---------- computer players + timed steps ---------- */
function schedule(r) {
  if (!r.G || !r.clients.size) return;
  if (r.G.result) { // show the result for a moment, then keep playing
    if (!r.nextT) {
      const ms = r.G.result.final ? NEXT_GAME_MS : NEXT_ROUND_MS;
      r.nextAt = Date.now() + ms;
      r.nextT = setTimeout(() => { r.nextT = null; if (r.G && r.G.result && r.clients.size) { nextRound(r); after(r); } }, ms);
    }
    return;
  }
  const e = engines[r.engine];
  const a = e.auto(r.G);
  if (a) {
    if (!r.autoT) r.autoT = setTimeout(() => { r.autoT = null; if (!r.G) return; try { e.step(r.G, a.key); } catch (err) { console.error('step failed', err); } after(r); }, a.ms);
    return;
  }
  idleTimer(r, e);
  if (r.botT) return;
  const s = e.waiting(r.G).find(i => isBotLike(r, i));
  if (s == null) return;
  const delay = r.seats[s] && !r.seats[s].bot ? AWAY_DELAY : BOT_DELAY[0] + Math.random() * (BOT_DELAY[1] - BOT_DELAY[0]);
  r.botT = setTimeout(() => {
    r.botT = null;
    if (!r.G || r.G.result || !e.waiting(r.G).includes(s) || !isBotLike(r, s)) return after(r);
    try {
      const mv = e.bot(r.G, s);
      const err = mv ? e.act(r.G, s, mv) : 'no move';
      if (err && ++r.botErrors > 30) { console.error('computer player stuck in', r.engine, err); return broadcast(r); }
    } catch (err) { console.error('computer player failed', err); }
    after(r);
  }, delay);
}
// people who are online but don't move: only when two or more people play together (alone you may think as long as you like)
function idleTimer(r, e) {
  const humans = r.seats.filter(x => x && !x.bot && online(r, x.pid)).length;
  const slow = humans >= 2 ? e.waiting(r.G).filter(i => !isBotLike(r, i)) : [];
  const key = slow.length ? slow.join(',') + '|' + r.round : '';
  if (key === r.idleKey) return;
  cancelIdle(r);
  if (!key) return;
  const ms = (e.idle && e.idle(r.G)) || TURN_MS;
  r.idleKey = key; r.idleAt = Date.now() + ms;
  r.idleT = setTimeout(() => {
    const now = r.idleKey; r.idleT = null; r.idleAt = 0; r.idleKey = '';
    if (!r.G || r.G.result) return;
    for (const i of e.waiting(r.G)) {
      if (isBotLike(r, i) || !now.split('|')[0].split(',').includes(String(i))) continue;
      for (let k = 0; k < 6 && !r.G.result && !e.auto(r.G) && e.waiting(r.G).includes(i); k++) { // finish the whole turn (e.g. draw + discard in rummy)
        try { const mv = e.bot(r.G, i); if (!mv || e.act(r.G, i, mv)) break; } catch (err) { console.error('auto move failed', err); break; }
      }
      if (r.G.result || e.auto(r.G)) break;
    }
    after(r);
  }, ms);
}
function after(r) { schedule(r); broadcast(r); } // schedule first so the view already knows when the next round starts

/* ---------- messages from people ---------- */
const clean = m => ({ a: String(m.a || '').slice(0, 10), id: m.id == null ? undefined : String(m.id).slice(0, 40), pile: m.pile == null ? undefined : String(m.pile).slice(0, 40),
  i: Number.isInteger(m.i) ? m.i : undefined, seat: Number.isInteger(m.seat) ? m.seat : undefined, amount: Number.isFinite(+m.amount) ? Math.round(+m.amount) : undefined,
  from: m.from == null ? undefined : String(m.from).slice(0, 10), to: m.to == null ? undefined : String(m.to).slice(0, 10) });
function handle(r, ws, m) {
  const e = engines[r.engine], pid = ws.pid, me = seatOf(r, pid);
  const nope = msg => send(ws, { t: 'nope', msg: subst(tr(ws.lang, msg), r, me, null, [], ws.lang) });
  switch (m.t) {
    case 'sit': {
      const i = m.seat, s = r.seats[i];
      if (!Number.isInteger(i) || i < 0 || i >= r.seats.length) return;
      if (!r.G) { if (s) return nope(M('rm.taken')); if (me >= 0) r.seats[me] = null; r.seats[i] = { pid, bot: false }; }
      else { if (!s || !s.bot) return nope(M('rm.onlyBot')); if (me >= 0) return nope(M('rm.hasSeat')); r.seats[i] = { pid, bot: false }; }
      break;
    }
    case 'stand': if (!r.G && me >= 0) r.seats[me] = null; break;
    case 'removeBot': if (!r.G && r.seats[m.seat] && r.seats[m.seat].bot) r.seats[m.seat] = null; break;
    case 'g': {
      if (!r.G) return nope(M('rm.notStarted'));
      if (r.G.result) return;
      let seat = me;
      if (e.meta.solo) seat = Math.max(0, me);
      else if (me < 0) return nope(M('rm.watching'));
      const err = e.act(r.G, seat, clean(m));
      if (err) nope(err);
      break;
    }
    case 'btn': // lobby / result buttons
      if (m.id === 'addBot' && !r.G) { if (!addBot(r)) return nope(M('rm.full')); }
      else if (m.id === 'start' && !r.G) startGame(r);
      else if (m.id === 'again' && r.G && r.G.result) nextRound(r); // "Continue now"
      else if (m.id === 'lobby' && r.G) toLobby(r);
      else return;
      break;
    default: return;
  }
  after(r);
}
function left(r) { if (r.mode === 'engine') after(r); }

module.exports = { init, setup, join, handle, broadcast, schedule, left, view, engines };
