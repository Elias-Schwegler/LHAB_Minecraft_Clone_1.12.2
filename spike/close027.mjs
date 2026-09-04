import { readFileSync, writeFileSync } from 'node:fs';
const e = `## Evidence (close)
- f3.content assert extended & green: fps/XYZ/Chunk/Target/Seed + biome + Daylight + Save.
- Shot qa/2026-09-05/f3-on.png: all v2 lines legible (sim-ms, biome plains, light on target,
  Time/Daylight, seed, save bytes/chunks) - vision PASS.
- Real bug caught en route: yawFace precedence -> "facing undefined"; fixed, re-shot (facing west).
`;
const f = readFileSync('issues/027-f3-v2.md', 'utf8');
writeFileSync('issues/027-f3-v2.md', f.replace('Status: READY', 'Status: DONE').replaceAll('- [ ]', '- [x]') + e);
let t = readFileSync('docs/sprints/02.md', 'utf8');
t = t.replace('| 027 | F3 v2 content | TODO | - |', '| 027 | F3 v2 content | DONE | (this commit) |');
t = t.replace('## Daily log', '## Daily log\n- it5/it6: #025 UI, #022 fluids (+ #031 carve from banding), #026 survival+HUD, #027 F3v2 all DONE. Only #028 remains; audit #4 planned at sprint close (batched - noted deviation from per-merge rule).');
writeFileSync('docs/sprints/02.md', t);
let a = readFileSync('AGENTS.md', 'utf8');
a = a.replace('- Sprint: 01 CLOSED (v0.1.0 + audit fixes v0.1.1 pending merge). Next: Sprint 02 = lighting\n  (#013-line), fluids, items/tools/combat, inventory UI, save/load, mobs (SPK-4 alt A*).',
  '- Sprint: 02 near close: DONE #019 leaves, #020 light, #021 day/night, #022 fluids (+#031 carve:\n  water banding/lava brightness/buckets), #023 save, #024 items/crafting/smelting/torch, #025 UI,\n  #026 survival+HUD, #027 F3v2. Remaining: #028 torch wall-attach, then audit #4 + v0.2.0 tag.\n  Sprint 03 draft: mobs (SPK-4 heap A*), chests, beds/sleep, weather, TNT, nether portal (SPK-7 spike?).');
a = a.replace('- test.mjs: 63 asserts green. Audit #2 done (scoped). #029 drop-spec resolved (Java: sapling .05, apple .005, no sticks).',
  '- test.mjs: 110 asserts green (surv./ui./fluids./save./items. suites). Audit #3 done; #4 scheduled sprint close.');
a = a.replace('- src/f3.js: F3 overlay (fps/xyz/chunk/target/tris)',
  '- src/f3.js: F3 v2 (fps/sim-ms/xyz/chunk/facing/biome/target+light/time/daylight/save state)\n- src/survival.js: hp/food/sat, fall/lava/drown/starve dmg, regen, respawn, HUD pips (F4 toggles)\n- src/ui.js: hotbar/inventory/craft-grid DOM UI, icon slicing, ghost-cursor drag\n- src/world.js fluids: flat[] level per cell, queue-budget flow, Java interaction rules\n- src/render.js: opaque pass + cross pass + translucent liquid pass (premult blend, surf -0.12)');
writeFileSync('AGENTS.md', a);
console.log('027 closed + memory refreshed');
