// Patiens (Klondike) – one table that everyone in the room can play together.
// Tap a card and it moves to the best place it fits; tap the deck for a new card.
const { makeDeck, pub, rv } = require('./common');
const { M, add } = require('./i18n');

const meta = { id: 'g-patiens', emoji: '🧩', min: 1, max: 4, fill: 1, kids: true, solo: true,
  name: { sv: 'Patiens', en: 'Solitaire' },
  desc: { sv: 'Klassisk patiens. Tryck på ett kort så hamnar det rätt.', en: 'Classic solitaire. Tap a card and it moves to the right place.' },
  rules: {
    sv: 'Mål: lägg alla kort i de fyra högarna uppe till höger – ess först, sedan 2, 3 … upp till kung, en hög per färg.\n\n• Tryck på ett kort så flyttas det automatiskt dit det passar.\n• I kolumnerna läggs korten i fallande ordning med växlande färg: röd 7 på svart 8.\n• Bara en kung får läggas i en tom kolumn.\n• Tryck på leken uppe till vänster för att vända upp ett nytt kort.\n• Fastnat? Tryck "Tips".\n\nNi kan spela tillsammans – alla i rummet kan flytta kort.',
    en: 'Goal: move all cards to the four piles at the top right – ace first, then 2, 3 … up to king, one pile per suit.\n\n• Tap a card and it moves automatically to where it fits.\n• In the columns, cards go in descending order with alternating colours: red 7 on black 8.\n• Only a king can go into an empty column.\n• Tap the deck at the top left to turn over a new card.\n• Stuck? Press "Hint".\n\nYou can play together – everyone in the room can move cards.' } };
add({
  sv: { 'pa.won': '🎉 Patiensen gick ut!', 'pa.moves': 'Klarad på {n} drag', 'pa.new': 'Ny giv!', 'pa.tipStock': '💡 Tryck på leken för ett nytt kort.', 'pa.tipCard': '💡 Det blinkande kortet kan flyttas.',
    'pa.noMoves': 'Inga fler drag – tryck "Ny giv" för att börja om.', 'pa.faceUpFirst': 'Alla kort måste vara uppvända först.', 'pa.recycled': 'Leken vändes – en runda till!', 'pa.empty': 'Leken är tom.',
    'pa.hidden': 'Det kortet ligger dolt under andra kort.', 'pa.noFit': 'Det kortet passar inte någonstans just nu.', 'pa.badFound': 'Där ska korten ligga i färg från ess och uppåt.',
    'pa.badTab': 'Där passar inte kortet. Lägg i fallande ordning med växlande färg – och bara kung i tom kolumn.', 'pa.tip': 'Tips', 'pa.restart': 'Ny giv', 'pa.finish': 'Lägg upp alla', 'pa.grats': 'Grattis!',
    'pa.hint': 'Tryck på ett kort så flyttas det dit det passar. Tryck på leken för ett nytt kort.' },
  en: { 'pa.won': '🎉 You solved it!', 'pa.moves': 'Solved in {n} moves', 'pa.new': 'New deal!', 'pa.tipStock': '💡 Tap the deck for a new card.', 'pa.tipCard': '💡 The blinking card can be moved.',
    'pa.noMoves': 'No more moves – press "New deal" to start over.', 'pa.faceUpFirst': 'All cards must be face up first.', 'pa.recycled': 'The deck was turned over – one more round!', 'pa.empty': 'The deck is empty.',
    'pa.hidden': 'That card is hidden under other cards.', 'pa.noFit': 'That card doesn\'t fit anywhere right now.', 'pa.badFound': 'Cards go there by suit, from ace upwards.',
    'pa.badTab': 'The card doesn\'t fit there. Use descending order with alternating colours – and only a king in an empty column.', 'pa.tip': 'Hint', 'pa.restart': 'New deal', 'pa.finish': 'Finish', 'pa.grats': 'Congratulations!',
    'pa.hint': 'Tap a card and it moves to where it fits. Tap the deck for a new card.' },
});

function start() {
  const deck = makeDeck();
  const tab = [];
  for (let i = 0; i < 7; i++) { tab.push(deck.splice(0, i + 1).map((c, j) => ({ c, up: j === i }))); }
  return { stock: deck, waste: [], found: [[], [], [], []], tab, moves: 0, phase: 'play', msg: '', tip: null, result: null, finishing: false };
}
const waiting = () => [];
const v = c => rv(c.r, true);
const topF = f => f[f.length - 1];
const canFound = (c, f) => (!f.length ? c.r === 'A' : topF(f).s === c.s && v(c) === v(topF(f)) + 1);
function canTab(c, t) { if (!t.length) return c.r === 'K'; const tp = t[t.length - 1]; return tp.up && tp.c.red !== c.red && v(tp.c) === v(c) + 1; }

// cards that would move if (pile, index) is picked up
function grab(G, pile, i) {
  if (pile === 'waste') return G.waste.length && i === G.waste.length - 1 ? [G.waste[i]] : null;
  if (pile[0] === 'f') { const f = G.found[+pile[1]]; return f.length && i === f.length - 1 ? [f[i]] : null; }
  if (pile[0] === 't') { const t = G.tab[+pile[1]]; if (!t[i] || !t[i].up) return null; return t.slice(i).map(x => x.c); }
  return null;
}
function fits(G, cards, to, from, i) {
  if (to[0] === 'f') return cards.length === 1 && canFound(cards[0], G.found[+to[1]]);
  if (to[0] === 't') { if (from === to) return false; if (from[0] === 't' && i === 0 && !G.tab[+to[1]].length) return false; return canTab(cards[0], G.tab[+to[1]]); }
  return false;
}
function bestTarget(G, pile, i) {
  const cards = grab(G, pile, i); if (!cards) return null;
  if (pile[0] !== 'f') for (let f = 0; f < 4; f++) if (fits(G, cards, 'f' + f, pile, i)) return 'f' + f;
  const tabs = [0, 1, 2, 3, 4, 5, 6].map(t => 't' + t);
  return tabs.find(t => G.tab[+t[1]].length && fits(G, cards, t, pile, i)) || tabs.find(t => fits(G, cards, t, pile, i)) || null;
}
function doMove(G, from, i, to) {
  let cards;
  if (from === 'waste') cards = [G.waste.pop()];
  else if (from[0] === 'f') cards = [G.found[+from[1]].pop()];
  else { const t = G.tab[+from[1]]; cards = t.splice(i).map(x => x.c); if (t.length && !t[t.length - 1].up) t[t.length - 1].up = true; }
  if (to[0] === 'f') G.found[+to[1]].push(cards[0]);
  else G.tab[+to[1]].push(...cards.map(c => ({ c, up: true })));
  G.moves++; G.tip = null; G.msg = '';
  if (G.found.every(f => f.length === 13)) {
    G.phase = 'over';
    G.result = { final: true, title: M('pa.won'), lines: [{ seat: -1, win: true, text: M('pa.moves', { n: G.moves }) }] };
  }
}
const canFinish = G => !G.stock.length && !G.waste.length && G.tab.every(t => t.every(x => x.up)) && G.phase === 'play';
function findTip(G) {
  const piles = ['waste', ...[0, 1, 2, 3, 4, 5, 6].map(t => 't' + t)];
  for (const p of piles) {
    const len = p === 'waste' ? G.waste.length : G.tab[+p[1]].length;
    for (let i = 0; i < len; i++) {
      if (!grab(G, p, i)) continue;
      const to = bestTarget(G, p, i);
      // moving a whole column onto another column is only useful if it reveals something
      if (to && !(to[0] === 't' && p[0] === 't' && i === 0)) return { pile: p, i };
    }
  }
  return G.stock.length || G.waste.length ? { pile: 'stock', i: -1 } : null;
}

function act(G, seat, m) {
  if (G.phase !== 'play') return null;
  if (m.a === 'btn' && m.id === 'restart') { Object.assign(G, start()); G.msg = M('pa.new'); return null; }
  if (m.a === 'btn' && m.id === 'tip') { G.tip = findTip(G); G.msg = G.tip ? M(G.tip.pile === 'stock' ? 'pa.tipStock' : 'pa.tipCard') : M('pa.noMoves'); return null; }
  if (m.a === 'btn' && m.id === 'finish') { if (!canFinish(G)) return M('pa.faceUpFirst'); G.finishing = true; return null; }
  if (m.a === 'pile' && m.pile === 'stock') {
    if (G.stock.length) G.waste.push(G.stock.pop());
    else if (G.waste.length) { G.stock = G.waste.reverse(); G.waste = []; G.msg = M('pa.recycled'); }
    else return M('pa.empty');
    G.moves++; G.tip = null; return null;
  }
  if (m.a === 'pile') {
    const { pile, i } = m;
    if (pile[0] === 't') { const t = G.tab[+pile[1]]; if (t[i] && !t[i].up) { if (i === t.length - 1) { t[i].up = true; return null; } return M('pa.hidden'); } }
    if (!grab(G, pile, i)) return null;
    const to = bestTarget(G, pile, i);
    if (!to) return M('pa.noFit');
    doMove(G, pile, i, to); return null;
  }
  if (m.a === 'move') {
    const cards = grab(G, m.from, m.i); if (!cards) return null;
    if (!fits(G, cards, m.to, m.from, m.i)) return M(m.to[0] === 'f' ? 'pa.badFound' : 'pa.badTab');
    doMove(G, m.from, m.i, m.to); return null;
  }
  return null;
}
function auto(G) { return G.finishing && G.phase === 'play' ? { ms: 120, key: 'finish' } : null; }
function step(G) {
  for (let t = 0; t < 7; t++) { const col = G.tab[t]; if (!col.length) continue; const to = bestTarget(G, 't' + t, col.length - 1); if (to && to[0] === 'f') return doMove(G, 't' + t, col.length - 1, to); }
  G.finishing = false;
}
function view(G) {
  const tipOn = (p, i) => !!G.tip && G.tip.pile === p && G.tip.i === i;
  const center = [
    { id: 'stock', layout: 'stack', row: 0, slot: 0, tap: true, empty: '↻', cards: G.stock.length ? [{ c: null, tip: tipOn('stock', -1) }] : [] },
    { id: 'waste', layout: 'fan', row: 0, slot: 1, cards: G.waste.slice(-3).map((c, k, a) => ({ c: pub(c), i: G.waste.length - a.length + k, tap: k === a.length - 1, drag: k === a.length - 1, tip: tipOn('waste', G.waste.length - 1) && k === a.length - 1 })) },
    ...G.found.map((f, k) => ({ id: 'f' + k, layout: 'stack', row: 0, slot: 3 + k, drop: true, empty: 'A', cards: f.length ? [{ c: pub(topF(f)), i: f.length - 1, tap: true, drag: true }] : [] })),
    ...G.tab.map((t, k) => ({ id: 't' + k, layout: 'col', row: 1, slot: k, drop: true, empty: 'K',
      cards: t.map((x, i) => ({ c: x.up ? pub(x.c) : null, i, tap: x.up || i === t.length - 1, tip: tipOn('t' + k, i), drag: x.up })) })),
  ];
  const buttons = [{ id: 'tip', label: M('pa.tip'), icon: 'bulb' }, { id: 'restart', label: M('pa.restart'), icon: 'restart' }];
  if (canFinish(G) && !G.finishing) buttons.unshift({ id: 'finish', label: M('pa.finish'), icon: 'sparkle', primary: true });
  return { turn: null, layout: 'solitaire', msg: G.msg, hint: G.phase === 'over' ? M('pa.grats') : M('pa.hint'),
    seats: [], center, hand: null, buttons, moves: G.moves };
}
module.exports = { meta, start, view, act, waiting, bot: () => null, auto, step };
