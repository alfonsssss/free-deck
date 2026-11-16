// Finns i sjön / Go Fish – 2–5 players. Ask for a rank you hold; collect fours.
const { RANKS, makeDeck, pub, sortHand, nextSeat, pick } = require('./common');
const { M, add, seat } = require('./i18n');

const meta = { id: 'g-finnsisjon', emoji: '🐟', min: 2, max: 5, fill: 3, kids: true,
  name: { sv: 'Finns i sjön', en: 'Go Fish' },
  desc: { sv: 'Fråga efter kort och samla fyrtal. Perfekt för barn!', en: 'Ask for cards and collect sets of four. Perfect for kids!' },
  rules: {
    sv: 'Mål: samla flest fyrtal (fyra kort med samma valör, t.ex. fyra kungar).\n\n1. När det är din tur: tryck på ett kort i din hand för att välja vad du vill fråga efter.\n2. Tryck på den spelare du vill fråga.\n3. Har hen sådana kort får du alla – och får fråga igen!\n4. Annars: "Finns i sjön!" – du drar ett kort. Får du det du frågade efter får du fråga igen.\n5. Fyrtal läggs ut automatiskt. När alla fyrtal är klara vinner den som har flest.',
    en: 'Goal: collect the most sets of four (four cards of the same rank, e.g. four kings).\n\n1. On your turn: tap a card in your hand to choose what to ask for.\n2. Tap the player you want to ask.\n3. If they have any, you get them all – and you ask again!\n4. If not: "Go fish!" – you draw a card. If you draw what you asked for, you ask again.\n5. Sets of four are laid down automatically. When all sets are done, the player with the most wins.' } };
add({
  sv: { 'gf.book': '📚 {a} fick ett fyrtal med {r}!', 'gf.shared': '🤝 Delad vinst!', 'gf.winner': '🏆 {a} vann!', 'gf.books': '{n} fyrtal',
    'gf.gave': '{t} gav {a} {n} {r}! {a} får fråga igen.', 'gf.gave1': '{t} gav {a} en {r}! {a} får fråga igen.', 'gf.fish': '🐟 Finns i sjön! {t} hade inga {r}.', 'gf.lucky': '{a} drog precis det och får fråga igen!',
    'gf.youDrew': 'Du drog {c}.', 'gf.fished': '🐟 {a} fiskade ett kort ur sjön.', 'gf.askFirst': 'Fråga någon först.', 'gf.self': 'Du kan inte fråga dig själv 🙂',
    'gf.pickFirst': 'Tryck först på ett kort i din hand för att välja vad du vill fråga efter.', 'gf.noCards': 'Den spelaren har inga kort kvar – fråga någon annan.',
    'gf.nobody': 'Ingen annan har kort – fiska ett ur sjön!', 'gf.fishBtn': 'Fiska ett kort', 'gf.ask': 'Fråga {a}', 'gf.whom': 'Vem vill du fråga efter {r}?', 'gf.tapCard': 'Tryck på ett kort för att välja vad du vill fråga efter.',
    'gf.booksLabel': '📚 {n} fyrtal', 'gf.pond': 'Sjön · {n}', 'gf.theirBooks': '{a}s fyrtal' },
  en: { 'gf.book': '📚 {a} got a set of four {r}!', 'gf.shared': '🤝 Shared win!', 'gf.winner': '🏆 {a} won!', 'gf.books': p => `${p.n} ${p.n === 1 ? 'set' : 'sets'}`,
    'gf.gave': '{t} gave {a} {n} {r}! {a} may ask again.', 'gf.gave1': '{t} gave {a} a {r}! {a} may ask again.', 'gf.fish': '🐟 Go fish! {t} had no {r}.', 'gf.lucky': '{a} drew exactly that and may ask again!',
    'gf.youDrew': 'You drew the {c}.', 'gf.fished': '🐟 {a} fished a card from the pond.', 'gf.askFirst': 'Ask someone first.', 'gf.self': 'You can\'t ask yourself 🙂',
    'gf.pickFirst': 'First tap a card in your hand to choose what to ask for.', 'gf.noCards': 'That player has no cards left – ask someone else.',
    'gf.nobody': 'Nobody else has cards – fish one from the pond!', 'gf.fishBtn': 'Go fish', 'gf.ask': 'Ask {a}', 'gf.whom': 'Who do you want to ask for {r}?', 'gf.tapCard': 'Tap a card to choose what to ask for.',
    'gf.booksLabel': p => `📚 ${p.n} ${p.n === 1 ? 'set' : 'sets'}`, 'gf.pond': 'Pond · {n}', 'gf.theirBooks': '{a}s sets' },
});

function start(n) {
  const stock = makeDeck();
  const per = n <= 3 ? 7 : 5;
  const G = { n, hands: Array.from({ length: n }, () => stock.splice(0, per)), stock, books: Array.from({ length: n }, () => []), bookCards: Array.from({ length: n }, () => []),
    turn: 0, sel: Array(n).fill(null), known: Array.from({ length: n }, () => new Set()), phase: 'play', msg: [], priv: Array(n).fill(''), result: null };
  for (let s = 0; s < n; s++) makeBooks(G, s);
  ensureCards(G);
  return G;
}
const addMsg = (G, m) => { G.msg = [].concat(G.msg || [], m); };
function makeBooks(G, s) {
  for (const r of RANKS) {
    const got = G.hands[s].filter(c => c.r === r);
    if (got.length === 4) { G.hands[s] = G.hands[s].filter(c => c.r !== r); G.books[s].push(r); G.bookCards[s].push(...got); addMsg(G, M('gf.book', { a: seat(s), r: M('ranks', { r }) })); }
  }
}
const totalBooks = G => G.books.reduce((t, b) => t + b.length, 0);
// a player whose hand is empty draws one card; if nobody can play the game ends
function ensureCards(G) {
  for (let guard = 0; guard < G.n + 1; guard++) {
    if (totalBooks(G) === 13 || (!G.stock.length && G.hands.every(h => !h.length))) return finish(G);
    const h = G.hands[G.turn];
    if (h.length) return;
    if (G.stock.length) { h.push(G.stock.pop()); makeBooks(G, G.turn); if (h.length) return; }
    G.turn = nextSeat(G.turn, G.n);
  }
}
function finish(G) {
  G.phase = 'over';
  const best = Math.max(...G.books.map(b => b.length));
  const winners = G.books.map((b, s) => (b.length === best ? s : -1)).filter(s => s >= 0);
  G.result = { final: true, title: winners.length > 1 ? M('gf.shared') : M('gf.winner', { a: seat(winners[0]) }),
    lines: G.books.map((b, s) => ({ seat: s, win: winners.includes(s), text: M('gf.books', { n: b.length }) })) };
}
const waiting = G => (G.phase === 'play' ? [G.turn] : []);

function ask(G, s, target, rank) {
  G.known[s].add(rank);
  const got = G.hands[target].filter(c => c.r === rank);
  G.priv = Array(G.n).fill('');
  if (got.length) {
    G.hands[target] = G.hands[target].filter(c => c.r !== rank);
    G.hands[s].push(...got);
    G.known[target].delete(rank);
    G.msg = got.length > 1 ? M('gf.gave', { t: seat(target), a: seat(s), n: got.length, r: M('ranks', { r: rank }) }) : M('gf.gave1', { t: seat(target), a: seat(s), r: M('rank', { r: rank }) });
    makeBooks(G, s);
  } else {
    G.msg = M('gf.fish', { t: seat(target), r: M('ranks', { r: rank }) });
    if (G.stock.length) {
      const c = G.stock.pop(); G.hands[s].push(c);
      if (c.r === rank) { addMsg(G, M('gf.lucky', { a: seat(s) })); makeBooks(G, s); }
      else { G.priv[s] = M('gf.youDrew', { c: M('card', { s: c.s, r: c.r }) }); makeBooks(G, s); G.turn = nextSeat(G.turn, G.n); }
    } else G.turn = nextSeat(G.turn, G.n);
  }
  G.sel[s] = null;
  ensureCards(G);
}

const nobodyToAsk = (G, s) => G.hands.every((h, i) => i === s || !h.length);
// nobody else has cards: draw from the pond instead of asking
function fish(G, s) {
  G.priv = Array(G.n).fill('');
  if (G.stock.length) { const c = G.stock.pop(); G.hands[s].push(c); G.priv[s] = M('gf.youDrew', { c: M('card', { s: c.s, r: c.r }) }); makeBooks(G, s); }
  G.msg = M('gf.fished', { a: seat(s) });
  G.sel[s] = null; G.turn = nextSeat(G.turn, G.n); ensureCards(G);
}
function act(G, s, m) {
  if (G.phase !== 'play') return null;
  if (s !== G.turn) return M('waitTurn');
  if (m.a === 'btn' && m.id === 'fish') { if (!nobodyToAsk(G, s)) return M('gf.askFirst'); fish(G, s); return null; }
  if (m.a === 'card') {
    const c = G.hands[s].find(k => k.id === m.id); if (!c) return null;
    G.sel[s] = G.sel[s] === c.r ? null : c.r; return null;
  }
  const target = m.a === 'seat' ? m.seat : m.a === 'btn' && String(m.id).startsWith('ask') ? +String(m.id).slice(3) : -1;
  if (target < 0) return null;
  if (target === s) return M('gf.self');
  if (!G.sel[s]) return M('gf.pickFirst');
  if (!G.hands[target] || !G.hands[target].length) return M('gf.noCards');
  ask(G, s, target, G.sel[s]);
  return null;
}

function view(G, s) {
  const mine = s === G.turn && G.phase === 'play', sel = s >= 0 ? G.sel[s] : null;
  const v = viewBase(G, s, sel, mine);
  if (mine && nobodyToAsk(G, s)) return Object.assign(v, { hint: M('gf.nobody'), buttons: [{ id: 'fish', label: M('gf.fishBtn'), icon: 'fish', primary: true }] });
  return v;
}
function viewBase(G, s, sel, mine) {
  const buttons = mine && sel ? G.hands.map((h, i) => (i !== s && h.length ? { id: 'ask' + i, label: M('gf.ask', { a: seat(i) }), icon: 'ask', primary: true } : null)).filter(Boolean) : [];
  return {
    turn: G.phase === 'play' ? G.turn : null, msg: G.msg, priv: s >= 0 ? G.priv[s] : '',
    hint: G.phase === 'over' ? M('gameOver') : mine ? (sel ? M('gf.whom', { r: M('ranks', { r: sel }) }) : M('gf.tapCard')) : M('waitFor'),
    seats: G.hands.map((h, i) => ({ cards: h.length, label: G.books[i].length ? M('gf.booksLabel', { n: G.books[i].length }) : '', tap: mine && i !== s && !!sel && h.length > 0 })),
    center: [
      { id: 'stock', label: M('gf.pond', { n: G.stock.length }), layout: 'pond', row: 0, cards: G.stock.slice(0, 9).map(() => ({ c: null })) },
      ...G.books.map((b, i) => (b.length ? { id: 'books' + i, label: M('gf.theirBooks', { a: seat(i) }), layout: 'fan', row: 1, small: true,
        cards: b.map(r => ({ c: pub(G.bookCards[i].find(c => c.r === r)) })) } : null)).filter(Boolean),
    ],
    hand: s >= 0 ? sortHand(G.hands[s]).map(c => ({ ...pub(c), ok: true, sel: sel === c.r })) : null,
    handTap: mine, buttons,
  };
}

function bot(G, s) {
  const hand = G.hands[s];
  if (nobodyToAsk(G, s)) return { a: 'btn', id: 'fish' };
  if (!G.sel[s]) {
    // prefer a rank someone is known to hold, else the rank we hold most of
    const cnt = {}; hand.forEach(c => (cnt[c.r] = (cnt[c.r] || 0) + 1));
    const ranks = Object.keys(cnt);
    const knownR = ranks.find(r => G.known.some((k, i) => i !== s && k.has(r) && G.hands[i].length));
    const r = knownR || ranks.sort((a, b) => cnt[b] - cnt[a])[0];
    return { a: 'card', id: hand.find(c => c.r === r).id };
  }
  const r = G.sel[s];
  const opts = G.hands.map((h, i) => i).filter(i => i !== s && G.hands[i].length);
  const knownS = opts.find(i => G.known[i].has(r));
  return { a: 'seat', seat: knownS ?? pick(opts) };
}
module.exports = { meta, start, view, act, waiting, bot, auto: () => null, step() {} };
