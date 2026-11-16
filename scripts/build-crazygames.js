// Builds the CrazyGames version: static files + their SDK + the address of your server, as a zip.
//   KORTBORD_SERVER=wss://din-server.example.com npm run build:crazygames
// Output: dist/crazygames/ (folder) and dist/free-deck-crazygames.zip (upload this).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'dist', 'crazygames');
const ZIP = path.join(ROOT, 'dist', 'free-deck-crazygames.zip');
const FILES = ['index.html', 'privacy.html', 'engine.js', 'engine.css', 'i18n.js', 'i18n-ui.js', 'platform.js', 'icons.js', 'sound.js', 'deck.js', 'deck-design.js', 'chess-ui.js', 'deck.css', 'rules.js', 'local.js', 'fonts/nunito.css', 'fonts/nunito-latin.woff2'];
const SDK = '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>';

require('./build-rules'); // the game rules, so games against the computer run in the browser
const server = process.env.KORTBORD_SERVER || '';
if (!/^wss:\/\//.test(server)) {
  if (!server) console.warn('ℹ️  Ingen KORTBORD_SERVER – spel mot datorn fungerar, men inte att bjuda in vänner. Exempel: KORTBORD_SERVER=wss://kortbord.example.com');
  else if (/^ws:\/\//.test(server)) console.warn('⚠️  ws:// fungerar bara lokalt. CrazyGames kör över https och kräver wss://');
}

fs.rmSync(OUT, { recursive: true, force: true });
for (const f of FILES) {
  const to = path.join(OUT, f);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(SRC, f), to);
}
// their SDK first in <head>, before our own scripts
let html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
html = html.replace('<script src="config.js"></script>', `${SDK}\n<script src="config.js"></script>`);
if (!html.includes(SDK)) throw new Error('Kunde inte lägga in CrazyGames SDK i index.html');
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.writeFileSync(path.join(OUT, 'config.js'),
  `// CrazyGames build ${new Date().toISOString().slice(0, 10)}\nwindow.KB_CONFIG = ${JSON.stringify({ platform: 'crazygames', server })};\n`);

// checks from the CrazyGames technical requirements
const problems = [];
for (const f of ['index.html', 'engine.css', 'fonts/nunito.css']) {
  const txt = fs.readFileSync(path.join(OUT, f), 'utf8');
  const abs = txt.match(/(?:src|href)="\/[^/][^"]*"|url\(\/[^/)][^)]*\)/g);
  if (abs) problems.push(`${f}: absoluta sökvägar ${abs.join(', ')}`);
  const ext = (txt.match(/(?:src|href)="https?:\/\/[^"]+"/g) || []).filter(x => !x.includes('sdk.crazygames.com'));
  if (ext.length) problems.push(`${f}: laddar filer från andra sidor ${ext.join(', ')}`);
}
const all = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(path.join(d, e.name)) : all.push(path.join(d, e.name)); })(OUT);
const bytes = all.reduce((t, f) => t + fs.statSync(f).size, 0);
if (all.length > 1500) problems.push(`för många filer: ${all.length} (max 1500)`);
if (bytes > 20 * 1024 * 1024) problems.push(`för stort: ${(bytes / 1048576).toFixed(1)} MB (max 20 MB för mobilens startsida)`);

fs.rmSync(ZIP, { force: true });
execFileSync('zip', ['-qr', ZIP, '.'], { cwd: OUT });

console.log(`✔ Byggt: ${path.relative(ROOT, ZIP)}`);
console.log(`  ${all.length} filer, ${(bytes / 1024).toFixed(0)} kB, zip ${(fs.statSync(ZIP).size / 1024).toFixed(0)} kB`);
console.log(`  Server: ${server || '(ingen)'}`);
if (problems.length) { console.error('✖ Problem:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('✔ Inga absoluta sökvägar, inga externa filer (förutom CrazyGames SDK), inom storleksgränserna.');
