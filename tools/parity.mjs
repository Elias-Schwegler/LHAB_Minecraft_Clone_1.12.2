// parity.mjs — honest parity metric (§7): counts a catalog variant as functional ONLY if
// 1) it is in the BUILT artifact registry (extracted from game/index.html, not src),
// 2) registry marks it functional:true, 3) a Blender-sourced tile exists in the atlas
//    manifest (tools/tex/atlas.json: {tileId:{src:"blender:script.py",...}}),
// 4) evidence screenshot qa/blocks/<n>[-<variant>].png or qa/blocks/family-<n>.png exists.
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { p, today } from './lib.mjs';

const catalog = JSON.parse(readFileSync(p('docs', 'catalog.json'), 'utf8'));
if (!existsSync(p('game', 'index.html'))) { console.error('run tools/build.mjs first'); process.exit(2); }
const html = readFileSync(p('game', 'index.html'), 'utf8');
const m = html.match(/\/\*REGISTRY-START\*\/([\s\S]*?)\/\*REGISTRY-END\*\//);
if (!m) { console.error('parity: registry markers not found in built artifact'); process.exit(1); }
const reg = JSON.parse(m[1]);
const texmeta = existsSync(p('tools', 'tex', 'atlas.json')) ? JSON.parse(readFileSync(p('tools', 'tex', 'atlas.json'), 'utf8')) : {};

mkdirSync(p('qa', 'blocks'), { recursive: true });
const rows = [];
let tot = { 1: [0, 0], 2: [0, 0], 3: [0, 0] };
// Variant key rule (documented in src/registry.js): catalog `labels` if present;
// v==1 -> "default"; v>1 without labels -> numeric meta keys "0".."v-1".
function keysOf(b) {
  if (b.labels && b.labels.length) return b.labels;
  if ((b.v || 1) === 1) return ['default'];
  return Array.from({ length: b.v }, (_, i) => String(i));
}
for (const b of catalog.blocks) {
  const tier = b.tier;
  const labels = keysOf(b);
  for (const lab of labels) {
    tot[tier][0]++;
    const r = reg[b.n];
    const v = r && (r.variants ? r.variants[lab] : r);
    let ok = !!v && !!v.functional;
    if (ok) {
      // #014: functional flag must carry proof binding (audit finding F5)
      const pr = v.proof;
      ok = !!(pr && Array.isArray(pr.tests) && pr.tests.length &&
        pr.tests.every((t) => html.includes(t)));
      if (!ok) rows.push(`${b.n}${lab ? ' ' + lab : ''}: functional:true WITHOUT valid proof.tests`);
    }
    if (ok) {
      const tiles = v.tiles || [];
      ok = tiles.length > 0 && tiles.every((t) => texmeta[t] && /^blender:/.test(texmeta[t].src || ''));
    }
    if (ok) {
      const key = lab === 'default' ? b.n : `${b.n}-${lab}`;
      const f1 = p('qa', 'blocks', `${key}.png`);
      const f2 = p('qa', 'blocks', `family-${b.n}.png`);
      ok = existsSync(f1) || existsSync(f2);
    }
    if (ok) tot[tier][1]++;
    else if (r) rows.push(`${b.n}${lab ? ' ' + lab : ''}: registered but not counted (needs functional flag + blender tile + qa/blocks png)`);
  }
}
const all = tot[1][0] + tot[2][0] + tot[3][0];
const done = tot[1][1] + tot[2][1] + tot[3][1];
console.log(`PARITY @ ${today()} — functional variants ${done}/${all} (${(100 * done / all).toFixed(1)}%)`);
for (const t of [1, 2, 3]) console.log(`  tier ${t}: ${tot[t][1]}/${tot[t][0]}`);
if (rows.length) console.log('registered-but-unproven:\n  ' + rows.slice(0, 40).join('\n  '));
writeFileSync(p('qa', 'parity-latest.json'), JSON.stringify({ date: today(), done, all, tot }, null, 1));
console.log('wrote qa/parity-latest.json');
