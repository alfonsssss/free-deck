// Rummy – 2–4 players. Draw, lay out sets and runs, discard. First to empty the hand wins the round.
const { SUITS, makeDeck, shuffle, pub, rv, sortHand, takeCard, nextSeat } = require('./common');
const { M, add, seat, card } = require('./i18n');
const END_AT = 100;

const meta = { id: 'g-rummy', emoji: '🀄', min: 2, max: 4, fill: 2, kids: false,
  name: { sv: 'Rummy', en: 'Rummy' },
  desc: { sv: 'Samla tretal och stegar och bli av med korten först.', en: 'Collect sets and runs and be the first to get rid of your cards.' },
  rules: {
    sv: 'Mål: bli av med alla kort genom att lägga ut kombinationer.\n\nKombinationer:\n• Tretal eller fyrtal: 3–4 kort med samma valör (7 7 7).\n• Stege: minst 3 kort i följd i samma färg (4♥ 5♥ 6♥). Ess får vara lågt eller högt.\n\nDin tur:\n1. Dra ett kort – från leken eller översta från kasthögen.\n2. Lägg ut kombinationer: markera korten och tryck "Lägg ut". Du kan också lägga till kort på kombinationer som redan ligger ute – markera kortet och tryck på kombinationen.\n3. Avsluta med att slänga ett kort: markera det och tryck "Släng".\n\nDen som blir av med alla kort vinner rundan och får poäng för de andras kort (klädda = 10, ess = 1). Först till 100 vinner.',
    en: 'Goal: get rid of all your cards by laying down combinations.\n\nCombinations:\n• Set: 3–4 cards of the same rank (7 7 7).\n• Run: at least 3 cards in a row in the same suit (4♥ 5♥ 6♥). Aces can be low or high.\n\nYour turn:\n1. Draw a card – from the deck or the top card of the discard pile.\n2. Lay down combinations: select the cards and press "Lay down". You can also add cards to combinations already on the table – select the card and tap the combination.\n3. Finish by discarding a card: select it and press "Discard".\n\nThe first player out of cards wins the round and scores the others\' cards (face cards = 10, aces = 1). First to 100 wins.' } };
add({
  sv: { 'ru.winAll': '🏆 {a} vann hela spelet!', 'ru.out': '🎉 {a} blev av med alla kort!', 'ru.plus': '+{n} poäng · totalt {t}', 'ru.left': '{n} kort kvar · totalt {t}', 'ru.note': 'Först till 100 poäng vinner.',
    'ru.takeDiscard': 'Leken är slut – ta kortet från kasthögen.', 'ru.drewStock': '{a} drog från leken', 'ru.emptyDiscard': 'Kasthögen är tom.', 'ru.tookDiscard': '{a} tog {c} från kasthögen', 'ru.drawFirst': 'Dra ett kort först – tryck på leken eller kasthögen.',
    'ru.need3': 'En kombination behöver minst 3 kort.', 'ru.noMeld': 'Korten bildar ingen kombination. Det ska vara samma valör, eller i följd i samma färg.', 'ru.laid': '{a} lade ut {n} kort', 'ru.selectFirst': 'Markera först kortet du vill lägga till.',
    'ru.noFit': 'De korten passar inte i den kombinationen.', 'ru.added': '{a} lade till {n} kort', 'ru.oneDiscard': 'Markera exakt ett kort att slänga.', 'ru.sameCard': 'Du kan inte slänga samma kort som du just tog från kasthögen.',
    'ru.discarded': '{a} slängde {c}', 'ru.stalemate': '⏱️ Ingen gick ut – {a} hade lägst kort', 'ru.bStock': 'Dra från leken', 'ru.bDiscard': 'Ta från kasthögen', 'ru.bMeld': 'Lägg ut', 'ru.bThrow': 'Släng',
    'ru.hDraw': 'Dra ett kort: från leken eller översta kortet på kasthögen.', 'ru.hSelect': 'Markera kort att lägga ut – eller ett kort att slänga för att avsluta.', 'ru.hOne': 'Tryck "Släng" för att avsluta, eller tryck på en kombination för att lägga till kortet.',
    'ru.hGood': 'Bra! Tryck "Lägg ut".', 'ru.hMore': 'Markera minst 3 kort för en kombination.', 'ru.hBad': 'De här korten bildar ingen kombination.', 'ru.stock': 'Leken · {n}', 'ru.pile': 'Kasthög' },
  en: { 'ru.winAll': '🏆 {a} won the whole game!', 'ru.out': '🎉 {a} got rid of all the cards!', 'ru.plus': '+{n} points · total {t}', 'ru.left': '{n} cards left · total {t}', 'ru.note': 'First to 100 points wins.',
    'ru.takeDiscard': 'The deck is empty – take the card from the discard pile.', 'ru.drewStock': '{a} drew from the deck', 'ru.emptyDiscard': 'The discard pile is empty.', 'ru.tookDiscard': '{a} took the {c} from the discard pile', 'ru.drawFirst': 'Draw a card first – tap the deck or the discard pile.',
    'ru.need3': 'A combination needs at least 3 cards.', 'ru.noMeld': 'Those cards don\'t make a combination. They must have the same rank, or be in a row in the same suit.', 'ru.laid': '{a} laid down {n} cards', 'ru.selectFirst': 'First select the card you want to add.',
    'ru.noFit': 'Those cards don\'t fit that combination.', 'ru.added': '{a} added {n} cards', 'ru.oneDiscard': 'Select exactly one card to discard.', 'ru.sameCard': 'You can\'t discard the card you just took from the discard pile.',
    'ru.discarded': '{a} discarded the {c}', 'ru.stalemate': '⏱️ Nobody went out – {a} had the lowest cards', 'ru.bStock': 'Draw from deck', 'ru.bDiscard': 'Take from discard pile', 'ru.bMeld': 'Lay down', 'ru.bThrow': 'Discard',
    'ru.hDraw': 'Draw a card: from the deck or the top of the discard pile.', 'ru.hSelect': 'Select cards to lay down – or one card to discard to finish.', 'ru.hOne': 'Press "Discard" to finish, or tap a combination to add the card.',
    'ru.hGood': 'Great! Press "Lay down".', 'ru.hMore': 'Select at least 3 cards for a combination.', 'ru.hBad': 'These cards don\'t make a combination.', 'ru.stock': 'Deck · {n}', 'ru.pile': 'Discard pile' },
});

const seat2 = seat; // (inside act, 'seat' is the seat number)
const pts = c => (['J', 'Q', 'K'].includes(c.r) ? 10 : c.r === 'A' ? 1 : +c.r);
function isSet(cs) { return cs.length >= 3 && cs.length <= 4 && cs.every(c => c.r === cs[0].r) && new Set(cs.map(c => c.s)).size === cs.length; }
function isRun(cs) {
  if (cs.length < 3 || !cs.every(c => c.s === cs[0].s)) return false;
  for (const low of [true, false]) {
    const v = cs.map(c => rv(c.r, low)).sort((a, b) => a - b);
    if (v.every((x, i) => i === 0 || x === v[i - 1] + 1)) return true;
  }
  return false;
}
const isMeld = cs => isSet(cs) || isRun(cs);
function sortMeld(cs) {
  if (isSet(cs)) return cs.slice().sort((a, b) => SUITS.indexOf(a.s) - SUITS.indexOf(b.s));
  const low = cs.some(c => c.r === 'A') && cs.some(c => c.r === '2');
  return cs.slice().sort((a, b) => rv(a.r, low) - rv(b.r, low));
}

function start(n, prev) {
  const stock = makeDeck();
  const per = n === 2 ? 10 : 7;
  const total = prev && prev.total && prev.total.length === n && !prev.result?.final ? prev.total : Array(n).fill(0);
  const dealer = prev ? (prev.dealer + 1) % n : 0;
  return { n, hands: Array.from({ length: n }, () => stock.splice(0, per)), stock, discard: [stock.pop()], melds: [], turn: (dealer + 1) % n, dealer,
    phase: 'draw', turns: 0, sel: Array.from({ length: n }, () => []), tookDiscard: null, total, msg: '', result: null };
}
const waiting = G => (G.phase === 'draw' || G.phase === 'play' ? [G.turn] : []);
function refill(G) {
  if (G.stock.length) return true;
  if (G.discard.length <= 1) return false;
  const t = G.discard.pop(); G.stock = shuffle(G.discard); G.discard = [t]; return true;
}
function finish(G, w) {
  const got = G.hands.reduce((t, h, s) => t + (s === w ? 0 : h.reduce((a, c) => a + pts(c), 0)), 0);
  G.total[w] += got; G.phase = 'over'; G.turn = null;
  const final = G.total[w] >= END_AT;
  G.result = { final, title: M(final ? 'ru.winAll' : 'ru.out', { a: seat(w) }),
    lines: G.hands.map((h, s) => ({ seat: s, win: s === w, text: s === w ? M('ru.plus', { n: got, t: G.total[s] }) : M('ru.left', { n: h.length, t: G.total[s] }) })),
    note: M('ru.note') };
}
const selected = (G, s) => G.hands[s].filter(c => G.sel[s].includes(c.id));

function act(G, seat, m) {
  if (G.phase === 'over') return null;
  if (seat !== G.turn) return M('waitTurn');
  const hand = G.hands[seat];
  if (G.phase === 'draw') {
    if ((m.a === 'pile' && m.pile === 'stock') || (m.a === 'btn' && m.id === 'stock')) {
      if (!refill(G)) {
        if (G.discard.length) return M('ru.takeDiscard');
        const lows = G.hands.map(h => h.reduce((a, c) => a + pts(c), 0)), w = lows.indexOf(Math.min(...lows));
        return finish(G, w), null; // no cards left anywhere: lowest hand wins the round
      }
      const c = G.stock.pop(); hand.push(c); G.phase = 'play'; G.tookDiscard = null; G.msg = M('ru.drewStock', { a: seat2(seat) }); return null;
    }
    if ((m.a === 'pile' && m.pile === 'discard') || (m.a === 'btn' && m.id === 'discard')) {
      const c = G.discard.pop(); if (!c) return M('ru.emptyDiscard');
      hand.push(c); G.phase = 'play'; G.tookDiscard = c.id; G.msg = M('ru.tookDiscard', { a: seat2(seat), c: card(c) }); return null;
    }
    if (m.a === 'card') return M('ru.drawFirst');
    return null;
  }
  // phase play
  if (m.a === 'card') { const i = G.sel[seat].indexOf(m.id); if (i >= 0) G.sel[seat].splice(i, 1); else if (hand.some(c => c.id === m.id)) G.sel[seat].push(m.id); return null; }
  const sel = selected(G, seat);
  if (m.a === 'btn' && m.id === 'meld') {
    if (!isMeld(sel)) return M(sel.length < 3 ? 'ru.need3' : 'ru.noMeld');
    sel.forEach(c => takeCard(hand, c.id));
    G.melds.push({ id: 'm' + G.melds.length + Date.now().toString(36), cards: sortMeld(sel), owner: seat });
    G.sel[seat] = []; G.msg = M('ru.laid', { a: seat2(seat), n: sel.length });
    if (!hand.length) finish(G, seat);
    return null;
  }
  if (m.a === 'pile' && m.pile.startsWith('m')) {
    const meld = G.melds.find(x => x.id === m.pile); if (!meld) return null;
    if (!sel.length) return M('ru.selectFirst');
    const combo = [...meld.cards, ...sel];
    if (!isMeld(combo)) return M('ru.noFit');
    sel.forEach(c => takeCard(hand, c.id)); meld.cards = sortMeld(combo); G.sel[seat] = [];
    G.msg = M('ru.added', { a: seat2(seat), n: sel.length });
    if (!hand.length) finish(G, seat);
    return null;
  }
  if ((m.a === 'btn' && m.id === 'discard') || (m.a === 'pile' && m.pile === 'discard') || (m.a === 'drop' && m.pile === 'discard')) {
    const one = m.a === 'drop' ? hand.find(c => c.id === m.id) : sel.length === 1 ? sel[0] : null;
    if (!one) return M('ru.oneDiscard');
    if (one.id === G.tookDiscard && hand.length > 1) return M('ru.sameCard');
    takeCard(hand, one.id); G.discard.push(one); G.sel[seat] = [];
    G.msg = M('ru.discarded', { a: seat2(seat), c: card(one) });
    if (!hand.length) return finish(G, seat), null;
    G.phase = 'draw'; G.turn = nextSeat(G.turn, G.n); G.tookDiscard = null;
    if (++G.turns > 60 * G.n) { // nobody can go out: lowest hand wins the round
      const lows = G.hands.map(h => h.reduce((a, c) => a + pts(c), 0)); finish(G, lows.indexOf(Math.min(...lows)));
      G.result.title = M('ru.stalemate', { a: seat2(lows.indexOf(Math.min(...lows))) });
    }
    return null;
  }
  return null;
}

function view(G, seat) {
  const mine = seat === G.turn, sel = seat >= 0 ? selected(G, seat) : [];
  const buttons = [];
  if (mine && G.phase === 'draw') {
    buttons.push({ id: 'stock', label: M('ru.bStock'), icon: 'card', primary: true });
    if (G.discard.length) buttons.push({ id: 'discard', label: M('ru.bDiscard'), icon: 'layers' });
  }
  if (mine && G.phase === 'play') {
    if (sel.length >= 3) buttons.push({ id: 'meld', label: M('ru.bMeld'), icon: 'grid', primary: isMeld(sel) });
    if (sel.length === 1) buttons.push({ id: 'discard', label: M('ru.bThrow'), icon: 'trash', primary: true });
  }
  let hint;
  if (G.phase === 'over') hint = M('roundOver');
  else if (!mine) hint = M('waitFor');
  else if (G.phase === 'draw') hint = M('ru.hDraw');
  else if (!sel.length) hint = M('ru.hSelect');
  else if (sel.length === 1) hint = M('ru.hOne');
  else hint = M(isMeld(sel) ? 'ru.hGood' : sel.length < 3 ? 'ru.hMore' : 'ru.hBad');
  return {
    turn: G.phase === 'over' ? null : G.turn, hint, msg: G.msg,
    seats: G.hands.map((h, s) => ({ cards: h.length, score: G.total[s], dealer: s === G.dealer })),
    center: [
      { id: 'stock', label: M('ru.stock', { n: G.stock.length }), layout: 'stack', row: 0, tap: mine && G.phase === 'draw', cards: G.stock.length ? [{ c: null }] : [] },
      { id: 'discard', label: M('ru.pile'), layout: 'stack', row: 0, tap: mine, drop: mine && G.phase === 'play', cards: G.discard.slice(-1).map(c => ({ c: pub(c) })) },
      ...G.melds.map(md => ({ id: md.id, label: seat2(md.owner), layout: 'fan', row: 1, small: true, tap: mine && G.phase === 'play' && sel.length > 0, cards: md.cards.map(c => ({ c: pub(c) })) })),
    ],
    hand: seat >= 0 ? sortHand(G.hands[seat], true).map(c => ({ ...pub(c), ok: true, sel: G.sel[seat].includes(c.id) })) : null,
    handTap: mine && G.phase === 'play', buttons,
  };
}

/* ---------- computer player ---------- */
// find melds in a hand (greedy: sets first, then runs)
function findMelds(hand) {
  const left = hand.slice(), out = [];
  const byRank = {}; left.forEach(c => (byRank[c.r] = byRank[c.r] || []).push(c));
  for (const cs of Object.values(byRank)) { const uniq = []; cs.forEach(c => { if (!uniq.some(u => u.s === c.s)) uniq.push(c); }); if (uniq.length >= 3) { out.push(uniq.slice(0, 4)); uniq.slice(0, 4).forEach(c => takeCard(left, c.id)); } }
  for (const s of SUITS) {
    for (const low of [true, false]) {
      const cs = left.filter(c => c.s === s).sort((a, b) => rv(a.r, low) - rv(b.r, low));
      let run = [];
      const flush = () => { if (run.length >= 3) { out.push(run); run.forEach(c => takeCard(left, c.id)); } run = []; };
      cs.forEach(c => { if (run.length && rv(c.r, low) !== rv(run[run.length - 1].r, low) + 1) flush(); run.push(c); });
      flush();
    }
  }
  return out;
}
function bot(G, seat) {
  const hand = G.hands[seat];
  if (G.phase === 'draw') {
    const t = G.discard[G.discard.length - 1];
    const useful = t && findMelds([...hand, t]).some(md => md.includes(t));
    const stockEmpty = !G.stock.length && G.discard.length <= 1;
    return { a: 'btn', id: (useful || stockEmpty) && G.discard.length ? 'discard' : 'stock' };
  }
  const melds = findMelds(hand);
  if (melds.length) {
    const want = melds[0].map(c => c.id).sort().join();
    if (G.sel[seat].slice().sort().join() === want) return { a: 'btn', id: 'meld' };
    G.sel[seat] = melds[0].map(c => c.id); return { a: 'btn', id: 'meld' };
  }
  for (const c of hand) for (const md of G.melds) if (isMeld([...md.cards, c])) { G.sel[seat] = [c.id]; return { a: 'pile', pile: md.id }; }
  // discard: highest card that is not close to forming a combination
  const near = c => hand.some(o => o !== c && (o.r === c.r || (o.s === c.s && Math.abs(rv(o.r, true) - rv(c.r, true)) <= 2)));
  const cands = hand.filter(c => c.id !== G.tookDiscard || hand.length === 1);
  const pickC = (cands.filter(c => !near(c)).length ? cands.filter(c => !near(c)) : cands).sort((a, b) => pts(b) - pts(a))[0];
  G.sel[seat] = [pickC.id];
  return { a: 'btn', id: 'discard' };
}
module.exports = { meta, start, view, act, waiting, bot, auto: () => null, step() {}, isMeld };
