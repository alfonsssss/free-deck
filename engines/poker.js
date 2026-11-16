// Texas Hold'em – 2–6 players. Blinds, betting rounds, side pots and hand evaluation.
const { makeDeck, pub, rv } = require('./common');
const { M, add, seat } = require('./i18n');
const START = 1000, BLIND_EVERY = 8; // blinds double every 8 hands so a game ends in reasonable time

const meta = { id: 'g-poker', emoji: '♠️', min: 2, max: 6, fill: 4, kids: false,
  name: { sv: "Texas Hold'em", en: "Texas Hold'em" },
  desc: { sv: 'Poker med låtsasmarker, blinds och satsningsrundor.', en: 'Poker with play chips, blinds and betting rounds.' },
  rules: {
    sv: 'Mål: vinna marker genom att ha bästa handen – eller få de andra att lägga sig. Markerna är bara på låtsas.\n\n• Du får 2 hemliga kort. Fem gemensamma kort läggs ut på bordet: först 3, sedan 1, sedan 1.\n• Efter varje utläggning satsar man. Du kan:\n   ✋ Checka – satsa inget (om ingen har satsat)\n   📞 Syna – satsa lika mycket som den högsta\n   ⬆️ Höj – satsa mer\n   🏳️ Lägg dig – ge upp handen\n• Bästa handen av dina 2 kort och bordets 5 vinner potten.\n\nHänder från bäst till sämst: Färgstege, Fyrtal, Kåk, Färg, Stege, Tretal, Två par, Par, Högt kort.',
    en: 'Goal: win chips by having the best hand – or by making everyone else fold. The chips are just for fun.\n\n• You get 2 secret cards. Five shared cards are dealt on the table: first 3, then 1, then 1.\n• After each deal there is a betting round. You can:\n   ✋ Check – bet nothing (if nobody has bet)\n   📞 Call – match the highest bet\n   ⬆️ Raise – bet more\n   🏳️ Fold – give up the hand\n• The best hand made from your 2 cards and the 5 on the table wins the pot.\n\nHands from best to worst: Straight flush, Four of a kind, Full house, Flush, Straight, Three of a kind, Two pair, Pair, High card.' } };
add({
  sv: { 'pk.h8': 'Färgstege till {v}', 'pk.royal': 'Royal straight flush!', 'pk.h7': 'Fyrtal i {a}', 'pk.h6': 'Kåk, {a} och {b}', 'pk.h5': 'Färg, {v} högst', 'pk.h4': 'Stege till {v}',
    'pk.h3': 'Tretal i {a}', 'pk.h2': 'Två par, {a} och {b}', 'pk.h1': 'Par i {a}', 'pk.h0': 'Högt kort: {v}',
    'pk.sb': 'Liten blind {n}', 'pk.bb': 'Stor blind {n}', 'pk.blindsUp': 'Blinds höjs till {a}/{b}!', 'pk.newHand': 'Ny giv! {a} och {b} lägger blinds.', 'pk.folded': 'Lade sig', 'pk.foldMsg': '{a} lade sig',
    'pk.noCheck': 'Du kan inte checka – någon har satsat. Syna {n} eller lägg dig.', 'pk.checks': 'Checkar', 'pk.checkMsg': '{a} checkar', 'pk.nothingToCall': 'Det finns inget att syna – du kan checka.',
    'pk.allin': 'All in {n}', 'pk.calls': 'Synar {n}', 'pk.callMsg': '{a} synar {n}', 'pk.minRaise': 'Du måste höja till minst {n}.', 'pk.notEnough': 'Det räcker inte för att höja – syna i stället.',
    'pk.raises': 'Höjer till {n}', 'pk.raiseMsg': '{a} höjer till {n}', 'pk.allinMsg': '{a} går all in med {n}', 'pk.flop': 'Floppen!', 'pk.turn': 'Turn!', 'pk.river': 'River!',
    'pk.wonPot': '{a} vann potten!', 'pk.wonUncontested': 'Vann {n} – alla andra lade sig · har {c}', 'pk.out': 'Slut på marker', 'pk.has': 'Har {c}', 'pk.foldedHas': 'Lade sig · har {c}',
    'pk.line': '{h} · har {c}', 'pk.lineWon': '{h} – vann {n} · har {c}', 'pk.wonWith': p => `${p.a} vann med ${String(p.h).toLowerCase()}!`, 'pk.winAll': '🏆 {a} vann hela spelet!', 'pk.note': 'Giv {n} · blinds {a}/{b}',
    'pk.fold': 'Lägg dig', 'pk.check': 'Checka', 'pk.call': 'Syna {n}', 'pk.raise': 'Höj', 'pk.bet': 'Satsa', 'pk.allinBtn': 'All in', 'pk.hOver': 'Given är slut!', 'pk.hRunout': 'Korten läggs ut…',
    'pk.hCall': 'Din tur: {n} att syna. Du har {c}.', 'pk.hCheck': 'Din tur: du kan checka eller satsa. Du har {c}.', 'pk.hFolded': 'Du lade dig. Vänta på nästa giv.', 'pk.board': 'Bordet',
    'pk.yourHand': 'Din hand: {h}', 'pk.youFolded': 'Du lade dig' },
  en: { 'pk.h8': 'Straight flush to the {v}', 'pk.royal': 'Royal flush!', 'pk.h7': 'Four {a}', 'pk.h6': 'Full house, {a} over {b}', 'pk.h5': 'Flush, {v} high', 'pk.h4': 'Straight to the {v}',
    'pk.h3': 'Three {a}', 'pk.h2': 'Two pair, {a} and {b}', 'pk.h1': 'Pair of {a}', 'pk.h0': 'High card: {v}',
    'pk.sb': 'Small blind {n}', 'pk.bb': 'Big blind {n}', 'pk.blindsUp': 'Blinds go up to {a}/{b}!', 'pk.newHand': 'New hand! {a} and {b} post the blinds.', 'pk.folded': 'Folded', 'pk.foldMsg': '{a} folded',
    'pk.noCheck': 'You can\'t check – someone has bet. Call {n} or fold.', 'pk.checks': 'Checks', 'pk.checkMsg': '{a} checks', 'pk.nothingToCall': 'There is nothing to call – you can check.',
    'pk.allin': 'All in {n}', 'pk.calls': 'Calls {n}', 'pk.callMsg': '{a} calls {n}', 'pk.minRaise': 'You must raise to at least {n}.', 'pk.notEnough': 'That is not enough to raise – call instead.',
    'pk.raises': 'Raises to {n}', 'pk.raiseMsg': '{a} raises to {n}', 'pk.allinMsg': '{a} goes all in with {n}', 'pk.flop': 'The flop!', 'pk.turn': 'The turn!', 'pk.river': 'The river!',
    'pk.wonPot': '{a} won the pot!', 'pk.wonUncontested': 'Won {n} – everyone else folded · has {c}', 'pk.out': 'Out of chips', 'pk.has': 'Has {c}', 'pk.foldedHas': 'Folded · has {c}',
    'pk.line': '{h} · has {c}', 'pk.lineWon': '{h} – won {n} · has {c}', 'pk.wonWith': p => `${p.a} won with ${String(p.h).toLowerCase()}!`, 'pk.winAll': '🏆 {a} won the whole game!', 'pk.note': 'Hand {n} · blinds {a}/{b}',
    'pk.fold': 'Fold', 'pk.check': 'Check', 'pk.call': 'Call {n}', 'pk.raise': 'Raise', 'pk.bet': 'Bet', 'pk.allinBtn': 'All in', 'pk.hOver': 'The hand is over!', 'pk.hRunout': 'Dealing the cards…',
    'pk.hCall': 'Your turn: {n} to call. You have {c}.', 'pk.hCheck': 'Your turn: you can check or bet. You have {c}.', 'pk.hFolded': 'You folded. Wait for the next hand.', 'pk.board': 'The table',
    'pk.yourHand': 'Your hand: {h}', 'pk.youFolded': 'You folded' },
});

/* ---------- hand evaluation ---------- */
function eval5(cs) {
  const vals = cs.map(c => rv(c.r)).sort((a, b) => b - a);
  const flush = cs.every(c => c.s === cs[0].s);
  let straight = 0;
  if (new Set(vals).size === 5) { if (vals[0] - vals[4] === 4) straight = vals[0]; else if (vals.join() === '14,5,4,3,2') straight = 5; }
  const cnt = {}; vals.forEach(v => (cnt[v] = (cnt[v] || 0) + 1));
  const g = Object.entries(cnt).map(([v, n]) => [n, +v]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const k = g.map(x => x[1]);
  if (straight && flush) return [8, straight];
  if (g[0][0] === 4) return [7, ...k];
  if (g[0][0] === 3 && g[1][0] === 2) return [6, ...k];
  if (flush) return [5, ...vals];
  if (straight) return [4, straight];
  if (g[0][0] === 3) return [3, ...k];
  if (g[0][0] === 2 && g[1][0] === 2) return [2, ...k];
  if (g[0][0] === 2) return [1, ...k];
  return [0, ...vals];
}
const cmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
function best(cards) {
  if (cards.length < 5) return null;
  let top = null;
  const n = cards.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
    const s = eval5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
    if (!top || cmp(s, top) > 0) top = s;
  }
  return top;
}
const VR = v => ({ 14: 'A', 13: 'K', 12: 'Q', 11: 'J' }[v] || String(v));
// name of a hand, as a translatable message
function handName(s) {
  if (!s) return '';
  if (s[0] === 8 && s[1] === 14) return M('pk.royal');
  return M('pk.h' + s[0], { v: M('rank', { r: VR(s[1]) }), a: M('ranks', { r: VR(s[1]) }), b: M('ranks', { r: VR(s[2]) }) });
}

/* ---------- game flow ---------- */
const seatName = seat;
const live = G => [...Array(G.n).keys()].filter(s => !G.folded[s] && !G.out[s]);
const canAct = (G, s) => !G.folded[s] && !G.allin[s] && !G.out[s];
const nextFrom = (G, s, ok) => { for (let k = 1; k <= G.n; k++) { const t = (s + k) % G.n; if (ok(t)) return t; } return -1; };
const pot = G => G.contrib.reduce((a, b) => a + b, 0);

function start(n, prev) {
  const fresh = !prev || !prev.chips || prev.chips.length !== n || prev.result?.final;
  const chips = fresh ? Array(n).fill(START) : prev.chips.slice();
  const out = chips.map(c => c <= 0);
  const G = { n, chips, out, deck: makeDeck(), hole: Array.from({ length: n }, () => []), board: [], burn: [], bet: Array(n).fill(0), contrib: Array(n).fill(0),
    folded: Array(n).fill(false), allin: Array(n).fill(false), acted: Array(n).fill(false), status: Array(n).fill(''), show: Array(n).fill(false),
    street: 0, turn: null, currentBet: 0, minRaise: 0, phase: 'bet', msg: '', result: null, hands: 0 };
  G.hands = fresh ? 1 : (prev.hands || 0) + 1;
  G.SB = 10 * 2 ** Math.floor((G.hands - 1) / BLIND_EVERY); G.BB = G.SB * 2;
  G.dealer = fresh ? 0 : nextFrom(G, prev.dealer, s => !out[s]);
  for (let r = 0; r < 2; r++) for (let s = 0; s < n; s++) if (!out[s]) G.hole[s].push(G.deck.pop());
  const act = [...Array(n).keys()].filter(s => !out[s]);
  const sb = act.length === 2 ? G.dealer : nextFrom(G, G.dealer, s => !out[s]);
  const bb = nextFrom(G, sb, s => !out[s]);
  post(G, sb, G.SB); post(G, bb, G.BB);
  G.sb = sb; G.bb = bb; G.status[sb] = M('pk.sb', { n: G.SB }); G.status[bb] = M('pk.bb', { n: G.BB });
  G.currentBet = Math.max(...G.bet); G.minRaise = G.BB;
  const up = G.hands > 1 && (G.hands - 1) % BLIND_EVERY === 0;
  G.turn = nextFrom(G, bb, s => canAct(G, s));
  G.msg = [up ? M('pk.blindsUp', { a: G.SB, b: G.BB }) : '', M('pk.newHand', { a: seat(sb), b: seat(bb) })];
  if (G.turn < 0 || live(G).filter(s => canAct(G, s)).length === 0) { G.phase = 'runout'; G.turn = null; }
  return G;
}
function post(G, s, amt) {
  const pay = Math.min(amt, G.chips[s]);
  G.chips[s] -= pay; G.bet[s] += pay; G.contrib[s] += pay;
  if (G.chips[s] === 0) G.allin[s] = true;
  return pay;
}
const waiting = G => (G.phase === 'bet' && G.turn != null && G.turn >= 0 ? [G.turn] : []);

function act(G, seat, m) {
  if (G.phase !== 'bet') return M('waitMoment');
  if (seat !== G.turn) return M('waitTurn');
  if (m.a !== 'btn') return null;
  const toCall = G.currentBet - G.bet[seat];
  switch (m.id) {
    case 'fold': G.folded[seat] = true; G.status[seat] = M('pk.folded'); G.msg = M('pk.foldMsg', { a: seatName(seat) }); break;
    case 'check': if (toCall > 0) return M('pk.noCheck', { n: toCall });
      G.status[seat] = M('pk.checks'); G.msg = M('pk.checkMsg', { a: seatName(seat) }); break;
    case 'call': { if (toCall <= 0) return M('pk.nothingToCall');
      const p = post(G, seat, toCall); G.status[seat] = G.allin[seat] ? M('pk.allin', { n: G.bet[seat] }) : M('pk.calls', { n: p }); G.msg = M('pk.callMsg', { a: seatName(seat), n: p }); break; }
    case 'raise': case 'allin': {
      const max = G.bet[seat] + G.chips[seat];
      let to = m.id === 'allin' ? max : Math.round(+m.amount || 0);
      const min = G.currentBet + G.minRaise;
      if (to >= max) to = max;
      else if (to < min) return M('pk.minRaise', { n: min });
      if (to <= G.currentBet) return M('pk.notEnough');
      const raise = to - G.currentBet;
      post(G, seat, to - G.bet[seat]);
      if (raise >= G.minRaise) G.minRaise = raise;
      G.currentBet = to;
      for (let s = 0; s < G.n; s++) if (s !== seat) G.acted[s] = false;
      G.status[seat] = G.allin[seat] ? M('pk.allin', { n: to }) : M('pk.raises', { n: to }); G.msg = M(G.allin[seat] ? 'pk.allinMsg' : 'pk.raiseMsg', { a: seatName(seat), n: to });
      break;
    }
    default: return null;
  }
  G.acted[seat] = true;
  advance(G);
  return null;
}
function advance(G) {
  const L = live(G);
  if (L.length === 1) return winUncontested(G, L[0]);
  const movers = L.filter(s => !G.allin[s]);
  const done = movers.every(s => G.acted[s] && G.bet[s] === G.currentBet);
  if (!done) { G.turn = nextFrom(G, G.turn, s => canAct(G, s) && (!G.acted[s] || G.bet[s] < G.currentBet)); return; }
  if (movers.length <= 1) { G.phase = 'runout'; G.turn = null; return; }
  nextStreet(G);
}
function nextStreet(G) {
  G.bet.fill(0); G.currentBet = 0; G.minRaise = G.BB; G.acted.fill(false);
  for (let s = 0; s < G.n; s++) if (!G.folded[s] && !G.allin[s] && !G.out[s]) G.status[s] = '';
  if (G.street >= 3) return showdown(G);
  G.burn.push(G.deck.pop()); // burn one card face down
  const k = G.street === 0 ? 3 : 1;
  for (let i = 0; i < k; i++) G.board.push(G.deck.pop());
  G.street++;
  G.msg = M(['', 'pk.flop', 'pk.turn', 'pk.river'][G.street]);
  const movers = live(G).filter(s => !G.allin[s]);
  if (movers.length <= 1) { G.phase = 'runout'; G.turn = null; return; }
  G.turn = nextFrom(G, G.dealer, s => canAct(G, s));
}
function auto(G) { return G.phase === 'runout' ? { ms: 1500, key: 'runout' } : null; }
function step(G) {
  if (G.phase !== 'runout') return;
  live(G).forEach(s => (G.show[s] = true)); // all-in: cards are shown while the board runs out
  if (G.street >= 3) return showdown(G);
  nextStreet(G); // nobody can bet any more, so this only deals the next card(s)
}
function winUncontested(G, w) {
  const p = pot(G); G.chips[w] += p; G.phase = 'over'; G.turn = null;
  finishResult(G, M('pk.wonPot', { a: seatName(w) }), [...Array(G.n).keys()].map(s => ({ seat: s, win: s === w,
    text: s === w ? M('pk.wonUncontested', { n: p, c: G.chips[s] }) : G.out[s] ? M('pk.out') : M('pk.has', { c: G.chips[s] }) })));
}
function showdown(G) {
  G.phase = 'over'; G.turn = null;
  const L = live(G);
  L.forEach(s => (G.show[s] = true));
  const score = {}; L.forEach(s => (score[s] = best([...G.hole[s], ...G.board])));
  const levels = [...new Set(G.contrib.filter(c => c > 0))].sort((a, b) => a - b);
  const won = Array(G.n).fill(0);
  let prev = 0;
  for (const lv of levels) {
    const amt = G.contrib.reduce((t, c) => t + Math.min(c, lv) - Math.min(c, prev), 0);
    let elig = L.filter(s => G.contrib[s] >= lv);
    if (!elig.length) elig = L;
    const top = elig.reduce((b, s) => (cmp(score[s], score[b]) > 0 ? s : b), elig[0]);
    const winners = elig.filter(s => cmp(score[s], score[top]) === 0);
    const share = Math.floor(amt / winners.length);
    winners.forEach(s => (won[s] += share));
    won[winners[0]] += amt - share * winners.length;
    prev = lv;
  }
  won.forEach((w, s) => (G.chips[s] += w));
  const bestSeat = won.indexOf(Math.max(...won));
  finishResult(G, M('pk.wonWith', { a: seatName(bestSeat), h: handName(score[bestSeat]) }), [...Array(G.n).keys()].map(s => ({ seat: s, win: won[s] > 0,
    text: G.out[s] ? M('pk.out') : G.folded[s] ? M('pk.foldedHas', { c: G.chips[s] }) :
      won[s] ? M('pk.lineWon', { h: handName(score[s]), n: won[s], c: G.chips[s] }) : M('pk.line', { h: handName(score[s]), c: G.chips[s] }) })));
}
function finishResult(G, title, lines) {
  const left = G.chips.filter(c => c > 0).length;
  const final = left <= 1;
  G.result = { final, title: final ? M('pk.winAll', { a: seatName(G.chips.findIndex(c => c > 0)) }) : title, lines,
    note: final ? '' : M('pk.note', { n: G.hands, a: G.SB, b: G.BB }) };
  G.msg = title;
}

function view(G, seat) {
  const myTurn = G.phase === 'bet' && seat === G.turn;
  const buttons = [];
  if (myTurn) {
    const toCall = G.currentBet - G.bet[seat], max = G.bet[seat] + G.chips[seat], min = Math.min(max, G.currentBet + G.minRaise);
    buttons.push({ id: 'fold', label: M('pk.fold'), icon: 'flag' });
    if (toCall <= 0) buttons.push({ id: 'check', label: M('pk.check'), icon: 'check', primary: true });
    else buttons.push({ id: 'call', label: M('pk.call', { n: Math.min(toCall, G.chips[seat]) }), icon: 'equal', primary: true });
    if (max > G.currentBet && G.chips[seat] > toCall) buttons.push({ id: 'raise', label: M(toCall > 0 ? 'pk.raise' : 'pk.bet'), icon: 'up', raise: { min, max, step: 10, pot: pot(G), current: G.currentBet } });
    if (G.chips[seat] > 0) buttons.push({ id: 'allin', label: M('pk.allinBtn'), icon: 'zap' });
  }
  const mine = seat >= 0 && !G.out[seat] ? best([...G.hole[seat], ...G.board]) : null;
  let hint;
  if (G.phase === 'over') hint = M('pk.hOver');
  else if (G.phase === 'runout') hint = M('pk.hRunout');
  else if (myTurn) { const toCall = G.currentBet - G.bet[seat]; hint = toCall > 0 ? M('pk.hCall', { n: toCall, c: G.chips[seat] }) : M('pk.hCheck', { c: G.chips[seat] }); }
  else if (seat >= 0 && G.folded[seat]) hint = M('pk.hFolded');
  else hint = M('waitFor');
  return {
    turn: G.phase === 'bet' ? G.turn : null, hint, msg: G.msg, pot: pot(G),
    seats: [...Array(G.n).keys()].map(s => ({ chips: G.chips[s], bet: G.bet[s], dealer: s === G.dealer, out: G.out[s],
      label: G.out[s] ? M('pk.out') : G.status[s],
      shown: G.out[s] || G.folded[s] || s === seat ? [] : G.hole[s].map(c => (G.show[s] ? pub(c) : null)) })),
    center: [{ id: 'board', label: M('pk.board'), layout: 'fan', row: 0, slots: 5, cards: G.board.map(c => ({ c: pub(c) })) }],
    hand: seat >= 0 && G.hole[seat].length && !G.out[seat] ? G.hole[seat].map(c => ({ ...pub(c), ok: !G.folded[seat] })) : null,
    handLabel: mine ? M('pk.yourHand', { h: handName(mine) }) : seat >= 0 && G.folded[seat] ? M('pk.youFolded') : '',
    handTap: false, buttons,
  };
}

/* ---------- computer player ---------- */
function strength(G, s) {
  const h = G.hole[s];
  if (!G.board.length) {
    const [a, b] = h.map(c => rv(c.r)).sort((x, y) => y - x);
    if (a === b) return 0.5 + a / 28;
    return ((a + b) / 28) * 0.7 + (h[0].s === h[1].s ? 0.06 : 0) + (a - b === 1 ? 0.04 : 0);
  }
  const sc = best([...h, ...G.board]), bd = G.board.length >= 5 ? best(G.board) : null;
  if (bd && cmp(sc, bd) === 0) return 0.2; // only playing the board
  return [0.15, 0.45, 0.7, 0.8, 0.86, 0.88, 0.94, 0.98, 1][sc[0]];
}
function bot(G, s) {
  const toCall = G.currentBet - G.bet[s], p = pot(G);
  const st = strength(G, s) + (Math.random() - 0.5) * 0.2;
  const max = G.bet[s] + G.chips[s];
  const raiseTo = Math.min(max, Math.ceil((G.currentBet + Math.max(G.minRaise, p / 2)) / 10) * 10);
  if (st > 0.78 && max > G.currentBet && Math.random() < 0.7) return { a: 'btn', id: 'raise', amount: raiseTo };
  if (toCall <= 0) return st > 0.6 && Math.random() < 0.35 && max > G.currentBet ? { a: 'btn', id: 'raise', amount: raiseTo } : { a: 'btn', id: 'check' };
  const odds = toCall / (p + toCall);
  if (st > odds + 0.12 || toCall <= G.BB / 2) return { a: 'btn', id: 'call' };
  return { a: 'btn', id: 'fold' };
}
module.exports = { meta, start, view, act, waiting, bot, auto, step, best, handName, eval5, cmp };
