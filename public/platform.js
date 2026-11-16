/* =========================================================
   Platform layer: what differs between the normal web version and CrazyGames.
   config.js (written by the build script) may set window.KB_CONFIG = { platform, server }.
   - platform 'crazygames': loads their SDK, uses their invite links, room info,
     username, language and gameplay start/stop signals; hides Community and
     "create your own game" (user-made content needs moderation there).
   - server: address of the multiplayer server (wss://…). Empty = same address as the page.
   ========================================================= */
const KB = Object.assign({ platform: 'web', server: '' }, window.KB_CONFIG || {});
const CG = { sdk: null, username: null, playing: false };
const isCG = () => !!CG.sdk;
const isCGBuild = () => KB.platform === 'crazygames';
// is there a multiplayer server to talk to? (the CrazyGames build only has one if KORTBORD_SERVER was set)
const hasServer = () => !isCGBuild() || !!KB.server;

async function platformInit() {
  if (isCGBuild() && window.CrazyGames && window.CrazyGames.SDK) {
    try {
      await window.CrazyGames.SDK.init();
      if (window.CrazyGames.SDK.environment !== 'disabled') CG.sdk = window.CrazyGames.SDK;
    } catch (e) { console.warn('CrazyGames SDK could not start', e); }
  }
  if (!CG.sdk) return;
  try { CG.sdk.game.loadingStart(); } catch (e) {}
  try { LANG = detectLang(CG.sdk.user.systemInfo && CG.sdk.user.systemInfo.locale); } catch (e) {}
  try { if (CG.sdk.user.isUserAccountAvailable) { const u = await CG.sdk.user.getUser(); if (u && u.username) CG.username = u.username; } } catch (e) {}
  try { CG.sdk.game.addJoinRoomListener(params => { const code = params && params.room; if (code) enterRoom(cleanCode(code), null, false, true); }); } catch (e) {}
}
function platformLoaded() { try { CG.sdk && CG.sdk.game.loadingStop(); } catch (e) {} }
const cleanCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

function serverURL() {
  if (KB.server) return KB.server;
  return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
}
// room code from an invite (CrazyGames invite param, or ?rum= on the web)
function invitedRoom() {
  if (CG.sdk) { try { const r = CG.sdk.game.getInviteParam('room'); if (r) return cleanCode(r); } catch (e) {} }
  if (isCGBuild()) return null;
  return cleanCode(new URLSearchParams(location.search).get('rum'));
}
function inviteLinkFor(code) {
  if (CG.sdk) { try { return CG.sdk.game.inviteLink({ room: code }); } catch (e) {} }
  return location.origin + location.pathname + '?rum=' + code;
}
// the address bar is CrazyGames' own page, so only change it on the web
function navTo(url) { if (!isCGBuild()) history.pushState(null, '', url); }
function cgGameplay(on) {
  if (!CG.sdk || on === CG.playing) return;
  CG.playing = on;
  try { on ? CG.sdk.game.gameplayStart() : CG.sdk.game.gameplayStop(); } catch (e) {}
}
function cgRoom(code, joinable) {
  if (!CG.sdk) return;
  try { if (code) CG.sdk.game.updateRoom({ roomId: code, isJoinable: !!joinable, inviteParams: { room: code } }); else CG.sdk.game.leftRoom(); } catch (e) {}
}
function cgHappy() { try { CG.sdk && CG.sdk.game.happytime(); } catch (e) {} }
const cgInstant = () => { try { return !!(CG.sdk && CG.sdk.game.isInstantMultiplayer); } catch (e) { return false; } };
