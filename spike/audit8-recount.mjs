import { readFileSync, existsSync } from 'node:fs';
const html = readFileSync('game/index.html', 'utf8');
const rm = html.match(/\/\*REGISTRY-START\*\/([\s\S]*?)\/\*REGISTRY-END\*\//);
if (!rm) { console.log('NO REGISTRY MARKERS'); process.exit(1); }
const reg = JSON.parse(rm[1]);
const tm = html.match(/window\.__TEXMETA\s*=\s*(\{[^\n]*\})/);
if (!tm) { console.log('NO TEXMETA ASSIGN'); process.exit(1); }
const tex = JSON.parse(tm[1]);
const sz = html.match(/window\.__ATLAS_SIZE\s*=\s*(\d+)/);
const catalog = JSON.parse(readFileSync('docs/catalog.json', 'utf8'));
function keysOf(b) {
  if (b.labels && b.labels.length) return b.labels;
  if ((b.v || 1) === 1) return ['default'];
  return Array.from({ length: b.v }, (_, i) => String(i));
}
const counted = [];
const tot = { 1: [0, 0], 2: [0, 0], 3: [0, 0] };
let proofFail = [], texFail = [], sheetFail = [];
for (const b of catalog.blocks) {
  for (const lab of keysOf(b)) {
    tot[b.tier][0]++;
    const r = reg[b.n];
    const v = r && (r.variants ? r.variants[lab] : r);
    const ok0 = !!v && !!v.functional;
    if (!ok0) continue;
    const pr = v.proof;
    const proof = !!(pr && Array.isArray(pr.tests) && pr.tests.length && pr.tests.every(t => html.includes(t)));
    if (!proof) { proofFail.push(`${b.n} ${lab}`); continue; }
    const tiles = v.tiles || [];
    const texOk = tiles.length > 0 && tiles.every(t => tex[t] && /^blender:/.test(tex[t].src || ''));
    if (!texOk) { texFail.push(`${b.n} ${lab} tiles=${JSON.stringify(tiles)}`); continue; }
    const key = lab === 'default' ? b.n : `${b.n}-${lab}`;
    const sheet = existsSync(`qa/blocks/${key}.png`) || existsSync(`qa/blocks/family-${b.n}.png`);
    if (!sheet) { sheetFail.push(`${b.n} ${lab}`); continue; }
    tot[b.tier][1]++;
    counted.push(`t${b.tier} ${key}`);
  }
}
const all = tot[1][0] + tot[2][0] + tot[3][0], done = tot[1][1] + tot[2][1] + tot[3][1];
console.log(`RECOUNT (built __TEXMETA): ${done}/${all} (${(100 * done / all).toFixed(1)}%) t1 ${tot[1][1]}/${tot[1][0]} t2 ${tot[2][1]}/${tot[2][0]} t3 ${tot[3][1]}/${tot[3][0]}`);
console.log('functional-without-proof:', proofFail.join(', ') || 'none');
console.log('no-blender-tile(via built texmeta):', texFail.join('; ') || 'none');
console.log('no-sheet:', sheetFail.join(', ') || 'none');
const t1 = counted.filter(c => c.startsWith('t1 ')).map(c => c.slice(3)).sort();
const t2 = counted.filter(c => c.startsWith('t2 ')).map(c => c.slice(3)).sort();
console.log('T1(' + t1.length + '):', t1.join(','));
console.log('T2(' + t2.length + '):', t2.join(','));
console.log('__ATLAS_SIZE =', sz && sz[1], '| __TEXMETA tiles:', Object.keys(tex).length);
const seen = new Map(); let collisions = [];
for (const [k, t] of Object.entries(tex)) {
  const c = `${t.x},${t.y}`;
  if (seen.has(c)) collisions.push(`${k} vs ${seen.get(c)} @ ${c}`); else seen.set(c, k);
}
console.log('manifest collisions:', collisions.join(' | ') || 'NONE');
const paints = [[160,160],[0,160],[80,160],[96,160],[48,160],[64,160],[112,160],[128,160],[144,160],[16,160],[32,160],[0,176],[16,176],[32,176],[48,176],[64,176],[80,176],[96,176],[112,176],[128,176],[144,176],[160,176]];
const manAt = new Map();
for (const [k, t] of Object.entries(tex)) manAt.set(`${t.x},${t.y}`, k);
const stomp = paints.filter(([x, y]) => manAt.has(`${x},${y}`)).map(c => `${c[0]},${c[1]} -> ${manAt.get(`${c[0]},${c[1]}`)}`);
console.log('paint cells stomped by manifest:', stomp.join(' | ') || 'NONE');
console.log('painted names already IN built __TEXMETA (should be none):',
  ['redstone_wire','redstone_torch','piston_top','piston_head','bed_side','bed_top','chest_side','chest_top','item_bucket','item_water_bucket','item_lava_bucket','tnt_side','tnt_top','repeater','redstone_lamp','redstone_lamp_lit','stone_pressure_plate','wooden_pressure_plate','stone_button','wooden_button','item_redstone','item_redstone_torch'].filter(n => tex[n]).join(',') || 'NONE');
