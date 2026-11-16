/* =========================================================
   Simple line icons for buttons (instead of emojis). One colour (currentColor),
   so they follow the button's text colour. Some shapes follow Lucide (ISC licence).
   ic('name') → <svg>; <i data-ic="name"></i> in the HTML is filled in by applyIcons().
   ========================================================= */
const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18M7 6h1v4M16.7 13.9l.7.7-2.8 2.8"/>',
  double: '<rect x="3" y="7" width="12" height="14" rx="2"/><path d="M9 3h10a2 2 0 0 1 2 2v12"/>',
  card: '<rect x="5" y="3" width="14" height="18" rx="2"/><rect x="8.5" y="6.5" width="7" height="11" rx="1"/>',
  cards: '<rect x="3" y="6" width="11" height="15" rx="2" transform="rotate(-10 8.5 13.5)"/><path d="M13 3.6l5.6 1a2 2 0 0 1 1.6 2.3l-2 11.4a2 2 0 0 1-2.3 1.6"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  equal: '<path d="M5 9h14M5 15h14"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  fish: '<path d="M2 12c3-5 9-7 14-4l5-3v14l-5-3c-5 3-11 1-14-4z"/><path d="M7 11h.01"/>',
  ask: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5M12 16.5h.01"/>',
  bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
  restart: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
  skip: '<path d="m5 4 10 8-10 8z"/><path d="M19 5v14"/>',
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15v4M17 17h4"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 13h.01M15 13h.01M9 17h6"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  home: '<path d="M3 11 12 3l9 8"/><path d="M5 9.5V21h14V9.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  sort: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  next: '<path d="M5 12h14M13 5l7 7-7 7"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  tools: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  swap: '<path d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  dots: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
  leave: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  pencil: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  sound: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  soundoff: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
  flip: '<rect x="3" y="5" width="8" height="14" rx="1.5"/><rect x="13" y="5" width="8" height="14" rx="1.5"/><path d="M7 2.5c3-1.5 7-1.5 10 0M15.5 1.5 17 2.5l-1 1.4"/>',
  spread: '<rect x="2" y="7" width="7" height="11" rx="1.5"/><rect x="8.5" y="6" width="7" height="11" rx="1.5"/><rect x="15" y="5" width="7" height="11" rx="1.5"/>',
  gather: '<rect x="7" y="6" width="10" height="14" rx="1.5"/><path d="M3 4l3 3M21 4l-3 3M12 2v3"/>',
  deal: '<rect x="9" y="3" width="6" height="9" rx="1"/><path d="M12 14v3M7 16l-2 3M17 16l2 3"/><rect x="2" y="19" width="5" height="3" rx=".8"/><rect x="9.5" y="19" width="5" height="3" rx=".8"/><rect x="17" y="19" width="5" height="3" rx=".8"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8 21h8M9.5 17h5v4h-5z"/>',
  down: '<path d="M12 4v14M6 12l6 6 6-6"/>',
  help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .8c0 1.7-2.5 2.3-2.5 4M12 17.5h.01"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
};
// card suits, filled (real symbols that look the same on every phone – never emoji)
const SUIT_PATH = {
  '♠': 'M12 2.2C9.4 5.6 4.3 8.6 4.3 13a4.1 4.1 0 0 0 6.9 3V18c0 1.6-.9 2.8-2.7 3.8h7c-1.8-1-2.7-2.2-2.7-3.8V16a4.1 4.1 0 0 0 6.9-3c0-4.4-5.1-7.4-7.7-10.8z',
  '♥': 'M12 21.2S3.5 15.8 3.5 9.7A4.6 4.6 0 0 1 12 7.1a4.6 4.6 0 0 1 8.5 2.6c0 6.1-8.5 11.5-8.5 11.5z',
  '♦': 'M12 2 19.2 12 12 22 4.8 12z',
  '♣': 'M12 2.4a4.3 4.3 0 0 0-3.6 6.7 4.3 4.3 0 1 0 2.8 6.2V18c0 1.6-.9 2.8-2.7 3.8h7c-1.8-1-2.7-2.2-2.7-3.8v-2.7a4.3 4.3 0 1 0 2.8-6.2A4.3 4.3 0 0 0 12 2.4z',
};
const suitSVG = (s, cls = '') => `<svg class="suit ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${SUIT_PATH[s] || ''}"/></svg>`;
function ic(name, cls = '') {
  const p = ICONS[name];
  if (!p) return '';
  const w = name === 'dots' ? 3.2 : 2;
  return `<svg class="svgic ${cls}" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}
// icon names from the server; anything else (e.g. a suit symbol ♠) is shown as text
const icOrText = (s, esc) => (ICONS[s] ? ic(s) : esc(s || ''));
function applyIcons(root = document) {
  root.querySelectorAll('i[data-ic]').forEach(el => { if (!el.firstChild) el.innerHTML = ic(el.dataset.ic); });
}

// emojis in texts from the rules → removed (suits stay, shown as plain symbols, never as emoji)
const EMOJI_RE = /(?![♠♥♦♣])[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}][\u{FE0F}\u{20E3}\u{200D}\p{Extended_Pictographic}]*|\u{FE0F}/gu;
const deEmoji = s => (typeof s === 'string' ? s.replace(EMOJI_RE, '').replace(/([♠♥♦♣])/g, '$1︎').replace(/\s{2,}/g, ' ').trim() : s);
function deEmojiDeep(o) {
  if (typeof o === 'string') return deEmoji(o);
  if (Array.isArray(o)) return o.map(deEmojiDeep);
  if (o && typeof o === 'object') { const r = {}; for (const k in o) r[k] = k === 's' || k === 'id' || k === 'color' ? o[k] : deEmojiDeep(o[k]); return r; }
  return o;
}
// a little card-shaped badge per built-in game (instead of an emoji)
const GAME_BADGE = { 'g-blackjack': ['21', ''], 'g-poker': ['', '♠'], 'g-vandatta': ['8', '♣'], 'g-rummy': ['', '♦'], 'g-hjarter': ['', '♥'], 'g-patiens': ['K', '♥'], 'g-finnsisjon': ['fish', ''], 'g-krig': ['A', '♠'], 'g-chess': ['chess', ''] };
function gameBadge(id, cls = '') {
  const [txt, suit] = GAME_BADGE[id] || ['', '♠'];
  const red = suit === '♥' || suit === '♦';
  const inner = txt === 'fish' ? ic('fish') : txt === 'chess' ? (typeof CHESS_GLYPH !== 'undefined' ? CHESS_GLYPH : '♞') : `${txt ? `<b>${txt}</b>` : ''}${suit ? suitSVG(suit) : ''}`;
  return `<span class="gbadge${red ? ' red' : ''}${txt && suit ? ' two' : ''} ${cls}">${inner}</span>`;
}
