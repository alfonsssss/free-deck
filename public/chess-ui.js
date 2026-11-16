/* =========================================================
   Chess menu: against the computer (level + clock), online against a random opponent
   (ranked, 10/5/3/1 minutes) or with a friend (invite link). Shows your rating and the top list.
   Uses deckSheet()/dkHead() (deck.js) for the sheet, send()/onMessage (index.html).
   ========================================================= */
const CH_TXT = {
  en: { title: 'Chess', vsBot: 'Computer', online: 'Online', friend: 'Friend', level: 'How good is the computer?', easy: 'Easy', medium: 'Medium', hard: 'Hard',
    clock: 'Time for each player', noClock: 'No clock', min: '{n} min', play: 'Play', find: 'Find an opponent', searching: 'Looking for an opponent ({n} min)…', cancel: 'Cancel',
    rating: 'Your rating', games: '{n} games', top: 'Top players', noTop: 'No ranked games yet – be the first!', matched: 'Opponent found: {name} ({r})', invite: 'Create game and copy link',
    newOpp: 'New opponent', home: 'Home', rated: 'Ranked', ratingNow: 'Rating {r} ({d})', premove: 'Premove', promoteTo: 'Promote to', needServer: 'Needs a connection to the server' },
  sv: { title: 'Schack', vsBot: 'Datorn', online: 'Online', friend: 'Vän', level: 'Hur bra är datorn?', easy: 'Lätt', medium: 'Medel', hard: 'Svår',
    clock: 'Tid för varje spelare', noClock: 'Ingen klocka', min: '{n} min', play: 'Spela', find: 'Hitta en motståndare', searching: 'Letar efter en motståndare ({n} min)…', cancel: 'Avbryt',
    rating: 'Din ranking', games: '{n} partier', top: 'Topplista', noTop: 'Inga rankade partier än – bli först!', matched: 'Motståndare hittad: {name} ({r})', invite: 'Skapa parti och kopiera länk',
    newOpp: 'Ny motståndare', home: 'Hem', rated: 'Rankat', ratingNow: 'Ranking {r} ({d})', premove: 'Förflyttning', promoteTo: 'Byt bonden mot', needServer: 'Kräver anslutning till servern' },
};
const ct = (k, p = {}) => String((CH_TXT[LANG] || CH_TXT.en)[k] ?? CH_TXT.en[k] ?? k).replace(/\{(\w+)\}/g, (m, x) => (x in p ? p[x] : m));
const CHS = { tab: 'bot', level: 'medium', tc: 0, otc: 5, seeking: false, top: null, me: null };
try { Object.assign(CHS, JSON.parse(localStorage.getItem('kortbord-chess')) || {}, { seeking: false, top: null, me: null }); } catch (e) {}
const chSave = () => { try { localStorage.setItem('kortbord-chess', JSON.stringify({ tab: CHS.tab, level: CHS.level, tc: CHS.tc, otc: CHS.otc })); } catch (e) {} };
const chOnline = () => hasServer() && ws && ws.readyState === 1 && !(ws instanceof LocalSocket);

function chessMenu() {
  deckInit(); // the sheet lives with the deck code
  if (hasServer()) send({ t: 'chessTop' });
  chRender();
}
function chRender() {
  const chips = (key, vals, label) => `<div class="chips" data-key="${key}">${vals.map(v => `<button data-v="${v}" class="${String(CHS[key]) === String(v) ? 'on' : ''}">${label(v)}</button>`).join('')}</div>`;
  const tabs = [['bot', ct('vsBot'), 'bot'], ...(hasServer() ? [['online', ct('online'), 'globe'], ['friend', ct('friend'), 'users']] : [])];
  let body = '';
  if (CHS.tab === 'bot') body = `<div class="q">${esc(ct('level'))}</div>${chips('level', ['easy', 'medium', 'hard'], v => esc(ct(v)))}
      <div class="q">${esc(ct('clock'))}</div>${chips('tc', [0, 10, 5, 3, 1], v => esc(v ? ct('min', { n: v }) : ct('noClock')))}
      <button class="go" data-go="bot">${ic('play')} ${esc(ct('play'))}</button>`;
  else if (CHS.tab === 'online') {
    const me = CHS.me ? `<div class="chme">${ic('trophy')}<b>${esc(ct('rating'))}: ${CHS.me.rating}</b><small>${esc(ct('games', { n: CHS.me.games }))}</small></div>` : '';
    const top = CHS.top ? (CHS.top.length ? `<ol class="chtop">${CHS.top.slice(0, 10).map(p => `<li><b>${esc(p.name || '?')}</b><span>${p.rating}</span></li>`).join('')}</ol>` : `<p class="dhelp">${esc(ct('noTop'))}</p>`) : '';
    body = `${me}<div class="q">${esc(ct('clock'))}</div>${chips('otc', [10, 5, 3, 1], v => esc(ct('min', { n: v })))}
      ${CHS.seeking ? `<div class="chseek"><span class="spin"></span>${esc(ct('searching', { n: CHS.otc }))}</div><button class="go" style="background:#f3eee4;color:#1f2433;box-shadow:none" data-go="cancel">${esc(ct('cancel'))}</button>`
        : `<button class="go" data-go="online">${ic('globe')} ${esc(ct('find'))}</button>`}
      <div class="q">${esc(ct('top'))}</div>${top}`;
  } else body = `<div class="q">${esc(ct('clock'))}</div>${chips('tc', [0, 10, 5, 3, 1], v => esc(v ? ct('min', { n: v }) : ct('noClock')))}
      <button class="go" data-go="friend">${ic('link')} ${esc(ct('invite'))}</button>`;
  const html = `${dkHead(`${gameBadge('g-chess')} ${esc(ct('title'))}`)}<div class="chtabs">${tabs.map(([k, l, i]) => `<button data-tab="${k}" class="${CHS.tab === k ? 'on' : ''}">${ic(i)}${esc(l)}</button>`).join('')}</div>${body}`;
  const open = $('dkSheet') && $('dkSheet').dataset.chess;
  if (open) { $('dkSheet').querySelector('.dsc').innerHTML = html; return; }
  const sh = deckSheet(html, chClick); sh.dataset.chess = '1';
  sh.addEventListener('click', e => { if (e.target === sh || e.target.closest('[data-close]')) chCancelSeek(); }, true);
}
function chClick(e) {
  const tab = e.target.closest('[data-tab]'); if (tab) { CHS.tab = tab.dataset.tab; sfx('click'); chSave(); chRender(); return; }
  const b = e.target.closest('[data-v]'); if (b) { const k = b.parentElement.dataset.key; CHS[k] = k === 'level' ? b.dataset.v : +b.dataset.v; sfx('click'); chSave(); chRender(); return; }
  const go = e.target.closest('[data-go]'); if (!go) return;
  const a = go.dataset.go;
  if (a === 'bot') { deckCloseSheet(); sfx('gameStart'); playSolo('g-chess', { tc: CHS.tc, level: CHS.level }); }
  else if (a === 'friend') { deckCloseSheet(); enterRoom(randomCode(), 'g-chess', false, false, { tc: CHS.tc, level: 'medium' }).then(ok => ok !== false && setTimeout(() => copyInvite($('eInvite')), 700)); }
  else if (a === 'online') {
    if (!chOnline()) { toast(ct('needServer')); sfx('error'); return; }
    CHS.seeking = true; sfx('click'); chRender();
    send({ t: 'chessSeek', tc: CHS.otc, name: myName || (typeof CG !== 'undefined' && CG.username) || 'Player' });
  } else if (a === 'cancel') { chCancelSeek(); chRender(); }
}
function chCancelSeek() { if (CHS.seeking) { CHS.seeking = false; send({ t: 'chessCancel' }); } }
// messages from the server about chess
function chessMsg(m) {
  if (m.t === 'chessTop') { CHS.top = m.list; CHS.me = m.me; if ($('dkSheet') && $('dkSheet').dataset.chess) chRender(); }
  else if (m.t === 'matched') {
    CHS.seeking = false; deckCloseSheet(); sfx('gameStart');
    toast(ct('matched', { name: m.opp, r: m.oppRating }));
    const go = async () => { if (!myName) setName(CG && CG.username ? CG.username : 'Player'); return enterRoom(m.room, null, false, false); };
    setTimeout(go, m.first ? 0 : 400); // the other player sits down a moment later
  } else if (m.t === 'rating') {
    CHS.lastRating = m;
    toast(ct('ratingNow', { r: m.rating, d: (m.diff >= 0 ? '+' : '') + m.diff }));
  }
}
