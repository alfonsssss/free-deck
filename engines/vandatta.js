// Vändåtta / Crazy Eights – 2–6 players. Match suit or rank; eights are wild.
const { SUITS, makeDeck, shuffle, pub, sortHand, takeCard, nextSeat } = require('./common');
const { M, add, seat, card } = require('./i18n');
const MAX_DRAWS = 3, END_AT = 200;

const meta = { id: 'g-vandatta', emoji: '8️⃣', min: 2, max: 6, fill: 3, kids: true,
  name: { sv: 'Vändåtta', en: 'Crazy Eights' },
  desc: { sv: 'Bli av med alla kort först! Lätt och roligt för hela familjen.', en: 'Get rid of all your cards first! Easy and fun for the whole family.' },
  rules: {
    sv: 'Mål: bli av med alla dina kort först.\n\n• Lägg ett kort med samma färg (♥ ♠ ♦ ♣) eller samma valör som översta kortet.\n• Åttor får läggas när som helst – då väljer du vilken färg som gäller.\n• Kan du inte lägga? Dra ett kort (högst 3). Går det fortfarande inte – passa.\n• Den som blir av med korten först vinner rundan och får poäng för de andras kort. Först till 200 vinner.',
    en: 'Goal: be the first to get rid of all your cards.\n\n• Play a card with the same suit (♥ ♠ ♦ ♣) or the same rank as the top card.\n• Eights can be played at any time – then you choose which suit counts.\n• Can\'t play? Draw a card (up to 3). Still nothing? Pass.\n• The first player out of cards wins the round and scores points for the others\' cards. First to 200 wins.' } };
add({
  sv: { 'vd.reshuffle': 'Leken tog slut – kasthögen blandades till en ny lek.', 'vd.chose': '{a} valde {s}', 'vd.played': '{a} lade {c}', 'vd.drew': '{a} drog ett kort', 'vd.passed': '{a} passade',
    'vd.winAll': '🏆 {a} vann hela spelet!', 'vd.out': '🎉 {a} blev av med alla kort!', 'vd.plus': '+{n} poäng · totalt {t}', 'vd.left': '{n} kort kvar · totalt {t}', 'vd.note': 'Först till 200 poäng vinner hela spelet.',
    'vd.chooseSuit': 'Välj vilken färg som ska gälla.', 'vd.bad': 'Det går inte. Lägg {s}, en {r} eller en åtta.', 'vd.max': 'Du har dragit 3 kort. Lägg ett kort eller passa.', 'vd.empty': 'Leken är slut – du får passa.',
    'vd.drawFirst': 'Dra kort först (upp till 3) innan du passar.', 'vd.draw': 'Dra kort', 'vd.pass': 'Passa', 'vd.hint8': 'Du lade en åtta – välj vilken färg som ska gälla.',
    'vd.hintPlay': 'Lägg ett kort i {s} eller en {r} – eller en åtta.', 'vd.hintDraw': 'Inget kort passar. Tryck "Dra kort".', 'vd.hintPass': 'Inget passar – tryck "Passa".',
    'vd.stock': 'Leken · {n}', 'vd.pile': 'Kasthög', 'vd.suitNow': 'Färg som gäller: {s}' },
  en: { 'vd.reshuffle': 'The deck ran out – the discard pile was shuffled into a new deck.', 'vd.chose': '{a} chose {s}', 'vd.played': '{a} played the {c}', 'vd.drew': '{a} drew a card', 'vd.passed': '{a} passed',
    'vd.winAll': '🏆 {a} won the whole game!', 'vd.out': '🎉 {a} got rid of all the cards!', 'vd.plus': '+{n} points · total {t}', 'vd.left': '{n} cards left · total {t}', 'vd.note': 'First to 200 points wins the game.',
    'vd.chooseSuit': 'Choose which suit counts.', 'vd.bad': 'You can\'t play that. Play {s}, a {r} or an eight.', 'vd.max': 'You have drawn 3 cards. Play a card or pass.', 'vd.empty': 'The deck is empty – you have to pass.',
    'vd.drawFirst': 'Draw cards first (up to 3) before you pass.', 'vd.draw': 'Draw card', 'vd.pass': 'Pass', 'vd.hint8': 'You played an eight – choose which suit counts.',
    'vd.hintPlay': 'Play a card in {s} or a {r} – or an eight.', 'vd.hintDraw': 'No card fits. Press "Draw card".', 'vd.hintPass': 'Nothing fits – press "Pass".',
    'vd.stock': 'Deck · {n}', 'vd.pile': 'Discard pile', 'vd.suitNow': 'Suit in play: {s}' },
});

function start(n, prev) {
  const stock = makeDeck();
  const per = n <= 4 ? 7 : 5;
  const hands = Array.from({ length: n }, () => stock.splice(0, per));
  const discard = [stock.pop()];
  const total = prev && prev.total && prev.total.length === n && !prev.result?.final ? prev.total : Array(n).fill(0);
  const dealer = prev ? (prev.dealer + 1) % n : 0;
  return { n, hands, stock, discard, suit: null, turn: (dealer + 1) % n, dealer, drawn: 0, phase: 'play', total, msg: '', result: null };
}
const top = G => G.discard[G.discard.length - 1];
const activeSuit = G => G.suit || top(G).s;
const legal = (G, c) => c.r === '8' || c.s === activeSuit(G) || c.r === top(G).r;
const canDraw = G => G.stock.length || G.discard.length > 1;
const waiting = G => (G.phase === 'play' || G.phase === 'suit' ? [G.turn] : []);
function refill(G) {
  if (G.stock.length) return true;
  if (G.discard.length <= 1) return false;
  const t = G.discard.pop(); G.stock = shuffle(G.discard); G.discard = [t];
  G.msg = M('vd.reshuffle');
  return true;
}
const points = c => (c.r === '8' ? 50 : ['J', 'Q', 'K'].includes(c.r) ? 10 : c.r === 'A' ? 1 : +c.r);
function endTurn(G) { G.drawn = 0; G.turn = nextSeat(G.turn, G.n); }
function finish(G, w) {
  const got = G.hands.reduce((t, h, s) => t + (s === w ? 0 : h.reduce((a, c) => a + points(c), 0)), 0);
  G.total[w] += got; G.phase = 'over';
  const final = G.total[w] >= END_AT;
  G.result = { final, title: M(final ? 'vd.winAll' : 'vd.out', { a: seat(w) }),
    lines: G.hands.map((h, s) => ({ seat: s, win: s === w, text: s === w ? M('vd.plus', { n: got, t: G.total[s] }) : M('vd.left', { n: h.length, t: G.total[s] }) })),
    note: M('vd.note') };
}

function act(G, s, m) {
  if (G.phase === 'over') return null;
  if (s !== G.turn) return M('waitTurn');
  const hand = G.hands[s];
  if (G.phase === 'suit') {
    if (m.a !== 'btn' || !SUITS.includes(m.id)) return M('vd.chooseSuit');
    G.suit = m.id; G.msg = M('vd.chose', { a: seat(s), s: M('suitSym', { s: m.id }) }); G.phase = 'play'; endTurn(G); return null;
  }
  if (m.a === 'card' || (m.a === 'drop' && m.pile === 'discard')) {
    const c = hand.find(k => k.id === m.id); if (!c) return null;
    if (!legal(G, c)) return M('vd.bad', { s: M('suitSym', { s: activeSuit(G) }), r: M('rank', { r: top(G).r }) });
    takeCard(hand, c.id); G.discard.push(c); G.suit = null;
    G.msg = M('vd.played', { a: seat(s), c: card(c) });
    if (!hand.length) { finish(G, s); return null; }
    if (c.r === '8') { G.phase = 'suit'; return null; }
    endTurn(G); return null;
  }
  if ((m.a === 'btn' && m.id === 'draw') || (m.a === 'pile' && m.pile === 'stock')) {
    if (G.drawn >= MAX_DRAWS) return M('vd.max');
    if (!refill(G)) return M('vd.empty');
    hand.push(G.stock.pop()); G.drawn++;
    G.msg = M('vd.drew', { a: seat(s) });
    return null;
  }
  if (m.a === 'btn' && m.id === 'pass') {
    if (G.drawn < MAX_DRAWS && canDraw(G)) return M('vd.drawFirst');
    G.msg = M('vd.passed', { a: seat(s) }); endTurn(G); return null;
  }
  return null;
}

function view(G, s) {
  const mine = s === G.turn && G.phase === 'play';
  const hand = s >= 0 ? sortHand(G.hands[s]).map(c => ({ ...pub(c), ok: !mine || legal(G, c) })) : null;
  const canPlay = mine && G.hands[s].some(c => legal(G, c));
  const buttons = [];
  if (s === G.turn && G.phase === 'suit') SUITS.forEach(x => buttons.push({ id: x, label: M('suit', { s: x }), icon: x, primary: true }));
  if (mine && G.drawn < MAX_DRAWS && canDraw(G)) buttons.push({ id: 'draw', label: M('vd.draw'), icon: 'card', primary: !canPlay });
  if (mine && !canPlay && (G.drawn >= MAX_DRAWS || !canDraw(G))) buttons.push({ id: 'pass', label: M('vd.pass'), icon: 'skip', primary: true });
  const t = top(G), as = activeSuit(G);
  let hint;
  if (G.phase === 'over') hint = M('roundOver');
  else if (s === G.turn && G.phase === 'suit') hint = M('vd.hint8');
  else if (mine) hint = canPlay ? M('vd.hintPlay', { s: M('suitSym', { s: as }), r: M('rank', { r: t.r }) }) : G.drawn < MAX_DRAWS ? M('vd.hintDraw') : M('vd.hintPass');
  else hint = M('waitFor');
  return {
    turn: G.phase === 'over' ? null : G.turn, hint, msg: G.msg,
    seats: G.hands.map((h, i) => ({ cards: h.length, score: G.total[i], dealer: i === G.dealer })),
    center: [
      { id: 'stock', label: M('vd.stock', { n: G.stock.length }), layout: 'stack', row: 0, tap: mine, cards: G.stock.length ? [{ c: null }] : [] },
      { id: 'discard', label: G.suit ? M('vd.suitNow', { s: G.suit }) : M('vd.pile'), layout: 'fan', row: 0, drop: mine,
        cards: G.discard.slice(-3).map(c => ({ c: pub(c) })) },
    ],
    hand, handTap: mine, buttons,
  };
}

function bot(G, s) {
  const hand = G.hands[s];
  if (G.phase === 'suit') return { a: 'btn', id: mostSuit(hand) };
  const ok = hand.filter(c => legal(G, c));
  const normal = ok.filter(c => c.r !== '8');
  if (normal.length) {
    const ms = mostSuit(hand);
    return { a: 'card', id: (normal.find(c => c.s === ms) || normal.sort((a, b) => points(b) - points(a))[0]).id };
  }
  if (ok.length) return { a: 'card', id: ok[0].id };
  if (G.drawn < MAX_DRAWS && canDraw(G)) return { a: 'btn', id: 'draw' };
  return { a: 'btn', id: 'pass' };
}
function mostSuit(hand) {
  const cnt = {}; hand.filter(c => c.r !== '8').forEach(c => (cnt[c.s] = (cnt[c.s] || 0) + 1));
  return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || '♥';
}
module.exports = { meta, start, view, act, waiting, bot, auto: () => null, step() {} };
