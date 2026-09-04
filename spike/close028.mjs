import { readFileSync, writeFileSync } from 'node:fs';
const e = `## Evidence (close)
- 3 asserts green: torch attaches to solid face only (on-wall PASS, no-float PASS);
  pop test: g=0, c=21/21 - pops exactly when its ATTACHED face's support block is removed, returns to inventory.
- Fidelity win found BY the test: initial impl used "any adjacent solid" (wrong: torch next to ground on
  any side never popped); now per-face attachment stored in cell flat[] (codes 1/2/4/6/8) checked per removal.
- Torch render/light already proven in #024 (torch-craft.png halo, torch-light assert 14->13/10).
`;
const f = readFileSync('issues/028-torch-model.md', 'utf8');
writeFileSync('issues/028-torch-model.md', f.replace('Status: DRAFT', 'Status: DONE').replace('- [ ] AC1', '- [x] AC1').replace('- [ ] AC2', '- [x] AC2').replace('- [ ] AC3', '- [x] AC3') + e);
let t = readFileSync('docs/sprints/02.md', 'utf8');
t = t.replace('| 028 | torch wall-attach | TODO | - |', '| 028 | torch wall-attach | DONE | (this commit) |');
writeFileSync('docs/sprints/02.md', t);
console.log('028 closed - sprint 02 committed work complete');
