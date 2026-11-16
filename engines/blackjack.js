// Blackjack – 1–5 players against the dealer (the house). Chips carry over between rounds.
const { makeDeck, pub } = require('./common');
const { M, add, seat } = require('./i18n');
const START = 500, BETS = [10, 25, 50, 100];

const meta = { id: 'g-blackjack', emoji: '🂡', min: 1, max: 5, fill: 1, kids: false,
  name: { sv: 'Blackjack', en: 'Blackjack' },
  desc: { sv: '21 mot dealern. Satsa, ta kort eller stå – dealern spelar själv.', en: '21 against the dealer. Bet, hit or stand – the dealer plays automatically.' },
  rules: {
    sv: 'Mål: få närmare 21 än dealern – utan att gå över.\n\n1. Välj hur mycket du vill satsa.\n2. Du får 2 kort. Dealern visar ett kort.\n3. "Ta kort" ger dig ett kort till. "Stå" betyder att du är nöjd.\n4. "Dubbla": dubbla insatsen och få exakt ett kort till.\n5. Dealern drar tills hen har minst 17.\n\nKlädda kort = 10. Ess = 1 eller 11. Över 21 = tjock 💥\nBlackjack (21 på två kort) ger 1,5 gånger insatsen.\nMarkerna är bara på låtsas.',
    en: 'Goal: get closer to 21 than the dealer – without going over.\n\n1. Choose how much to bet.\n2. You get 2 cards. The dealer shows one card.\n3. "Hit" gives you another card. "Stand" means you are happy.\n4. "Double": double your bet and get exactly one more card.\n5. The dealer draws until reaching at least 17.\n\nFace cards = 10. Aces = 1 or 11. Over 21 = bust 💥\nBlackjack (21 with two cards) pays 1.5 times the bet.\nThe chips are just for fun.' } };
add({
  sv: { 'bj.newChips': '{a} fick {n} nya marker', 'bj.chooseBet': 'Välj hur mycket du vill satsa.', 'bj.reveal': 'Dealern vänder sitt kort…', 'bj.bj': 'Blackjack! 🎉', 'bj.dealerBJ': 'Dealern har blackjack!',
    'bj.betDone': 'Du har redan satsat – väntar på de andra.', 'bj.onlyChips': 'Du har bara {n} marker.', 'bj.doubleTwo': 'Du kan bara dubbla på dina två första kort.', 'bj.doubleChips': 'Du har inte tillräckligt med marker för att dubbla.',
    'bj.bust': 'Tjock {v} 💥', 'bj.stands': 'Står på {v}', 'bj.took': '{a} tog ett kort', 'bj.tookDouble': '{a} tog ett kort och dubblade', 'bj.standMsg': '{a} står på {v}', 'bj.draws': 'Dealern drar… {v}',
    'bj.rBust': 'Tjock ({v}) – förlorade {b}', 'bj.rBJ': 'Blackjack! Vann {w}', 'bj.rDealerBJ': 'Dealern hade blackjack – förlorade {b}', 'bj.rWin': 'Vann {b} ({v} mot {d})', 'bj.rWinBust': 'Vann {b} ({v} – dealern blev tjock)',
    'bj.rPush': 'Lika ({v}) – fick tillbaka {b}', 'bj.rLose': 'Förlorade {b} ({v} mot {d})', 'bj.has': '{t} · har {n}', 'bj.tDealerBust': 'Dealern blev tjock! 🎉', 'bj.tDealer': 'Dealern fick {d}',
    'bj.bet': 'Satsa {n}', 'bj.hit': 'Ta kort', 'bj.stand': 'Stå', 'bj.double': 'Dubbla', 'bj.hBet': 'Hur mycket vill du satsa? Du har {n} marker.', 'bj.hWaitBets': 'Väntar på att alla ska satsa…',
    'bj.hTurn': 'Du har {v}. Vill du ta ett kort till eller stå?', 'bj.hDealer': 'Dealern spelar…', 'bj.betOk': '✅ Satsat', 'bj.betting': 'Satsar…', 'bj.dealer': 'Dealer', 'bj.dealerV': 'Dealer · {v}', 'bj.dealerV2': 'Dealer · {v} + ?',
    'bj.yourCards': 'Dina kort · {v}' },
  en: { 'bj.newChips': '{a} got {n} new chips', 'bj.chooseBet': 'Choose how much to bet.', 'bj.reveal': 'The dealer turns over the hidden card…', 'bj.bj': 'Blackjack! 🎉', 'bj.dealerBJ': 'The dealer has blackjack!',
    'bj.betDone': 'You have already bet – waiting for the others.', 'bj.onlyChips': 'You only have {n} chips.', 'bj.doubleTwo': 'You can only double on your first two cards.', 'bj.doubleChips': 'You don\'t have enough chips to double.',
    'bj.bust': 'Bust {v} 💥', 'bj.stands': 'Stands on {v}', 'bj.took': '{a} took a card', 'bj.tookDouble': '{a} took a card and doubled', 'bj.standMsg': '{a} stands on {v}', 'bj.draws': 'The dealer draws… {v}',
    'bj.rBust': 'Bust ({v}) – lost {b}', 'bj.rBJ': 'Blackjack! Won {w}', 'bj.rDealerBJ': 'The dealer had blackjack – lost {b}', 'bj.rWin': 'Won {b} ({v} vs {d})', 'bj.rWinBust': 'Won {b} ({v} – the dealer went bust)',
    'bj.rPush': 'Push ({v}) – got {b} back', 'bj.rLose': 'Lost {b} ({v} vs {d})', 'bj.has': '{t} · has {n}', 'bj.tDealerBust': 'The dealer went bust! 🎉', 'bj.tDealer': 'The dealer got {d}',
    'bj.bet': 'Bet {n}', 'bj.hit': 'Hit', 'bj.stand': 'Stand', 'bj.double': 'Double', 'bj.hBet': 'How much do you want to bet? You have {n} chips.', 'bj.hWaitBets': 'Waiting for everyone to bet…',
    'bj.hTurn': 'You have {v}. Take another card or stand?', 'bj.hDealer': 'The dealer is playing…', 'bj.betOk': '✅ Bet placed', 'bj.betting': 'Betting…', 'bj.dealer': 'Dealer', 'bj.dealerV': 'Dealer · {v}', 'bj.dealerV2': 'Dealer · {v} + ?',
    'bj.yourCards': 'Your cards · {v}' },
});

function value(cards) {
  let t = 0, a = 0;
  for (const c of cards) { if (c.r === 'A') { t += 1; a++; } else t += ['J', 'Q', 'K'].includes(c.r) ? 10 : +c.r; }
  const soft = a && t + 10 <= 21;
  return { t: soft ? t + 10 : t, soft };
}
const isBJ = cards => cards.length === 2 && value(cards).t === 21;

function start(n, prev) {
  const chips = prev && prev.chips && prev.chips.length === n ? prev.chips.slice() : Array(n).fill(START);
  const note = [];
  chips.forEach((c, s) => { if (c < BETS[0]) { chips[s] = START; note.push(M('bj.newChips', { a: seat(s), n: START })); } });
  return { n, chips, bets: Array(n).fill(0), hands: Array.from({ length: n }, () => []), done: Array(n).fill(false), status: Array(n).fill(''),
    dealer: [], hole: true, deck: makeDeck(2), phase: 'bet', turn: null, msg: note.length ? note : M('bj.chooseBet'), result: null, lastBet: prev?.lastBet || Array(n).fill(25) };
}
const draw = G => { if (!G.deck.length) G.deck = makeDeck(2); return G.deck.pop(); };
function waiting(G) {
  if (G.phase === 'bet') return G.bets.map((b, s) => (b ? -1 : s)).filter(s => s >= 0);
  if (G.phase === 'play' && G.turn != null) return [G.turn];
  return [];
}
function nextTurn(G) {
  const s = G.done.findIndex(d => !d);
  G.turn = s < 0 ? null : s;
  if (s < 0) { G.phase = 'dealer'; G.hole = false; G.msg = M('bj.reveal'); }
}
function deal(G) {
  for (let s = 0; s < G.n; s++) G.hands[s] = [draw(G)];
  G.dealer = [draw(G)];
  for (let s = 0; s < G.n; s++) G.hands[s].push(draw(G));
  G.dealer.push(draw(G));
  G.phase = 'play'; G.hole = true;
  for (let s = 0; s < G.n; s++) if (isBJ(G.hands[s])) { G.done[s] = true; G.status[s] = M('bj.bj'); }
  if (isBJ(G.dealer)) { G.done.fill(true); G.msg = M('bj.dealerBJ'); }
  else G.msg = '';
  nextTurn(G);
}
function act(G, s, m) {
  if (m.a !== 'btn') return null;
  if (G.phase === 'bet') {
    if (G.bets[s]) return M('bj.betDone');
    const amt = +String(m.id).replace('bet', '');
    if (!BETS.includes(amt)) return null;
    if (amt > G.chips[s]) return M('bj.onlyChips', { n: G.chips[s] });
    G.bets[s] = amt; G.chips[s] -= amt; G.lastBet[s] = amt;
    if (G.bets.every(b => b)) deal(G);
    return null;
  }
  if (G.phase !== 'play') return M('waitMoment');
  if (s !== G.turn) return M('waitTurn');
  const h = G.hands[s];
  if (m.id === 'hit' || m.id === 'double') {
    if (m.id === 'double') {
      if (h.length !== 2) return M('bj.doubleTwo');
      if (G.chips[s] < G.bets[s]) return M('bj.doubleChips');
      G.chips[s] -= G.bets[s]; G.bets[s] *= 2;
    }
    h.push(draw(G));
    const v = value(h).t;
    if (v > 21) { G.done[s] = true; G.status[s] = M('bj.bust', { v }); }
    else if (v === 21 || m.id === 'double') { G.done[s] = true; G.status[s] = M('bj.stands', { v }); }
    G.msg = M(m.id === 'double' ? 'bj.tookDouble' : 'bj.took', { a: seat(s) });
  } else if (m.id === 'stand') { const v = value(h).t; G.done[s] = true; G.status[s] = M('bj.stands', { v }); G.msg = M('bj.standMsg', { a: seat(s), v }); }
  else return null;
  if (G.done[s]) nextTurn(G);
  return null;
}
function auto(G) {
  if (G.phase !== 'dealer') return null;
  const allBust = G.hands.every(h => value(h).t > 21);
  return { ms: 900, key: !allBust && value(G.dealer).t < 17 ? 'draw' : 'settle' };
}
function step(G, key) {
  if (key === 'draw') { G.dealer.push(draw(G)); G.msg = M('bj.draws', { v: value(G.dealer).t }); return; }
  const d = value(G.dealer).t, dBJ = isBJ(G.dealer);
  const lines = G.hands.map((h, s) => {
    const v = value(h).t, b = G.bets[s];
    let win = 0, text;
    if (v > 21) text = M('bj.rBust', { v, b });
    else if (isBJ(h) && !dBJ) { win = Math.floor(b * 2.5); text = M('bj.rBJ', { w: win - b }); }
    else if (dBJ && !isBJ(h)) text = M('bj.rDealerBJ', { b });
    else if (d > 21) { win = b * 2; text = M('bj.rWinBust', { b, v }); }
    else if (v > d) { win = b * 2; text = M('bj.rWin', { b, v, d }); }
    else if (v === d) { win = b; text = M('bj.rPush', { v, b }); }
    else text = M('bj.rLose', { b, v, d });
    G.chips[s] += win;
    return { seat: s, win: win > b, text: M('bj.has', { t: text, n: G.chips[s] }) };
  });
  G.phase = 'over';
  G.result = { final: false, title: d > 21 ? M('bj.tDealerBust') : M('bj.tDealer', { d }), lines };
}
function view(G, s) {
  const me = s >= 0 ? s : -1, myTurn = G.phase === 'play' && s === G.turn;
  const buttons = [];
  if (G.phase === 'bet' && me >= 0 && !G.bets[me]) {
    BETS.filter(b => b <= G.chips[me]).forEach(b => buttons.push({ id: 'bet' + b, label: M('bj.bet', { n: b }), icon: 'coins', primary: b === G.lastBet[me] }));
  }
  if (myTurn) {
    buttons.push({ id: 'hit', label: M('bj.hit'), icon: 'plus', primary: value(G.hands[me]).t < 17 });
    buttons.push({ id: 'stand', label: M('bj.stand'), icon: 'hand', primary: value(G.hands[me]).t >= 17 });
    if (G.hands[me].length === 2 && G.chips[me] >= G.bets[me]) buttons.push({ id: 'double', label: M('bj.double'), icon: 'double' });
  }
  const dv = value(G.hole ? G.dealer.slice(0, 1) : G.dealer).t;
  let hint;
  if (G.phase === 'bet') hint = me >= 0 && !G.bets[me] ? M('bj.hBet', { n: G.chips[me] }) : M('bj.hWaitBets');
  else if (myTurn) hint = M('bj.hTurn', { v: value(G.hands[me]).t });
  else if (G.phase === 'play') hint = M('waitFor');
  else hint = G.phase === 'dealer' ? M('bj.hDealer') : M('roundOver');
  return {
    turn: G.phase === 'play' ? G.turn : null, hint, msg: G.msg,
    seats: G.hands.map((h, i) => ({ chips: G.chips[i], bet: G.bets[i], shown: h.map(pub),
      label: G.status[i] || (h.length ? String(value(h).t) : G.phase === 'bet' ? (G.bets[i] ? M('bj.betOk') : M('bj.betting')) : '') })),
    center: [{ id: 'dealer', label: G.dealer.length ? M(G.hole ? 'bj.dealerV2' : 'bj.dealerV', { v: dv }) : M('bj.dealer'), layout: 'fan', row: 0,
      cards: G.dealer.map((c, i) => ({ c: G.hole && i === 1 ? null : pub(c) })) }],
    hand: me >= 0 && G.hands[me].length ? G.hands[me].map(c => ({ ...pub(c), ok: true })) : null,
    handLabel: me >= 0 && G.hands[me].length ? M('bj.yourCards', { v: value(G.hands[me]).t }) : '',
    handTap: false, buttons,
  };
}
function bot(G, s) {
  if (G.phase === 'bet') { const b = BETS.filter(x => x <= G.chips[s]); return { a: 'btn', id: 'bet' + (b.includes(G.lastBet[s]) ? G.lastBet[s] : b[Math.min(1, b.length - 1)]) }; }
  const v = value(G.hands[s]), up = value(G.dealer.slice(0, 1)).t;
  if (G.hands[s].length === 2 && (v.t === 10 || v.t === 11) && up < 10 && G.chips[s] >= G.bets[s]) return { a: 'btn', id: 'double' };
  const hit = v.t <= 11 || (v.soft && v.t <= 17) || (v.t <= 16 && up >= 7);
  return { a: 'btn', id: hit ? 'hit' : 'stand' };
}
const idle = G => (G.phase === 'bet' ? 10000 : 0); // with others at the table: your last bet is placed for you after 10 s
module.exports = { meta, start, view, act, waiting, bot, auto, step, value, idle };
