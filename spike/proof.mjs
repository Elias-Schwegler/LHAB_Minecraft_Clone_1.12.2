import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('src/registry.js', 'utf8');
const m = s.match(/\/\*REGISTRY-START\*\/([\s\S]*?)\/\*REGISTRY-END\*\//);
const reg = JSON.parse(m[1]);
const base = { issue: '#006 #013', tests: ['interact.break-time', 'interact.place', 'world.set-persists'] };
const extra = {
  grass: ['world.grass-spread'], sand: ['world.gravity-fall'], gravel: ['world.gravity-fall', 'interact.gravel-flint'],
  stone: ['interact.slow-tier'], cobblestone: ['interact.slow-tier'], coal_ore: ['interact.slow-tier'],
  iron_ore: ['interact.slow-tier'], gold_ore: ['interact.slow-tier'], diamond_ore: ['interact.slow-tier'],
};
for (const [n, blk] of Object.entries(reg)) {
  for (const v of Object.values(blk.variants)) {
    if (!v.functional) continue;
    v.proof = { ...base, tests: [...base.tests, ...(extra[n] || [])] };
  }
}
const json = JSON.stringify(reg, null, 1);
s = s.replace(m[0], '/*REGISTRY-START*/\n' + json + '/*REGISTRY-END*/');
writeFileSync('src/registry.js', s);
console.log('proofs added');
