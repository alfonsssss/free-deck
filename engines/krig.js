// Krig / War – two players, highest card wins the battle.
const { makeDeck, shuffle, pub, rv } = require('./common');
const { M, add, seat, card } = require('./i18n');
const MAX_BATTLES = 120; // keeps a game to a few minutes; then most cards wins

const meta = { id: 'g-krig', emoji: '⚔️', min: 2, max: 2, fill: 2, kids: true,
  name: { sv: 'Krig', en: 'War' },
  desc: { sv: 'Superenkelt för två – högst kort vinner!', en: 'Super simple for two – the highest card wins!' },
  rules: {
    sv: 'Båda vänder ett kort samtidigt. Högst kort vinner båda korten. Ess är högst.\n\nLika? Då blir det KRIG: båda lägger 3 kort dolda och ett uppvänt. Högst tar allt!\n\nDen som har flest kort när leken är slut – eller får alla kort – vinner.',
    en: 'Both players flip a card at the same time. The highest card wins both cards. Aces are highest.\n\nA tie? Then it\'s WAR: both put down 3 cards face down and one face up. Highest takes everything!\n\nWhoever has the most cards at the end – or gets all the cards – wins.' } };
add({
  sv: { 'kr.start': 'Tryck på "Vänd kort" för att börja!', 'kr.war': '⚔️ KRIG! Båda har {r}. Vänd igen – 3 dolda och ett uppvänt.', 'kr.won': '{a} vann {n} kort med {c}!',
    'kr.tie': 'Oavgjort!', 'kr.winner': '🏆 {a} vann!', 'kr.already': 'Du har redan vänt – väntar på den andra spelaren.', 'kr.tap': 'Tryck på "Vänd kort".',
    'kr.tapWar': 'Krig! Tryck på "Vänd kort".', 'kr.who': 'Vem vann?', 'kr.ready': '✅ Klar', 'kr.flip': 'Vänd kort', 'kr.waitOther': 'Väntar på {other}…' },
  en: { 'kr.start': 'Press "Flip card" to start!', 'kr.war': '⚔️ WAR! Both have {r}. Flip again – 3 face down and one face up.', 'kr.won': '{a} won {n} cards with the {c}!',
    'kr.tie': 'It\'s a draw!', 'kr.winner': '🏆 {a} won!', 'kr.already': 'You have already flipped – waiting for the other player.', 'kr.tap': 'Press "Flip card".',
    'kr.tapWar': 'War! Press "Flip card".', 'kr.who': 'Who won?', 'kr.ready': '✅ Ready', 'kr.flip': 'Flip card', 'kr.waitOther': 'Waiting for {other}…' },
});

function start() {
  const deck = makeDeck();
  const piles = [[], []];
  deck.forEach((c, i) => piles[i % 2].push(c));
  return { piles, battle: [[], []], ready: [false, false], war: false, phase: 'play', battles: 0, msg: M('kr.start'), result: null };
}
const waiting = G => (G.phase === 'play' ? [0, 1].filter(s => !G.ready[s]) : []);

function act(G, s, m) {
  if (G.phase !== 'play') return M('waitMoment');
  if (!(m.a === 'btn' && m.id === 'flip') && m.a !== 'pile') return null;
  if (G.ready[s]) return M('kr.already');
  const pile = G.piles[s];
  const n = G.war ? 4 : 1;
  for (let i = 0; i < n && pile.length; i++) G.battle[s].push(pile.pop());
  G.ready[s] = true;
  if (G.ready[0] && G.ready[1]) G.phase = 'resolve';
  return null;
}
function auto(G) { return G.phase === 'resolve' ? { ms: 1400, key: 'resolve' } : null; }
function step(G) {
  const a = G.battle[0][G.battle[0].length - 1], b = G.battle[1][G.battle[1].length - 1];
  G.battles++;
  if (a && b && rv(a.r) === rv(b.r) && G.piles[0].length && G.piles[1].length) {
    G.war = true; G.msg = M('kr.war', { r: M('ranks', { r: a.r }) });
    G.ready = [false, false]; G.phase = 'play'; return;
  }
  const w = !b || (a && rv(a.r) > rv(b.r)) ? 0 : 1;
  const won = shuffle([...G.battle[0], ...G.battle[1]]);
  G.piles[w].unshift(...won);
  G.msg = M('kr.won', { a: seat(w), n: won.length, c: card(w === 0 ? a : b) });
  G.battle = [[], []]; G.ready = [false, false]; G.war = false; G.phase = 'play';
  const [p0, p1] = [G.piles[0].length, G.piles[1].length];
  if (!p0 || !p1 || G.battles >= MAX_BATTLES) {
    G.phase = 'over';
    const winner = p0 === p1 ? -1 : p0 > p1 ? 0 : 1;
    G.result = { final: true, title: winner < 0 ? M('kr.tie') : M('kr.winner', { a: seat(winner) }),
      lines: [0, 1].map(x => ({ seat: x, text: M('cards', { n: G.piles[x].length }), win: x === winner })) };
  }
}
function view(G, s) {
  return {
    turn: null, msg: G.msg,
    hint: G.phase === 'over' ? M('gameOver') : G.phase === 'resolve' ? M('kr.who') :
      s >= 0 && !G.ready[s] ? M(G.war ? 'kr.tapWar' : 'kr.tap') : M('kr.waitOther'),
    seats: [0, 1].map(x => ({ cards: G.piles[x].length, label: G.ready[x] && G.phase === 'play' ? M('kr.ready') : '' })),
    center: [0, 1].map(x => ({ id: 'b' + x, label: seat(x), layout: 'fan', row: 0,
      cards: G.battle[x].map((c, i) => ({ c: i % 4 === 0 || i === G.battle[x].length - 1 ? pub(c) : null, i })) })), // war cards lie face down
    hand: null,
    buttons: s >= 0 && G.phase === 'play' && !G.ready[s] ? [{ id: 'flip', label: M('kr.flip'), icon: 'card', primary: true }] : [],
  };
}
const bot = () => ({ a: 'btn', id: 'flip' });
const idle = () => 6000; // with another person: your card is turned over for you after 6 s
module.exports = { meta, start, view, act, waiting, bot, auto, step, idle };
