import { readFileSync, writeFileSync } from 'node:fs';
const e = `## Evidence (close)
- 8 ui asserts green: hotbar DOM + live atlas icons, Digit-select highlight, E open/close,
  drag transfer inv->inv, craft-grid result live-computed (planks x4 from log), collect-to-inventory,
  close returns items.
- Vision PASS (qa/2026-09-04/ui-inventory.png): panel legible at 854x480 - crafting 2x2 with log x3 in,
  planks x4 result, Main grid, hotbar with 9 icons + stack counts + white selection frame. No magenta, no overlap with F3.
- Also fixed: harness wiped CF.shotScenarios registered by earlier modules (now additive).
`;
const f = readFileSync('issues/025-inventory-gui.md', 'utf8');
writeFileSync('issues/025-inventory-gui.md', f.replace('Status: READY', 'Status: DONE').replaceAll('- [ ]', '- [x]') + e);

let s = readFileSync('docs/sprints/02.md', 'utf8');
s = s.replace('## Daily log', `## Task tracker (updated every merge; was one mega-chunk, broken out per user request 2026-09-04)
| # | issue | status | merged |
|---|-------|--------|--------|
| 019 | leaves behavior | DONE | cc992e1 |
| 020 | block light + glowstone | DONE | b152bdc |
| 021 | skylight + day/night | DONE | 36ffe2b |
| 022 | fluids (water/lava/interactions) | IN PROGRESS | - |
| 023 | save/load | DONE | 1db5139 |
| 024 | items/tools/crafting | DONE | f5ef998 |
| 025 | inventory + hotbar UI | DONE | (this commit) |
| 026 | survival (health/hunger/fall/respawn/HUD) | NEXT | - |
| 027 | F3 v2 content | TODO | - |
| 028 | torch wall-attach | TODO | - |
| 029/030 | audit fixes | DONE | 0e4b222 |

## Daily log`);
writeFileSync('docs/sprints/02.md', s);
console.log('025 closed + tracker added');
