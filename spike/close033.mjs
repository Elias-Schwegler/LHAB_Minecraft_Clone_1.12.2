import { readFileSync, writeFileSync } from 'node:fs';
const e = `## Evidence (close)
- Suite split: boot/world/light/grass*/time*/fluids*/render/player/interact/f3/items/ui/survival/save
  (* = slow-tagged). worldTests mega-function cut into 5 self-contained suites (raw-segment splice, verified).
- Wall times measured (this box): --quick 32s (was ~180s full; goal <60s MET), full --all 96s, single suite ~17s.
- Assert parity: 107 pass both before and after split (verified same count + 0 fails/errors).
- Key fix: game loop stops at boot-suite end (CF.stopGameLoop) - SwiftShader redraw storm was eating the
  virtual-time budget; suites drive sim manually.
- test.mjs: --quick / --suites=a,b flags + per-suite timing table printed.
`;
const f = readFileSync('issues/033-suite-split.md', 'utf8').replace('Status: DRAFT', 'Status: DONE').replace('- [ ]', '- [x]');
writeFileSync('issues/033-suite-split.md', f + e);

let a = readFileSync('AGENTS.md', 'utf8');
a = a.replace('node tools/test.mjs\n', 'node tools/test.mjs            # full gate (all suites, ~96s)\nnode tools/test.mjs --quick   # dev loop (~32s, skips slow: grass/time/fluids)\nnode tools/test.mjs --suites=world,light\n');
a = a.replace('Start with #033 then #035 mob core.', 'Start with #035 mob core (#033 done).');
writeFileSync('AGENTS.md', a);

let t = readFileSync('docs/sprints/03.md', 'utf8');
t = t.replace('| 033 | CHORE | test-suite split per module (180s wall -> <60s) | 0.5d |', '| 033 | CHORE | test-suite split per module (180s wall -> <60s) | DONE - quick 32s |');
t = t.replace('- (sprint opens next iteration; #033 first = quality-gate speed, then #035 mob core)', '- it7: #033 DONE (suites + --quick 32s + loop-stop fix). Next: #035 mob core.');
writeFileSync('docs/sprints/03.md', t);
console.log('033 closed');
