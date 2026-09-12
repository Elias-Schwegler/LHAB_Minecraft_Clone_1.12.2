// audit7 independent parity recount: BUILT artifact only (registry markers + __TEXMETA),
// plus proof.tests literal binding + qa/blocks sheets + honest-false spot check.
import { readFileSync, existsSync } from 'node:fs';
import { p } from '../tools/lib.mjs';

const html = readFileSync(p('game', 'index.html'), 'utf8');
const regM = html.match(/\/\*REGISTRY-START\*\/([\s\S]*?)\/\*REGISTRY-END\*\//);
const reg = JSON.parse(regM[1]);
const cat = JSON.parse(readFileSync(p('docs', 'catalog.json'), 'utf8'));
const tmM = html.match(/window\.__TEXMETA\s*=\s*(\{[\s\S]*?\});/);
if (!tmM) { console.log('NO __TEXMETA FOUND in built file'); process.exit(1); }
const texmeta = JSON.parse(tmM[1]);
console.log('__TEXMETA tiles:', Object.keys(texmeta).length);

const keysOf = (b) => (b.labels && b.labels.length ? b.labels : (b.v || 1) === 1 ? ['default'] : Array.from({ length: b.v }, (_, i) => String(i)));
const counted = []; const problems = [];
let tot = { 1: [0, 0], 2: [0, 0], 3: [0, 0] };
for (const b of cat.blocks) {
  for (const lab of keysOf(b)) {
    tot[b.tier][0]++;
    const r = reg[b.n];
    const v = r && r.variants ? r.variants[lab] : null;
    if (!v || !v.functional) continue;
    const badProof = !(v.proof && v.proof.tests && v.proof.tests.length && v.proof.tests.every((t) => html.includes(t)));
    const tiles = v.tiles || [];
    const badTex = !(tiles.length > 0 && tiles.every((t) => texmeta[t] && /^blender:/.test(texmeta[t].src || '')));
    const key = lab === 'default' ? b.n : `${b.n}-${lab}`;
    const noPng = !(existsSync(p('qa', 'blocks', key + '.png')) || existsSync(p('qa', 'blocks', 'family-' + b.n + '.png')));
    if (badProof || badTex || noPng) problems.push(`${key}: proof=${!badProof} blenderTiles=${!badTex} png=${!noPng}`);
    else counted.push(key + ' t' + b.tier);
  }
}
console.log('COUNTED', counted.length, '/', tot[1][0] + tot[2][0] + tot[3][0]);
for (const t of [1, 2, 3]) console.log(`  tier ${t}: ${tot[t][1 - 1][1] || 0}/${tot[t][0]}`);
console.log('by tier recount: t1=' + counted.filter((c) => c.endsWith('t1')).length + ' t2=' + counted.filter((c) => c.endsWith('t2')).length + ' t3=' + counted.filter((c) => c.endsWith('t3')).length);
if (problems.length) { console.log('PROBLEMS:'); problems.forEach((x) => console.log('  ' + x)); }
console.log('counted list: ' + counted.join(', '));

const mustFalse = ['tnt:default', 'chest:default', 'bed:0', 'portal:default', 'farmland:default', 'wheat:default', 'carrot:default', 'potato:default', 'crafting_table:default'];
for (const k of mustFalse) {
  const [n, lab] = k.split(':');
  const v = reg[n] && reg[n].variants && reg[n].variants[lab];
  console.log(`honest-false ${k}: functional=${v ? v.functional : 'MISSING'}`);
}

// atlas manifest collision check (both manifest + built __TEXMETA)
for (const [name, meta] of [['atlas.json', JSON.parse(readFileSync(p('tools', 'tex', 'atlas.json'), 'utf8'))], ['built __TEXMETA', texmeta]]) {
  const cells = {};
  let dupes = 0;
  for (const [t, x] of Object.entries(meta)) {
    if (x.x === undefined) continue;
    const c = x.x + ',' + x.y;
    if (cells[c]) { console.log(`  ${name} COLLISION ${c}: ${cells[c]} vs ${t}`); dupes++; }
    cells[c] = t;
  }
  console.log(`${name}: ${Object.keys(meta).length} tiles, ${dupes} collisions`);
}
