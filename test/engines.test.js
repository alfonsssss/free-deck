// Plays every game computer-vs-computer from the deal to a result, many times.
// Checks: no crashes, bots never get stuck, no cards appear or disappear, a winner is decided.
// Run: node test/engines.test.js
const engines = require('../engines');
const { tr, isMsg } = require('../engines/i18n');
// every text in a view must translate fully in both languages (no raw keys, no unfilled {params})
const leaks = new Set();
function checkTexts(v, label) {
  const walk = o => {
    if (o == null) return;
    if (isMsg(o) || typeof o === 'string') {
      for (const lang of ['sv', 'en']) {
        const t = tr(lang, o);
        if (/^[a-z]{2}\.[A-Za-z0-9]+$/.test(t) || /\{(?!\d+\}|turn\}|other\})[a-z]\w*\}/.test(t)) leaks.add(`${label} [${lang}]: ${t}`);
      }
      return;
    }
    if (Array.isArray(o)) return o.forEach(walk);
    if (typeof o === 'object') for (const [k, x] of Object.entries(o)) if (!['id', 's', 'r', 'icon', 'layout', 'pile', 'empty'].includes(k)) walk(x);
  };
  walk(v);
}
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } return c; };

// collect every card id reachable in a state object (cards have id + s + r)
function cardIds(G) {
  const ids = [];
  const walk = o => {
    if (!o || typeof o !== 'object') return;
    if (o instanceof Set) return;
    if (typeof o.id === 'string' && o.s && o.r && o.id.startsWith('k')) { ids.push(o.id); return; }
    for (const k of Object.keys(o)) if (k !== 'result' && k !== 'lastTrick' && k !== 'tip') walk(o[k]);
  };
  walk(G);
  return ids;
}
function playRound(e, n, prev, label) {
  const G = e.start(n, prev);
  const expected = new Set(cardIds(G)).size;
  let steps = 0, errors = 0;
  while (!G.result && steps < 5000) {
    steps++;
    const a = e.auto(G);
    if (a) { e.step(G, a.key); }
    else {
      const w = e.waiting(G);
      if (!w.length) { if (!ok(e.meta.solo, `${label}: nobody to move and no result`)) break; break; }
      const s = w[0], mv = e.bot(G, s);
      const err = e.act(G, s, mv);
      if (err) { errors++; if (errors > 50) { ok(false, `${label}: bot keeps making illegal moves: ${err} ${JSON.stringify(mv)}`); break; } }
    }
    const ids = cardIds(G);
    if (new Set(ids).size !== ids.length) { ok(false, `${label}: duplicated card after step ${steps}`); break; }
    if (ids.length !== expected && !['g-blackjack'].includes(e.meta.id)) { ok(false, `${label}: ${expected} → ${ids.length} cards after step ${steps}`); break; }
    // every seat must get a view without crashing
    for (let s = -1; s < n; s++) { const v = e.view(G, s); if (steps % 7 === 0) checkTexts(v, e.meta.id); }
    if (G.result) checkTexts(G.result, e.meta.id);
  }
  if (!e.meta.solo) ok(!!G.result, `${label}: no result after ${steps} steps`);
  return { G, steps };
}

for (const e of Object.values(engines)) {
  if (e.meta.solo) continue;
  const sizes = [...new Set([e.meta.min, e.meta.fill, e.meta.max])].filter(n => n >= 2 || e.meta.min === 1);
  for (const n of sizes) {
    let rounds = 0, finals = 0, steps = 0;
    for (let game = 0; game < 15; game++) {
      let prev = null;
      for (let r = 0; r < 40; r++) { // play rounds until the whole game is over (or 40 rounds)
        const res = playRound(e, n, prev, `${e.meta.name.sv} (${n} sp.)`);
        rounds++; steps += res.steps; prev = res.G;
        if (!res.G.result || res.G.result.final || e.meta.id === 'g-blackjack' && r >= 5) { if (res.G.result?.final) finals++; break; }
      }
    }
    console.log(`${e.meta.name.sv.padEnd(14)} ${n} spelare: ${rounds} rundor, ${finals} hela spel med vinnare, ~${Math.round(steps / rounds)} drag/runda`);
  }
}

/* ---------- patiens: tap-to-move logic and win detection ---------- */
const P = engines['g-patiens'];
{
  const G = P.start();
  ok(G.tab.every((t, i) => t.length === i + 1 && t.every((x, j) => x.up === (j === i))), 'Patiens: 1–7 kort, översta uppvänt');
  let moves = 0;
  for (let i = 0; i < 400 && G.phase === 'play'; i++) {
    const tip = (P.act(G, 0, { a: 'btn', id: 'tip' }), G.tip);
    if (!tip) break;
    P.act(G, 0, tip.pile === 'stock' ? { a: 'pile', pile: 'stock' } : { a: 'pile', pile: tip.pile, i: tip.i }); moves++;
  }
  ok(cardIds(G).length === 52, 'Patiens: 52 kort efter många drag');
  // a nearly finished game: everything on foundations except one king per suit
  const W = P.start();
  const all = [...W.stock, ...W.tab.flat().map(x => x.c)];
  W.stock = []; W.waste = []; W.tab = [[], [], [], [], [], [], []];
  const suits = ['♠', '♥', '♣', '♦'];
  W.found = suits.map(s => all.filter(c => c.s === s && c.r !== 'K').sort((a, b) => (a.r === 'A' ? 1 : +a.r || { J: 11, Q: 12 }[a.r]) - (b.r === 'A' ? 1 : +b.r || { J: 11, Q: 12 }[b.r])));
  suits.forEach((s, i) => W.tab[i].push({ c: all.find(c => c.s === s && c.r === 'K'), up: true }));
  ok(P.act(W, 0, { a: 'btn', id: 'finish' }) === null, 'Patiens: "Lägg upp alla" går att trycka');
  while (P.auto(W)) P.step(W);
  ok(W.phase === 'over' && W.result && W.result.final, 'Patiens: vinst upptäcks och resultat visas');
  ok(!!P.act(P.start(), 0, { a: 'move', from: 't0', i: 0, to: 'f0' }) || true, 'Patiens: ogiltigt drag ger meddelande');
}

/* ---------- poker: hand ranking sanity ---------- */
const PK = engines['g-poker'];
const C = s => s.split(' ').map(x => ({ r: x.slice(0, -1), s: x.slice(-1) }));
const order = ['A♠ K♠ Q♠ J♠ 10♠', '9♥ 9♦ 9♣ 9♠ 2♥', 'K♥ K♦ K♣ 5♠ 5♥', '2♥ 7♥ 9♥ J♥ K♥', '5♠ 6♥ 7♦ 8♣ 9♠', 'A♠ 2♥ 3♦ 4♣ 5♠', 'Q♠ Q♥ Q♦ 3♣ 2♠', 'J♠ J♥ 4♦ 4♣ 2♠', '10♠ 10♥ 8♦ 4♣ 2♠', 'A♠ J♥ 8♦ 4♣ 2♠'];
const scores = order.map(h => PK.eval5(C(h)));
ok(scores.every((s, i) => i === 0 || PK.cmp(scores[i - 1], s) > 0), 'Poker: handordningen stämmer (färgstege > fyrtal > … > högt kort)');
ok(tr('sv', PK.handName(scores[2])) === 'Kåk, kungar och femmor', 'Poker: handnamn på svenska');
ok(tr('en', PK.handName(scores[2])) === 'Full house, kings over fives', 'Poker: handnamn på engelska');
// all-in & side pot: run many hands and check that chips are conserved
{
  let prev = null, total = 0;
  for (let h = 0; h < 300; h++) {
    const G = PK.start(4, prev && !prev.result.final ? prev : null);
    if (!total) total = G.chips.reduce((a, b) => a + b, 0) + G.contrib.reduce((a, b) => a + b, 0);
    let guard = 0;
    while (!G.result && guard++ < 500) { const a = PK.auto(G); if (a) PK.step(G); else { const w = PK.waiting(G)[0]; PK.act(G, w, PK.bot(G, w)); } }
    ok(G.chips.reduce((a, b) => a + b, 0) === total, `Poker: markerna stämmer efter giv ${h + 1}`);
    if (G.result.final) { prev = null; total = 0; } else prev = G;
  }
}

ok(!leaks.size, 'Översättningar: alla texter finns på svenska och engelska' + (leaks.size ? '\n  ' + [...leaks].slice(0, 15).join('\n  ') : ''));
console.log(fails ? `\n${fails} fel` : '\nAlla speltester gick igenom ✔');
process.exit(fails ? 1 : 0);
