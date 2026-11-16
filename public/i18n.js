/* =========================================================
   Texts in the web page (Swedish + English). The game texts themselves are
   translated on the server; this file covers buttons, menus and dialogs.
   Language: saved choice → CrazyGames locale → browser language → English.
   ========================================================= */
const I18N = {
  sv: {
    home: 'Hem', roomCode: 'RUMSKOD', roomCodeTip: 'Rumskod – läs upp den för dina vänner', invite: 'Bjud in', rules: 'Regler', inviteFriends: 'Bjud in vänner',
    codeHelp: 'Rumskod – läs upp den eller skicka länken', linkCopied: 'Länk kopierad!', linkCopiedToast: '🔗 Länk kopierad! Skicka den till dina vänner – eller läs upp rumskoden: {code}',
    copyPrompt: 'Kopiera länken och skicka till dina vänner:', sitHere: '＋ Sätt dig här', takeSeat: 'Ta platsen', removeBot: 'Ta bort datorn', bet: 'Insats', away: '📶 Borta – datorn spelar',
    you: 'Du', watching: '👀 {n} tittar på', pot: 'Pott', yourTurn: '🎯 Din tur!', waitingFor: '⏳ Väntar på {name}…', handTap: '🔒 Din hand – tryck på ett kort', handSecret: '🔒 Din hand – bara du ser den',
    newGame: 'Nytt spel', playAgain: 'Spela igen', changePlayers: 'Ändra spelare', toStart: 'Till startsidan', waitYourTurn: 'Vänta på din tur – det är {name}s tur.', notNow: 'Det går inte just nu.',
    raiseTitle: '⬆️ Hur mycket?', less: '➖ Mindre', more: '➕ Mer', qMin: 'Minsta', qHalf: 'Halva potten', qPot: 'Hela potten', qAll: '🔥 Allt', raiseTo: '⬆️ {label} till {n}', cancel: 'Avbryt',
    skip: 'Hoppa över', next: 'Nästa →', startPlaying: '🎉 Börja spela', gotIt: 'Uppfattat!', whatName: '👋 Vad heter du?', yourName: 'Ditt namn', go: 'Kör!', loading: 'Laddar…',
    heroTitle: 'En kortlek, direkt i webbläsaren.', heroText: 'Blanda, dela ut och spela vilket kortspel du vill – själv eller med vänner.',
    haveCode: 'Har du en rumskod?', join: 'Gå med', writeCode: 'Skriv rumskoden du har fått', favorites: '⭐ Mina favoriter', chooseGame: 'Färdiga spel', play: 'Spela', plays: '▶ {n} spelningar',
    players: '👥 {n} spelare', kids: '👶 För barn', classic: 'Klassiker', favEmpty: 'Tryck på ☆ på ett spel så hamnar det här.', favSaved: '⭐ Sparad bland dina favoriter', favRemoved: 'Borttagen från favoriter',
    sitAs: 'Sitt som {name}', pickSeat: 'Välj var du vill sitta', findGames: 'Hitta populära spel', back: 'Tillbaka', openDeck: 'Öppna en kortlek', heroTitleSolo: 'En kortlek, direkt i webbläsaren.', connLost: 'Tappade anslutningen – försöker igen…', room: 'Rum {code}', playNow: 'Spela {name}', heroTextSolo: 'Blanda, dela ut och spela vilket kortspel du vill.',
    tabGames: 'Spel', createOwn: 'Skapa eget spel', createTip: 'Skapa eget spel|Börja med ett tomt bord och en kortlek. Lägg till platser, marker och knappar – och publicera i Community.',
    myGames: '🎨 Spel jag har gjort', by: 'av {name}', onlyYou: 'Bara du', favorite: 'Favorit', favOnTip: 'Spara som favorit|Spelet hamnar under ⭐ Mina favoriter.', favOffTip: 'Ta bort favorit|Spelet försvinner från Mina favoriter.',
    delTip: 'Ta bort|Tar bort ditt spel för alltid.', reportTip: 'Rapportera|Tycker du att spelet är olämpligt? Tryck här så tittar vi på det.',
    language: 'Språk', nextRoundIn: 'Nästa runda börjar om {n} s…', newGameIn: 'Nytt spel börjar om {n} s…', continueNow: 'Fortsätt nu', autoMoveIn: 'Datorn gör ditt drag om {n} s',
    guide: [
      ['👋', 'Välkommen till bordet!', 'Här spelar du kort med vänner – eller mot datorn. Du behöver inte kunna reglerna, spelet hjälper dig hela vägen.'],
      ['✋', 'Din hand', 'Dina kort ligger längst ner. Bara du kan se dem. Tryck på ett kort – eller dra upp det till bordet – för att spela det.'],
      ['🔘', 'Stora knappar', 'Knapparna visar bara det du kan göra just nu, till exempel "Ta kort" eller "Stå". Texten ovanför säger vad du ska göra.'],
      ['🎯', 'Din tur', 'När det är din tur lyser din bild och raden ovanför knapparna blir orange. Annars ser du vem ni väntar på.'],
      ['🔗', 'Bjud in', 'Tryck "Bjud in" så kopieras en länk du kan skicka. Eller läs upp rumskoden. Tomma platser fylls av datorn.'],
    ],
  },
  en: {
    home: 'Home', roomCode: 'ROOM CODE', roomCodeTip: 'Room code – read it out to your friends', invite: 'Invite', rules: 'Rules', inviteFriends: 'Invite friends',
    codeHelp: 'Room code – read it out or send the link', linkCopied: 'Link copied!', linkCopiedToast: '🔗 Link copied! Send it to your friends – or read out the room code: {code}',
    copyPrompt: 'Copy the link and send it to your friends:', sitHere: '＋ Sit here', takeSeat: 'Take seat', removeBot: 'Remove computer', bet: 'Bet', away: '📶 Away – the computer plays',
    you: 'You', watching: '👀 {n} watching', pot: 'Pot', yourTurn: '🎯 Your turn!', waitingFor: '⏳ Waiting for {name}…', handTap: '🔒 Your hand – tap a card', handSecret: '🔒 Your hand – only you can see it',
    newGame: 'New game', playAgain: 'Play again', changePlayers: 'Change players', toStart: 'Back to start', waitYourTurn: 'Please wait – it is {name}\'s turn.', notNow: 'You can\'t do that right now.',
    raiseTitle: '⬆️ How much?', less: '➖ Less', more: '➕ More', qMin: 'Minimum', qHalf: 'Half the pot', qPot: 'Whole pot', qAll: '🔥 Everything', raiseTo: '⬆️ {label} to {n}', cancel: 'Cancel',
    skip: 'Skip', next: 'Next →', startPlaying: '🎉 Start playing', gotIt: 'Got it!', whatName: '👋 What is your name?', yourName: 'Your name', go: 'Let\'s go!', loading: 'Loading…',
    heroTitle: 'A deck of cards, right in your browser.', heroText: 'Shuffle, deal and play any card game you know – on your own or with friends.',
    haveCode: 'Got a room code?', join: 'Join', writeCode: 'Type the room code you were given', favorites: '⭐ My favourites', chooseGame: 'Ready-made games', play: 'Play', plays: '▶ {n} plays',
    players: '👥 {n} players', kids: '👶 Kid friendly', classic: 'Classic', favEmpty: 'Tap ☆ on a game to keep it here.', favSaved: '⭐ Saved to your favourites', favRemoved: 'Removed from favourites',
    sitAs: 'Play as {name}', pickSeat: 'Choose where you want to sit', findGames: 'Find popular games', back: 'Back', openDeck: 'Open a deck of cards', heroTitleSolo: 'A deck of cards, right in your browser.', connLost: 'Connection lost – trying again…', room: 'Room {code}', playNow: 'Play {name}', heroTextSolo: 'Shuffle, deal and play any card game you know.',
    tabGames: 'Games', createOwn: 'Create your own game', createTip: 'Create your own game|Start with an empty table and a deck. Add seats, chips and buttons – and publish it to the Community.',
    myGames: '🎨 Games I made', by: 'by {name}', onlyYou: 'Only you', favorite: 'Favourite', favOnTip: 'Save as favourite|The game shows up under ⭐ My favourites.', favOffTip: 'Remove favourite|The game disappears from My favourites.',
    delTip: 'Delete|Deletes your game for good.', reportTip: 'Report|Think this game is inappropriate? Tap here and we will take a look.',
    language: 'Language', nextRoundIn: 'Next round starts in {n} s…', newGameIn: 'New game starts in {n} s…', continueNow: 'Continue now', autoMoveIn: 'The computer moves for you in {n} s',
    guide: [
      ['👋', 'Welcome to the table!', 'Play cards with friends – or against the computer. You don\'t need to know the rules; the game helps you all the way.'],
      ['✋', 'Your hand', 'Your cards are at the bottom. Only you can see them. Tap a card – or drag it up to the table – to play it.'],
      ['🔘', 'Big buttons', 'The buttons only show what you can do right now, like "Hit" or "Stand". The text above tells you what to do.'],
      ['🎯', 'Your turn', 'When it is your turn, your picture glows and the bar above the buttons turns orange. Otherwise you see who you are waiting for.'],
      ['🔗', 'Invite', 'Press "Invite" to copy a link you can send. Or read out the room code. Empty seats are filled by the computer.'],
    ],
  },
};
let LANG = 'en';
const NUM_LOCALE = () => (LANG === 'sv' ? 'sv-SE' : 'en-US');
function t(key, p = {}) {
  const s = (I18N[LANG] && I18N[LANG][key]) ?? I18N.en[key] ?? key;
  const out = typeof s === 'string' ? s.replace(/\{(\w+)\}/g, (m, k) => (k in p ? (typeof p[k] === 'number' ? p[k].toLocaleString(NUM_LOCALE()) : p[k]) : m)) : s;
  return typeof deEmoji === 'function' ? (Array.isArray(out) ? out.map(r => r.map((x, i) => (i ? deEmoji(x) : x))) : deEmoji(out)) : out; // no emojis in the interface
}
const fmt = n => Number(n || 0).toLocaleString(NUM_LOCALE());
function detectLang(sdkLocale) {
  let saved = null; try { saved = localStorage.getItem('kortbord-lang'); } catch (e) {}
  const src = saved || sdkLocale || navigator.language || 'en';
  return String(src).toLowerCase().startsWith('sv') ? 'sv' : 'en';
}
function setLang(l, remember) {
  LANG = l === 'sv' ? 'sv' : 'en';
  if (remember) { try { localStorage.setItem('kortbord-lang', LANG); } catch (e) {} }
  document.documentElement.lang = LANG;
  applyI18n();
  if (typeof uiApply === 'function' && document.body) uiApply(); // free table, tools, Community (i18n-ui.js)
}
// static texts in the HTML: data-i18n (text), data-i18n-ph (placeholder), data-i18n-title (title)
function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-ph]').forEach(el => (el.placeholder = t(el.dataset.i18nPh)));
  root.querySelectorAll('[data-i18n-title]').forEach(el => (el.title = t(el.dataset.i18nTitle)));
  root.querySelectorAll('[data-i18n-tip]').forEach(el => (el.dataset.tip = t(el.dataset.i18nTip)));
}
LANG = detectLang();
