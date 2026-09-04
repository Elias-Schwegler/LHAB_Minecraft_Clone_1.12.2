// build.mjs — assembles the single shipped artifact game/index.html from src/.
// Zero dependencies, fully offline. Enforces §1.1: no external refs in output.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { p } from './lib.mjs';

const manifest = JSON.parse(readFileSync(p('src', 'manifest.json'), 'utf8'));
const atlas = { b64: null, tiles: {} };
if (existsSync(p('tools', 'tex', 'atlas.png'))) {
  atlas.b64 = readFileSync(p('tools', 'tex', 'atlas.png')).toString('base64');
  if (existsSync(p('tools', 'tex', 'atlas.json'))) {
    atlas.tiles = JSON.parse(readFileSync(p('tools', 'tex', 'atlas.json'), 'utf8'));
  }
}

const js = manifest.modules.map((m) => `/* ==== ${m} ==== */\n` + readFileSync(p(m), 'utf8')).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Cubeforge</title>
<style>
html,body{margin:0;height:100%;overflow:hidden;background:#000}
#gl{width:100%;height:100%;display:block;image-rendering:pixelated}
</style>
</head>
<body>
<canvas id="gl"></canvas>
<script>window.__ATLAS_B64=${atlas.b64 ? JSON.stringify(atlas.b64) : 'null'};window.__TEXMETA=${JSON.stringify(atlas.tiles)};</script>
<script>
${js}
</script>
</body>
</html>`;

// offline audit (§1.1): no http(s) references, no fetch/XHR/import, no CDN
const audit = [
  [/https?:\/\//g, 'external URL reference'],
  [/\bfetch\s*\(/g, 'fetch( call'],
  [/XMLHttpRequest/g, 'XMLHttpRequest'],
  [/import\s*\(/g, 'dynamic import'],
  [/<script[^>]+src=/gi, 'external script src'],
];
for (const [re, why] of audit) {
  const m = html.match(re);
  if (m) { console.error(`BUILD AUDIT FAIL: ${why} x${m.length}`); process.exit(1); }
}

writeFileSync(p('game', 'index.html'), html);
console.log(`build OK -> game/index.html (${(html.length / 1024).toFixed(1)} KB, atlas ${atlas.b64 ? 'embedded' : 'ABSENT (magenta)'})`);
