/* =========================================================
   Rule-based games UI (oval table). The server sends a ready-made "view" ({t:'eng', v}):
   seats, piles in the middle, my hand, the buttons I may press and a hint text.
   This file only draws it and sends taps/drags back – all rules live on the server.
   Uses globals from index.html: $, esc, send, toast, room, showRules, store.
   ========================================================= */
let evRoomKey = '', evNextAt = 0, evTick = null;
let EV = null, evPending = null, evDrag = null, evSuppressClick = false, evSeenIds = new Set(), evResultKey = '', evMsgKey = '';

function engInit() {
  const el = $('eng');
  if (el.dataset.ready) return;
  el.dataset.ready = '1';
  el.innerHTML = `
    <header class="etop">
      <button class="ebtn-top" id="eBack" data-i18n-title="toStart"><i data-ic="home"></i> <span class="lbl" data-i18n="home"></span></button>
      <div class="title"><span id="eTitle"></span></div>
      <div class="roomcode" data-i18n-title="roomCodeTip"><small data-i18n="roomCode"></small><b id="eCode"></b></div>
      <button class="ebtn-top invite" id="eInvite"><i data-ic="link"></i> <span data-i18n="invite"></span></button>
      <button class="ebtn-top" id="eRules"><i data-ic="book"></i> <span class="lbl" data-i18n="rules"></span></button>
    </header>
    <div class="etable" id="eTable">
      <div class="oval" id="eOval"></div>
      <div class="ecenter" id="eCenter"></div>
      <div id="eSeats"></div>
      <div class="ebanner hide" id="eBanner"></div>
      <div class="ewatch" id="eWatch"></div>
      <div class="emsg hide" id="eMsg"></div>
    </div>
    <div class="ehint" id="eHint"></div>
    <div class="eidle" id="eIdle"></div>
    <div class="ebuttons" id="eButtons"></div>
    <div class="ehand none" id="eHand"><div class="hlabel" id="eHandLabel"></div><div class="hcards" id="eHandCards"></div></div>
    <div id="eResult" class="hide"></div>`;
  applyI18n(el); applyIcons(el);
  $('eBack').onclick = () => goHome();
  $('eRules').onclick = () => EV && showRules(EV.meta.name, EV.meta.rules);
  $('eInvite').onclick = () => (localRoom ? goOnline() : copyInvite($('eInvite')));
  el.addEventListener('click', engClick);
  el.addEventListener('pointerdown', engDown);
  window.addEventListener('pointermove', engMove);
  window.addEventListener('pointerup', engUp);
  window.addEventListener('pointercancel', engUp);
  let rz = 0; // redraw on the next frame (avoids the browser's ResizeObserver loop warning)
  new ResizeObserver(() => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => EV && renderEngine()); }).observe($('eTable'));
}
async function copyInvite(btn) {
  const link = inviteLinkFor(room); // CrazyGames: their invite link; otherwise our own address
  let copied = false;
  try { await navigator.clipboard.writeText(link); copied = true; } catch (e) { prompt(t('copyPrompt'), link); }
  if (!copied) return;
  const old = btn.innerHTML;
  btn.classList.add('done'); btn.innerHTML = ic('check') + ' <span>' + esc(t('linkCopied')) + '</span>';
  toast(t('linkCopiedToast', { code: room }));
  setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = old; }, 2200);
}

function showEngine(v) {
  engInit();
  v = deEmojiDeep(v); // the rules' texts may contain emojis – we show plain text and real symbols
  if (v.layout === 'chess') chessUpdate(v); else engSounds(v);
  $('landing').classList.add('hide'); $('game').classList.add('hide'); $('eng').classList.remove('hide');
  if (evDrag) { evPending = v; return; } // don't redraw under a finger that is dragging
  const firstTime = !EV;
  EV = v; renderEngine();
  // CrazyGames: playing vs. break (lobby/result), and whether friends can still join this room
  cgGameplay(v.phase === 'game' && !v.result);
  const roomKey = v.code + (v.phase === 'lobby' || v.seats.some(x => x && x.bot));
  if (roomKey !== evRoomKey) { evRoomKey = roomKey; cgRoom(v.code, v.phase === 'lobby' || v.seats.some(x => x && x.bot)); }
  if (firstTime && !store.get('localStorage', 'kortbord-guide2')) setTimeout(openGuide, 500);
}

/* ---------- drawing ---------- */
function ecard(c, extra = '', attrs = '') {
  if (!c) return `<div class="ec back ${extra}" ${attrs}></div>`;
  const isNew = c.id && !evSeenIds.has(c.id);
  const face = ['J', 'Q', 'K'].includes(c.r) ? `<b class="fl">${c.r}</b>${suitSVG(c.s)}` : suitSVG(c.s);
  return `<div class="ec${c.red ? ' red' : ''}${isNew ? ' deal-in' : ''} ${extra}" data-cid="${esc(c.id || '')}" ${attrs} aria-label="${esc(c.r + ' ' + c.s)}">
    <span class="tl">${esc(c.r)}${suitSVG(c.s)}</span><span class="mid${['J', 'Q', 'K'].includes(c.r) ? ' face' : ''}">${face}</span></div>`;
}
function seatPos(i, n, me, W, H, ow, oh) {
  const rel = ((i - (me >= 0 ? me : 0)) % n + n) % n;
  const ang = (90 + (rel * 360) / n) * Math.PI / 180;
  const rx = ow / 2 + 26, ry = oh / 2 + 22;
  const mx = Math.min(85, W / 6); // keep seat buttons fully on screen
  return { x: Math.min(W - mx, Math.max(mx, W / 2 + rx * Math.cos(ang))), y: Math.min(H - 50, Math.max(48, H / 2 + ry * Math.sin(ang))), ang };
}
function renderEngine() {
  const v = EV; if (!v) return;
  const T = $('eTable'), W = T.clientWidth, H = T.clientHeight;
  const solo = v.layout === 'solitaire';
  T.classList.toggle('solitaire', solo);
  T.classList.toggle('chess', v.layout === 'chess' && v.phase === 'game');
  $('eTitle').innerHTML = `${gameBadge(v.meta.id)} ${esc(v.meta.name)}`;
  $('eCode').textContent = v.code;
  $('eCode').parentElement.classList.toggle('hide', localRoom);
  $('eInvite').classList.toggle('hide', localRoom && !hasServer());

  // oval size: wide on computers, tall on phones
  const portrait = W < H * 0.9;
  let ow, oh;
  if (portrait) { ow = W * 0.72; oh = Math.min(H * 0.66, ow * 1.35); } else { oh = H * 0.62; ow = Math.min(W * 0.78, oh * 1.9); }
  const O = $('eOval'); O.style.width = ow + 'px'; O.style.height = oh + 'px';
  let cw = Math.max(40, Math.min(78, Math.min(ow, oh) * 0.17));
  if (solo) cw = Math.max(36, Math.min(90, (W - 16 - 6 * 10) / 7, (H - 40) / 6));
  T.style.setProperty('--cw', cw + 'px'); T.style.setProperty('--cw0', cw + 'px'); T.style.setProperty('--gap', solo ? Math.max(4, Math.min(14, (W - cw * 7) / 8)) + 'px' : '10px');
  const hw = Math.max(50, Math.min(104, innerWidth / 7.5, innerHeight * (innerHeight < 560 ? 0.13 : 0.15))); // smaller hand in small windows
  $('eng').style.setProperty('--hw', hw + 'px');

  // seats
  const n = v.seats.length, seatsEl = $('eSeats'), compact = H < 330;
  seatsEl.innerHTML = solo ? '' : v.seats.map((s, i) => {
    const p = seatPos(i, n, v.me, W, H, ow, oh);
    const style = `left:${p.x}px;top:${p.y}px`;
    if (s && s.me && compact && v.hand && v.phase === 'game') return ''; // small window: my hand + the orange bar already show my info
    if (!s) return v.phase === 'lobby' ? `<div class="eseat empty" style="${style}"><button class="sit" data-sit="${i}">${esc(t('sitHere'))}</button></div>` : '';
    const info = [s.cards != null ? `${ic('card')} ${s.cards}` : '', s.chips != null ? `${ic('coins')} ${fmt(s.chips)}` : '', s.score != null && s.chips == null ? `${ic('star')} ${s.score}` : ''].filter(Boolean).join(' · ');
    const shown = (s.shown || []).length && !(s.me && v.hand) ? `<div class="shown">${s.shown.map(c => ecard(c)).join('')}</div>` : ''; // my own cards are shown big in the hand
    const label = s.label ? `<div class="st${/Tjock|Lade sig|Slut|Bust|Folded|Out of/.test(s.label) ? ' bad' : ''}">${esc(s.label)}</div>` : '';
    const bet = s.bet ? `<div class="info">${esc(t('bet'))}: ${ic('coins')} ${fmt(s.bet)}</div>` : '';
    const take = v.phase === 'game' && s.bot && v.me < 0 ? `<button class="sit" data-sit="${i}">${esc(t('takeSeat'))}</button>` : '';
    const x = v.phase === 'lobby' && s.bot ? `<button class="x" data-rmbot="${i}" aria-label="${esc(t('removeBot'))}">✕</button>` : '';
    return `<div class="eseat${s.me ? ' me' : ''}${s.bot ? ' bot' : ''}${s.away ? ' away' : ''}${v.turn === i ? ' turn' : ''}${s.tap ? ' tap' : ''}" style="${style}" ${s.tap ? `data-seat="${i}"` : ''}>
      ${x}<div class="av" style="--c:${s.color}">${s.bot ? ic('bot') : esc((s.name || '?')[0].toUpperCase())}${s.dealer ? '<span class="dealer">D</span>' : ''}</div>
      <div class="nm">${s.me ? esc(t('you')) : esc(s.name)}</div>${info ? `<div class="info">${info}</div>` : ''}${bet}${label}
      ${s.away ? `<div class="awaytxt">${esc(t('away'))}</div>` : ''}${shown}${take}</div>`;
  }).join('');

  // nudge seats that stick out of the table area back inside (tall seats on small phones)
  const tr = T.getBoundingClientRect();
  seatsEl.querySelectorAll('.eseat').forEach(el => {
    const r = el.getBoundingClientRect(); let dx = 0, dy = 0;
    if (r.bottom > tr.bottom - 4) dy = tr.bottom - 4 - r.bottom;
    if (r.top + dy < tr.top + 4) dy = tr.top + 4 - r.top;
    if (r.right > tr.right - 4) dx = tr.right - 4 - r.right;
    if (r.left + dx < tr.left + 4) dx = tr.left + 4 - r.left;
    if (dx || dy) { el.style.left = parseFloat(el.style.left) + dx + 'px'; el.style.top = parseFloat(el.style.top) + dy + 'px'; }
  });

  // middle of the table
  const C = $('eCenter');
  if (v.phase === 'lobby') {
    C.innerHTML = `<div class="elobby"><div class="big">${v.meta.emoji}</div><h2>${esc(v.meta.name)}</h2>
      ${localRoom ? '' : `<div class="codelbl">${esc(t('codeHelp'))}</div><div class="code">${esc(v.code)}</div>`}
      ${localRoom && !hasServer() ? '' : `<button class="invite" id="eInvite2">${ic('link')} ${esc(t('inviteFriends'))}</button>`}</div>`;
    if ($('eInvite2')) $('eInvite2').onclick = () => (localRoom ? goOnline() : copyInvite($('eInvite2')));
  } else if (v.layout === 'chess') {
    C.innerHTML = chessHTML(v, W, H);
  } else {
    const rows = {};
    v.center.forEach(p => (rows[p.row || 0] = rows[p.row || 0] || []).push(p));
    const msgNow = [v.priv, v.msg].filter(Boolean).join(' · ');
    C.innerHTML = Object.keys(rows).sort().map(r => `<div class="erow">${rows[r].map(p => pileHTML(p, v, solo, cw)).join('')}</div>`).join('') +
      (v.pot ? `<div class="pot">${esc(t('pot'))}: ${ic('coins')} ${fmt(v.pot)}</div>` : '') +
      (msgNow && !solo ? `<div class="emsg2${msgNow !== evMsgKey ? ' fresh' : ''}">${esc(msgNow)}</div>` : '');
  }

  // banner, message, watchers
  // whose turn: shown in the hint bar (orange when it is my turn) so it never covers a seat
  const myTurn = v.phase === 'game' && v.turn != null && v.turn >= 0 && v.turn === v.me && !v.result;
  const waitTurn = v.phase === 'game' && v.turn != null && v.turn >= 0 && !myTurn && !v.result;
  $('eHint').classList.toggle('mine', myTurn);
  $('eBanner').classList.add('hide');
  // event text: in the middle of the table (or at the bottom in patiens, where the middle is full of cards)
  const msg = [v.priv, v.msg].filter(Boolean).join(' · '), M = $('eMsg');
  M.classList.toggle('hide', !msg || v.phase !== 'game' || !solo);
  if (solo) M.textContent = msg;
  evMsgKey = msg;
  $('eWatch').textContent = v.watchers ? t('watching', { n: v.watchers }) : '';

  // hint + buttons
  const hint = v.hint || '';
  $('eHint').textContent = myTurn ? (/^(Din tur|Your turn)/.test(hint) ? hint : t('yourTurn') + ' ' + hint)
    : waitTurn && !/(Väntar|Waiting)/.test(hint) ? `${t('waitingFor', { name: v.turnName })} ${hint}` : hint;
  const chips = (v.buttons || []).filter(b => b.chip), rest = (v.buttons || []).filter(b => !b.chip);
  $('eButtons').classList.toggle('haschips', chips.length > 0);
  $('eButtons').innerHTML = (chips.length ? `<div class="chiprow">${chips.map(b => `<button class="betchip c${b.chip}${b.primary ? ' on' : ''}" data-btn="${esc(b.id)}" aria-label="${esc(b.label)}" ${b.off ? 'disabled' : ''}><span>${esc(b.label)}</span></button>`).join('')}</div>` : '') +
    (chips.length ? '<div class="btnrow">' : '') +
    rest.map(b => `<button class="ebtn t-${b.tone || BTN_TONE[b.id] || 'plain'}${b.primary ? ' primary' : ''}" data-btn="${esc(b.id)}" data-lobby="${v.phase === 'lobby' ? 1 : ''}"><span class="ic">${icOrText(b.icon, esc)}</span>${esc(b.label)}</button>`).join('') + (chips.length ? '</div>' : '');
  tickIdle();

  engRenderHand(v, hw);
  engRenderResult(v);
  // remember which cards have been seen so only new ones animate in
  document.querySelectorAll('#eng .ec[data-cid]').forEach(e => e.dataset.cid && evSeenIds.add(e.dataset.cid));
}
function pileHTML(p, v, solo, cw) {
  const cls = ['pile', p.layout, p.small ? 'small' : '', p.tap ? 'tap' : ''].join(' ');
  const style = solo && p.slot != null ? `style="grid-column:${p.slot + 1}"` : '';
  let cards;
  if (p.layout === 'trick') {
    cards = p.cards.map(x => {
      const pos = seatPos(x.seat, v.seats.length, v.me, 2, 2, 1, 1);
      const dx = Math.cos(pos.ang) * cw * 0.85, dy = Math.sin(pos.ang) * cw * 0.6;
      return ecard(x.c, '', `style="transform:translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))"`);
    }).join('');
  } else if (p.layout === 'pond') {
    cards = p.cards.map((x, k) => ecard(null, '', `style="left:${(k * 37) % 70}%;top:${(k * 53) % 45}%;transform:rotate(${(k * 47) % 60 - 30}deg)"`)).join('');
  } else if (p.layout === 'stack') {
    const top = p.cards[p.cards.length - 1];
    const tappable = top && (top.tap || p.tap);
    cards = top ? ecard(top.c, (tappable ? 'tap ' : '') + (top.tip ? 'tip' : ''),
      tappable ? `data-pile="${esc(p.id)}" data-i="${top.i ?? -1}"${top.drag ? ' data-drag="1"' : ''}` : '') : '';
  } else {
    cards = p.cards.map(x => ecard(x.c, (x.tap ? 'tap ' : '') + (x.tip ? 'tip' : ''), x.tap || x.drag ? `data-pile="${esc(p.id)}" data-i="${x.i}"${x.drag ? ' data-drag="1"' : ''}` : '')).join('');
  }
  if (!p.cards.length && p.layout !== 'trick') cards = `<div class="pempty">${esc(p.empty || '')}</div>`;
  if (p.slots && p.cards.length < p.slots && p.layout === 'fan') cards += Array(p.slots - p.cards.length).fill('<div class="pempty" style="margin-left:6px;opacity:.5"></div>').join('');
  return `<div class="${cls}" ${style} data-pile="${esc(p.id)}" ${p.tap ? 'data-pt="1"' : ''} ${p.drop ? `data-drop="${esc(p.id)}"` : ''}>
    ${p.label ? `<div class="plabel">${esc(p.label)}</div>` : ''}<div class="pcards" data-count="">${cards}</div></div>`;
}
function engRenderHand(v, hw) {
  const H = $('eHand'), cards = v.hand || [];
  H.classList.toggle('none', !cards.length);
  $('eHandLabel').textContent = v.handLabel || (cards.length ? t(v.handTap ? 'handTap' : 'handSecret') : '');
  const box = $('eHandCards'), W = box.clientWidth || innerWidth, n = cards.length;
  const step = n > 1 ? Math.min(hw * 0.72, (W - 24 - hw) / (n - 1)) : 0, x0 = (W - hw - step * (n - 1)) / 2;
  box.innerHTML = cards.map((c, i) => ecard(c, [v.handTap ? 'tapok' : '', c.sel ? 'sel' : '', v.handTap && !c.ok ? 'dim' : ''].join(' '),
    `data-hand="${esc(c.id)}" style="left:${x0 + i * step}px;z-index:${i + 1}"`)).join('');
}
function engRenderResult(v) {
  const R = $('eResult');
  if (!v.result) { R.classList.add('hide'); evResultKey = ''; evNextAt = 0; clearInterval(evTick); return; }
  const r = v.result, key = v.round + r.title;
  // countdown to the next round (the server starts it by itself)
  if (key !== evResultKey || !evNextAt) evNextAt = r.nextIn != null ? Date.now() + r.nextIn : 0;
  // a short line on the table – no full screen: "You won 50" + what happened
  const mine = r.lines.find(l => l.seat === v.me && v.me >= 0);
  const head = mine && mine.text ? mine.text : r.title;
  const subs = [mine && mine.text ? r.title : '', r.note, ...r.lines.filter(l => l !== mine && l.text).slice(0, 3).map(l => (l.name && !l.text.includes(l.name) ? l.name + ': ' : '') + l.text)].filter(Boolean);
  const tone = mine ? (mine.win ? 'win' : /lost|förlorade|bust|tjock/i.test(mine.text) ? 'lose' : '') : '';
  R.classList.remove('hide');
  R.innerHTML = `<div class="rbar ${tone}">${mine && mine.win ? ic('trophy') : ''}<b>${esc(head)}</b>${subs.map(x => `<small>${esc(x)}</small>`).join('')}<div class="rcount" id="rCount"></div></div>`;
  tickCountdown(r.final);
  clearInterval(evTick); evTick = setInterval(() => tickCountdown(r.final), 250);
  if (key !== evResultKey) {
    evResultKey = key;
    const iWon = r.lines.some(l => l.win && (l.seat === v.me || l.seat === -1));
    if (iWon) cgHappy();
    if (iWon && r.final) confetti(['♠', '♥', '♦', '♣']);
    sfx(iWon ? 'win' : 'pop');
  }
}
function tickCountdown(final) {
  const el = $('rCount'); if (!el) return;
  if (!evNextAt) { el.textContent = ''; return; }
  const n = Math.max(0, Math.ceil((evNextAt - Date.now()) / 1000));
  el.textContent = ''; el.title = t(final ? 'newGameIn' : 'nextRoundIn', { n });
  const bar = Math.max(0, Math.min(1, (evNextAt - Date.now()) / (final ? 5000 : 3200)));
  el.style.setProperty('--left', bar);
}
// "the computer moves for you in 8 s" when other people are waiting on me
let evIdleAt = 0, evIdleT = 0;
function tickIdle() {
  const v = EV; clearTimeout(evIdleT);
  const el = $('eIdle'); if (!el) return;
  if (!v || v.idleIn == null) { evIdleAt = 0; el.textContent = ''; el.classList.remove('on'); return; }
  if (v._idleSeen !== true) { v._idleSeen = true; evIdleAt = Date.now() + v.idleIn; }
  const n = Math.max(0, Math.ceil((evIdleAt - Date.now()) / 1000));
  el.textContent = n <= 15 ? t('autoMoveIn', { n }) : '';
  el.classList.toggle('on', n <= 15);
  evIdleT = setTimeout(tickIdle, 250);
}
function confetti(set) {
  const box = document.createElement('div'); box.className = 'confetti';
  box.innerHTML = Array.from({ length: 36 }, (_, i) => { const sy = set[i % set.length]; return `<span style="left:${Math.random() * 100}%;animation-delay:${Math.random() * .8}s;color:${sy === '♥' || sy === '♦' ? '#e0443a' : '#fff'}">${suitSVG(sy)}</span>`; }).join('');
  document.body.appendChild(box); setTimeout(() => box.remove(), 3600);
}

// colour of a button by what it does
const BTN_TONE = { fold: 'bad', call: 'good', check: 'good', raise: 'warn', allin: 'hot', hit: 'good', stand: 'warn', double: 'blue', split: 'blue', start: 'good', addBot: 'plain', draw: 'good', pass: 'warn', fish: 'blue', meld: 'good', resign: 'plain', flip: 'good', restart: 'plain', tip: 'blue' };

/* ---------- chess board ---------- */
let evChessSel = -1, evChessKey = '', evPre = null, evPromo = null, evClock = null, evChessN = -1, evChessOver = false, evLowBeep = 0;
const CHESS_G = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
const fmtClock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : ms < 10000 ? (Math.max(0, ms) / 1000).toFixed(1) : '0:' + String(s).padStart(2, '0'); };
function chessHTML(v, W, H) {
  const key = v.board + v.turn; if (key !== evChessKey) { evChessKey = key; evChessSel = -1; }
  const size = Math.floor(Math.min(W - 16, H - 96) / 8) * 8, sqz = size / 8;
  const myTurn = v.turn === v.me && !v.result;
  const moves = myTurn ? (v.moves || []) : (v.premoves || []); // not my turn: I can plan a premove
  const targets = new Set(moves.filter(m => m[0] === evChessSel).map(m => m[1])), movable = new Set(moves.map(m => m[0]));
  const last = v.last || [], pre = evPre ? [evPre.from, evPre.to] : [];
  let cells = '';
  for (let d = 0; d < 64; d++) {
    const sq = v.flip ? 63 - d : d, r = sq >> 3, c = sq & 7, p = v.board[sq];
    const cls = ['sq', (r + c) % 2 ? 'dk' : 'lt', sq === evChessSel ? 'sel' : '', targets.has(sq) ? (p !== '.' ? 'cap' : 'tgt') : '', last.includes(sq) ? 'last' : '', pre.includes(sq) ? 'pre' : '',
      sq === v.check ? 'chk' : '', movable.has(sq) && evChessSel < 0 ? 'mv' : '', !myTurn ? 'wait' : ''].filter(Boolean).join(' ');
    const piece = p === '.' ? '' : `<span class="pc ${p === p.toUpperCase() ? 'w' : 'b'}">${CHESS_G[p.toUpperCase()]}︎</span>`;
    const coord = (v.flip ? r === 0 : r === 7) ? `<i class="cf">${'abcdefgh'[c]}</i>` : '';
    const coordR = (v.flip ? c === 7 : c === 0) ? `<i class="cr">${8 - r}</i>` : '';
    cells += `<div class="${cls}" data-sq="${sq}">${piece}${coord}${coordR}</div>`;
  }
  const clock = v.clock;
  if (clock) evClock = { t: clock.t.slice(), run: clock.run, at: Date.now() };
  else evClock = null;
  const side = x => { const s = v.seats[x]; if (!s) return ''; const taken = (s.taken || '').split('').map(t => CHESS_G[t] + '︎').join('');
    const cl = clock ? `<span class="cclock${clock.run === x ? ' run' : ''}" data-clock="${x}">${fmtClock(clock.t[x])}</span>` : '';
    return `<div class="cside${v.turn === x ? ' turn' : ''}"><i style="--c:${s.color}">${s.bot ? ic('bot') : esc((s.name || '?')[0].toUpperCase())}</i><b>${s.me ? esc(t('you')) : esc(s.name)}</b><span class="ctaken ${x === 0 ? 'b' : 'w'}">${taken}</span>${cl}</div>`; };
  const top = v.flip ? 0 : 1, bottom = 1 - top;
  const promo = evPromo ? `<div class="cpromo"><b>${esc(ct('promoteTo'))}</b><div>${'QRBN'.split('').map(p => `<button data-promo="${p}"><span class="pc ${v.me === 1 ? 'b' : 'w'}">${CHESS_G[p]}︎</span></button>`).join('')}</div></div>` : '';
  const rated = v.rated && v.result ? `<div class="cend"><button class="ebtn t-good" data-cend="new">${ic('globe')} ${esc(ct('newOpp'))}</button><button class="ebtn t-plain" data-cend="home">${ic('home')} ${esc(ct('home'))}</button></div>` : '';
  return `<div class="chesswrap" style="--sq:${sqz}px">${side(top)}<div class="board">${cells}${promo}</div>${side(bottom)}${rated}</div>`;
}
// clocks tick on screen between messages
setInterval(() => {
  if (!evClock || evClock.run < 0 || !EV || EV.layout !== 'chess') return;
  const x = evClock.run, el = document.querySelector(`[data-clock="${x}"]`); if (!el) return;
  const ms = evClock.t[x] - (Date.now() - evClock.at);
  el.textContent = fmtClock(ms); el.classList.toggle('low', ms < 20000);
  if (x === EV.me && ms < 10000 && ms > 0 && Date.now() - evLowBeep > 1000) { evLowBeep = Date.now(); sfx('lowtime'); }
}, 100);
const isPromo = (v, from, to) => { const p = v.board[from]; return (p === 'P' && to >> 3 === 0) || (p === 'p' && to >> 3 === 7); };
function chessSend(v, from, to, promo) { evChessSel = -1; evPre = null; engAct({ a: 'move', from: String(from), to: String(to), id: promo || 'Q' }); }
function chessTap(sq) {
  const v = EV; if (!v || v.layout !== 'chess' || v.result) return;
  const myTurn = v.turn === v.me;
  const moves = myTurn ? (v.moves || []) : (v.premoves || []);
  if (evChessSel >= 0 && moves.some(m => m[0] === evChessSel && m[1] === sq)) {
    const from = evChessSel;
    if (myTurn) {
      if (isPromo(v, from, sq)) { evPromo = { from, to: sq }; evChessSel = -1; sfx('click'); renderEngine(); return; } // choose the new piece
      chessSend(v, from, sq); return;
    }
    evPre = { from, to: sq }; evChessSel = -1; sfx('click'); renderEngine(); return; // premove: played as soon as it is my turn
  }
  if (moves.some(m => m[0] === sq)) { evChessSel = sq === evChessSel ? -1 : sq; if (!myTurn) evPre = null; sfx('click'); }
  else { if (evChessSel >= 0 || evPre) sfx('error'); evChessSel = -1; evPre = null; if (!moves.length && !myTurn) toast(t('waitYourTurn', { name: v.turnName })); }
  renderEngine();
}
// after each new position: sounds, and a planned premove is played if it is still allowed
function chessUpdate(v) {
  if (v.layout !== 'chess' || v.phase !== 'game') return;
  if (v.nmoves !== evChessN) {
    if (evChessN >= 0 && v.nmoves > evChessN) sfx(v.check >= 0 ? 'check' : v.kind === 'capture' ? 'capture' : v.kind === 'castle' ? 'castle' : v.kind === 'promo' ? 'promote' : 'move');
    else if (v.nmoves === 0) sfx('gameStart');
    evChessN = v.nmoves; evPromo = null;
  }
  if (v.result && !evChessOver) { evChessOver = true; sfx('gameEnd'); evPre = null; }
  if (!v.result) evChessOver = false;
  if (evPre && v.turn === v.me && !v.result) {
    const p = evPre; evPre = null;
    if ((v.moves || []).some(m => m[0] === p.from && m[1] === p.to)) setTimeout(() => chessSend(v, p.from, p.to, 'Q'), 60);
  }
}

/* ---------- sounds ---------- */
let evSndRound = -1, evSndTurn = null;
function engSounds(v) {
  if (v.phase !== 'game') return;
  const ids = [...(v.hand || []), ...(v.center || []).flatMap(c => c.cards || []), ...(v.seats || []).flatMap(s => (s && s.shown) || [])].map(c => c && c.id).filter(Boolean);
  const fresh = ids.filter(id => !evSeenIds.has(id)).length;
  if (v.round !== evSndRound) { evSndRound = v.round; if (fresh > 3) sfx('shuffle'); }
  else if (fresh) sfx(fresh > 1 ? 'deal' : 'place');
  const mine = v.turn != null && v.turn === v.me && !v.result;
  if (mine && evSndTurn !== v.round + ':' + v.turn) sfx('pop');
  evSndTurn = mine ? v.round + ':' + v.turn : null;
}

/* ---------- input: taps ---------- */
function engAct(m) { send({ t: 'g', ...m }); }
function engClick(e) {
  if (evSuppressClick) { evSuppressClick = false; return; }
  const v = EV; if (!v) return;
  const t = e.target;
  const pr = t.closest('[data-promo]'); if (pr && evPromo) { const p = evPromo; evPromo = null; sfx('promote'); return chessSend(v, p.from, p.to, pr.dataset.promo); }
  const ce = t.closest('[data-cend]'); if (ce) { if (ce.dataset.cend === 'home') return goHome(); goHome(); setTimeout(() => { CHS.tab = 'online'; chessMenu(); }, 300); return; }
  const sq = t.closest('[data-sq]'); if (sq) return chessTap(+sq.dataset.sq);
  const sit = t.closest('[data-sit]'); if (sit) return send({ t: 'sit', seat: +sit.dataset.sit });
  const rm = t.closest('[data-rmbot]'); if (rm) return send({ t: 'removeBot', seat: +rm.dataset.rmbot });
  const res = t.closest('[data-res]');
  if (res) { const a = res.dataset.res; if (a === 'home') return goHome(); return send({ t: 'btn', id: a }); }
  const b = t.closest('[data-btn]');
  if (b) {
    sfx(b.classList.contains('betchip') ? 'place' : 'click');
    if (b.dataset.lobby) return send({ t: 'btn', id: b.dataset.btn });
    const def = (v.buttons || []).find(x => x.id === b.dataset.btn);
    if (def && def.raise) return openRaise(def);
    return engAct({ a: 'btn', id: b.dataset.btn });
  }
  const h = t.closest('[data-hand]');
  if (h) {
    if (!v.handTap) return toast(v.turn != null && v.turn !== v.me ? t('waitYourTurn', { name: v.turnName }) : (v.hint || t('notNow')));
    return engAct({ a: 'card', id: h.dataset.hand });
  }
  const seat = t.closest('[data-seat]'); if (seat) return engAct({ a: 'seat', seat: +seat.dataset.seat });
  const card = t.closest('.ec[data-pile]'); if (card) return engAct({ a: 'pile', pile: card.dataset.pile, i: +card.dataset.i });
  const pile = t.closest('.pile[data-pt]'); if (pile) return engAct({ a: 'pile', pile: pile.dataset.pile, i: -1 });
}

/* ---------- input: drag a card from the hand (or a patiens card) onto a pile ---------- */
function engDown(e) {
  if (e.button !== 0) return;
  const h = e.target.closest('[data-hand]'), c = e.target.closest('.ec[data-drag]');
  const el = h || c; if (!el) return;
  if (h && !EV.handTap) return;
  evDrag = { el, x: e.clientX, y: e.clientY, moved: false, hand: h ? h.dataset.hand : null, from: c ? c.dataset.pile : null, i: c ? +c.dataset.i : null };
}
function engMove(e) {
  const d = evDrag; if (!d) return;
  if (!d.moved) {
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10) return;
    d.moved = true;
    const r = d.el.getBoundingClientRect();
    d.ox = e.clientX - r.left; d.oy = e.clientY - r.top;
    d.ghost = d.el.cloneNode(true); d.ghost.classList.add('ghost'); d.ghost.style.width = r.width + 'px'; d.ghost.style.height = r.height + 'px'; d.ghost.style.setProperty('--w', r.width + 'px');
    document.body.appendChild(d.ghost); d.el.style.opacity = '.3';
  }
  d.ghost.style.left = (e.clientX - d.ox) + 'px'; d.ghost.style.top = (e.clientY - d.oy) + 'px';
  const target = dropAt(e);
  document.querySelectorAll('#eng .droptarget').forEach(x => x.classList.toggle('droptarget', x === target));
  if (target) target.classList.add('droptarget');
  e.preventDefault();
}
function dropAt(e) { const el = document.elementFromPoint(e.clientX, e.clientY); return el ? el.closest('[data-drop]') : null; }
function engUp(e) {
  const d = evDrag; if (!d) return;
  evDrag = null;
  document.querySelectorAll('#eng .droptarget').forEach(x => x.classList.remove('droptarget'));
  if (d.moved) {
    evSuppressClick = true; setTimeout(() => (evSuppressClick = false), 50);
    d.ghost.remove(); d.el.style.opacity = '';
    const target = dropAt(e);
    if (d.hand) {
      if (target) engAct({ a: 'drop', id: d.hand, pile: target.dataset.drop });
      else if (e.clientY < $('eHand').getBoundingClientRect().top - 10) engAct({ a: 'card', id: d.hand }); // dragged up onto the table = play it
    } else if (target && d.from) engAct({ a: 'move', from: d.from, i: d.i, to: target.dataset.drop });
  }
  if (evPending) { const v = evPending; evPending = null; showEngine(v); }
}

/* ---------- poker: choose an amount ---------- */
function openRaise(b) {
  const R = b.raise, d = $('dRaise'), inp = $('rRange');
  inp.min = R.min; inp.max = R.max; inp.step = R.step || 10; inp.value = R.min;
  const show = () => { $('rAmount').textContent = fmt(+inp.value); $('rOk').textContent = t('raiseTo', { label: b.label, n: fmt(+inp.value) }); };
  inp.oninput = show;
  const set = x => { inp.value = Math.max(R.min, Math.min(R.max, Math.round(x / (R.step || 10)) * (R.step || 10))); show(); };
  $('rMinus').onclick = () => set(+inp.value - (R.step || 10) * 2);
  $('rPlus').onclick = () => set(+inp.value + (R.step || 10) * 2);
  $('rQuick').onclick = ev => { const q = ev.target.closest('[data-q]'); if (!q) return; const k = q.dataset.q;
    set(k === 'min' ? R.min : k === 'half' ? R.current + R.pot / 2 : k === 'pot' ? R.current + R.pot : R.max); };
  show();
  d.onclose = () => { if (d.returnValue === 'ok') engAct({ a: 'btn', id: 'raise', amount: +inp.value }); };
  d.returnValue = ''; d.showModal();
}

/* ---------- first-time guide ---------- */
const GUIDE = () => t('guide').map(([big, h, p]) => ({ big, h, p }));
let guideStep = 0;
function openGuide() {
  guideStep = 0; renderGuide();
  const d = $('dGuide'); if (!d.open) d.showModal();
}
function renderGuide() {
  const G2 = GUIDE(), g = G2[guideStep], last = guideStep === G2.length - 1;
  $('gBody').innerHTML = `<div class="gstep"><div class="big">${g.big}</div><h3>${esc(g.h)}</h3><p>${esc(g.p)}</p></div>
    <div class="dots">${G2.map((_, i) => `<i class="${i === guideStep ? 'on' : ''}"></i>`).join('')}</div>`;
  $('gNext').textContent = t(last ? 'startPlaying' : 'next');
}
function closeGuide() { store.set('localStorage', 'kortbord-guide2', '1'); $('dGuide').close(); }
