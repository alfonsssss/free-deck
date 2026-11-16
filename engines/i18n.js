// Translations for everything the server says (game texts, hints, results, errors).
// Engines never build finished sentences: they return messages M(key, params) and the room
// translates them into each player's language ('sv' or 'en') right before sending.
// A message param may itself be a message (e.g. a card name) – it is translated first.
// Seat names are written as {0}, {1} … and filled in afterwards by the room (Du/You/Anna).
const dict = { sv: {}, en: {} };
const M = (k, p = {}) => ({ k, p });
const isMsg = v => v && typeof v === 'object' && typeof v.k === 'string' && v.p && typeof v.p === 'object';
const seat = s => `{${s}}`; // placeholder for a seat name

function add(texts) { for (const lang of Object.keys(dict)) Object.assign(dict[lang], texts[lang] || {}); }

function tr(lang, v) {
  if (v == null || v === '') return v;
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(x => tr(lang, x)).filter(Boolean).join(' ');
  if (!isMsg(v)) return String(v);
  const L = dict[lang] ? lang : 'en';
  const t = dict[L][v.k] ?? dict.en[v.k] ?? dict.sv[v.k];
  const p = {};
  for (const [k, x] of Object.entries(v.p)) p[k] = isMsg(x) || Array.isArray(x) ? tr(lang, x) : x;
  if (typeof t === 'function') return t(p, L);
  if (t == null) return v.k;
  return t.replace(/\{(\w+)\}/g, (m, k) => (k in p ? (typeof p[k] === 'number' ? p[k].toLocaleString(L === 'sv' ? 'sv-SE' : 'en-US') : p[k]) : m));
}

/* ---------- cards ---------- */
const SUIT = { sv: { '♠': 'spader', '♥': 'hjärter', '♣': 'klöver', '♦': 'ruter' }, en: { '♠': 'spades', '♥': 'hearts', '♣': 'clubs', '♦': 'diamonds' } };
const RANK = { sv: { A: 'ess', K: 'kung', Q: 'dam', J: 'knekt' }, en: { A: 'ace', K: 'king', Q: 'queen', J: 'jack' } };
const RANKS_SV = { A: 'ess', K: 'kungar', Q: 'damer', J: 'knektar', '2': 'tvåor', '3': 'treor', '4': 'fyror', '5': 'femmor', '6': 'sexor', '7': 'sjuor', '8': 'åttor', '9': 'nior', '10': 'tior' };
const RANKS_EN = { A: 'aces', K: 'kings', Q: 'queens', J: 'jacks', '2': 'twos', '3': 'threes', '4': 'fours', '5': 'fives', '6': 'sixes', '7': 'sevens', '8': 'eights', '9': 'nines', '10': 'tens' };
add({
  sv: {
    card: p => `${SUIT.sv[p.s]} ${RANK.sv[p.r] || p.r}`,
    rank: p => RANK.sv[p.r] || p.r,
    ranks: p => RANKS_SV[p.r] || p.r,
    suit: p => SUIT.sv[p.s],
    suitSym: p => `${SUIT.sv[p.s]} ${p.s}`,
    cards: p => `${p.n} kort`,
    and: '{a} och {b}',
    // shared
    waitTurn: 'Vänta på din tur.',
    waitFor: 'Väntar på {turn}…',
    waitMoment: 'Vänta lite…',
    roundOver: 'Rundan är slut!',
    gameOver: 'Spelet är slut!',
    total: 'totalt {n}',
  },
  en: {
    card: p => `${RANK.en[p.r] || p.r} of ${SUIT.en[p.s]}`,
    rank: p => RANK.en[p.r] || p.r,
    ranks: p => RANKS_EN[p.r] || p.r,
    suit: p => SUIT.en[p.s],
    suitSym: p => `${SUIT.en[p.s]} ${p.s}`,
    cards: p => `${p.n} ${p.n === 1 ? 'card' : 'cards'}`,
    and: '{a} and {b}',
    waitTurn: 'Please wait for your turn.',
    waitFor: 'Waiting for {turn}…',
    waitMoment: 'One moment…',
    roundOver: 'The round is over!',
    gameOver: 'The game is over!',
    total: 'total {n}',
  },
});
const card = c => M('card', { s: c.s, r: c.r });

module.exports = { M, tr, add, isMsg, seat, card, dict };
