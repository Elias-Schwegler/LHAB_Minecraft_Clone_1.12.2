import { readFileSync, writeFileSync } from 'node:fs';

const e = `## Evidence (close - mechanics; visual carve-out #031)
- 4 fluid asserts green in gate (94 total): spread (source lv0, d4=lv4, capped at 7 - nothing at d8);
  obsidian (water directly into untouched lava source); solidify >=1 at flow-front collision;
  stone (lava into immobile lv7 water). fluidTick budget <30ms measured.
- Light propagates through liquids (attenuated) - pool floor lit, verified via readPixels probe [3,48,99].
- Shots: fluid-pool.png (flowing terraced translucent pool), fluid-lava.png (water+lava front with
  solidified stone, glowing lava) - vision PASS for mechanics; banding artifact on water surface
  (alternating dark rows, cause unresolved after 3 hypotheses) + lava tile too dark -> FIX #031.
- Honest counting: water/lava stay functional:false (not breakable w/o buckets) -> count with buckets (#031).
- Bugs fixed en route: liquid cells leaked into opaque greedy pass; liquid quad built from 2 diagonal
  corners (degenerate slivers); alpha compositing now premultiplied (blendFuncSeparate ONE,1-OSA).
`;
const f = readFileSync('issues/022-fluids.md', 'utf8');
writeFileSync('issues/022-fluids.md', f.replace('Status: READY', 'Status: DONE').replaceAll('- [ ] AC1', '- [x] AC1').replaceAll('- [ ] AC2', '- [x] AC2').replaceAll('- [ ] AC3', '- [x] AC3').replaceAll('- [ ] AC4', '- [ ] AC4 -> #031 (mechanics shot OK; banding visual carved)') + e);

const i31 = `# Issue: 031 - Water surface banding + lava brightness + buckets
- Type: FIX | Status: READY | Epic: E6 | Sprint: 02/03 | Depends: #022

## Spec
(a) WATER BANDING: flowing pool renders alternating dark rows across the surface (see qa/2026-09-04/fluid-pool.png).
Ruled out: opaque-pass leak (fixed, still bands), degenerate quads (fixed, still bands), coplanar z-fight
with banks (surface lowered 0.12, still bands). Probe data: light=240 everywhere above surface, wtris=286,
glErr=0, center pixel correct deep-blue. Suspect: per-cell side faces drawn INTO the water volume visible
through the lowered surface, or blend order without per-pixel depth sort. Needs fresh eyes.
(b) LAVA tile renders dark (OVERLAY noise); MC lava is bright orange emissive-looking.
(c) Buckets: iron bucket item; right-click water/lava source = pickup (empty->filled), filled = place;
this is the 'break' equivalent to flip water/lava functional:true (+2 blocks parity).
## Acceptance criteria
- [ ] AC1 shot: pool surface visually coherent (no alternating black rows) - vision PASS
- [ ] AC2 lava sheet + in-scene: bright orange
- [ ] AC3 harness: bucket pickup/place round-trip; water/lava become functional w/ proof
`;
writeFileSync('issues/031-water-banding-buckets.md', i31);

let t = readFileSync('docs/sprints/02.md', 'utf8');
t = t.replace('| 022 | fluids (water/lava/interactions) | IN PROGRESS | - |', '| 022 | fluids (water/lava/interactions) | DONE (visual carve -> #031) | (this commit) |');
t = t.replace('| 026 | survival (health/hunger/fall/respawn/HUD) | NEXT | - |', '| 031 | water banding + lava brightness + buckets | READY (from #022 carve) | - |\n| 026 | survival (health/hunger/fall/respawn/HUD) | NEXT | - |');
writeFileSync('docs/sprints/02.md', t);

let p = readFileSync('docs/PARITY.md', 'utf8');
p = p.replace('[ ] water/lava flow + obsidian/cobblestone', '[x] water/lava flow + obsidian/cobblestone            <- #022 asserts (spread/caps/3 Java interactions) + fluid shots; buckets->#031');
writeFileSync('docs/PARITY.md', p);
console.log('#022 closed, #031 filed, tracker+parity updated');
