/* =========================================================
   Free Deck – "Design your own game": the tools. Only shown while designing.
   Everything a designer sets lives in the table state as st.cfg, so it is saved with the game,
   shared with friends at the table and laid out again for everyone who plays it:
     zones   – named spots: a pile, a row (cards side by side) or a column (cards overlapping down),
               each with a rule: cards placed there turn face up, face down, or stay as they are
     deck    – number of decks, jokers, short deck (7–A)
     felt / back – table colour and card backs
     chips   – starting chips per player (0 = no chips) · score – a score counter · turns – whose turn it is
     buttons – the game's own buttons, e.g. "Deal 1 to everyone", "Flip top card of Discard"
   Game-time numbers (chips, score, turn) live in st.meta.
   ========================================================= */
const DD_TXT = {
  en: { deck1: '1 deck', decksN: '{n} decks', noJokers: 'No jokers', jokersN: '{n} jokers', tools: 'Tools', spots: 'Spots on the table', spotsHelp: 'Cards dropped on a spot go into it. Drag a spot\'s name to move it – tap it to change it.', addPile: 'Pile', addRow: 'Row', addCol: 'Column',
    cards: 'The cards', decks: 'Decks', jokers: 'Jokers', short: 'Short deck (7 to Ace)', applyDeck: 'Use these cards', look: 'Look', felt: 'Table', back: 'Card backs',
    players: 'Players', startHand: 'Cards in each hand at the start', startHandHelp: 'Deal cards into your hand on the table – that many is what everyone starts with.', chips: 'Starting chips', none: 'None', score: 'Keep score', turns: 'Take turns',
    buttons: 'Your game\'s buttons', buttonsHelp: 'Buttons everyone playing your game can press.', addButton: 'Add a button', noButtons: 'No buttons yet.',
    spot: 'Spot', spotName: 'Name', layout: 'Cards lie', lPile: 'In a pile', lRow: 'In a row', lCol: 'In a column', faceRule: 'Cards placed here', fAny: 'Stay as they are', fUp: 'Turn face up', fDown: 'Turn face down', del: 'Delete', done: 'Done',
    bDealAll: 'Deal to everyone', bDealSpot: 'Deal to a spot', bFlip: 'Flip top card', bToDeck: 'Back into the deck', bCollect: 'Collect & shuffle', bNext: 'Next player', bLabel: 'Button text', howMany: 'How many cards', toSpot: 'Which spot', faceUp: 'Face up', faceDown: 'Face down',
    needSpot: 'Add a spot first', endTurn: 'End turn', yourTurn: 'Your turn!', turnOf: '{name}\'s turn', chipsOf: 'Chips', scoreOf: 'Score', me: 'You', adjust: 'Change', deckLeft: 'The deck is empty' },
  sv: { deck1: '1 lek', decksN: '{n} lekar', noJokers: 'Inga jokrar', jokersN: '{n} jokrar', tools: 'Verktyg', spots: 'Platser på bordet', spotsHelp: 'Kort som släpps på en plats hamnar där. Dra i platsens namn för att flytta den – tryck för att ändra.', addPile: 'Hög', addRow: 'Rad', addCol: 'Kolumn',
    cards: 'Korten', decks: 'Lekar', jokers: 'Jokrar', short: 'Kort lek (7 till ess)', applyDeck: 'Använd de här korten', look: 'Utseende', felt: 'Bordet', back: 'Baksidor',
    players: 'Spelare', startHand: 'Kort i varje hand från start', startHandHelp: 'Dela ut kort till din hand på bordet – så många får alla från början.', chips: 'Marker från start', none: 'Inga', score: 'Räkna poäng', turns: 'Turordning',
    buttons: 'Spelets knappar', buttonsHelp: 'Knappar som alla som spelar ditt spel kan trycka på.', addButton: 'Lägg till en knapp', noButtons: 'Inga knappar än.',
    spot: 'Plats', spotName: 'Namn', layout: 'Korten ligger', lPile: 'I en hög', lRow: 'På rad', lCol: 'I en kolumn', faceRule: 'Kort som läggs här', fAny: 'Är som de är', fUp: 'Vänds upp', fDown: 'Vänds ner', del: 'Ta bort', done: 'Klar',
    bDealAll: 'Ge kort till alla', bDealSpot: 'Ge kort till en plats', bFlip: 'Vänd översta kortet', bToDeck: 'Tillbaka till leken', bCollect: 'Samla och blanda', bNext: 'Nästa spelare', bLabel: 'Text på knappen', howMany: 'Hur många kort', toSpot: 'Vilken plats', faceUp: 'Uppvända', faceDown: 'Nedvända',
    needSpot: 'Lägg till en plats först', endTurn: 'Klar med turen', yourTurn: 'Din tur!', turnOf: '{name}s tur', chipsOf: 'Marker', scoreOf: 'Poäng', me: 'Du', adjust: 'Ändra', deckLeft: 'Leken är tom' },
};
const ddt = (k, p = {}) => String((DD_TXT[LANG] || DD_TXT.en)[k] ?? DD_TXT.en[k] ?? k).replace(/\{(\w+)\}/g, (m, x) => (x in p ? p[x] : m));
const DD_FELTS = { green: ['#3a9f68', '#14583a'], blue: ['#3a78b8', '#173c66'], red: ['#b8473a', '#5e1f18'], purple: ['#7b52b8', '#3a2163'], wood: ['#a8743f', '#5a3a1b'], night: ['#3b4558', '#151a24'] };
const DD_BACKS = { red: ['#c0392b', '#a52a1f'], blue: ['#2f6fd0', '#2459a8'], green: ['#219a5a', '#177645'], black: ['#2b2f3a', '#16181f'], gold: ['#d4a12a', '#b0831b'] };
const ddCfg = () => (DK.st.cfg || (DK.st.cfg = { zones: [], deck: { decks: 1, jokers: 0, short: false }, felt: 'green', back: 'red', chips: 0, score: false, turns: false, buttons: [] }));
const ddMeta = () => (DK.st.meta || (DK.st.meta = { chips: {}, score: {}, turn: null }));

/* ---------- the cards a game uses ---------- */
function ddMakeCards(deck) {
  const d = deck || {}, out = [], ranks = d.short ? ['A', '7', '8', '9', '10', 'J', 'Q', 'K'] : DK_RANKS;
  for (let k = 0; k < Math.max(1, Math.min(3, d.decks || 1)); k++) for (const s of DK_SUITS) for (const r of ranks) out.push({ id: s + r + (k ? '_' + k : ''), s, r, up: false });
  for (let j = 0; j < Math.min(4, d.jokers || 0); j++) out.push({ id: 'JK' + j, s: j % 2 ? '♥' : '♠', r: 'JK', up: false });
  return dkShuffle(out);
}
function ddJokerFace(c) {
  const red = c.s === '♥';
  return { red, html: `<div class="in"><div class="f joker"><div class="cr tl">J<br>O<br>K</div><div class="mid jk">${ic('star')}<b>JOKER</b></div></div><div class="b"></div></div>` };
}

/* ---------- spots (zones) ---------- */
const ddZone = id => (ddCfg().zones || []).find(z => z.id === id);
// where card i of a pile in a zone sits (row/column spread the cards out)
function ddOffset(p, i, n) {
  const z = p.z && ddZone(p.z); if (!z || z.layout === 'pile') return null;
  if (z.layout === 'row') { const step = Math.min(DK.cw * 0.32, (DK.W * 0.5) / Math.max(1, n - 1)); return { dx: (i - (n - 1) / 2) * step, dy: 0 }; }
  const step = Math.min(DK.ch * 0.24, (DK.H * 0.35) / Math.max(1, n - 1)); return { dx: 0, dy: i * step - Math.min(DK.ch * 0.2, ((n - 1) * step) / 2) };
}
// a spot near this point (for dropping cards)
function ddZoneAt(px, py) {
  let best = null, bd = DK.cw * 0.8;
  for (const z of ddCfg().zones || []) { const c = dkToPx(z.x, z.y); const d = Math.hypot(c.x - px, c.y - py); if (d < bd) { bd = d; best = z; } }
  return best;
}
function ddApplyFace(z, cards) { if (!z) return; if (z.face === 'up') cards.forEach(c => (c.up = true)); else if (z.face === 'down') cards.forEach(c => (c.up = false)); }
function ddRenderZones() {
  const t = $('dkTable'), zones = (DK.st.cfg && DK.st.cfg.zones) || [], live = new Set();
  DK.zels = DK.zels || new Map();
  for (const z of zones) {
    live.add(z.id);
    let el = DK.zels.get(z.id);
    if (!el) { el = document.createElement('div'); el.className = 'dzone'; el.dataset.zone = z.id; el.innerHTML = '<span class="zl"></span>'; t.appendChild(el); DK.zels.set(z.id, el); }
    const c = dkToPx(z.x, z.y), w = z.layout === 'row' ? DK.cw * 2.6 : DK.cw + 14, h = z.layout === 'col' ? DK.ch * 2 : DK.ch + 14;
    const cy = z.layout === 'col' ? c.y + DK.ch * 0.42 : c.y;
    el.style.cssText = `width:${w}px;height:${h}px;transform:translate(${c.x - w / 2}px,${cy - h / 2}px)`;
    el.classList.toggle('edit', DK.creating);
    el.querySelector('.zl').textContent = z.name || ddt('spot');
  }
  for (const [id, el] of DK.zels) if (!live.has(id)) { el.remove(); DK.zels.delete(id); }
}
function ddAddZone(layout) {
  const cfg = ddCfg(), n = cfg.zones.length;
  const spots = [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8], [0.5, 0.15], [0.5, 0.85], [0.1, 0.5], [0.9, 0.5]];
  const [x, y] = spots[n % spots.length];
  deckSnap();
  cfg.zones.push({ id: 'z' + Math.random().toString(36).slice(2, 7), x, y, name: { pile: ddt('addPile'), row: ddt('addRow'), col: ddt('addCol') }[layout] + ' ' + (n + 1), layout, face: 'any' });
  sfx('pop'); deckCommit();
}
function ddZoneSheet(id) {
  const z = ddZone(id); if (!z) return;
  const chips = (key, vals) => `<div class="chips" data-key="${key}">${vals.map(([v, l]) => `<button data-v="${v}" class="${z[key] === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
  deckSheet(`${dkHead(esc(ddt('spot')))}
    <div class="q">${esc(ddt('spotName'))}</div><input class="dfield" id="zName" maxlength="20" value="${esc(z.name || '')}">
    <div class="q">${esc(ddt('layout'))}</div>${chips('layout', [['pile', ddt('lPile')], ['row', ddt('lRow')], ['col', ddt('lCol')]])}
    <div class="q">${esc(ddt('faceRule'))}</div>${chips('face', [['any', ddt('fAny')], ['up', ddt('fUp')], ['down', ddt('fDown')]])}
    <div style="display:flex;gap:10px;margin-top:18px"><button class="go" style="margin:0;background:#f3eee4;color:#7a2a24;box-shadow:none;flex:1" data-del>${ic('trash')} ${esc(ddt('del'))}</button><button class="go" style="margin:0;flex:2" data-ok>${esc(ddt('done'))}</button></div>`, e => {
    const b = e.target.closest('[data-v]');
    if (b) { z[b.parentElement.dataset.key] = b.dataset.v; b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); sfx('click'); }
    if (e.target.closest('[data-del]')) { deckSnap(); const cfg = ddCfg(); cfg.zones = cfg.zones.filter(x => x.id !== id); DK.st.piles.forEach(p => { if (p.z === id) delete p.z; }); deckCloseSheet(); sfx('slide'); deckCommit(); }
    if (e.target.closest('[data-ok]')) { z.name = $('zName').value.trim().slice(0, 20) || z.name; deckCloseSheet(); deckCommit(); }
  });
}

/* ---------- chips, score and turns ---------- */
function ddPlayers() { return DK.online && DK.peers.length ? DK.peers.map(p => ({ pid: p.pid, name: p.pid === DK.me ? ddt('me') : p.name, color: p.color })) : [{ pid: DK.me, name: ddt('me'), color: '#ff6b4a' }]; }
function ddRenderBoard() {
  const cfg = DK.st.cfg, box = $('dkBoard'); if (!box) return;
  const show = cfg && (cfg.chips || cfg.score || cfg.turns);
  box.classList.toggle('hide', !show); $('deck').classList.toggle('hasboard', !!show);
  if (show) {
    const m = ddMeta(), ps = ddPlayers();
    if (cfg.turns && !ps.some(p => p.pid === m.turn)) m.turn = ps[0].pid;
    box.innerHTML = ps.map(p => `<button class="dpl${cfg.turns && m.turn === p.pid ? ' turn' : ''}${p.pid === DK.me ? ' me' : ''}" data-pl="${esc(p.pid)}" style="--c:${p.color}">
      <i>${esc((p.name || '?')[0].toUpperCase())}</i><b>${esc(p.name)}</b>
      ${cfg.chips ? `<span>${ic('coins')}${fmt(m.chips[p.pid] ?? cfg.chips)}</span>` : ''}${cfg.score ? `<span>${ic('star')}${m.score[p.pid] || 0}</span>` : ''}</button>`).join('');
  }
  // the game's own buttons + "End turn"
  const bar = $('dkGameBtns'); if (!bar) return;
  const btns = (cfg && cfg.buttons) || [];
  const myTurn = cfg && cfg.turns && ddMeta().turn === DK.me;
  bar.innerHTML = btns.map(b => `<button class="dtool gb" data-gb="${esc(b.id)}">${esc(b.label)}</button>`).join('') +
    (cfg && cfg.turns && (myTurn || !DK.online) ? `<button class="dtool gb main" data-gb="__next">${ic('next')}<span class="dl">${esc(ddt('endTurn'))}</span></button>` : '');
  bar.classList.toggle('hide', !bar.innerHTML);
  $('deck').classList.toggle('hasgb', !!bar.innerHTML);
}
function ddNextTurn() {
  const ps = ddPlayers(), m = ddMeta(), i = ps.findIndex(p => p.pid === m.turn);
  m.turn = ps[(i + 1) % ps.length].pid;
  const p = ps.find(x => x.pid === m.turn);
  toast(m.turn === DK.me ? ddt('yourTurn') : ddt('turnOf', { name: p.name }));
}
function ddPlayerSheet(pid) {
  const cfg = ddCfg(), m = ddMeta(), p = ddPlayers().find(x => x.pid === pid); if (!p) return;
  const row = (key, label, steps) => `<div class="q">${esc(label)}</div><div class="chips" data-key="${key}">${steps.map(d => `<button data-d="${d}">${d > 0 ? '+' : ''}${d}</button>`).join('')}</div>`;
  deckSheet(`${dkHead(esc(p.name))}${cfg.chips ? row('chips', ddt('chipsOf'), [-50, -10, 10, 50, 100]) : ''}${cfg.score ? row('score', ddt('scoreOf'), [-5, -1, 1, 5, 10]) : ''}
    <button class="go" data-close>${esc(ddt('done'))}</button>`, e => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    const key = b.parentElement.dataset.key, d = +b.dataset.d;
    deckSnap();
    if (key === 'chips') m.chips[pid] = Math.max(0, (m.chips[pid] ?? cfg.chips) + d); else m.score[pid] = (m.score[pid] || 0) + d;
    sfx(key === 'chips' ? 'place' : 'click'); deckCommit(); toast(`${p.name}: ${key === 'chips' ? fmt(m.chips[pid]) : m.score[pid]}`);
  });
}

/* ---------- the game's own buttons ---------- */
const DD_STEPS = { dealAll: 'bDealAll', dealSpot: 'bDealSpot', flip: 'bFlip', toDeck: 'bToDeck', collect: 'bCollect', next: 'bNext' };
function ddRunButton(id) {
  if (id === '__next') { deckSnap(); ddNextTurn(); sfx('pop'); deckCommit(); return; }
  const b = (ddCfg().buttons || []).find(x => x.id === id); if (!b) return;
  const src = DK.st.piles.find(p => !p.z && p.cards.length) && dkBiggest();
  const deckPile = DK.st.piles.filter(p => !p.z).sort((a, c) => c.cards.length - a.cards.length)[0] || dkBiggest();
  const zonePile = zid => { let p = DK.st.piles.find(x => x.z === zid); if (!p) { const z = ddZone(zid); if (!z) return null; p = { id: dkId(), x: z.x, y: z.y, z: zid, cards: [] }; DK.st.piles.push(p); } return p; };
  deckSnap();
  const s = b.step;
  if (s.k === 'dealAll') {
    const ps = ddPlayers(); let moved = 0;
    for (let r = 0; r < (s.n || 1); r++) for (const p of ps) { const c = deckPile && deckPile.cards.pop(); if (!c) break; (DK.st.hands[p.pid] || (DK.st.hands[p.pid] = [])).push({ id: c.id, s: c.s, r: c.r }); moved++; }
    if (!moved) toast(ddt('deckLeft')); sfx('deal');
  } else if (s.k === 'dealSpot') {
    const zp = zonePile(s.zone); if (!zp) return toast(ddt('needSpot'));
    for (let i = 0; i < (s.n || 1); i++) { const c = deckPile && deckPile !== zp && deckPile.cards.pop(); if (!c) break; c.up = s.face === 'up'; zp.cards.push(c); }
    ddApplyFace(ddZone(s.zone), zp.cards.slice(-(s.n || 1))); sfx('deal');
  } else if (s.k === 'flip') {
    const zp = DK.st.piles.find(x => x.z === s.zone); const c = zp && zp.cards[zp.cards.length - 1]; if (c) { c.up = !c.up; sfx('flip'); }
  } else if (s.k === 'toDeck') {
    const zp = DK.st.piles.find(x => x.z === s.zone);
    if (zp && deckPile && zp !== deckPile) { const cs = zp.cards.splice(0); cs.forEach(c => (c.up = false)); deckPile.cards.unshift(...cs); dkShuffle(deckPile.cards); sfx('shuffle'); }
  } else if (s.k === 'collect') { deckCommit(); deckGather(); return; }
  else if (s.k === 'next') { ddNextTurn(); sfx('pop'); }
  void src; deckCommit(s.k === 'flip' ? 'flip' : 'deal');
}
function ddButtonSheet() {
  const cfg = ddCfg(), zones = cfg.zones || [];
  const o = { k: 'dealAll', n: 1, zone: zones[0] && zones[0].id, face: 'up', label: '' };
  const render = () => `${dkHead(esc(ddt('addButton')))}
    <div class="chips" data-key="k">${Object.entries(DD_STEPS).map(([k, l]) => `<button data-v="${k}" class="${o.k === k ? 'on' : ''}">${esc(ddt(l))}</button>`).join('')}</div>
    ${['dealAll', 'dealSpot'].includes(o.k) ? `<div class="q">${esc(ddt('howMany'))}</div><div class="chips" data-key="n">${[1, 2, 3, 5, 7].map(n => `<button data-v="${n}" class="${o.n === n ? 'on' : ''}">${n}</button>`).join('')}</div>` : ''}
    ${['dealSpot', 'flip', 'toDeck'].includes(o.k) ? (zones.length ? `<div class="q">${esc(ddt('toSpot'))}</div><div class="chips" data-key="zone">${zones.map(z => `<button data-v="${esc(z.id)}" class="${o.zone === z.id ? 'on' : ''}">${esc(z.name)}</button>`).join('')}</div>` : `<p style="font-weight:800;color:#b0473a">${esc(ddt('needSpot'))}</p>`) : ''}
    ${o.k === 'dealSpot' ? `<div class="chips" data-key="face" style="margin-top:8px">${[['up', ddt('faceUp')], ['down', ddt('faceDown')]].map(([v, l]) => `<button data-v="${v}" class="${o.face === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>` : ''}
    <div class="q">${esc(ddt('bLabel'))}</div><input class="dfield" id="bLabel" maxlength="20" placeholder="${esc(ddt(DD_STEPS[o.k]))}" value="${esc(o.label)}">
    <button class="go" data-ok>${ic('plus')} ${esc(ddt('addButton'))}</button>`;
  const sh = deckSheet(render(), e => {
    const b = e.target.closest('[data-v]');
    if (b) { o.label = ($('bLabel') || {}).value || ''; const k = b.parentElement.dataset.key; o[k] = k === 'n' ? +b.dataset.v : b.dataset.v; sfx('click'); sh.querySelector('.dsc').innerHTML = render(); return; }
    if (!e.target.closest('[data-ok]')) return;
    if (['dealSpot', 'flip', 'toDeck'].includes(o.k) && !o.zone) { toast(ddt('needSpot')); sfx('error'); return; }
    deckSnap();
    const label = ($('bLabel').value.trim() || ddt(DD_STEPS[o.k])).slice(0, 20);
    cfg.buttons.push({ id: 'b' + Math.random().toString(36).slice(2, 7), label, step: { k: o.k, n: o.n, zone: o.zone, face: o.face } });
    deckCloseSheet(); sfx('pop'); deckCommit();
  });
}

/* ---------- the Tools sheet (designing only) ---------- */
function ddToolsSheet() {
  const cfg = ddCfg();
  const chip = (key, val, label, on) => `<button data-set="${key}" data-v="${val}" class="${on ? 'on' : ''}">${label}</button>`;
  const sw = (c, v) => Object.entries(c).map(([k, [a]]) => `<button data-set="${v}" data-v="${k}" class="swatch${cfg[v] === k ? ' on' : ''}" style="--sw:${a}" aria-label="${k}"></button>`).join('');
  const render = () => `${dkHead(esc(ddt('tools')))}
    <div class="q">${esc(ddt('spots'))}</div>
    <div class="chips"><button data-add="pile">${ic('card')} ${esc(ddt('addPile'))}</button><button data-add="row">${ic('spread')} ${esc(ddt('addRow'))}</button><button data-add="col">${ic('layers')} ${esc(ddt('addCol'))}</button></div>
    <p class="dhelp">${esc(ddt('spotsHelp'))}</p>
    <div class="q">${esc(ddt('cards'))}</div>
    <div class="chips">${[1, 2, 3].map(n => chip('decks', n, esc(ddt(n === 1 ? 'deck1' : 'decksN', { n })), cfg.deck.decks === n)).join('')}</div>
    <div class="chips" style="margin-top:8px">${[0, 2, 4].map(n => chip('jokers', n, esc(ddt(n ? 'jokersN' : 'noJokers', { n })), cfg.deck.jokers === n)).join('')}</div>
    <label class="dsw"><input type="checkbox" id="ddShort" ${cfg.deck.short ? 'checked' : ''}> ${esc(ddt('short'))}</label>
    <button class="go small" data-deck>${ic('shuffle')} ${esc(ddt('applyDeck'))}</button>
    <div class="q">${esc(ddt('look'))}</div>
    <div class="chips"><span class="lbl2">${esc(ddt('felt'))}</span>${sw(DD_FELTS, 'felt')}</div>
    <div class="chips" style="margin-top:8px"><span class="lbl2">${esc(ddt('back'))}</span>${sw(DD_BACKS, 'back')}</div>
    <div class="q">${esc(ddt('players'))}</div>
    <p class="dhelp">${esc(ddt('startHand'))}: <b>${dkHand().length}</b> – ${esc(ddt('startHandHelp'))}</p>
    <div class="chips"><span class="lbl2">${esc(ddt('chips'))}</span>${[0, 100, 500, 1000].map(n => chip('chips', n, n ? fmt(n) : esc(ddt('none')), cfg.chips === n)).join('')}</div>
    <label class="dsw"><input type="checkbox" data-tog="score" ${cfg.score ? 'checked' : ''}> ${esc(ddt('score'))}</label>
    <label class="dsw"><input type="checkbox" data-tog="turns" ${cfg.turns ? 'checked' : ''}> ${esc(ddt('turns'))}</label>
    <div class="q">${esc(ddt('buttons'))}</div><p class="dhelp">${esc(ddt('buttonsHelp'))}</p>
    <div class="blist">${cfg.buttons.length ? cfg.buttons.map(b => `<div class="bitem"><b>${esc(b.label)}</b><small>${esc(ddt(DD_STEPS[b.step.k]))}</small><button data-delb="${esc(b.id)}" aria-label="${esc(ddt('del'))}">${ic('trash')}</button></div>`).join('') : `<p class="dhelp">${esc(ddt('noButtons'))}</p>`}</div>
    <button class="go small" data-addb>${ic('plus')} ${esc(ddt('addButton'))}</button>`;
  const sh = deckSheet(render(), e => {
    const t = e.target, again = () => { sh.querySelector('.dsc').innerHTML = render(); };
    const add = t.closest('[data-add]'); if (add) { deckCloseSheet(); ddAddZone(add.dataset.add); return; }
    const set = t.closest('[data-set]');
    if (set) { const k = set.dataset.set, v = set.dataset.v; deckSnap();
      if (k === 'decks' || k === 'jokers') cfg.deck[k] = +v; else if (k === 'chips') cfg.chips = +v; else cfg[k] = v;
      sfx('click'); deckCommit(); again(); return; }
    const tog = t.closest('[data-tog]'); if (tog) { deckSnap(); cfg[tog.dataset.tog] = tog.checked; sfx('click'); deckCommit(); return; }
    if (t.closest('[data-deck]')) { cfg.deck.short = $('ddShort').checked; deckCloseSheet(); deckGather(); return; }
    const delb = t.closest('[data-delb]'); if (delb) { deckSnap(); cfg.buttons = cfg.buttons.filter(b => b.id !== delb.dataset.delb); sfx('slide'); deckCommit(); again(); return; }
    if (t.closest('[data-addb]')) { ddButtonSheet(); }
  });
  sh.querySelector('.dsc').classList.add('tall');
}
// table colour + card backs on screen
function ddApplyLook() {
  const cfg = DK.st.cfg || {}, f = DD_FELTS[cfg.felt] || DD_FELTS.green, b = DD_BACKS[cfg.back] || DD_BACKS.red, s = $('deck').style;
  s.setProperty('--felt1', f[0]); s.setProperty('--felt2', f[1]); s.setProperty('--back1', b[0]); s.setProperty('--back2', b[1]);
}
