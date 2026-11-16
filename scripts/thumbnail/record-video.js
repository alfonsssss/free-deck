// Records a gameplay preview of the CrazyGames build (English): deck, Blackjack, chess.
// node record.js <landscape|portrait> <outdir>
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const mode = process.argv[2] || 'landscape', out = process.argv[3] || '.';
const size = mode === 'portrait' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
const view = mode === 'portrait' ? { width: 540, height: 960 } : { width: 1920, height: 1080 };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1200,2100'] });
  const ctx = await browser.newContext(mode === 'portrait' ? { viewport: null } : { viewport: view, deviceScaleFactor: size.width / view.width, hasTouch: false });
  const page = await ctx.newPage();
  // frames straight from Chrome (screencast), turned into an mp4 with ffmpeg afterwards
  const frames = []; const fdir = path.join(out, 'frames-' + mode); fs.rmSync(fdir, { recursive: true, force: true }); fs.mkdirSync(fdir, { recursive: true });
  const cdp = await ctx.newCDPSession(page);
  if (mode === 'portrait') await cdp.send('Emulation.setDeviceMetricsOverride', { width: view.width, height: view.height, deviceScaleFactor: 2, mobile: false, scale: 1 }); // a phone screen, drawn sharp at 1080×1920
  cdp.on('Page.screencastFrame', async f => { const n = frames.length; const file = path.join(fdir, String(n).padStart(5, '0') + '.jpg'); fs.writeFileSync(file, Buffer.from(f.data, 'base64')); frames.push({ file, t: f.metadata.timestamp }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {} });
  await page.addInitScript(() => { try { localStorage.setItem('kortbord-deckhelp', '1'); localStorage.setItem('kortbord-guide2', '1'); localStorage.setItem('kortbord-intro', '1'); localStorage.setItem('kortbord-lang', 'en'); localStorage.setItem('kortbord-name', 'Alex'); } catch (e) {} });
  const t0 = Date.now();
  await page.goto('http://localhost:5190/', { waitUntil: 'networkidle' });
  let shooting = false; // screenshot loop disturbs input; screencast + sharp upscaling instead
  if (shooting) { // full-resolution screenshots in a loop (the screencast is only half size on a 2x screen)
    const cdp2 = cdp;
    (async () => { while (shooting) { try { const r = await cdp2.send('Page.captureScreenshot', { format: 'jpeg', quality: 85, optimizeForSpeed: true }); const n = frames.length; const file = path.join(fdir, String(n).padStart(5, '0') + '.jpg'); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); frames.push({ file, t: Date.now() / 1000 }); await sleep(30); } catch (e) { break; } } })();
  } else await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: size.width, maxHeight: size.height, everyNthFrame: 1 });
  await sleep(500);
  const box = async sel => { const el = await page.waitForSelector(sel, { state: 'visible', timeout: 8000 }); const b = await el.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; };
  const glide = async (x, y, steps = 18) => page.mouse.move(x, y, { steps });
  const click = async sel => { const p = await box(sel); await glide(p.x, p.y, 14); await sleep(120); await page.mouse.click(p.x, p.y); };
  const drag = async (from, to, steps = 26) => { await glide(from.x, from.y, 12); await page.mouse.down(); await sleep(90); await glide(to.x, to.y, steps); await sleep(80); await page.mouse.up(); };
  const center = async handle => { const b = await handle.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };

  // 1. the start page, then open the deck
  await glide(view.width * 0.7, view.height * 0.35, 25); await sleep(500);
  await click('#lDeck'); await sleep(1100);

  // 2. the deck: shuffle, deal into the hand, play cards on the table
  await click('#deck [data-dk="shuffle"]'); await sleep(900);
  await click('#deck [data-dk="deal"]'); await sleep(450);
  await click('.dsheet [data-key="n"] [data-v="5"]'); await sleep(200);
  await click('.dsheet [data-key="to"] [data-v="hand"]'); await sleep(200);
  await click('.dsheet [data-go]'); await sleep(1300);
  const deckTop = async () => { const id = await page.evaluate(() => { const p = dkBiggest(); return p.cards[p.cards.length - 1].id; }); return center(await page.$(`#deck .dc[data-id="${id}"]`)); };
  let d = await deckTop();
  await drag(d, { x: view.width * 0.3, y: view.height * 0.42 }); await sleep(300);
  await page.mouse.click(view.width * 0.3, view.height * 0.42); await sleep(500); // flip
  d = await deckTop();
  await drag(d, { x: view.width * 0.68, y: view.height * 0.42 }); await sleep(250);
  await page.mouse.click(view.width * 0.68, view.height * 0.42); await sleep(500);
  const handCards = await page.$$('#deck .dc.hand');
  if (handCards.length) { await drag(await center(handCards[2] || handCards[0]), { x: view.width * 0.31, y: view.height * 0.44 }); await sleep(600); }
  if (handCards.length > 1) { await drag(await center(handCards[0]), { x: view.width * 0.69, y: view.height * 0.44 }); await sleep(700); }

  // 3. Blackjack: build a bet with chips, deal, play
  await click('#deck [data-dk="home"]'); await sleep(900);
  await page.evaluate(() => playSolo('g-blackjack')); await sleep(1300);
  for (const c of ['add100', 'add100', 'add50']) { await click(`[data-btn="${c}"]`); await sleep(350); }
  await click('[data-btn="place"]'); await sleep(1500);
  for (let i = 0; i < 2; i++) {
    const can = await page.$('[data-btn="hit"]'); if (!can) break;
    const total = await page.evaluate(() => (EV && EV.hand ? EV.handLabel : ''));
    const v = +(String(total).match(/(\d+)\s*$/) || [0, 0])[1];
    await click(v < 16 ? '[data-btn="hit"]' : '[data-btn="stand"]'); await sleep(1100);
    if (v >= 16) break;
  }
  if (await page.$('[data-btn="stand"]')) { await click('[data-btn="stand"]'); }
  await sleep(3200);

  // 4. Chess: drag pieces against the computer
  await page.evaluate(() => goHome()); await sleep(800);
  await page.evaluate(() => playSolo('g-chess', { tc: 5, level: 'medium' })); await sleep(1300);
  const sq = async i => center(await page.$(`[data-sq="${i}"]`));
  await drag(await sq(52), await sq(36), 22); await sleep(2300); // e2-e4
  await drag(await sq(62), await sq(45), 22); await sleep(2300); // Ng1-f3
  await drag(await sq(61), await sq(34), 22); await sleep(2200); // Bf1-c4
  console.log('recorded', Math.round((Date.now() - t0) / 1000), 's');
  await sleep(300); if (shooting) { shooting = false; await sleep(400); } else await cdp.send('Page.stopScreencast');
  await ctx.close(); await browser.close();
  // a concat list with how long each frame stays on screen
  const lines = []; frames.forEach((f, i) => { const next = frames[i + 1]; lines.push(`file '${f.file}'`, `duration ${next ? Math.max(0.001, next.t - f.t).toFixed(4) : 0.5}`); });
  lines.push(`file '${frames[frames.length - 1].file}'`);
  fs.writeFileSync(path.join(out, `list-${mode}.txt`), lines.join('\n'));
  console.log('frames', frames.length);
})();
