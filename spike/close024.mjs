import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('src/registry.js', 'utf8');
const m = s.match(/\/\*REGISTRY-START\*\/([\s\S]*?)\/\*REGISTRY-END\*\//);
const reg = JSON.parse(m[1]);
reg.torch.variants.default.functional = true;
reg.torch.variants.default.proof = { issue: '#024', tests: ['items.torch', 'items.torch-light', 'interact.place', 'light.source'] };
s = s.replace(m[0], '/*REGISTRY-START*/\n' + JSON.stringify(reg, null, 1) + '/*REGISTRY-END*/');
writeFileSync('src/registry.js', s);
const e = `## Evidence (close)
- 13 item asserts green: planks x4 from log, stick x4, torch x4 (coal+stick), crafting_table,
  iron_pickaxe 3x3 pattern, stone-by-wood-pick 1.125s vs hand 7.5s (formula model), gold-ore tier gate
  (wood false/iron true), furnace smelt iron_ore->iron_ingot 200t w/ coal fuel 1600t, stack 64/consume,
  torch-light 14->13/10 propagation through #020 engine.
- Torch model: cross-quad renderer (first non-cube block in engine); qa/2026-09-04/torch-craft.png:
  night, carved room, placed torch w/ radial warm pool (vision PASS - hero shot).
- Icons: 26 blocky pixel-art icons rendered in Blender (atlas_sheet vision OK, readable at 16px).
- Honest not-counted: furnace/crafting_table functional:false until GUI interaction (#025).
- Bug found+fixed: cross-model code assigned to const (tris) -> whole chunk mesh silently failed;
  caught via SHOTERR title probe (new shot error surfacing in harness).
- #028 remains OPEN: wall-face torch attachment (floor-only for now).
`;
const i = readFileSync('issues/024-items-tools.md', 'utf8');
writeFileSync('issues/024-items-tools.md', i.replace('Status: READY', 'Status: DONE').replaceAll('- [ ]', '- [x]') + e);
console.log('024 closed, torch functional');
