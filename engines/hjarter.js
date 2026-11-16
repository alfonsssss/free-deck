// Hjärter / Hearts – exactly 4 players. Avoid hearts (1 p each) and the queen of spades (13 p).
const { makeDeck, pub, rv, sortHand, takeCard } = require('./common');
const { M, add, seat, card } = require('./i18n');
const END_AT = 100;

const meta = { id: 'g-hjarter', emoji: '♥️', min: 4, max: 4, fill: 4, kids: false,
  name: { sv: 'Hjärter', en: 'Hearts' },
  desc: { sv: 'Stickspel för fyra. Undvik hjärter och spader dam!', en: 'A trick-taking game for four. Avoid hearts and the queen of spades!' },
  rules: {
    sv: 'Mål: få så FÅ poäng som möjligt.\n\n• Den som har klöver 2 börjar.\n• Lägg ett kort i samma färg som det första kortet i sticket om du kan. Annars får du lägga vad du vill.\n• Högst kort i den färg som spelades ut vinner sticket och börjar nästa.\n• Varje hjärter = 1 poäng. Spader dam = 13 poäng.\n• Hjärter får inte spelas ut förrän någon har lagt hjärter.\n• Tar du ALLA poängkort ("skjuta månen") får de andra 26 poäng var!\n• När någon når 100 poäng vinner den med lägst poäng.',
    en: 'Goal: get as FEW points as possible.\n\n• The player with the 2 of clubs starts.\n• Follow the suit of the first card in the trick if you can. Otherwise play anything.\n• The highest card in the suit that was led wins the trick and leads the next one.\n• Each heart = 1 point. Queen of spades = 13 points.\n• Hearts can\'t be led until someone has played a heart.\n• Take ALL the point cards ("shoot the moon") and everyone else gets 26 points!\n• When someone reaches 100 points, the lowest score wins.' } };
add({
  sv: { 'hj.first2c': 'Första sticket måste börja med klöver 2.', 'hj.noLeadHearts': 'Hjärter får inte spelas ut förrän någon har lagt hjärter.', 'hj.follow': 'Du måste följa färg och lägga {s} när du har det.',
    'hj.noPoints': 'I första sticket får man inte lägga poängkort.', 'hj.collecting': 'Vänta – sticket samlas in.', 'hj.played': '{a} lade {c}', 'hj.took': '{a} tog sticket.', 'hj.tookPts': '{a} tog sticket (+{n} poäng).',
    'hj.winLow': '🏆 {a} vann med lägst poäng!', 'hj.moon': '🌙 {a} sköt månen!', 'hj.line': '+{n} denna runda · totalt {t}', 'hj.note': 'Spelet slutar när någon når 100 poäng.',
    'hj.hintCollect': 'Sticket samlas in…', 'hj.hint2c': 'Du börjar – lägg klöver 2.', 'hj.hintFollow': 'Lägg ett kort i {s}.', 'hj.hintVoid': 'Du har ingen {s} – lägg vilket kort du vill.', 'hj.hintLead': 'Du börjar sticket – välj ett kort.',
    'hj.ptsRound': '🫳 {n} p i rundan' },
  en: { 'hj.first2c': 'The first trick must start with the 2 of clubs.', 'hj.noLeadHearts': 'Hearts can\'t be led until someone has played a heart.', 'hj.follow': 'You must follow suit and play {s} when you have it.',
    'hj.noPoints': 'You can\'t play point cards in the first trick.', 'hj.collecting': 'Wait – the trick is being collected.', 'hj.played': '{a} played the {c}', 'hj.took': '{a} took the trick.', 'hj.tookPts': '{a} took the trick (+{n} points).',
    'hj.winLow': '🏆 {a} won with the lowest score!', 'hj.moon': '🌙 {a} shot the moon!', 'hj.line': '+{n} this round · total {t}', 'hj.note': 'The game ends when someone reaches 100 points.',
    'hj.hintCollect': 'Collecting the trick…', 'hj.hint2c': 'You start – play the 2 of clubs.', 'hj.hintFollow': 'Play a card in {s}.', 'hj.hintVoid': 'You have no {s} – play any card.', 'hj.hintLead': 'You lead the trick – choose a card.',
    'hj.ptsRound': '🫳 {n} pts this round' },
});

const isQS = c => c.s === '♠' && c.r === 'Q';
const pts = c => (c.s === '♥' ? 1 : isQS(c) ? 13 : 0);

function start(n, prev) {
  const deck = makeDeck();
  const hands = [0, 1, 2, 3].map(() => deck.splice(0, 13));
  const lead = hands.findIndex(h => h.some(c => c.s === '♣' && c.r === '2'));
  const total = prev && prev.total && !prev.result?.final ? prev.total : [0, 0, 0, 0];
  return { n: 4, hands, trick: [], turn: lead, leader: lead, broken: false, first: true, taken: [[], [], [], []], total,
    phase: 'play', msg: '', result: null };
}
const waiting = G => (G.phase === 'play' ? [G.turn] : []);
const leadSuit = G => (G.trick.length ? G.trick[0].card.s : null);

// why a card can't be played, or null if it is fine
function whyNot(G, s, c) {
  const hand = G.hands[s], ls = leadSuit(G);
  if (!ls) {
    if (G.first && !(c.s === '♣' && c.r === '2')) return M('hj.first2c');
    if (c.s === '♥' && !G.broken && hand.some(k => k.s !== '♥')) return M('hj.noLeadHearts');
    return null;
  }
  if (c.s !== ls && hand.some(k => k.s === ls)) return M('hj.follow', { s: M('suitSym', { s: ls }) });
  if (G.first && pts(c) && hand.some(k => !pts(k) && (k.s === ls || !hand.some(x => x.s === ls)))) return M('hj.noPoints');
  return null;
}
function act(G, s, m) {
  if (G.phase !== 'play') return G.phase === 'trick' ? M('hj.collecting') : null;
  if (s !== G.turn) return M('waitTurn');
  if (!(m.a === 'card' || m.a === 'drop')) return null;
  const c = G.hands[s].find(k => k.id === m.id); if (!c) return null;
  const why = whyNot(G, s, c); if (why) return why;
  takeCard(G.hands[s], c.id);
  G.trick.push({ seat: s, card: c });
  if (c.s === '♥') G.broken = true;
  G.msg = M('hj.played', { a: seat(s), c: card(c) });
  if (G.trick.length === 4) G.phase = 'trick'; else G.turn = (G.turn + 1) % 4;
  return null;
}
function auto(G) { return G.phase === 'trick' ? { ms: 1700, key: 'trick' } : null; }
function step(G) {
  const ls = leadSuit(G);
  const win = G.trick.filter(t => t.card.s === ls).sort((a, b) => rv(b.card.r) - rv(a.card.r))[0].seat;
  const p = G.trick.reduce((t, x) => t + pts(x.card), 0);
  G.taken[win].push(...G.trick.map(t => t.card));
  G.msg = p ? M('hj.tookPts', { a: seat(win), n: p }) : M('hj.took', { a: seat(win) });
  G.trick = []; G.first = false; G.turn = G.leader = win; G.phase = 'play';
  if (G.hands.every(h => !h.length)) score(G);
}
function score(G) {
  const round = G.taken.map(t => t.reduce((a, c) => a + pts(c), 0));
  const moon = round.findIndex(p => p === 26);
  const addPts = moon >= 0 ? round.map((_, s) => (s === moon ? 0 : 26)) : round;
  addPts.forEach((p, s) => (G.total[s] += p));
  G.phase = 'over';
  const final = G.total.some(t => t >= END_AT);
  const low = Math.min(...G.total);
  G.result = { final, title: final ? M('hj.winLow', { a: seat(G.total.indexOf(low)) }) : moon >= 0 ? M('hj.moon', { a: seat(moon) }) : M('roundOver'),
    lines: G.total.map((t, s) => ({ seat: s, win: final ? t === low : addPts[s] === Math.min(...addPts), text: M('hj.line', { n: addPts[s], t }) })),
    note: final ? '' : M('hj.note') };
}
function view(G, s) {
  const mine = s === G.turn && G.phase === 'play';
  const ls = leadSuit(G);
  const hint = G.phase === 'over' ? M('roundOver') : G.phase === 'trick' ? M('hj.hintCollect') : !mine ? M('waitFor') :
    G.first && !ls ? M('hj.hint2c') : ls ? (G.hands[s].some(k => k.s === ls) ? M('hj.hintFollow', { s: M('suitSym', { s: ls }) }) : M('hj.hintVoid', { s: M('suit', { s: ls }) })) : M('hj.hintLead');
  return {
    turn: G.phase === 'play' ? G.turn : null, hint, msg: G.msg,
    seats: G.hands.map((h, i) => { const p = G.taken[i].reduce((a, c) => a + pts(c), 0); return { cards: h.length, score: G.total[i], label: p ? M('hj.ptsRound', { n: p }) : '' }; }),
    center: [{ id: 'trick', layout: 'trick', row: 0, drop: mine, cards: G.trick.map(t => ({ c: pub(t.card), seat: t.seat })) }],
    hand: s >= 0 ? sortHand(G.hands[s]).map(c => ({ ...pub(c), ok: !mine || !whyNot(G, s, c) })) : null,
    handTap: mine, buttons: [],
  };
}
function bot(G, s) {
  const hand = G.hands[s], ok = hand.filter(c => !whyNot(G, s, c)), ls = leadSuit(G);
  const low = a => a.slice().sort((x, y) => rv(x.r) - rv(y.r));
  if (!ls) { const safe = ok.filter(c => c.s !== '♥' && !isQS(c)); return { a: 'card', id: low(safe.length ? safe : ok)[0].id }; }
  const follow = ok.filter(c => c.s === ls);
  if (follow.length) {
    const best = Math.max(...G.trick.filter(t => t.card.s === ls).map(t => rv(t.card.r)));
    const under = follow.filter(c => rv(c.r) < best);
    const choice = under.length ? low(under).pop() : (G.trick.length === 3 && !G.trick.some(t => pts(t.card)) ? low(follow).pop() : low(follow)[0]);
    return { a: 'card', id: choice.id };
  }
  const qs = ok.find(isQS); if (qs) return { a: 'card', id: qs.id };
  const hearts = ok.filter(c => c.s === '♥'); if (hearts.length) return { a: 'card', id: low(hearts).pop().id };
  return { a: 'card', id: low(ok).pop().id };
}
module.exports = { meta, start, view, act, waiting, bot, auto, step };
