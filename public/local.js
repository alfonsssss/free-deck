/* =========================================================
   Local table: games against the computer run right here in the browser,
   using the same rules as the server (rules.js, built from engines/).
   LocalSocket behaves like a WebSocket to the server, so the rest of the page
   doesn't need to know the difference. Nothing is sent over the network.
   ========================================================= */
const LocalServer = (() => {
  const R = window.KB_RULES;
  const pickL = (x, lang) => (x && typeof x === 'object' ? x[lang] || x.en || x.sv : x);
  const cleanLang = l => (String(l || '').toLowerCase().startsWith('sv') ? 'sv' : 'en');
  const PLAYS_KEY = 'kortbord-localplays';
  let plays = {};
  try { plays = JSON.parse(localStorage.getItem(PLAYS_KEY)) || {}; } catch (e) {}

  function engineList(lang) {
    return Object.values(R.engines).map(e => ({ id: e.meta.id, engine: true, builtin: true, name: pickL(e.meta.name, lang), emoji: e.meta.emoji,
      desc: pickL(e.meta.desc, lang), rules: pickL(e.meta.rules, lang), min: e.meta.min, max: e.meta.max, kids: !!e.meta.kids, solo: !!e.meta.solo }));
  }
  R.init({ send: (ws, m) => ws._deliver(m) });

  function hello(ws, m) {
    const want = String(m.want || '');
    const e = R.engines[want] || R.engines['g-blackjack'];
    const r = { code: 'LOCAL', uid: 'local', round: 0, mode: 'engine', clients: new Set([ws]), players: new Map() };
    ws.pid = String(m.pid || 'me'); ws.lang = cleanLang(m.lang);
    r.players.set(ws.pid, { pid: ws.pid, name: String(m.name || '').slice(0, 20) || (ws.lang === 'sv' ? 'Du' : 'You'), color: '#ff6b4a', conns: 1 });
    R.setup(r, e.meta.id);
    if (m.opts && typeof m.opts === 'object') r.opts = { tc: +m.opts.tc || 0, level: String(m.opts.level || 'medium') };
    R.join(r, ws.pid);
    R.handle(r, ws, { t: 'btn', id: 'start' }); // alone at the table: no lobby, straight into the game
    plays[e.meta.id] = (plays[e.meta.id] || 0) + 1;
    try { localStorage.setItem(PLAYS_KEY, JSON.stringify(plays)); } catch (err) {}
    return r;
  }
  function stop(r) { clearTimeout(r.botT); clearTimeout(r.autoT); clearTimeout(r.nextT); clearTimeout(r.idleT); clearTimeout(r.deadT); r.botT = r.autoT = r.nextT = r.idleT = r.deadT = null; }

  function receive(ws, m) {
    if (m.t === 'lobby') { ws.lang = cleanLang(m.lang); return ws._deliver({ t: 'templates', list: [], engines: engineList(ws.lang) }); }
    if (m.t === 'listTemplates') return ws._deliver({ t: 'templates', list: [], engines: engineList(ws.lang || 'en') });
    if (m.t === 'hello') { ws.room = hello(ws, m); return; }
    const r = ws.room; if (!r) return;
    if (m.t === 'switchGame') {
      if (!R.engines[m.id]) return;
      stop(r); r.round = 0;
      R.setup(r, m.id); R.join(r, ws.pid); R.handle(r, ws, { t: 'btn', id: 'start' });
      return;
    }
    R.handle(r, ws, m);
  }
  return { receive, stop, engineList, plays: () => plays };
})();

class LocalSocket {
  constructor() {
    this.readyState = 0; this.room = null;
    setTimeout(() => { if (this.readyState !== 0) return; this.readyState = 1; this.onopen && this.onopen(); }, 0);
  }
  send(raw) {
    if (this.readyState !== 1) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    try { LocalServer.receive(this, m); } catch (e) { console.error('local game failed', m && m.t, e); }
  }
  _deliver(m) { // async, like a real socket
    if (this.readyState !== 1) return;
    const data = JSON.stringify(m);
    setTimeout(() => { if (this.readyState === 1 && this.onmessage) this.onmessage({ data }); }, 0);
  }
  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    if (this.room) { LocalServer.stop(this.room); this.room.clients.delete(this); this.room = null; }
    // no onclose: a local table never "loses the connection"
  }
}
