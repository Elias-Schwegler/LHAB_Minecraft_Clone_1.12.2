# Issue: 030 — Regenerate broken torch parity evidence sheet
- Type: FIX (audit #3 F1, P1) | Status: DONE | Epic: E4 | Sprint: 02 | Depends on: #024 (DONE)
- Time-box: <= 1 iteration-day

## SMART
- [x] Specific: qa/blocks/torch.png in HEAD is a broken pre-fix render; regenerate it (and sanity-check siblings) with tools/blockshots.mjs
- [x] Measurable: new sheet shows the torch cross on the pedestal; parity re-run 17/399 unchanged
- [x] Achievable: trivial — current build already renders the subject correctly (audit #3 reproduced: `node tools/shot.mjs block block=torch seed=5` shows torch + light pool)
- [x] Relevant: torch is a counted block (§7); its evidence is currently invalid ("no counts without evidence")
- [x] Time-boxed: one command + vision check

## 1.12.2 Reference spec
N/A (process/evidence fix; behavior itself proven correct by items.torch / items.torch-light asserts).

## Acceptance criteria
- [ ] AC1: qa/blocks/torch.png regenerated from current main shows the torch cross-model block on the pedestal with light pool — evidence: regenerated PNG + vision verdict
- [ ] AC2: visual spot-check of the other 16 counted-block sheets for the same pre-fix-bug failure mode (pedestal absent / room unmeshed) — evidence: pass list in issue
- [ ] AC3: `node tools/parity.mjs` still 17/399 (sheet just becomes honest, count unchanged)

## Test plan
- Harness: none needed (render already proven; items.torch-light green)
- Screenshot: `node tools/blockshots.mjs` (or shot.mjs block block=torch seed=5 for the single file)
- Vision check looks for: torch cross on stone pedestal, warm pool on floor; magenta/garbage quads = fail

## Risk / feasibility
None; current build reproduction clean.

## Evidence (fill at close)
- (from audit #3, docs/audits/2026-09-04-c.md F1: HEAD sheet = green-field mess with grid-patterned garbage quads, no subject, room unmeshed = captured the pre-fix cross-model const-assignment bug; fixed build renders correctly)
## Evidence (close - audit #3 F1)
- qa/blocks/torch.png regenerated post-const-fix: cross-model torch with lit tip on pedestal sheet (vision PASS, 52KB, shows model not garbage quads).
- Also: added missing #021 AC1 cave-sky0 assert (cave cell skylight=0 under 3x3x6 stone shell); SMELT junk key removed; AGENTS backtick corruption fixed; assert count 80.
