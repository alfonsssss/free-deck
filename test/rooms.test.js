// End-to-end over WebSocket against a running server (npm start).
// One person plays every game against the computer to a result; checks lobby, bots, names,
// friendly errors, play counting, disconnect takeover and the community flow.
// Run: node test/rooms.test.js   (server on localhost:5178)
const WebSocket = require('ws');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; return c; };
const URL = process.env.URL || 'ws://localhost:5178';

function client(pid, name, lang = 'sv') {
  const c = { v: null, lists: null, nopes: [], errors: [], open: false };
  c.connect = (room, want) => new Promise(res => {
    c.ws = new WebSocket(URL);
    c.ws.on('open', () => { c.ws.send(JSON.stringify(room ? { t: 'hello', room, pid, name, author: 'key-' + pid, want, lang } : { t: 'lobby', author: 'key-' + pid, lang })); res(); });
    c.ws.on('message', d => { const m = JSON.parse(d); if (m.t === 'eng') c.v = m.v; if (m.t === 'templates') c.lists = m; if (m.t === 'nope') c.nopes.push(m.msg); if (m.t === 'error') c.errors.push(m.msg); if (m.t === 'state') c.S = m.S; });
  });
  c.send = m => c.ws.send(JSON.stringify(m));
  c.close = () => c.ws.close();
  return c;
}
const key = (v, mv) => JSON.stringify([mv, v.msg, v.hint, v.pot, (v.hand || []).length, v.center.map(c => c.cards.length), v.seats.map(s => s && [s.cards, s.chips, s.bet, s.label])]);
async function until(fn, ms = 20000) { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await sleep(60); } return false; }

// a simple "human": always makes a legal-looking move using only what the view shows
function humanMove(v) {
  if (v.meta.id === 'g-patiens') return null;
  if (v.turn !== v.me && !(v.buttons || []).length) return null;
  const btn = id => (v.buttons || []).find(b => b.id === id);
  const prim = (v.buttons || []).find(b => b.primary) || (v.buttons || [])[0];
  if (v.meta.id === 'g-finnsisjon') {
    if (btn('fish')) return { a: 'btn', id: 'fish' };
    const ask = (v.buttons || []).find(b => b.id.startsWith('ask'));
    if (ask) return { a: 'btn', id: ask.id };
    if (v.handTap && v.hand && v.hand.length) return { a: 'card', id: v.hand[0].id };
    return null;
  }
  if (v.meta.id === 'g-rummy') {
    if (btn('stock')) return { a: 'btn', id: 'stock' };
    if (btn('discard')) return { a: 'btn', id: 'discard' };
    if (v.handTap && v.hand && v.hand.length) return { a: 'card', id: v.hand[v.hand.length - 1].id };
    return null;
  }
  if (v.handTap && v.hand) { const c = v.hand.find(h => h.ok); if (c) return { a: 'card', id: c.id }; }
  if (prim) return { a: 'btn', id: prim.id, amount: prim.raise ? prim.raise.min : undefined };
  return null;
}

(async () => {
  const games = ['g-vandatta', 'g-krig', 'g-hjarter', 'g-blackjack', 'g-poker', 'g-finnsisjon', 'g-rummy', 'g-patiens'];
  const before = client('obs', 'Obs'); await before.connect(); await until(() => before.lists);
  const playsBefore = Object.fromEntries(before.lists.engines.map(e => [e.id, e.plays]));
  before.close();

  for (const g of games) {
    const room = 'E' + Math.floor(Math.random() * 1e6);
    const A = client('pa' + g, 'Anna');
    await A.connect(room, g);
    await until(() => A.v);
    ok(A.v && A.v.phase === 'lobby' && A.v.me === 0, `${g}: rummet öppnas i lobbyn och Anna sitter på plats 1`);
    A.send({ t: 'btn', id: 'start' });
    await until(() => A.v.phase === 'game');
    ok(A.v.phase === 'game', `${g}: spelet startar`);
    if (!A.v.meta.solo) ok(A.v.seats.filter(Boolean).length >= A.v.meta.min, `${g}: datorer fyller platserna (${A.v.seats.filter(s => s && s.bot).length} st)`);
    ok(!/\{\d|\{turn|\{other/.test(JSON.stringify(A.v)), `${g}: inga oersatta {namn} i texten`);
    if (g === 'g-patiens') { A.send({ t: 'g', a: 'pile', pile: 'stock' }); await sleep(200); ok(A.v.center.find(c => c.id === 'waste').cards.length === 1, 'g-patiens: tryck på leken vänder upp ett kort'); A.close(); continue; }
    if (g === 'g-krig') { // a full game can be 120 battles – check that battles get decided
      let wins = 0, last = '';
      await until(() => { if (A.v.msg !== last && /vann \d+ kort/.test(A.v.msg || '')) { wins++; last = A.v.msg; } if ((A.v.buttons || []).length) A.send({ t: 'g', a: 'btn', id: 'flip' }); return wins >= 3; }, 30000);
      ok(wins >= 3, `${g}: strider avgörs (${wins} st), t.ex. "${last}"`);
      A.close(); continue;
    }
    // play until a result appears (bots play the other seats)
    let moves = 0;
    const done = await until(() => {
      if (A.v.result) return true;
      const mv = humanMove(A.v);
      if (mv && moves < 2000 && A.lastSent !== key(A.v, mv)) {
        A.lastSent = key(A.v, mv); A.send({ t: 'g', ...mv }); moves++;
      }
      return false;
    }, g === 'g-krig' ? 240000 : 120000);
    ok(done, `${g}: rundan spelas klart till ett resultat (${moves} egna drag) – "${A.v.result && A.v.result.title}"`);
    if (done && g === 'g-blackjack') {
      ok(A.v.result.nextIn > 0, `${g}: resultatet visar nedräkning till nästa runda (${Math.round(A.v.result.nextIn / 1000)} s)`);
      const round = A.v.round;
      ok(await until(() => !A.v.result && A.v.round === round + 1, 9000), `${g}: nästa runda startar av sig själv utan att trycka på något`);
    }
    if (done && g === 'g-vandatta') {
      A.send({ t: 'btn', id: 'again' }); await until(() => A.v.phase === 'game' && !A.v.result);
      ok(!A.v.result, `${g}: "Spela igen" startar en ny runda`);
      // illegal move gives a friendly message
      await until(() => A.v.turn === A.v.me, 30000);
      const bad = (A.v.hand || []).find(h => !h.ok);
      if (bad) { A.nopes = []; A.send({ t: 'g', a: 'card', id: bad.id }); await until(() => A.nopes.length, 2000); ok(A.nopes.length && /Lägg|åtta/.test(A.nopes[0]), `${g}: otillåtet kort ger vänligt meddelande: "${A.nopes[0]}"`); }
      // disconnect: the computer takes over, and the seat comes back on reconnect
      const W = client('watch' + g, 'Wilma', 'en'); await W.connect(room); await until(() => W.v); // someone stays in the room (in English)
      ok(/[A-Za-z]/.test(W.v.hint) && !/[åäö]/.test(W.v.hint + W.v.meta.name + JSON.stringify(W.v.buttons)), `${g}: en engelsk spelare i samma rum får engelska texter: "${W.v.hint}" (${W.v.meta.name})`);
      const turnBefore = A.v.turn;
      A.close(); await sleep(4000);
      const B = client('pa' + g, 'Anna'); await B.connect(room); await until(() => B.v);
      ok(B.v.me === 0 && B.v.seats[0].name === 'Anna', `${g}: Anna får tillbaka sin plats efter att ha tappat uppkopplingen`);
      ok(B.v.turn !== turnBefore || B.v.result, `${g}: datorn spelade åt Anna medan hon var borta`);
      B.close(); W.close();
    } else A.close();
  }

  await sleep(500);
  const after = client('obs2', 'Obs'); await after.connect(); await until(() => after.lists);
  const playsAfter = Object.fromEntries(after.lists.engines.map(e => [e.id, e.plays]));
  ok(playsAfter['g-vandatta'] === playsBefore['g-vandatta'] + 2, `Spelningar: Vändåtta räknades två gånger (start + spela igen): ${playsBefore['g-vandatta']} → ${playsAfter['g-vandatta']}`);
  ok(playsAfter['g-poker'] === playsBefore['g-poker'] + 1, 'Spelningar: poker räknades en gång');
  after.close();

  /* ---------- two people: nobody can stall the game ---------- */
  for (const [g, ms] of [['g-krig', 9000], ['g-blackjack', 13000]]) {
    const room = 'I' + Math.floor(Math.random() * 1e6);
    const A = client('ia' + g, 'Anna'), B = client('ib' + g, 'Bo');
    await A.connect(room, g); await until(() => A.v); await B.connect(room); await until(() => B.v && A.v.seats.filter(Boolean).length === 2);
    A.send({ t: 'btn', id: 'start' }); await until(() => A.v.phase === 'game' && B.v.phase === 'game');
    await until(() => A.v.idleIn != null, 2000);
    ok(A.v.idleIn > 0 && B.v.idleIn > 0, `${g}: med två personer visas när datorn gör draget åt en (${Math.round(A.v.idleIn / 1000)} s)`);
    const start = JSON.stringify([A.v.center.map(c => c.cards.length), A.v.seats.map(x => x && x.cards)]);
    const moved = await until(() => JSON.stringify([A.v.center.map(c => c.cards.length), A.v.seats.map(x => x && x.cards)]) !== start, ms);
    ok(moved, `${g}: ingen tryckte – datorn gjorde dragen och spelet gick vidare`);
    A.close(); B.close();
  }

  /* ---------- community ---------- */
  const room = 'C' + Math.floor(Math.random() * 1e6);
  const M = client('maker', 'Maja'); await M.connect(room, 'b-free'); await until(() => M.S);
  M.errors = [];
  M.send({ t: 'publish', name: 'Fula fan-spelet', desc: 'test', rules: '', public: true, min: 2, max: 4, kids: false, emoji: '🎲' });
  await until(() => M.errors.length, 2000);
  ok(M.errors.some(e => /tillåtna/.test(e)), 'Community: olämpliga ord stoppas före publicering ' + JSON.stringify(M.errors));
  M.errors = [];
  M.send({ t: 'publish', name: 'Testspel ' + room, desc: 'Ett snällt spel', rules: 'Ha kul', public: true, min: 2, max: 4, kids: true, emoji: '🎲' });
  await sleep(400);
  const O = client('other', 'Olle'); await O.connect(); await until(() => O.lists);
  const pub = O.lists.list.find(t => t.name === 'Testspel ' + room);
  ok(pub && pub.kids && pub.min === 2 && pub.max === 4 && pub.author === 'Maja', 'Community: det publicerade spelet syns för andra med skapare, antal spelare och "för barn"');
  ok(pub && pub.plays === 0, 'Community: nytt spel börjar på 0 spelningar');
  const P = client('player1', 'P'); await P.connect('P' + room, pub.id); await sleep(400);
  const P2 = client('player2', 'P2'); await P2.connect('Q' + room, pub.id); await sleep(400);
  O.lists = null; O.send({ t: 'listTemplates' }); await until(() => O.lists);
  ok(O.lists.list.find(t => t.id === pub.id).plays === 2, 'Community: spelningsräknaren ökar när spelet startas i två rum');
  P.send({ t: 'useTemplate', id: pub.id }); await sleep(300);
  O.lists = null; O.send({ t: 'listTemplates' }); await until(() => O.lists);
  ok(O.lists.list.find(t => t.id === pub.id).plays === 2, 'Community: att starta om i samma rum direkt räknas inte en gång till');
  // three reports hide the game
  for (const k of ['r1', 'r2', 'r3']) { const R = client(k, k); await R.connect(); await until(() => R.lists); R.send({ t: 'report', id: pub.id, reason: 'test' }); await sleep(150); R.close(); }
  O.lists = null; O.send({ t: 'listTemplates' }); await until(() => O.lists);
  ok(!O.lists.list.find(t => t.id === pub.id), 'Community: efter 3 rapporter döljs spelet');
  [M, O, P, P2].forEach(c => c.close());

  console.log(fails ? `\n${fails} fel` : '\nAlla rumstester gick igenom ✔');
  process.exit(fails ? 1 : 0);
})();
