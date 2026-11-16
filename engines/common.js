// Shared helpers for the rule engines.
// An engine works with seat numbers 0..n-1 and exposes:
//   meta          { id, name, emoji, min, max, fill, kids, desc, rules, solo? }
//   start(n, prev) → G              new round (prev = previous G, to keep chips/scores)
//   view(G, seat) → view            what one seat may see (seat = -1 for watchers)
//   act(G, seat, msg) → null|text   apply a move; returns a friendly error text if not allowed
//   waiting(G)    → [seat]          seats that must act now (bots/away players are played for)
//   bot(G, seat)  → msg             a move for a computer player
//   auto(G)       → {ms,key}|null   a timed step (dealer draws, trick is collected …)
//   step(G, key)                    run that timed step
// G.result = { title, lines:[{seat,text,win}], final } ends a round.
const crypto = require('crypto');

const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_NAME = { '♠': 'spader', '♥': 'hjärter', '♣': 'klöver', '♦': 'ruter' };
const RANK_NAME = { A: 'ess', K: 'kung', Q: 'dam', J: 'knekt' };
const RANK_PLURAL = { A: 'ess', K: 'kungar', Q: 'damer', J: 'knektar', '2': 'tvåor', '3': 'treor', '4': 'fyror', '5': 'femmor',
  '6': 'sexor', '7': 'sjuor', '8': 'åttor', '9': 'nior', '10': 'tior' };

let uid = 0;
function makeDeck(decks = 1) {
  const out = [];
  for (let d = 0; d < decks; d++) for (const s of SUITS) for (const r of RANKS) out.push({ id: 'k' + (++uid).toString(36), s, r, red: s === '♥' || s === '♦' });
  return shuffle(out);
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const pick = a => a[crypto.randomInt(a.length)];
const pub = c => (c ? { id: c.id, s: c.s, r: c.r, red: c.red } : null);
// rank value, ace high (14) by default
const rv = (r, aceLow = false) => (r === 'A' ? (aceLow ? 1 : 14) : r === 'K' ? 13 : r === 'Q' ? 12 : r === 'J' ? 11 : +r);
const cardName = c => `${SUIT_NAME[c.s]} ${RANK_NAME[c.r] || c.r}`;
const sortHand = (cards, aceLow = false) => cards.slice().sort((a, b) => SUITS.indexOf(a.s) - SUITS.indexOf(b.s) || rv(a.r, aceLow) - rv(b.r, aceLow));
const takeCard = (arr, id) => { const i = arr.findIndex(c => c.id === id); return i < 0 ? null : arr.splice(i, 1)[0]; };
const nextSeat = (seat, n, ok = () => true) => { for (let k = 1; k <= n; k++) { const s = (seat + k) % n; if (ok(s)) return s; } return -1; };
const sv = n => Number(n).toLocaleString('sv-SE');

module.exports = { SUITS, RANKS, SUIT_NAME, RANK_NAME, RANK_PLURAL, makeDeck, shuffle, pick, pub, rv, cardName, sortHand, takeCard, nextSeat, sv };
