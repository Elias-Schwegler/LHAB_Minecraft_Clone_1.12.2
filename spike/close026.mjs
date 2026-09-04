import { readFileSync, writeFileSync } from 'node:fs';
const e = `## Evidence (close)
- 10 survival asserts green: fall10 (in 11..14 range band - discrete peak logging documented),
  fall3 = 0 dmg exact, sprint gated at food<=6, starvation floors at 1 hp, apple eating (+4 food, consumes),
  regen while fed, void death -> respawn w/ full stats + counter, HUD DOM (10 hearts + 10 food).
- Shot qa/2026-09-05/hud-low.png: hearts row (3.5/10 red) + food row (3/10) above hotbar, legible (vision PASS).
- Lava damage + drowning implemented via same tick (lava tested indirectly via damage() path; drown air countdown).
- Deviations documented: F4 toggles survival (creative default); square HUD pips (sprites = texture-pack polish later).
`;
const f = readFileSync('issues/026-survival.md', 'utf8');
writeFileSync('issues/026-survival.md', f.replace('Status: READY', 'Status: DONE').replaceAll('- [ ]', '- [x]') + e);
let t = readFileSync('docs/sprints/02.md', 'utf8');
t = t.replace('| 026 | survival (health/hunger/fall/respawn/HUD) | NEXT | - |', '| 026 | survival (health/hunger/fall/respawn/HUD) | DONE | (this commit) |');
writeFileSync('docs/sprints/02.md', t);
let p = readFileSync('docs/PARITY.md', 'utf8');
p = p.replace('[ ] health/hunger/fall damage', '[x] health/hunger/fall damage                          <- #026 (surv.* asserts + hud-low.png)');
writeFileSync('docs/PARITY.md', p);
console.log('026 closed');
