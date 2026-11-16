/* =========================================================
   Sounds, made in code with the Web Audio API (no sound files to load).
   sfx('flip' | 'slide' | 'place' | 'shuffle' | 'deal' | 'click' | 'win' | 'pop' | 'error')
   Muted with sfxMute(true); CrazyGames' own mute setting is respected (platform.js).
   ========================================================= */
const SFX = { ctx: null, muted: false, noise: null, last: {} };
try { SFX.muted = localStorage.getItem('kortbord-mute') === '1'; } catch (e) {}

function sfxCtx() {
  if (SFX.muted) return null;
  if (!SFX.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    SFX.ctx = new AC();
    const len = SFX.ctx.sampleRate; // one second of white noise, reused for every paper sound
    SFX.noise = SFX.ctx.createBuffer(1, len, SFX.ctx.sampleRate);
    const d = SFX.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (SFX.ctx.state === 'suspended') SFX.ctx.resume();
  return SFX.ctx;
}
// browsers only allow sound after the first tap
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => sfxCtx(), { once: true, capture: true }));

// a short burst of filtered noise = the sound of paper
function paper(t, { dur = 0.06, freq = 2500, q = 1.2, vol = 0.5, sweep = 0, type = 'bandpass' } = {}) {
  const c = SFX.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = SFX.noise; f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(80, freq * sweep), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
}
function tone(t, { freq = 440, dur = 0.12, vol = 0.18, type = 'sine', to = 0 } = {}) {
  const c = SFX.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
function sfx(name) {
  const c = sfxCtx(); if (!c) return;
  const now = c.currentTime;
  if (SFX.last[name] && now - SFX.last[name] < 0.03) return; // don't stack the same sound
  SFX.last[name] = now;
  const r = () => 0.9 + Math.random() * 0.2;
  switch (name) {
    case 'flip': paper(now, { dur: 0.05, freq: 3200 * r(), q: 0.8, vol: 0.55 }); paper(now + 0.035, { dur: 0.05, freq: 1800 * r(), q: 1, vol: 0.35 }); break;
    case 'slide': paper(now, { dur: 0.16, freq: 1400 * r(), q: 0.6, vol: 0.3, sweep: 2.4 }); break;
    case 'place': paper(now, { dur: 0.05, freq: 900 * r(), q: 0.7, vol: 0.6, type: 'lowpass' }); tone(now, { freq: 140, to: 80, dur: 0.07, vol: 0.12 }); break;
    case 'deal': paper(now, { dur: 0.09, freq: 2200 * r(), q: 0.7, vol: 0.4, sweep: 0.5 }); break;
    case 'shuffle': // a riffle: many fast little flicks, then the cards squared up
      for (let i = 0; i < 22; i++) paper(now + i * 0.022 + Math.random() * 0.006, { dur: 0.03, freq: 2600 + Math.random() * 1800, q: 1.5, vol: 0.28 + Math.random() * 0.12 });
      paper(now + 0.55, { dur: 0.09, freq: 700, q: 0.6, vol: 0.55, type: 'lowpass' }); break;
    case 'click': tone(now, { freq: 1400, to: 900, dur: 0.045, vol: 0.08, type: 'triangle' }); break;
    case 'pop': tone(now, { freq: 520, to: 880, dur: 0.09, vol: 0.12, type: 'triangle' }); break;
    case 'error': tone(now, { freq: 220, to: 160, dur: 0.16, vol: 0.12, type: 'square' }); break;
    case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(now + i * 0.09, { freq: f, dur: 0.22, vol: 0.14, type: 'triangle' })); break;
  }
}
function sfxMute(on) {
  SFX.muted = !!on;
  try { localStorage.setItem('kortbord-mute', on ? '1' : '0'); } catch (e) {}
  if (on && SFX.ctx) SFX.ctx.suspend(); else if (!on) sfxCtx();
  document.querySelectorAll('[data-mute]').forEach(b => { b.innerHTML = ic(on ? 'soundoff' : 'sound'); b.setAttribute('aria-label', on ? 'Sound off' : 'Sound on'); });
}
