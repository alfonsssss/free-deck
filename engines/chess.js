// Chess / Schack – two players (or you against the computer). Full rules: castling, en passant,
// promotion (always to a queen, the usual choice), check, checkmate, stalemate.
// Board: 64 squares, index = row * 8 + col, row 0 = black's back rank (top). Seat 0 = white, seat 1 = black.
const { M, add, seat } = require('./i18n');

const meta = { id: 'g-chess', emoji: '♞', min: 2, max: 2, fill: 2, kids: true,
  name: { sv: 'Schack', en: 'Chess' },
  desc: { sv: 'Klassiskt schack – mot datorn eller en vän.', en: 'Classic chess – against the computer or a friend.' },
  rules: {
    sv: 'Vit börjar. Tryck på en pjäs för att se vart den kan gå, och tryck sedan på rutan du vill flytta till.\n\nMålet är att sätta motståndarens kung i schack matt – den är hotad och kan inte komma undan.\n\nRockad: flytta kungen två steg mot tornet. En bonde som når sista raden blir en dam. Kan den som är på tur inte flytta, men står inte i schack, blir det patt (oavgjort).',
    en: 'White moves first. Tap a piece to see where it can go, then tap the square you want to move to.\n\nThe goal is to checkmate the other king – it is attacked and cannot escape.\n\nCastling: move the king two squares towards the rook. A pawn that reaches the last row becomes a queen. If the player to move has no legal move but is not in check, it is stalemate (a draw).' } };
add({
  sv: { 'ch.white': 'Vit', 'ch.black': 'Svart', 'ch.yourMove': 'Tryck på en pjäs och sedan dit den ska.', 'ch.check': 'Schack!', 'ch.mate': 'Schack matt! {a} vann!', 'ch.stale': 'Patt – oavgjort!',
    'ch.draw': 'Oavgjort!', 'ch.moved': '{a} flyttade {p}', 'ch.took': '{a} tog en {p}', 'ch.illegal': 'Det draget går inte.', 'ch.resign': 'Ge upp', 'ch.resigned': '{a} gav upp.', 'ch.wins': '{a} vann!',
    'ch.P': 'bonde', 'ch.N': 'springare', 'ch.B': 'löpare', 'ch.R': 'torn', 'ch.Q': 'dam', 'ch.K': 'kung', 'ch.castle': '{a} gjorde rockad', 'ch.promo': '{a} fick en ny dam!' },
  en: { 'ch.white': 'White', 'ch.black': 'Black', 'ch.yourMove': 'Tap a piece, then the square to move to.', 'ch.check': 'Check!', 'ch.mate': 'Checkmate! {a} won!', 'ch.stale': 'Stalemate – a draw!',
    'ch.draw': 'A draw!', 'ch.moved': '{a} moved a {p}', 'ch.took': '{a} took a {p}', 'ch.illegal': 'That move is not allowed.', 'ch.resign': 'Resign', 'ch.resigned': '{a} resigned.', 'ch.wins': '{a} won!',
    'ch.P': 'pawn', 'ch.N': 'knight', 'ch.B': 'bishop', 'ch.R': 'rook', 'ch.Q': 'queen', 'ch.K': 'king', 'ch.castle': '{a} castled', 'ch.promo': '{a} got a new queen!' },
});

const START = 'rnbqkbnrpppppppp' + '.'.repeat(32) + 'PPPPPPPPRNBQKBNR';
const white = p => p !== '.' && p === p.toUpperCase();
const colorOf = p => (p === '.' ? -1 : white(p) ? 0 : 1);
const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

function start() {
  return { b: START.split(''), turn: 0, castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0, moves: 0, last: null, msg: null, result: null, taken: [[], []] };
}
// is square sq attacked by side `by`?
function attacked(b, sq, by) {
  const r = sq >> 3, c = sq & 7;
  const pawnDir = by === 0 ? 1 : -1; // white pawns attack upwards (towards row 0), so they sit below
  for (const dc of [-1, 1]) { const rr = r + pawnDir, cc = c + dc; if (on(rr, cc)) { const p = b[rr * 8 + cc]; if (p === (by === 0 ? 'P' : 'p')) return true; } }
  for (const [dr, dc] of KN) { const rr = r + dr, cc = c + dc; if (on(rr, cc) && b[rr * 8 + cc] === (by === 0 ? 'N' : 'n')) return true; }
  for (const [dr, dc] of KG) { const rr = r + dr, cc = c + dc; if (on(rr, cc) && b[rr * 8 + cc] === (by === 0 ? 'K' : 'k')) return true; }
  const slide = (dirs, kinds) => {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (on(rr, cc)) { const p = b[rr * 8 + cc]; if (p !== '.') { if (colorOf(p) === by && kinds.includes(p.toUpperCase())) return true; break; } rr += dr; cc += dc; }
    }
    return false;
  };
  return slide(DIAG, 'BQ') || slide(ORTH, 'RQ');
}
const kingSq = (b, side) => b.indexOf(side === 0 ? 'K' : 'k');
// all moves for the side to move, ignoring whether the own king ends up in check
function pseudo(G, side) {
  const b = G.b, out = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq]; if (colorOf(p) !== side) continue;
    const r = sq >> 3, c = sq & 7, P = p.toUpperCase();
    const push = (to, extra = {}) => out.push({ from: sq, to, ...extra });
    if (P === 'P') {
      const dir = side === 0 ? -1 : 1, startRow = side === 0 ? 6 : 1, lastRow = side === 0 ? 0 : 7;
      const one = (r + dir) * 8 + c;
      if (on(r + dir, c) && b[one] === '.') {
        push(one, r + dir === lastRow ? { promo: true } : {});
        const two = (r + 2 * dir) * 8 + c;
        if (r === startRow && b[two] === '.') push(two, { double: true });
      }
      for (const dc of [-1, 1]) {
        const rr = r + dir, cc = c + dc; if (!on(rr, cc)) continue;
        const to = rr * 8 + cc;
        if (b[to] !== '.' && colorOf(b[to]) !== side) push(to, rr === lastRow ? { promo: true } : {});
        else if (to === G.ep) push(to, { enpassant: true });
      }
    } else if (P === 'N' || P === 'K') {
      for (const [dr, dc] of P === 'N' ? KN : KG) { const rr = r + dr, cc = c + dc; if (!on(rr, cc)) continue; const to = rr * 8 + cc; if (colorOf(b[to]) !== side) push(to); }
      if (P === 'K') { // castling
        const row = side === 0 ? 7 : 0, opp = 1 - side, k = side === 0 ? 'K' : 'k', q = side === 0 ? 'Q' : 'q';
        if (sq === row * 8 + 4 && !attacked(b, sq, opp)) {
          if (G.castle[k] && b[row * 8 + 5] === '.' && b[row * 8 + 6] === '.' && b[row * 8 + 7] === (side === 0 ? 'R' : 'r') && !attacked(b, row * 8 + 5, opp) && !attacked(b, row * 8 + 6, opp)) push(row * 8 + 6, { castle: 'k' });
          if (G.castle[q] && b[row * 8 + 3] === '.' && b[row * 8 + 2] === '.' && b[row * 8 + 1] === '.' && b[row * 8] === (side === 0 ? 'R' : 'r') && !attacked(b, row * 8 + 3, opp) && !attacked(b, row * 8 + 2, opp)) push(row * 8 + 2, { castle: 'q' });
        }
      }
    } else {
      const dirs = P === 'B' ? DIAG : P === 'R' ? ORTH : [...DIAG, ...ORTH];
      for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (on(rr, cc)) { const to = rr * 8 + cc; if (b[to] === '.') push(to); else { if (colorOf(b[to]) !== side) push(to); break; } rr += dr; cc += dc; } }
    }
  }
  return out;
}
// play a move on a copy-able state (mutates G); returns the captured piece
function apply(G, m) {
  const b = G.b, p = b[m.from], side = colorOf(p);
  let cap = b[m.to];
  b[m.to] = m.promo ? (side === 0 ? 'Q' : 'q') : p; b[m.from] = '.';
  if (m.enpassant) { const capSq = m.to + (side === 0 ? 8 : -8); cap = b[capSq]; b[capSq] = '.'; }
  if (m.castle) { const row = side === 0 ? 7 : 0; if (m.castle === 'k') { b[row * 8 + 5] = b[row * 8 + 7]; b[row * 8 + 7] = '.'; } else { b[row * 8 + 3] = b[row * 8]; b[row * 8] = '.'; } }
  G.ep = m.double ? (m.from + m.to) / 2 : -1;
  // castling rights go when the king or a rook moves (or a rook is taken)
  const lose = sq => { if (sq === 63) G.castle.K = false; if (sq === 56) G.castle.Q = false; if (sq === 7) G.castle.k = false; if (sq === 0) G.castle.q = false; if (sq === 60) G.castle.K = G.castle.Q = false; if (sq === 4) G.castle.k = G.castle.q = false; };
  lose(m.from); lose(m.to);
  G.half = p.toUpperCase() === 'P' || cap !== '.' ? 0 : G.half + 1;
  G.turn = 1 - side;
  return cap;
}
const clone = G => ({ ...G, b: G.b.slice(), castle: { ...G.castle } });
function legal(G, side = G.turn) {
  return pseudo(G, side).filter(m => { const g = clone(G); apply(g, m); return !attacked(g.b, kingSq(g.b, side), 1 - side); });
}
const waiting = G => (G.result ? [] : [G.turn]);

function finish(G, winner, title) {
  G.result = { final: true, title, lines: [0, 1].map(x => ({ seat: x, text: M(x === 0 ? 'ch.white' : 'ch.black'), win: x === winner })) };
}
function after(G, mover) {
  const opp = 1 - mover, moves = legal(G, opp), check = attacked(G.b, kingSq(G.b, opp), mover);
  if (!moves.length) { if (check) finish(G, mover, M('ch.mate', { a: seat(mover) })); else finish(G, -1, M('ch.stale')); return; }
  const left = G.b.filter(p => p !== '.' && p.toUpperCase() !== 'K');
  if (!left.length || G.half >= 100 || G.moves >= 300) { finish(G, -1, M('ch.draw')); return; }
  if (check) G.msg = M('ch.check');
}
function act(G, s, m) {
  if (G.result) return null;
  if (m.a === 'btn' && m.id === 'resign') { finish(G, 1 - s, M('ch.resigned', { a: seat(s) })); return null; }
  if (m.a !== 'move') return null;
  if (s !== G.turn) return M('waitTurn');
  const from = parseInt(m.from, 10), to = parseInt(m.to, 10);
  const mv = legal(G).find(x => x.from === from && x.to === to);
  if (!mv) return M('ch.illegal');
  const piece = G.b[from].toUpperCase();
  const cap = apply(G, mv);
  if (cap !== '.') G.taken[s].push(cap.toUpperCase());
  G.moves++; G.last = [from, to];
  G.msg = mv.castle ? M('ch.castle', { a: seat(s) }) : mv.promo ? M('ch.promo', { a: seat(s) }) : cap !== '.' ? M('ch.took', { a: seat(s), p: M('ch.' + cap.toUpperCase()) }) : M('ch.moved', { a: seat(s), p: M('ch.' + piece) });
  after(G, s);
  return null;
}

/* ---------- the computer: a small look-ahead (alpha-beta), good enough to be fun ---------- */
// a little bonus for pieces in the middle and pawns moving up
const CENTER = Array.from({ length: 64 }, (_, sq) => { const r = sq >> 3, c = sq & 7; return 14 - 2 * (Math.abs(3.5 - r) + Math.abs(3.5 - c)); });
function evaluate(b) { // from white's point of view
  let s = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq]; if (p === '.') continue;
    const P = p.toUpperCase(), w = p === P, r = sq >> 3;
    let v = VAL[P] + (P === 'N' || P === 'B' ? CENTER[sq] : P === 'P' ? (w ? 6 - r : r - 1) * 8 + CENTER[sq] * 0.3 : P === 'Q' ? CENTER[sq] * 0.3 : 0);
    s += w ? v : -v;
  }
  return s;
}
function search(G, depth, alpha, beta, side) {
  const moves = legal(G, side);
  if (!moves.length) return attacked(G.b, kingSq(G.b, side), 1 - side) ? -100000 - depth : 0;
  if (depth === 0) return (side === 0 ? 1 : -1) * evaluate(G.b);
  moves.sort((a, b) => (G.b[b.to] !== '.' ? VAL[G.b[b.to].toUpperCase()] : 0) - (G.b[a.to] !== '.' ? VAL[G.b[a.to].toUpperCase()] : 0));
  for (const m of moves) {
    const g = clone(G); apply(g, m);
    const sc = -search(g, depth - 1, -beta, -alpha, 1 - side);
    if (sc > alpha) alpha = sc;
    if (alpha >= beta) break;
  }
  return alpha;
}
function bot(G, s) {
  const moves = legal(G, s); if (!moves.length) return null;
  let best = [], bestSc = -Infinity;
  for (const m of moves) {
    const g = clone(G); apply(g, m);
    const sc = -search(g, 2, -Infinity, Infinity, 1 - s) + Math.random() * 12; // a little randomness: not the same game every time
    if (sc > bestSc + 0.5) { bestSc = sc; best = [m]; } else if (Math.abs(sc - bestSc) <= 0.5) best.push(m);
  }
  const m = best[Math.floor(Math.random() * best.length)];
  return { a: 'move', from: String(m.from), to: String(m.to) };
}

function view(G, s) {
  const me = s >= 0 ? s : 0;
  const myTurn = !G.result && s === G.turn;
  const inCheck = !G.result && attacked(G.b, kingSq(G.b, G.turn), 1 - G.turn);
  return {
    layout: 'chess', turn: G.result ? null : G.turn, msg: G.msg,
    hint: G.result ? M('gameOver') : myTurn ? (inCheck ? [M('ch.check'), M('ch.yourMove')] : M('ch.yourMove')) : M('waitFor'),
    board: G.b.join(''), flip: me === 1, last: G.last, check: inCheck ? kingSq(G.b, G.turn) : -1,
    moves: myTurn ? legal(G).map(m => [m.from, m.to]) : [],
    seats: [0, 1].map(x => ({ label: M(x === 0 ? 'ch.white' : 'ch.black'), taken: G.taken[x].join('') })),
    center: [], hand: null,
    buttons: s >= 0 && !G.result && G.moves > 1 ? [{ id: 'resign', label: M('ch.resign'), icon: 'flag' }] : [],
  };
}
const idle = () => 90000; // with a friend: the computer moves for you after 90 s of nothing
module.exports = { meta, start, view, act, waiting, bot, auto: () => null, step() {}, idle, _legal: legal, _apply: apply, _start: start };
