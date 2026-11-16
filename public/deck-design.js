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
  en: { theDeck: 'The deck', eachHand: 'Each player\'s hand', turnHand: 'Hand of the player whose turn it is', toWhere: 'To where (choose one or more)', fromWhere: 'From where', topCard: 'Top card', allCards: 'All cards', whichSpots: 'Which spots', howMuch: 'How much',
    k_deal: 'Deal cards', k_move: 'Move cards', k_flip: 'Flip top card', k_reveal: 'Turn all face up', k_shuffle: 'Shuffle', k_collect: 'Collect all & shuffle', k_next: 'Next player\'s turn', k_chips: 'Chips to everyone', k_score: 'Points',
    sDeal: 'Deal {n} {f} to: {to}', sMoveTop: 'Move the top card from {from} to {to}', sMoveAll: 'Move all cards from {from} to {to}', sFlip: 'Flip the top card on {s}', sReveal: 'Turn all cards face up on {s}', sShuffle: 'Shuffle {s}', sChips: '{n} chips to everyone', sScore: '{n} points',
    editButton: 'Edit button', bLabelPh: 'e.g. Deal a round', whatItDoes: 'What it does, in order', addStep: 'Add a step', saveButton: 'Save button', needStep: 'Add at least one step', isDeck: 'This is the deck (cards are dealt from here)',
    dragButtons: 'Drag a button onto the table to place it there', guide: 'Guide', guideTitle: 'Make your own game', back: 'Back', next: 'Next', letsGo: 'Let\'s go!',
    g1t: '1. Lay out the table', g1x: 'Open Tools and add spots: piles, rows and columns – for example a draw pile, a discard pile and a pile for each player. Drag their names to put them where you want.',
    g2t: '2. Choose the cards', g2x: 'In Tools you choose how many decks, jokers or a short deck, and the colours of the table and the card backs.',
    g3t: '3. How a round starts', g3x: 'Deal cards into your hand and onto the spots exactly as a round should start. When someone plays your game, the table is laid out like this with a new shuffle.',
    g4t: '4. Make buttons', g4x: 'Buttons do the work: each button can do several steps in a row – e.g. deal 1 card face down to three piles, flip the top card, then pass the turn. Drag buttons onto the table to place them.',
    g5t: '5. Rules and publish', g5x: 'Press Publish, write the rules in plain words and share it in the Community. Use Invite to play it with friends.',
    deck1: '1 deck', decksN: '{n} decks', noJokers: 'No jokers', jokersN: '{n} jokers', tools: 'Tools', spots: 'Spots on the table', spotsHelp: 'Cards dropped on a spot go into it. Drag a spot\'s name to move it – tap it to change it.', addPile: 'Pile', addRow: 'Row', addCol: 'Column',
    cards: 'The cards', decks: 'Decks', jokers: 'Jokers', short: 'Short deck (7 to Ace)', applyDeck: 'Use these cards', look: 'Look', felt: 'Table', back: 'Card backs',
    players: 'Players', startHand: 'Cards in each hand at the start', startHandHelp: 'Deal cards into your hand on the table – that many is what everyone starts with.', chips: 'Starting chips', none: 'None', score: 'Keep score', turns: 'Take turns',
    buttons: 'Your game\'s buttons', buttonsHelp: 'Buttons everyone playing your game can press.', addButton: 'Add a button', noButtons: 'No buttons yet.',
    spot: 'Spot', spotName: 'Name', layout: 'Cards lie', lPile: 'In a pile', lRow: 'In a row', lCol: 'In a column', faceRule: 'Cards placed here', fAny: 'Stay as they are', fUp: 'Turn face up', fDown: 'Turn face down', del: 'Delete', done: 'Done',
    bDealAll: 'Deal to everyone', bDealSpot: 'Deal to a spot', bFlip: 'Flip top card', bToDeck: 'Back into the deck', bCollect: 'Collect & shuffle', bNext: 'Next player', bLabel: 'Button text', howMany: 'How many cards', toSpot: 'Which spot', faceUp: 'Face up', faceDown: 'Face down',
    needSpot: 'Add a spot first', endTurn: 'End turn', yourTurn: 'Your turn!', turnOf: '{name}\'s turn', chipsOf: 'Chips', scoreOf: 'Score', me: 'You', adjust: 'Change', deckLeft: 'The deck is empty' },
  sv: { theDeck: 'Leken', eachHand: 'Varje spelares hand', turnHand: 'Handen för den vars tur det är', toWhere: 'Vart (välj en eller flera)', fromWhere: 'Varifrån', topCard: 'Översta kortet', allCards: 'Alla kort', whichSpots: 'Vilka platser', howMuch: 'Hur mycket',
    k_deal: 'Dela ut kort', k_move: 'Flytta kort', k_flip: 'Vänd översta kortet', k_reveal: 'Vänd upp alla', k_shuffle: 'Blanda', k_collect: 'Samla allt och blanda', k_next: 'Nästa spelares tur', k_chips: 'Marker till alla', k_score: 'Poäng',
    sDeal: 'Dela {n} {f} till: {to}', sMoveTop: 'Flytta översta kortet från {from} till {to}', sMoveAll: 'Flytta alla kort från {from} till {to}', sFlip: 'Vänd översta kortet på {s}', sReveal: 'Vänd upp alla kort på {s}', sShuffle: 'Blanda {s}', sChips: '{n} marker till alla', sScore: '{n} poäng',
    editButton: 'Ändra knapp', bLabelPh: 't.ex. Dela en runda', whatItDoes: 'Vad den gör, i ordning', addStep: 'Lägg till ett steg', saveButton: 'Spara knappen', needStep: 'Lägg till minst ett steg', isDeck: 'Det här är leken (kort delas ut härifrån)',
    dragButtons: 'Dra en knapp till bordet för att placera den där', guide: 'Guide', guideTitle: 'Gör ditt eget spel', back: 'Tillbaka', next: 'Nästa', letsGo: 'Nu kör vi!',
    g1t: '1. Lägg upp bordet', g1x: 'Öppna Verktyg och lägg till platser: högar, rader och kolumner – till exempel en draghög, en kasthög och en hög per spelare. Dra i namnen för att placera dem.',
    g2t: '2. Välj korten', g2x: 'I Verktyg väljer du antal lekar, jokrar eller kort lek, och färg på bordet och baksidorna.',
    g3t: '3. Hur en runda börjar', g3x: 'Dela ut kort till din hand och på platserna precis som en runda ska börja. När någon spelar ditt spel läggs bordet upp så här med en ny blandning.',
    g4t: '4. Gör knappar', g4x: 'Knapparna gör jobbet: varje knapp kan göra flera steg i rad – t.ex. dela 1 kort nedvänt till tre högar, vända översta kortet och sedan ge turen vidare. Dra knapparna till bordet för att placera dem.',
    g5t: '5. Regler och publicera', g5x: 'Tryck Publicera, skriv reglerna med vanliga ord och dela i Community. Bjud in för att spela med vänner.',
    deck1: '1 lek', decksN: '{n} lekar', noJokers: 'Inga jokrar', jokersN: '{n} jokrar', tools: 'Verktyg', spots: 'Platser på bordet', spotsHelp: 'Kort som släpps på en plats hamnar där. Dra i platsens namn för att flytta den – tryck för att ändra.', addPile: 'Hög', addRow: 'Rad', addCol: 'Kolumn',
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
    <label class="dsw"><input type="checkbox" id="zDeck" ${z.deck ? 'checked' : ''}> ${esc(ddt('isDeck'))}</label>
    <div style="display:flex;gap:10px;margin-top:18px"><button class="go" style="margin:0;background:#f3eee4;color:#7a2a24;box-shadow:none;flex:1" data-del>${ic('trash')} ${esc(ddt('del'))}</button><button class="go" style="margin:0;flex:2" data-ok>${esc(ddt('done'))}</button></div>`, e => {
    const b = e.target.closest('[data-v]');
    if (b) { z[b.parentElement.dataset.key] = b.dataset.v; b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); sfx('click'); }
    if (e.target.closest('[data-del]')) { deckSnap(); const cfg = ddCfg(); cfg.zones = cfg.zones.filter(x => x.id !== id); DK.st.piles.forEach(p => { if (p.z === id) delete p.z; }); deckCloseSheet(); sfx('slide'); deckCommit(); }
    if (e.target.closest('[data-ok]')) { z.name = $('zName').value.trim().slice(0, 20) || z.name; const dk = $('zDeck').checked; if (dk) ddCfg().zones.forEach(x => (x.deck = false)); z.deck = dk; deckCloseSheet(); deckCommit(); }
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
  ddRenderButtons();
  bar.innerHTML = btns.filter(b => b.x == null).map(b => `<button class="dtool gb" data-gb="${esc(b.id)}" style="--bc:${DD_TONES[b.tone] || DD_TONES.blue}">${esc(b.label)}</button>`).join('') +
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

/* ---------- the game's own buttons ----------
   A button runs its steps in order. Steps:
     deal    { n, to: ['hands' | 'me' | spotId …], face }   n cards from the deck to each target, round by round
     move    { from: spotId|'deck', to: spotId|'deck'|'me'|'hands', which: 'top'|'all', face }
     flip    { spots: [spotId …] }    turn the top card over        reveal { spots } – all cards face up
     shuffle { spot: spotId|'deck' }  collect – everything back into the deck, shuffled
     next – next player's turn        chips { n } – every player gets n chips   score { n } – the player who pressed gets n points
   Buttons can sit anywhere on the table (x, y) – drag them while designing. */
const DD_KINDS = ['deal', 'move', 'flip', 'reveal', 'shuffle', 'collect', 'next', 'chips', 'score'];
const DD_TONES = { blue: '#2f74d8', green: '#21a35e', orange: '#ffb02e', red: '#e0443a', dark: '#1f2433' };
const ddSteps = b => (b.steps || (b.step ? [b.step] : [])).map(st => (['dealAll', 'dealSpot', 'toDeck'].includes(st.k) || (st.k === 'flip' && st.zone && !(st.spots && st.spots.length)) ? ddOldStep(st) : st));
function ddOldStep(s) { // buttons made before steps existed
  if (s.k === 'dealAll') return { k: 'deal', n: s.n || 1, to: ['hands'], face: 'up' };
  if (s.k === 'dealSpot') return { k: 'deal', n: s.n || 1, to: [s.zone], face: s.face || 'up' };
  if (s.k === 'toDeck') return { k: 'move', from: s.zone, to: 'deck', which: 'all', face: 'down' };
  if (s.k === 'flip') return { k: 'flip', spots: [s.zone] };
  return { k: s.k };
}
// the deck = the spot marked as deck, otherwise the biggest pile that is not on a spot
function ddDeckPile() {
  const dz = (ddCfg().zones || []).find(z => z.deck);
  if (dz) return ddZonePile(dz.id);
  return DK.st.piles.filter(p => !p.z).sort((a, c) => c.cards.length - a.cards.length)[0] || dkBiggest() || ddNewPile(0.5, 0.42);
}
function ddNewPile(x, y, z) { const p = { id: dkId(), x, y, cards: [], ...(z ? { z } : {}) }; DK.st.piles.push(p); return p; }
function ddZonePile(zid) { let p = DK.st.piles.find(x => x.z === zid); if (!p) { const z = ddZone(zid); if (!z) return null; p = ddNewPile(z.x, z.y, zid); } return p; }
const ddHandOf = pid => DK.st.hands[pid] || (DK.st.hands[pid] = []);
const ddTurnPid = () => (ddCfg().turns && ddMeta().turn) || DK.me;
function ddPut(target, cards, face) {
  if (target === 'me' || target === 'hands' || (typeof target === 'object' && target.hand)) {
    const pid = typeof target === 'object' ? target.hand : ddTurnPid();
    ddHandOf(pid).push(...cards.map(c => ({ id: c.id, s: c.s, r: c.r }))); return;
  }
  const p = target === 'deck' ? ddDeckPile() : ddZonePile(target); if (!p) return;
  cards.forEach(c => (c.up = face === 'up' ? true : face === 'down' ? false : c.up));
  if (target !== 'deck') ddApplyFace(ddZone(target), cards);
  p.cards.push(...cards);
}
function ddTake(from, which) {
  const p = from === 'deck' ? ddDeckPile() : DK.st.piles.find(x => x.z === from);
  if (!p || !p.cards.length) return [];
  return which === 'all' ? p.cards.splice(0) : [p.cards.pop()];
}
// run a button: quick steps at once, dealing one card at a time so it looks and sounds like a dealer
async function ddRunButton(id) {
  if (DK.running) return;
  if (id === '__next') { deckSnap(); ddNextTurn(); sfx('pop'); deckCommit(); return; }
  const b = (ddCfg().buttons || []).find(x => x.id === id); if (!b) return;
  DK.running = true; deckSnap();
  const wait = ms => new Promise(r => setTimeout(r, ms));
  try {
    for (const s of ddSteps(b)) {
      if (s.k === 'deal') {
        const tos = []; for (const t of s.to || ['hands']) { if (t === 'hands') ddPlayers().forEach(p => tos.push({ hand: p.pid })); else tos.push(t); }
        let dealt = 0;
        for (let r = 0; r < (s.n || 1); r++) for (const t of tos) { const c = ddTake('deck', 'top')[0]; if (!c) break; ddPut(t, [c], s.face); dealt++; sfx('deal'); deckRender(); await wait(110); }
        if (!dealt) toast(ddt('deckLeft'));
      } else if (s.k === 'move') {
        const cs = ddTake(s.from || 'deck', s.which || 'top');
        if (s.to === 'hands') { const ps = ddPlayers(); cs.forEach((c, i) => ddPut({ hand: ps[i % ps.length].pid }, [c], s.face)); } else ddPut(s.to || 'deck', cs, s.face);
        if (s.to === 'deck' && cs.length > 1) dkShuffle(ddDeckPile().cards);
        sfx(cs.length > 1 ? 'slide' : 'place');
      } else if (s.k === 'flip' || s.k === 'reveal') {
        for (const z of s.spots || []) { const p = DK.st.piles.find(x => x.z === z); if (!p || !p.cards.length) continue; if (s.k === 'flip') { const c = p.cards[p.cards.length - 1]; c.up = !c.up; } else p.cards.forEach(c => (c.up = true)); }
        sfx('flip');
      } else if (s.k === 'shuffle') { const p = s.spot && s.spot !== 'deck' ? DK.st.piles.find(x => x.z === s.spot) : ddDeckPile(); if (p) { dkShuffle(p.cards); p.cards.forEach(c => (c.up = false)); dkShakePile(p); } sfx('shuffle'); }
      else if (s.k === 'collect') { const all = [...DK.st.piles.flatMap(p => p.cards.splice(0)), ...Object.values(DK.st.hands).flatMap(h => h.splice(0))]; all.forEach(c => (c.up = false)); const dp = ddDeckPile(); dp.cards.push(...all.map(c => ({ id: c.id, s: c.s, r: c.r, up: false }))); dkShuffle(dp.cards); sfx('shuffle'); }
      else if (s.k === 'next') { ddNextTurn(); sfx('pop'); }
      else if (s.k === 'chips') { const m = ddMeta(), cfg = ddCfg(); ddPlayers().forEach(p => (m.chips[p.pid] = Math.max(0, (m.chips[p.pid] ?? cfg.chips) + (s.n || 0)))); sfx('place'); }
      else if (s.k === 'score') { const m = ddMeta(), pid = ddTurnPid(); m.score[pid] = (m.score[pid] || 0) + (s.n || 0); sfx('pop'); }
      deckRender();
      if (s !== ddSteps(b).slice(-1)[0]) await wait(160);
    }
  } finally { DK.running = false; deckCommit('deal'); }
}
// what a step does, in words
function ddStepText(s) {
  const zn = id => (id === 'deck' ? ddt('theDeck') : id === 'hands' ? ddt('eachHand') : id === 'me' ? ddt('turnHand') : (ddZone(id) || {}).name || '?');
  const face = s.face === 'down' ? ddt('faceDown') : s.face === 'up' ? ddt('faceUp') : '';
  switch (s.k) {
    case 'deal': return ddt('sDeal', { n: s.n || 1, to: (s.to || ['hands']).map(zn).join(', '), f: face.toLowerCase() });
    case 'move': return ddt(s.which === 'all' ? 'sMoveAll' : 'sMoveTop', { from: zn(s.from || 'deck'), to: zn(s.to || 'deck') }) + (face ? ` (${face.toLowerCase()})` : '');
    case 'flip': return ddt('sFlip', { s: (s.spots || []).map(zn).join(', ') });
    case 'reveal': return ddt('sReveal', { s: (s.spots || []).map(zn).join(', ') });
    case 'shuffle': return ddt('sShuffle', { s: zn(s.spot || 'deck') });
    case 'chips': return ddt('sChips', { n: (s.n > 0 ? '+' : '') + (s.n || 0) });
    case 'score': return ddt('sScore', { n: (s.n > 0 ? '+' : '') + (s.n || 0) });
    default: return ddt('k_' + s.k);
  }
}
// edit (or make) a button: name, colour and its steps
function ddButtonSheet(id) {
  const cfg = ddCfg(), zones = cfg.zones || [];
  const orig = id && cfg.buttons.find(b => b.id === id);
  const b = orig ? JSON.parse(JSON.stringify({ ...orig, steps: ddSteps(orig) })) : { id: 'b' + Math.random().toString(36).slice(2, 7), label: '', tone: 'blue', steps: [] };
  delete b.step;
  let edit = b.steps.length ? -1 : 'new'; // which step is open: index, 'new' (choose a kind) or -1 (none)
  const spotChips = (key, list, multi, extra = []) => { const opts = [...extra, ...zones.map(z => [z.id, z.name])];
    return opts.length ? `<div class="chips" data-key="${key}" data-multi="${multi ? 1 : ''}">${opts.map(([v, l]) => { const on = multi ? (list || []).includes(v) : list === v; return `<button data-v="${esc(v)}" class="${on ? 'on' : ''}">${esc(l)}</button>`; }).join('')}</div>` : `<p class="dhelp" style="color:#b0473a">${esc(ddt('needSpot'))}</p>`; };
  const numChips = (key, val, vals) => `<div class="chips" data-key="${key}">${vals.map(n => `<button data-v="${n}" class="${val === n ? 'on' : ''}">${n > 0 && key !== 'n' ? '+' : ''}${n}</button>`).join('')}</div>`;
  const faceChips = val => `<div class="chips" data-key="face">${[['up', ddt('faceUp')], ['down', ddt('faceDown')], ['', ddt('fAny')]].map(([v, l]) => `<button data-v="${v}" class="${(val || '') === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
  const stepForm = s => {
    if (s.k === 'deal') return `<div class="q">${esc(ddt('howMany'))}</div>${numChips('n', s.n, [1, 2, 3, 4, 5, 7, 10, 13])}
      <div class="q">${esc(ddt('toWhere'))}</div>${spotChips('to', s.to, true, [['hands', ddt('eachHand')], ['me', ddt('turnHand')]])}<div class="q">${esc(ddt('faceRule'))}</div>${faceChips(s.face)}`;
    if (s.k === 'move') return `<div class="q">${esc(ddt('fromWhere'))}</div>${spotChips('from', s.from, false, [['deck', ddt('theDeck')]])}
      <div class="chips" data-key="which" style="margin-top:8px">${[['top', ddt('topCard')], ['all', ddt('allCards')]].map(([v, l]) => `<button data-v="${v}" class="${(s.which || 'top') === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>
      <div class="q">${esc(ddt('toWhere'))}</div>${spotChips('to', s.to, false, [['deck', ddt('theDeck')], ['me', ddt('turnHand')], ['hands', ddt('eachHand')]])}<div class="q">${esc(ddt('faceRule'))}</div>${faceChips(s.face)}`;
    if (s.k === 'flip' || s.k === 'reveal') return `<div class="q">${esc(ddt('whichSpots'))}</div>${spotChips('spots', s.spots, true)}`;
    if (s.k === 'shuffle') return `<div class="q">${esc(ddt('whichSpots'))}</div>${spotChips('spot', s.spot || 'deck', false, [['deck', ddt('theDeck')]])}`;
    if (s.k === 'chips') return `<div class="q">${esc(ddt('howMuch'))}</div>${numChips('n', s.n, [-100, -10, 10, 50, 100, 500])}`;
    if (s.k === 'score') return `<div class="q">${esc(ddt('howMuch'))}</div>${numChips('n', s.n, [-5, -1, 1, 2, 5, 10])}`;
    return '';
  };
  const render = () => `${dkHead(esc(ddt(orig ? 'editButton' : 'addButton')))}
    <div class="q">${esc(ddt('bLabel'))}</div><input class="dfield" id="bLabel" maxlength="20" placeholder="${esc(ddt('bLabelPh'))}" value="${esc(b.label)}">
    <div class="chips" style="margin-top:8px">${Object.entries(DD_TONES).map(([k, c]) => `<button data-tone="${k}" class="swatch${b.tone === k ? ' on' : ''}" style="--sw:${c}" aria-label="${k}"></button>`).join('')}</div>
    <div class="q">${esc(ddt('whatItDoes'))}</div>
    <div class="steps">${b.steps.map((s, i) => `<div class="step${edit === i ? ' open' : ''}"><div class="sh" data-open="${i}"><i>${i + 1}</i><span>${esc(ddStepText(s))}</span>
      ${i ? `<button data-up="${i}" aria-label="Up">${ic('up')}</button>` : ''}<button data-dels="${i}" aria-label="${esc(ddt('del'))}">${ic('trash')}</button></div>${edit === i ? `<div class="sf">${stepForm(s)}</div>` : ''}</div>`).join('')}</div>
    ${edit === 'new' ? `<div class="kinds">${DD_KINDS.map(k => `<button data-kind="${k}">${esc(ddt('k_' + k))}</button>`).join('')}</div>` : `<button class="go small" style="background:#f3eee4;color:#1f2433;box-shadow:none" data-newstep>${ic('plus')} ${esc(ddt('addStep'))}</button>`}
    <div style="display:flex;gap:10px;margin-top:16px">${orig ? `<button class="go" style="margin:0;background:#f3eee4;color:#7a2a24;box-shadow:none;flex:1" data-delb>${ic('trash')}</button>` : ''}<button class="go" style="margin:0;flex:3" data-save>${esc(ddt('saveButton'))}</button></div>`;
  const sh = deckSheet(render(), e => {
    const t = e.target, again = () => { b.label = ($('bLabel') || {}).value ?? b.label; sh.querySelector('.dsc').innerHTML = render(); };
    const tone = t.closest('[data-tone]'); if (tone) { b.tone = tone.dataset.tone; sfx('click'); again(); return; }
    const kind = t.closest('[data-kind]'); if (kind) { const k = kind.dataset.kind, z0 = zones[0] && zones[0].id;
      b.steps.push(k === 'deal' ? { k, n: 1, to: ['hands'], face: 'down' } : k === 'move' ? { k, from: 'deck', to: z0 || 'me', which: 'top', face: 'up' } : k === 'flip' || k === 'reveal' ? { k, spots: z0 ? [z0] : [] } : k === 'shuffle' ? { k, spot: 'deck' } : k === 'chips' ? { k, n: 10 } : k === 'score' ? { k, n: 1 } : { k });
      edit = b.steps.length - 1; sfx('pop'); again(); return; }
    if (t.closest('[data-newstep]')) { edit = 'new'; again(); return; }
    const up = t.closest('[data-up]'); if (up) { const i = +up.dataset.up; [b.steps[i - 1], b.steps[i]] = [b.steps[i], b.steps[i - 1]]; edit = -1; sfx('click'); again(); return; }
    const dels = t.closest('[data-dels]'); if (dels) { b.steps.splice(+dels.dataset.dels, 1); edit = -1; sfx('slide'); again(); return; }
    const op = t.closest('[data-open]'); if (op) { const i = +op.dataset.open; edit = edit === i ? -1 : i; again(); return; }
    const v = t.closest('[data-v]');
    if (v && typeof edit === 'number' && edit >= 0) { const s = b.steps[edit], key = v.parentElement.dataset.key, multi = v.parentElement.dataset.multi, val = v.dataset.v;
      if (multi) { const list = s[key] || (s[key] = []); const i = list.indexOf(val); if (i >= 0) list.splice(i, 1); else list.push(val); }
      else s[key] = key === 'n' ? +val : val;
      sfx('click'); again(); return; }
    if (t.closest('[data-delb]')) { deckSnap(); cfg.buttons = cfg.buttons.filter(x => x.id !== b.id); deckCloseSheet(); sfx('slide'); deckCommit(); return; }
    if (t.closest('[data-save]')) {
      if (!b.steps.length) { toast(ddt('needStep')); sfx('error'); return; }
      b.label = ($('bLabel').value.trim() || ddStepText(b.steps[0])).slice(0, 20);
      deckSnap();
      if (orig) Object.assign(orig, b), delete orig.step; else { b.x = null; b.y = null; cfg.buttons.push(b); }
      deckCloseSheet(); sfx('pop'); deckCommit();
    }
  });
  sh.querySelector('.dsc').classList.add('tall');
}
// buttons on the table (placed by the designer) – the rest sit in the row above the deck tools
function ddRenderButtons() {
  const t = $('dkTable'), cfg = DK.st.cfg, live = new Set();
  DK.bels = DK.bels || new Map();
  for (const b of (cfg && cfg.buttons) || []) {
    if (b.x == null) continue;
    live.add(b.id);
    let el = DK.bels.get(b.id);
    if (!el) { el = document.createElement('button'); el.className = 'dgbtn'; el.dataset.gb = b.id; t.appendChild(el); DK.bels.set(b.id, el); }
    const c = dkToPx(b.x, b.y);
    el.textContent = b.label; el.style.setProperty('--bc', DD_TONES[b.tone] || DD_TONES.blue);
    el.classList.toggle('edit', DK.creating);
    if (!(DK.drag && DK.drag.button === b.id)) el.style.transform = `translate(calc(${c.x}px - 50%),calc(${c.y}px - 50%))`;
  }
  for (const [id, el] of DK.bels) if (!live.has(id)) { el.remove(); DK.bels.delete(id); }
}

/* ---------- a short guide for making a game ---------- */
function ddGuide(i = 0) {
  const steps = ['g1', 'g2', 'g3', 'g4', 'g5'];
  try { localStorage.setItem('kortbord-designguide', '1'); } catch (e) {}
  deckSheet(`${dkHead(`${esc(ddt('guideTitle'))} <small style="color:#6c7488;font-size:14px;margin-left:6px">${i + 1}/${steps.length}</small>`)}
    <div class="guide"><b>${esc(ddt(steps[i] + 't'))}</b><p>${esc(ddt(steps[i] + 'x'))}</p></div>
    <div class="gdots">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
    <div style="display:flex;gap:10px;margin-top:14px">${i ? `<button class="go" style="margin:0;background:#f3eee4;color:#1f2433;box-shadow:none;flex:1" data-g="${i - 1}">${esc(ddt('back'))}</button>` : ''}
      <button class="go" style="margin:0;flex:2" ${i < steps.length - 1 ? `data-g="${i + 1}"` : 'data-close'}>${esc(ddt(i < steps.length - 1 ? 'next' : 'letsGo'))}</button></div>`, e => {
    const g = e.target.closest('[data-g]'); if (g) { sfx('click'); ddGuide(+g.dataset.g); }
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
    <div class="blist">${cfg.buttons.length ? cfg.buttons.map(b => `<div class="bitem" data-editb="${esc(b.id)}"><b>${esc(b.label)}</b><small>${esc(ddSteps(b).map(ddStepText).join(' → '))}</small><button data-delb="${esc(b.id)}" aria-label="${esc(ddt('del'))}">${ic('trash')}</button></div>`).join('') : `<p class="dhelp">${esc(ddt('noButtons'))}</p>`}</div>
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
    const eb = t.closest('[data-editb]'); if (eb) { ddButtonSheet(eb.dataset.editb); return; }
    if (t.closest('[data-addb]')) { ddButtonSheet(); }
  });
  sh.querySelector('.dsc').classList.add('tall');
}
// table colour + card backs on screen
function ddApplyLook() {
  const cfg = DK.st.cfg || {}, f = DD_FELTS[cfg.felt] || DD_FELTS.green, b = DD_BACKS[cfg.back] || DD_BACKS.red, s = $('deck').style;
  s.setProperty('--felt1', f[0]); s.setProperty('--felt2', f[1]); s.setProperty('--back1', b[0]); s.setProperty('--back2', b[1]);
}
