import { readFileSync } from 'node:fs';
const html = readFileSync('game/index.html', 'utf8');
const reg = JSON.parse(html.match(/\/\*REGISTRY-START\*\/([\s\S]*?)\/\*REGISTRY-END\*\//)[1]);
const names = ['redstone_wire','redstone_torch','redstone_ore','repeater','redstone_lamp','lit_redstone_lamp','stone_pressure_plate','wooden_pressure_plate','stone_button','wooden_button','piston','netherrack','quartz_ore'];
for (const n of names) {
  const r = reg[n];
  if (!r) { console.log(n + ': NOT IN REGISTRY'); continue; }
  const v = r.variants ? Object.entries(r.variants) : [['*', r]];
  for (const [k, vv] of v) {
    const pf = vv.proof && vv.proof.tests ? vv.proof.tests.join(',') : 'no-proof';
    console.log(`${n}:${k} functional=${!!vv.functional} proof=[${pf}]`);
  }
}
