/* =========================================================
   Free Deck – a deck of cards on a table, as easy as a real one.
   Drag cards anywhere · tap to flip · drag into your hand · drop on a card to make a pile.
   Runs in the browser (no server needed). The table is saved, so it is there next time.
   State: { piles:[{id,x,y,cards:[{id,s,r,up}]}], hand:[{id,s,r}] }  (x,y = 0..1 of the table)
   Uses: ic(), suitSVG() (icons.js), sfx() (sound.js), t()/LANG (i18n.js), cgGameplay() (platform.js)
   ========================================================= */
const DK = { game: null, creating: false, st: null, hist: [], els: new Map(), counts: new Map(), drag: null, me: 'me', online: false, peers: [], local: null, W: 0, H: 0, cw: 80, ch: 112, top: 58, bar: 64, handH: 120, open: false, seq: 0, tipsLeft: 4 };
const DK_SUITS = ['♠', '♥', '♦', '♣'], DK_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const DK_TXT = {
  en: { toolsLbl: 'Tools', rules: 'Rules', newRound: 'New round', createHint: 'Set up the table the way your game starts – use Tools for spots, buttons and more', publish: 'Publish', pubTitle: 'Publish your game', gName: 'Name', gDesc: 'Short description', gRules: 'How do you play?', gRulesPh: 'Explain the rules in plain words…', gPlayers: 'Players', gKids: 'Kid friendly', gPublic: 'Show in Community', gNamePh: 'e.g. Friday poker', gDescPh: 'e.g. Quick and fun for the whole family', pubGo: 'Publish', pubNeedName: 'Give your game a name (at least 3 letters)', pubOffline: 'Publishing needs a connection to the server – try again in a moment', invite: 'Invite', linkCopied: 'Link copied – send it to your friends!', joined: '{name} joined the table', connecting: 'Opening the table for friends…', title: 'Free Deck', shuffle: 'Shuffle', deal: 'Deal', gather: 'Collect', undo: 'Undo', hand: 'Your hand – drag cards here', handN: 'Your hand · {n}',
    tipDrag: 'Drag cards anywhere', tipTap: 'Tap to flip', tipHand: 'Drag down into your hand', tipHold: 'Hold a pile for more',
    dealTitle: 'Deal cards', howMany: 'How many cards each?', toWho: 'To', myHand: 'My hand', piles: '{n} piles', faceQ: 'Cards are', faceDown: 'Face down', faceUp: 'Face up', dealGo: 'Deal',
    pileTitle: 'Pile of {n}', flipAll: 'Flip pile', shufflePile: 'Shuffle', spread: 'Spread out', takeAll: 'Take into hand', gatherHere: 'Stack it up', home: 'Home',
    help: 'How it works', help1: 'Drag a card to move it. Drop it on another card to make a pile.', help2: 'Tap a card to turn it over.', help3: 'Drag cards down to your hand – only you see them. Drag them back up to play.',
    help4: 'Hold a pile for more: flip, shuffle, spread out.', help5: 'Drag the number on a pile to move the whole pile.', gotIt: 'Got it!', empty: 'No cards left in that pile', newDeck: 'Fresh deck shuffled' },
  sv: { toolsLbl: 'Verktyg', rules: 'Regler', newRound: 'Ny runda', createHint: 'Lägg upp bordet som ditt spel börjar – Verktyg har platser, knappar och mer', publish: 'Publicera', pubTitle: 'Publicera ditt spel', gName: 'Namn', gDesc: 'Kort beskrivning', gRules: 'Hur spelar man?', gRulesPh: 'Förklara reglerna med vanliga ord…', gPlayers: 'Spelare', gKids: 'Passar barn', gPublic: 'Visa i Community', gNamePh: 't.ex. Fredagspoker', gDescPh: 't.ex. Snabbt och roligt för hela familjen', pubGo: 'Publicera', pubNeedName: 'Ge spelet ett namn (minst 3 bokstäver)', pubOffline: 'Publicering kräver anslutning till servern – försök igen strax', invite: 'Bjud in', linkCopied: 'Länken är kopierad – skicka den till dina vänner!', joined: '{name} kom till bordet', connecting: 'Öppnar bordet för vänner…', title: 'Free Deck', shuffle: 'Blanda', deal: 'Dela ut', gather: 'Samla', undo: 'Ångra', hand: 'Din hand – dra kort hit', handN: 'Din hand · {n}',
    tipDrag: 'Dra korten vart du vill', tipTap: 'Tryck för att vända', tipHand: 'Dra ner till handen', tipHold: 'Håll på en hög för mer',
    dealTitle: 'Dela ut', howMany: 'Hur många kort var?', toWho: 'Till', myHand: 'Min hand', piles: '{n} högar', faceQ: 'Korten ska vara', faceDown: 'Nedvända', faceUp: 'Uppvända', dealGo: 'Dela ut',
    pileTitle: 'Hög med {n}', flipAll: 'Vänd högen', shufflePile: 'Blanda', spread: 'Bred ut', takeAll: 'Ta till handen', gatherHere: 'Lägg ihop', home: 'Hem',
    help: 'Så funkar det', help1: 'Dra ett kort för att flytta det. Släpp det på ett annat kort för att göra en hög.', help2: 'Tryck på ett kort för att vända det.', help3: 'Dra ner kort till handen – bara du ser dem. Dra upp dem igen för att spela.',
    help4: 'Håll på en hög för mer: vänd, blanda, bred ut.', help5: 'Dra i siffran på en hög för att flytta hela högen.', gotIt: 'Uppfattat!', empty: 'Högen är tom', newDeck: 'Ny lek blandad' },
};
const dt = (k, p = {}) => String((DK_TXT[LANG] || DK_TXT.en)[k] ?? DK_TXT.en[k] ?? k).replace(/\{(\w+)\}/g, (m, x) => (x in p ? p[x] : m));
// every player's hand: { pid: [cards] } – I only see mine face up
function dkFix(st) { if (!st.hands) st.hands = {}; if (st.hand) { st.hands[DK.me] = st.hand; delete st.hand; } return st; }
const dkHand = () => (DK.st.hands[DK.me] || (DK.st.hands[DK.me] = []));
const dkId = () => 'p' + (++DK.seq).toString(36) + Math.random().toString(36).slice(2, 5);
function dkShuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function dkFreshState(cfg) {
  const st = { piles: [{ id: dkId(), x: 0.5, y: 0.42, cards: ddMakeCards(cfg && cfg.deck) }], hands: {} };
  if (cfg) st.cfg = JSON.parse(JSON.stringify(cfg));
  return st;
}

/* ---------- open / close ---------- */
function deckOpen(keep) {
  deckInit();
  if (!keep && (DK.game || DK.creating)) { DK.game = null; DK.creating = false; DK.st = null; } // plain deck
  if (!DK.st) { try { DK.st = JSON.parse(localStorage.getItem('kortbord-deck')); } catch (e) {} if (!DK.st || !DK.st.piles) DK.st = dkFreshState(); dkFix(DK.st); }
  DK.open = true; $('deck').classList.remove('hide'); document.body.classList.add('indeck');
  ['landing', 'game', 'eng'].forEach(id => $(id) && $(id).classList.add('hide'));
  deckTexts(); deckLayout(); deckRender(true);
  try { cgGameplay(true); } catch (e) {}
  let seen = null; try { seen = localStorage.getItem('kortbord-deckhelp'); } catch (e) {}
  if (!seen) setTimeout(deckHelp, 350);
}
function deckClose() {
  if (DK.online) deckOffline();
  DK.open = false; $('deck').classList.add('hide'); document.body.classList.remove('indeck'); deckCloseSheet();
  try { cgGameplay(false); } catch (e) {}
}

/* ---------- build the screen once ---------- */
function deckInit() {
  if ($('deck')) return;
  const el = document.createElement('div'); el.id = 'deck'; el.className = 'hide';
  el.innerHTML = `
    <header class="dtop">
      <button class="dbtn" data-dk="home" aria-label="Home">${ic('home')}</button>
      <div class="title">${suitSVG('♠')}<span id="dkTitle"></span></div>
      <div class="dpeers" id="dkPeers"></div>
      <button class="dbtn hide" data-dk="rules" id="dkRulesBtn">${ic('book')}<span class="dl" data-dkt="rules"></span></button>
      <button class="dbtn hide" data-dk="tools" id="dkToolsBtn">${ic('tools')}<span class="dl" data-dkt="toolsLbl"></span></button>
      <button class="dbtn invite hide" data-dk="publish" id="dkPubBtn">${ic('upload')}<span class="dl" data-dkt="publish"></span></button>
      <button class="dbtn invite needs-server" data-dk="invite">${ic('link')}<span class="dl" data-dkt="invite"></span></button>
      <button class="dbtn" data-dk="help" aria-label="Help">${ic('help')}</button>
      <button class="dbtn" data-dk="mute" data-mute aria-label="Sound">${ic(SFX.muted ? 'soundoff' : 'sound')}</button>
    </header>
    <div class="dcreate hide" id="dkCreate">${ic('pencil')}<span data-dkt="createHint"></span></div>
    <div class="dtips" id="dkTips"><span>${ic('hand')}<b data-dkt="tipDrag"></b></span><span>${ic('flip')}<b data-dkt="tipTap"></b></span><span>${ic('down')}<b data-dkt="tipHand"></b></span></div>
    <div class="dboard hide" id="dkBoard"></div>
    <div id="dkTable"></div>
    <div class="dgb hide" id="dkGameBtns"></div>
    <div class="dbar">
      <button class="dtool main" data-dk="shuffle">${ic('shuffle')}<span class="dl" data-dkt="shuffle"></span></button>
      <button class="dtool" data-dk="deal">${ic('deal')}<span class="dl" data-dkt="deal"></span></button>
      <button class="dtool" data-dk="gather">${ic('gather')}<span class="dl" data-dkt="gather"></span></button>
      <button class="dtool" data-dk="undo" aria-label="Undo">${ic('undo')}</button>
    </div>
    <div class="dhand" id="dkHand"><div class="hl" id="dkHandLbl"></div></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => {
    const gb = e.target.closest('[data-gb]'); if (gb) { sfx('click'); ddRunButton(gb.dataset.gb); return; }
    const pl = e.target.closest('[data-pl]'); if (pl) { sfx('click'); ddPlayerSheet(pl.dataset.pl); return; }
    const b = e.target.closest('[data-dk]'); if (!b) return;
    const a = b.dataset.dk;
    if (a !== 'mute') sfx('click');
    if (a === 'home') { deckClose(); goHome(); }
    else if (a === 'mute') { sfxMute(!SFX.muted); sfx('pop'); }
    else if (a === 'help') deckHelp();
    else if (a === 'invite') deckInvite();
    else if (a === 'rules') deckRules();
    else if (a === 'publish') deckPublishSheet();
    else if (a === 'tools') ddToolsSheet();
    else if (a === 'shuffle') deckShuffleMain();
    else if (a === 'deal') deckDealSheet();
    else if (a === 'gather') { if (DK.game && DK.game.setup) deckNewRound(); else deckGather(); }
    else if (a === 'undo') deckUndo();
  });
  el.addEventListener('pointerdown', deckDown);
  window.addEventListener('pointermove', deckMove, { passive: false });
  window.addEventListener('pointerup', deckUp);
  window.addEventListener('pointercancel', deckUp);
  let rz = 0; window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { if (DK.open) { deckLayout(); deckRender(true); } }); });
}
function deckTexts() {
  document.querySelectorAll('#deck [data-dkt]').forEach(e => (e.textContent = dt(e.dataset.dkt)));
  $('dkTitle').textContent = DK.game ? DK.game.name : dt('title');
  $('dkRulesBtn').classList.toggle('hide', !(DK.game && DK.game.rules));
  $('dkPubBtn').classList.toggle('hide', !DK.creating || !hasServer());
  $('dkToolsBtn').classList.toggle('hide', !DK.creating);
  $('dkCreate').classList.toggle('hide', !DK.creating);
  $('dkTips').classList.toggle('hide', DK.creating);
  const g = document.querySelector('#deck [data-dk="gather"] .dl'); if (g) g.textContent = DK.game && DK.game.setup ? dt('newRound') : dt('gather');
  const u = document.querySelector('#deck [data-dk="undo"]'); if (u) u.setAttribute('aria-label', dt('undo'));
}

/* ---------- geometry ---------- */
function deckLayout() {
  const W = innerWidth, H = innerHeight;
  DK.W = W; DK.H = H;
  DK.top = W < 520 ? 54 : 60;
  DK.cw = Math.round(Math.max(52, Math.min(118, W * 0.17, H * 0.13)));
  DK.ch = Math.round(DK.cw * 1.4);
  DK.handH = Math.round(DK.ch * 0.78 + 26);
  DK.bar = 66;
  const s = $('deck').style;
  s.setProperty('--cw', DK.cw + 'px'); s.setProperty('--ch', DK.ch + 'px'); s.setProperty('--top', DK.top + 'px'); s.setProperty('--handH', DK.handH + 'px'); s.setProperty('--bar', DK.bar + 'px');
}
// table area for pile centres
function dkArea() {
  const el = $('deck'), gb = el && el.classList.contains('hasgb') ? 54 : 0, board = el && el.classList.contains('hasboard') ? 46 : 0;
  return { x0: DK.cw / 2 + 6, x1: DK.W - DK.cw / 2 - 6, y0: DK.top + board + DK.ch / 2 + 4, y1: DK.H - DK.handH - DK.bar - gb - DK.ch / 2 + 10 };
}
function dkToPx(x, y) { const a = dkArea(); return { x: a.x0 + x * (a.x1 - a.x0), y: a.y0 + y * (a.y1 - a.y0) }; }
function dkToNorm(px, py) { const a = dkArea(); return { x: Math.min(1, Math.max(0, (px - a.x0) / (a.x1 - a.x0))), y: Math.min(1, Math.max(0, (py - a.y0) / (a.y1 - a.y0))) }; }

/* ---------- drawing ---------- */
function dkFace(c) {
  if (c.r === 'JK') return ddJokerFace(c);
  const red = c.s === '♥' || c.s === '♦', face = 'JQK'.includes(c.r);
  const mid = face ? `<div class="mid face">${c.r}${suitSVG(c.s)}</div>` : `<div class="mid">${suitSVG(c.s)}</div>`;
  return { red, html: `<div class="in"><div class="f"><div class="cr tl">${c.r}${suitSVG(c.s)}</div>${mid}<div class="cr br">${c.r}${suitSVG(c.s)}</div></div><div class="b"></div></div>` };
}
function dkCardEl(c) {
  let el = DK.els.get(c.id);
  if (!el) {
    const f = dkFace(c);
    el = document.createElement('div'); el.className = 'dc' + (f.red ? ' red' : ''); el.dataset.id = c.id; el.innerHTML = f.html;
    el.setAttribute('aria-label', c.r + ' ' + c.s);
    $('dkTable').appendChild(el); DK.els.set(c.id, el);
  }
  return el;
}
function dkPlace(el, x, y, rot, z, instant) {
  if (instant) el.classList.add('nt');
  el.style.transform = `translate(${x - DK.cw / 2}px,${y - DK.ch / 2}px) rotate(${rot || 0}deg)`;
  el.style.zIndex = z;
  if (instant) { void el.offsetWidth; el.classList.remove('nt'); }
}
// slight, stable tilt per card so piles look like real paper
const dkTilt = id => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0; return ((h % 7) - 3) * 0.6; };
function deckRender(instant) {
  if (!DK.open) return;
  const st = DK.st, seen = new Set();
  ddApplyLook(); ddRenderZones();
  let z = 10;
  for (const p of st.piles) {
    const zone = p.z && ddZone(p.z);
    if (zone) { p.x = zone.x; p.y = zone.y; }
    const c0 = dkToPx(p.x, p.y), n = p.cards.length;
    p.cards.forEach((c, i) => {
      const el = dkCardEl(c); seen.add(c.id);
      if (DK.drag && DK.drag.ids.includes(c.id)) return;
      const fan = ddOffset(p, i, n), off = fan ? 0 : Math.min(i, 14) * 0.35, depth = n - 1 - i;
      el.classList.toggle('down', !c.up); el.classList.remove('hand');
      el.style.display = !fan && depth > 16 ? 'none' : ''; // deep cards are hidden under the pile anyway
      dkPlace(el, c0.x - off * 0.3 + (fan ? fan.dx : 0), c0.y - off + (fan ? fan.dy : 0), n > 1 && !fan ? dkTilt(c.id) : 0, z++, instant);
    });
    z += 2;
  }
  // hand: a fan along the bottom, face up for me
  const hand = dkHand(), hn = hand.length;
  const avail = DK.W - DK.cw - 24, step = hn > 1 ? Math.min(DK.cw * 0.62, avail / (hn - 1)) : 0;
  const hx0 = (DK.W - (hn - 1) * step) / 2, hy = DK.H - DK.handH + DK.ch / 2 + 22;
  hand.forEach((c, i) => {
    const el = dkCardEl(c); seen.add(c.id);
    if (DK.drag && DK.drag.ids.includes(c.id)) return;
    el.classList.remove('down'); el.classList.add('hand'); el.style.display = '';
    const k = hn > 1 ? i / (hn - 1) - 0.5 : 0;
    dkPlace(el, hx0 + i * step, hy + Math.abs(k) * 10, k * Math.min(14, hn * 1.2), 2100 + i, instant);
  });
  for (const [id, el] of DK.els) if (!seen.has(id)) { el.remove(); DK.els.delete(id); }
  // pile counts (drag them to move the pile)
  const live = new Set();
  for (const p of st.piles) {
    if (p.cards.length < 2) continue;
    live.add(p.id);
    let b = DK.counts.get(p.id);
    if (!b) { b = document.createElement('div'); b.className = 'dcount'; b.dataset.pile = p.id; $('dkTable').appendChild(b); DK.counts.set(p.id, b); }
    b.innerHTML = ic('layers') + p.cards.length;
    if (DK.drag && DK.drag.pile === p.id && DK.drag.whole) continue;
    const c0 = dkToPx(p.x, p.y);
    if (instant) b.classList.add('nt');
    b.style.transform = `translate(${c0.x - 15}px,${c0.y + DK.ch / 2 - 13}px)`;
    if (instant) { void b.offsetWidth; b.classList.remove('nt'); }
  }
  for (const [id, b] of DK.counts) if (!live.has(id)) { b.remove(); DK.counts.delete(id); }
  $('dkHandLbl').textContent = hn ? dt('handN', { n: hn }) : dt('hand');
  $('dkPeers').innerHTML = DK.online ? DK.peers.filter(p => p.pid !== DK.me).map(p => { const n = (DK.st.hands[p.pid] || []).length;
    return `<span class="dpeer" style="--c:${p.color}" title="${esc(p.name)}"><i>${esc((p.name || '?')[0].toUpperCase())}</i>${n ? `<b>${ic('card')}${n}</b>` : ''}</span>`; }).join('') : '';
  const u = document.querySelector('#deck [data-dk="undo"]'); if (u) u.disabled = !DK.hist.length;
  ddRenderBoard();
}

/* ---------- changes ---------- */
function deckSnap() { DK.hist.push(JSON.stringify(DK.st)); if (DK.hist.length > 60) DK.hist.shift(); }
function deckCommit(fx) {
  DK.st.piles = DK.st.piles.filter(p => p.cards.length);
  if (DK.online) send({ t: 'deck', st: DK.st, fx: fx || '' }); // friends at the table see it at once
  else if (!DK.game && !DK.creating) { try { localStorage.setItem('kortbord-deck', JSON.stringify(DK.st)); } catch (e) {} } // my own table is kept for next time
  deckRender();
}
function deckUndo() {
  const prev = DK.hist.pop(); if (!prev) return;
  DK.st = dkFix(JSON.parse(prev)); sfx('slide'); deckCommit('slide');
}
const dkPile = id => DK.st.piles.find(p => p.id === id);
const dkPileOf = cid => DK.st.piles.find(p => p.cards.some(c => c.id === cid));
const dkBiggest = () => DK.st.piles.slice().sort((a, b) => b.cards.length - a.cards.length)[0];
function dkShakePile(p) { p.cards.slice(-12).forEach(c => { const el = DK.els.get(c.id); if (el) { el.classList.remove('shuffling'); void el.offsetWidth; el.classList.add('shuffling'); } }); }

function deckShuffleMain() {
  const p = dkBiggest();
  if (!p || p.cards.length < 2) { deckFresh(); return; }
  deckSnap(); dkShuffle(p.cards); p.cards.forEach(c => (c.up = false));
  sfx('shuffle'); deckCommit('shuffle'); dkShakePile(p);
}
function deckFresh() { deckSnap(); const cfg = DK.st.cfg, meta = DK.st.meta; DK.st = dkFreshState(cfg); if (meta) DK.st.meta = meta; sfx('shuffle'); deckCommit(); dkShakePile(DK.st.piles[0]); toast(dt('newDeck')); }
// everything back into one face-down, shuffled deck in the middle
function deckGather() {
  deckSnap();
  const all = [...DK.st.piles.flatMap(p => p.cards), ...Object.values(DK.st.hands).flat()].map(c => ({ id: c.id, s: c.s, r: c.r, up: false }));
  const cfg = DK.st.cfg, meta = DK.st.meta;
  const want = cfg ? ddMakeCards(cfg.deck) : null; // after "Use these cards" the deck changes
  DK.st = { piles: [{ id: dkId(), x: 0.5, y: 0.42, cards: want || dkShuffle(all) }], hands: {} };
  if (cfg) DK.st.cfg = cfg; if (meta) DK.st.meta = meta;
  sfx('slide'); deckCommit(); setTimeout(() => { sfx('shuffle'); dkShakePile(DK.st.piles[0]); }, 280);
}
// deal n cards from the biggest pile, one at a time like a dealer
function deckDeal(n, to, up) {
  const src = dkBiggest(); if (!src || !src.cards.length) { toast(dt('empty')); sfx('error'); return; }
  deckSnap();
  const targets = [];
  if (to === 'hand') targets.push('hand');
  else {
    const k = to; // k piles in a row/arc below or around the deck
    for (let i = 0; i < k; i++) {
      const ang = Math.PI * (0.15 + 0.7 * (k === 1 ? 0.5 : i / (k - 1)));
      const x = Math.min(0.95, Math.max(0.05, 0.5 - Math.cos(ang) * 0.42)), y = Math.min(0.98, 0.42 + Math.sin(ang) * 0.5);
      const p = { id: dkId(), x, y, cards: [] }; DK.st.piles.push(p); targets.push(p);
    }
  }
  const order = []; for (let r = 0; r < n; r++) for (const tg of targets) order.push(tg);
  let i = 0;
  const step = () => {
    if (i >= order.length || !src.cards.length) { deckCommit('deal'); return; }
    const c = src.cards.pop(), tg = order[i++];
    if (tg === 'hand') { c.up = true; dkHand().push({ id: c.id, s: c.s, r: c.r }); } else { c.up = !!up; tg.cards.push(c); }
    sfx('deal'); deckRender();
    setTimeout(step, order.length > 20 ? 70 : 120);
  };
  step();
}

/* ---------- touching cards ---------- */
function dkHit(e) { return document.elementsFromPoint(e.clientX, e.clientY).find(x => x.classList && (x.classList.contains('dc') || x.classList.contains('dcount'))); }
function deckDown(e) {
  if (!DK.open || e.button > 0 || DK.drag) return;
  const zl = DK.creating && e.target.closest('.dzone.edit .zl');
  if (zl) { // designing: drag a spot by its name, tap it to change it
    e.preventDefault();
    const zid = zl.parentElement.dataset.zone, z = ddZone(zid), c = z && dkToPx(z.x, z.y); if (!z) return;
    DK.drag = { zone: zid, ids: [], x0: e.clientX, y0: e.clientY, dx: e.clientX - c.x, dy: e.clientY - c.y, moved: false, pid: e.pointerId, hit: zl.parentElement };
    return;
  }
  const hit = e.target.closest('.dc,.dcount'); if (!hit || !$('deck').contains(hit)) return;
  e.preventDefault();
  let ids, from, pile = null, whole = false;
  if (hit.classList.contains('dcount')) { pile = hit.dataset.pile; const p = dkPile(pile); if (!p) return; ids = p.cards.map(c => c.id); from = 'pile'; whole = true; }
  else {
    const cid = hit.dataset.id;
    if (dkHand().some(c => c.id === cid)) { ids = [cid]; from = 'hand'; }
    else { const p = dkPileOf(cid); if (!p) return; pile = p.id; ids = [p.cards[p.cards.length - 1].id]; from = 'pile'; } // you always pick up the top card
  }
  const lead = whole ? hit : DK.els.get(ids[0]);
  const r = (whole ? DK.els.get(ids[ids.length - 1]) : lead).getBoundingClientRect();
  DK.drag = { ids, from, pile, whole, x0: e.clientX, y0: e.clientY, dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - (r.top + r.height / 2), moved: false, t0: Date.now(), pid: e.pointerId, hit };
  clearTimeout(DK.holdT);
  // holding still on a pile: it pops a little; let go without moving and the pile menu opens
  if (from === 'pile' && !whole) DK.holdT = setTimeout(() => { const d = DK.drag; if (d && !d.moved) { d.held = true; sfx('pop'); const el = DK.els.get(d.ids[0]); if (el) el.classList.add('held'); } }, 480);
}
function deckMove(e) {
  const d = DK.drag; if (!d || e.pointerId !== d.pid) return;
  if (d.zone) { if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 7 && !d.moved) return; d.moved = true; e.preventDefault();
    const z = ddZone(d.zone); if (z) { const n = dkToNorm(e.clientX - d.dx, e.clientY - d.dy); z.x = n.x; z.y = n.y; ddRenderZones(); DK.st.piles.forEach(p => { if (p.z === d.zone) { p.x = n.x; p.y = n.y; } }); deckRender(true); } return; }
  if (!d.moved) {
    if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 7) return;
    d.moved = true; clearTimeout(DK.holdT); sfx('slide');
    document.querySelectorAll('#deck .dc.held').forEach(el => el.classList.remove('held'));
    d.els = d.ids.map(id => DK.els.get(id)).filter(Boolean);
    // moving a whole pile: only the top card casts a shadow (52 shadows would make one huge dark blob)
    d.els.forEach((el, i) => { el.classList.add('dlift'); el.style.zIndex = 5000 + i; const under = d.whole && i < d.els.length - 1; el.classList.toggle('dflat', under); el.style.display = d.whole && i < d.els.length - 8 ? 'none' : ''; });
    if (d.whole) d.hit.classList.add('nt');
  }
  e.preventDefault();
  const cx = e.clientX - d.dx, cy = e.clientY - d.dy;
  d.els.forEach((el, i) => { const off = Math.min(i, 14) * 0.35; el.style.transform = `translate(${cx - DK.cw / 2 - off * 0.3}px,${cy - DK.ch / 2 - off}px) rotate(${d.whole ? 0 : -3}deg) scale(1.06)`; });
  if (d.whole) d.hit.style.transform = `translate(${cx - 15}px,${cy + DK.ch / 2 - 13}px)`;
  // where would it land?
  const overHand = e.clientY > DK.H - DK.handH - 10 && !d.whole;
  $('dkHand').classList.toggle('over', overHand);
  const tgt = overHand ? null : dkDropPile(cx, cy, d);
  if (d.tgt !== (tgt && tgt.id)) {
    if (d.tgtEl) d.tgtEl.classList.remove('target');
    d.tgt = tgt && tgt.id; d.tgtEl = tgt ? DK.els.get(tgt.cards[tgt.cards.length - 1].id) : null;
    if (d.tgtEl) d.tgtEl.classList.add('target');
  }
  const zt = overHand || tgt ? null : ddZoneAt(cx, cy);
  if (d.zt !== (zt && zt.id)) { if (d.ztEl) d.ztEl.classList.remove('target'); d.zt = zt && zt.id; d.ztEl = zt && DK.zels && DK.zels.get(zt.id); if (d.ztEl) d.ztEl.classList.add('target'); }
}
function dkDropPile(cx, cy, d) {
  let best = null, bd = DK.cw * 0.6;
  for (const p of DK.st.piles) {
    if (d.whole && p.id === d.pile) continue;
    if (!d.whole && p.id === d.pile && p.cards.length === 1) continue;
    if (d.from === 'pile' && !d.whole && p.id === d.pile) continue;
    const n = p.cards.length, fan = ddOffset(p, n - 1, n), c = dkToPx(p.x, p.y);
    const dist = Math.min(Math.hypot(c.x - cx, c.y - cy), fan ? Math.hypot(c.x + fan.dx - cx, c.y + fan.dy - cy) : Infinity);
    if (dist < bd) { bd = dist; best = p; }
  }
  return best;
}
function deckUp(e) {
  const d = DK.drag; if (!d || (e.pointerId !== d.pid && e.type !== 'pointercancel')) return;
  clearTimeout(DK.holdT); DK.drag = null;
  $('dkHand').classList.remove('over');
  if (d.tgtEl) d.tgtEl.classList.remove('target');
  if (d.ztEl) d.ztEl.classList.remove('target');
  if (d.zone) { // moving a spot (designing)
    if (d.moved) { const n = dkToNorm(e.clientX - d.dx, e.clientY - d.dy), z = ddZone(d.zone); if (z) { z.x = n.x; z.y = n.y; } sfx('place'); deckCommit(); }
    else ddZoneSheet(d.zone);
    return;
  }
  (d.els || []).forEach(el => el.classList.remove('dlift', 'dflat'));
  if (d.whole) d.hit.classList.remove('nt');
  document.querySelectorAll('#deck .dc.held').forEach(el => el.classList.remove('held'));
  if (!d.moved && d.held) { deckPileMenu(d.pile); return; }
  if (!d.moved) { // a tap
    if (d.from === 'pile' && !d.whole) { const p = dkPile(d.pile); const c = p && p.cards[p.cards.length - 1]; if (c) { deckSnap(); c.up = !c.up; sfx('flip'); deckCommit('flip'); dkTip(); } }
    else deckRender();
    return;
  }
  const cx = e.clientX - d.dx, cy = e.clientY - d.dy;
  deckSnap();
  // take the cards out of where they were
  let cards;
  if (d.from === 'hand') { const i = dkHand().findIndex(c => c.id === d.ids[0]); cards = [{ ...dkHand().splice(i, 1)[0], up: true }]; }
  else { const p = dkPile(d.pile); cards = d.whole ? p.cards.splice(0) : [p.cards.pop()]; }
  if (e.clientY > DK.H - DK.handH - 10 && !d.whole) { // into my hand
    const hn = dkHand().length, avail = DK.W - DK.cw - 24, step = hn > 0 ? Math.min(DK.cw * 0.62, avail / Math.max(1, hn)) : 0;
    const x0 = (DK.W - hn * step) / 2, idx = Math.max(0, Math.min(hn, Math.round((e.clientX - x0) / Math.max(1, step))));
    dkHand().splice(idx, 0, ...cards.map(c => ({ id: c.id, s: c.s, r: c.r })));
    sfx('slide');
  } else {
    const tgt = DK.st.piles.find(p => p.id === d.tgt);
    const zone = !tgt && ddZoneAt(cx, cy), zpile = zone && DK.st.piles.find(p => p.z === zone.id && p.cards.length);
    if (tgt) { tgt.cards.push(...cards); ddApplyFace(tgt.z && ddZone(tgt.z), cards); }
    else if (zpile) { zpile.cards.push(...cards); ddApplyFace(zone, cards); }
    else if (zone) { ddApplyFace(zone, cards); DK.st.piles.push({ id: dkId(), x: zone.x, y: zone.y, z: zone.id, cards }); }
    else { const n = dkToNorm(cx, cy); DK.st.piles.push({ id: dkId(), x: n.x, y: n.y, cards }); }
    sfx('place');
  }
  deckCommit('place'); dkTip();
}
function dkTip() { if (DK.tipsLeft > 0 && --DK.tipsLeft === 0) $('dkTips').classList.add('gone'); }

/* ---------- sheets ---------- */
function deckSheet(html, onClick) {
  deckCloseSheet();
  const s = document.createElement('div'); s.className = 'dsheet'; s.id = 'dkSheet';
  s.innerHTML = `<div class="dsc">${html}</div>`;
  s.addEventListener('click', e => { if (e.target === s || e.target.closest('[data-close]')) { sfx('click'); deckCloseSheet(); return; } onClick && onClick(e); });
  document.body.appendChild(s);
  return s;
}
function deckCloseSheet() { const s = $('dkSheet'); if (s) s.remove(); }
const dkHead = title => `<h3>${title}<button data-close aria-label="Close">${ic('close')}</button></h3>`;
function deckDealSheet() {
  const o = { n: 5, to: 'hand', up: false };
  try { Object.assign(o, JSON.parse(localStorage.getItem('kortbord-dealcfg')) || {}); } catch (e) {}
  const chips = (key, vals, label) => `<div class="chips" data-key="${key}">${vals.map(v => `<button data-v="${v}" class="${String(o[key]) === String(v) ? 'on' : ''}">${label ? label(v) : v}</button>`).join('')}</div>`;
  const s = deckSheet(`${dkHead(dt('dealTitle'))}
    <div class="q">${esc(dt('howMany'))}</div>${chips('n', [1, 2, 3, 4, 5, 6, 7, 10, 13])}
    <div class="q">${esc(dt('toWho'))}</div>${chips('to', ['hand', 2, 3, 4, 5, 6], v => (v === 'hand' ? esc(dt('myHand')) : esc(dt('piles', { n: v }))))}
    <div class="q">${esc(dt('faceQ'))}</div>${chips('up', [false, true], v => esc(dt(v ? 'faceUp' : 'faceDown')))}
    <button class="go" data-go>${ic('deal')} ${esc(dt('dealGo'))}</button>`, e => {
    const b = e.target.closest('[data-v]');
    if (b) { const k = b.parentElement.dataset.key; o[k] = k === 'n' || (k === 'to' && b.dataset.v !== 'hand') ? +b.dataset.v : k === 'up' ? b.dataset.v === 'true' : b.dataset.v;
      b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); sfx('click'); }
    if (e.target.closest('[data-go]')) { try { localStorage.setItem('kortbord-dealcfg', JSON.stringify(o)); } catch (err) {} deckCloseSheet(); deckDeal(o.n, o.to, o.up); }
  });
  return s;
}
function deckPileMenu(pid) {
  const p = dkPile(pid); if (!p) return;
  deckSheet(`${dkHead(esc(dt('pileTitle', { n: p.cards.length })))}
    <div class="menu">
      <button data-m="flip">${ic('flip')}${esc(dt('flipAll'))}</button>
      <button data-m="shuffle" ${p.cards.length < 2 ? 'disabled' : ''}>${ic('shuffle')}${esc(dt('shufflePile'))}</button>
      <button data-m="spread" ${p.cards.length < 2 ? 'disabled' : ''}>${ic('spread')}${esc(dt('spread'))}</button>
      <button data-m="take">${ic('hand')}${esc(dt('takeAll'))}</button>
    </div>`, e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const pile = dkPile(pid); deckCloseSheet(); if (!pile) return;
    deckSnap();
    if (b.dataset.m === 'flip') { pile.cards.reverse(); const up = !pile.cards[pile.cards.length - 1].up; pile.cards.forEach(c => (c.up = up)); sfx('flip'); }
    else if (b.dataset.m === 'shuffle') { dkShuffle(pile.cards); sfx('shuffle'); setTimeout(() => dkShakePile(pile), 30); }
    else if (b.dataset.m === 'take') { dkHand().push(...pile.cards.splice(0).map(c => ({ id: c.id, s: c.s, r: c.r }))); sfx('slide'); }
    else if (b.dataset.m === 'spread') { // lay the cards out in a row (wraps to more rows), face up
      const cards = pile.cards.splice(0), a = dkArea(), per = Math.max(1, Math.floor((a.x1 - a.x0) / (DK.cw * 0.42)) + 1);
      const sx = Math.min(1 / Math.max(1, Math.min(per, cards.length) - 1), (DK.cw * 0.42) / (a.x1 - a.x0));
      const rows = Math.ceil(cards.length / per), sy = Math.min(0.3, (DK.ch * 0.45) / (a.y1 - a.y0));
      cards.forEach((c, i) => { const row = Math.floor(i / per), col = i % per, inRow = Math.min(per, cards.length - row * per);
        c.up = true; DK.st.piles.push({ id: dkId(), x: Math.min(1, Math.max(0, 0.5 + (col - (inRow - 1) / 2) * sx)), y: Math.min(1, Math.max(0, pile.y - (rows - 1) * sy / 2 + row * sy)), cards: [c] }); });
      sfx('deal');
    }
    deckCommit();
  });
}
function deckHelp() {
  try { localStorage.setItem('kortbord-deckhelp', '1'); } catch (e) {}
  deckSheet(`${dkHead(esc(dt('help')))}<ul class="help">
    <li><b>${ic('hand')}</b>${esc(dt('help1'))}</li><li><b>${ic('flip')}</b>${esc(dt('help2'))}</li><li><b>${ic('down')}</b>${esc(dt('help3'))}</li>
    <li><b>${ic('dots')}</b>${esc(dt('help4'))}</li><li><b>${ic('layers')}</b>${esc(dt('help5'))}</li></ul>
    <button class="go" data-close>${esc(dt('gotIt'))}</button>`);
}

/* ---------- playing together (the server passes the table on to everyone in the room) ---------- */
function deckInvite() {
  if (!hasServer()) return;
  if (DK.online) { copyInvite(document.querySelector('#deck [data-dk="invite"]')); return; }
  toast(dt('connecting'));
  DK.local = JSON.stringify(DK.st); // my own table comes back when I leave
  DK.inviteAfter = true;
  enterRoom(randomCode(), 'deck', false).then(ok => { if (ok === false) { DK.inviteAfter = false; DK.local = null; } });
}
// the server sent the shared table (on joining, or after someone else changed it)
function deckOnline(m) {
  if (!DK.online) {
    DK.online = true; DK.me = me;
    if (!DK.local) DK.local = DK.st ? JSON.stringify(DK.st) : null;
    DK.hist = [];
    deckOpen(true);
  }
  if (m.st) {
    const before = DK.st;
    DK.st = dkFix(m.st);
    if (before && m.by && m.fx) sfx(m.fx === 'shuffle' ? 'shuffle' : m.fx);
  } else { // a new room: I bring my table
    const st = dkFix(JSON.parse(DK.local || 'null') || dkFreshState());
    if (st.hands.me) { st.hands[DK.me] = st.hands.me; delete st.hands.me; }
    DK.st = st; send({ t: 'deck', st: DK.st, fx: '' });
  }
  deckRender();
  if (DK.inviteAfter) { DK.inviteAfter = false; setTimeout(() => copyInvite(document.querySelector('#deck [data-dk="invite"]')), 300); }
}
function deckPeersMsg(m) {
  const old = new Set(DK.peers.map(p => p.pid));
  DK.peers = m.players || [];
  for (const p of DK.peers) if (old.size && !old.has(p.pid) && p.pid !== DK.me) { toast(dt('joined', { name: p.name })); sfx('pop'); }
  deckRender();
}
function deckOffline() {
  DK.online = false; DK.peers = [];
  let st = null; try { st = JSON.parse(DK.local || 'null'); } catch (e) {}
  DK.me = 'me'; DK.st = dkFix(st || dkFreshState()); DK.local = null; DK.hist = [];
}

/* ---------- games made by players (Community) ---------- */
// a fresh table laid out the way the game starts
function dkFromSetup(setup, players) {
  const cfg = setup.cfg || null;
  const cards = ddMakeCards(cfg && cfg.deck), st = { piles: [], hands: {} };
  if (cfg) { st.cfg = JSON.parse(JSON.stringify(cfg)); st.meta = { chips: {}, score: {}, turn: players[0] || null }; if (cfg.chips) players.forEach(p => (st.meta.chips[p] = cfg.chips)); }
  const take = () => cards.pop();
  const piles = (setup.piles || []).map(p => ({ id: dkId(), x: p.x, y: p.y, cards: [], src: p, ...(p.z ? { z: p.z } : {}) }));
  for (const pid of players) { st.hands[pid] = []; for (let i = 0; i < (setup.hand || 0) && cards.length; i++) { const c = take(); st.hands[pid].push({ id: c.id, s: c.s, r: c.r }); } }
  for (const p of piles) if (!p.src.rest) for (let i = 0; i < p.src.n && cards.length; i++) p.cards.push(take());
  const rest = piles.find(p => p.src.rest) || (cards.length ? (piles.push({ id: dkId(), x: 0.5, y: 0.42, cards: [], src: { face: 'down' } }), piles[piles.length - 1]) : null);
  if (rest) while (cards.length) rest.cards.push(take());
  for (const p of piles) { p.cards.forEach((c, i) => (c.up = p.src.face === 'up' || (p.src.face === 'top' && i === p.cards.length - 1))); delete p.src; st.piles.push(p); }
  return st;
}
function deckPlayGame(g) {
  DK.game = g; DK.creating = false; DK.hist = [];
  DK.st = dkFromSetup(g.setup || {}, [DK.me]);
  deckOpen(true); sfx('shuffle');
  if (g.rules) setTimeout(deckRules, 500);
}
function deckNewRound() {
  deckSnap();
  const players = DK.online ? DK.peers.map(p => p.pid) : [DK.me];
  DK.st = dkFromSetup(DK.game.setup, players.length ? players : [DK.me]);
  sfx('shuffle'); deckCommit('shuffle');
}
function deckCreate() {
  DK.game = null; DK.creating = true; DK.hist = [];
  DK.st = dkFreshState(); dkFix(DK.st); ddCfg();
  deckOpen(true); sfx('shuffle');
}
function deckRules() {
  const g = DK.game; if (!g) return;
  deckSheet(`${dkHead(esc(g.name))}<p style="white-space:pre-wrap;line-height:1.5;margin:0;max-height:55vh;overflow:auto">${esc(g.rules || g.desc || '')}</p><button class="go" data-close>${esc(t('gotIt'))}</button>`);
}
// what the table looks like now → how the game starts
function dkCaptureSetup() {
  const piles = DK.st.piles.map(p => { const up = p.cards.filter(c => c.up).length, top = p.cards[p.cards.length - 1];
    return { x: +p.x.toFixed(3), y: +p.y.toFixed(3), n: p.cards.length, face: up === p.cards.length ? 'up' : up === 1 && top.up ? 'top' : 'down', ...(p.z ? { z: p.z } : {}) }; });
  const big = piles.reduce((b, p, i) => (p.n > (b < 0 ? -1 : piles[b].n) ? i : b), -1);
  if (big >= 0) piles[big].rest = true; // the biggest pile gets whatever is left after dealing
  return { piles, hand: dkHand().length, cfg: DK.st.cfg || null };
}
function deckPublishSheet() {
  const o = { name: '', desc: '', rules: '', min: 2, max: 4, kids: true, public: true };
  const chips = (key, vals) => `<div class="chips" data-key="${key}">${vals.map(v => `<button data-v="${v}" class="${o[key] === v ? 'on' : ''}">${v}</button>`).join('')}</div>`;
  const sh = deckSheet(`${dkHead(esc(dt('pubTitle')))}
    <div class="q">${esc(dt('gName'))}</div><input class="dfield" id="pgName" maxlength="40" placeholder="${esc(dt('gNamePh'))}">
    <div class="q">${esc(dt('gDesc'))}</div><input class="dfield" id="pgDesc" maxlength="200" placeholder="${esc(dt('gDescPh'))}">
    <div class="q">${esc(dt('gRules'))}</div><textarea class="dfield" id="pgRules" rows="4" maxlength="3000" placeholder="${esc(dt('gRulesPh'))}"></textarea>
    <div class="q">${esc(dt('gPlayers'))}</div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${chips('min', [1, 2, 3, 4])}<span>–</span>${chips('max', [2, 4, 6, 8])}</div>
    <label class="dsw"><input type="checkbox" id="pgKids" checked> ${esc(dt('gKids'))}</label>
    <label class="dsw"><input type="checkbox" id="pgPublic" checked> ${esc(dt('gPublic'))}</label>
    <button class="go" data-pub>${ic('upload')} ${esc(dt('pubGo'))}</button>`, e => {
    const b = e.target.closest('[data-v]');
    if (b) { const k = b.parentElement.dataset.key; o[k] = +b.dataset.v; b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); sfx('click'); }
    if (!e.target.closest('[data-pub]')) return;
    const name = $('pgName').value.trim();
    if (name.length < 3) { toast(dt('pubNeedName')); sfx('error'); $('pgName').focus(); return; }
    if (!ws || ws.readyState !== 1 || ws instanceof LocalSocket) { toast(dt('pubOffline')); sfx('error'); return; }
    send({ t: 'publishDeck', name, desc: $('pgDesc').value.trim(), rules: $('pgRules').value.trim(), min: o.min, max: Math.max(o.min, o.max), kids: $('pgKids').checked, public: $('pgPublic').checked,
      author: myName || (typeof CG !== 'undefined' && CG.username) || '', setup: dkCaptureSetup() });
    DK.pubPending = { name, rules: $('pgRules').value.trim(), desc: $('pgDesc').value.trim(), setup: dkCaptureSetup() };
    deckCloseSheet(); sfx('win');
  });
  sh.querySelector('.dsc').style.maxHeight = '92vh'; sh.querySelector('.dsc').style.overflow = 'auto';
}
// the server saved it: keep playing it as the published game
function deckPublished(m) {
  if (!DK.pubPending) return;
  DK.game = { id: m.id, ...DK.pubPending }; DK.pubPending = null; DK.creating = false; deckTexts();
}
