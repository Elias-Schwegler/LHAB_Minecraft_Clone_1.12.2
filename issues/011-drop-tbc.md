# Issue: 011 — Resolve drop-table [TBC]s that leaked into counted blocks
- Type: FIX | Severity: P1 (audit 2026-09-04, F2) | Status: DONE (research is the work)
- Epic: docs/backlog/epics.md (E4)
- Sprint: — | Depends on: — | Spike: —
- Time-box: <= 1 iteration-day (research + registry/REFERENCE alignment only)

## SMART
- [x] Specific: eliminate [TBC] from gold-ore drop, gravel flint %, leaves drop chance
- [x] Measurable: zero [TBC] markers on those 3 rows in REFERENCE; registry matches
- [x] Achievable / Relevant: DoR rule "[TBC] ⇒ not READY" was violated by #006 (gold
  ore counted while its drop was [TBC]); metrics honesty §1.4 / Time-boxed 0.5d

## 1.12.2 Reference spec (to be CONFIRMED by research, not assumed)
- gold_ore: requires iron+; believed to drop the gold_ore block item itself in
  1.12.2 (raw_gold is 1.17+; REFERENCE's "gold_ingot decision [TBC]" is wrong-era).
- gravel: believed 10% flint (unenchanted). Registry ships 100% gravel drop.
- leaves (oak): believed ~10% sapling + apple chance (0.5% apple); registry ships
  drop:null while counted functional.

## Reproduction (auditor)
docs/REFERENCE.md line for gold_ore(14) is an unresolved [TBC] paragraph ending
"Decision: ... gold_ingot [TBC]"; src/registry.js ships drop:"gold_ore";
parity counts gold_ore functional. issues/006 spec admits "gold ore [TBC]".
DoR.md §1 forbids READY with [TBC].

## Acceptance criteria
- [ ] AC1: REFERENCE rows gold_ore/gravel/leaves rewritten with confirmed 1.12.2 values, [TBC] removed
- [ ] AC2: src/registry.js drop fields match the confirmed values (or simplifications explicitly marked + de-counted per #013 decision)
- [ ] AC3: if drop probabilities implemented: harness asserts (statistical w/ fixed seed or direct roll-fn assert); else data-only change documented

## Test plan
- Harness: registry data equality asserts for the 3 drop fields
- Shot: none (data change). Vision: n/a unless leaf-drop particles deferred (epic E6).

## Risk / feasibility
Research-risk (version archaeology), not code-risk. If unresolvable: REFERENCE keeps
[TBC] and the 3 blocks must be de-counted until proven (coordinate with #013).

## Evidence (fill at close)
- Build/test output:
- Screenshots: n/a
- Vision verdict per AC: n/a
- Parity impact: none expected (no count change unless drops fail proof)

## Evidence (close: TBCs resolved for implemented blocks)
- gold_ore -> gold_ingot (1.12 has no raw items; raw_* are 1.17+) in registry + REFERENCE resolved.
- gravel -> 10% flint implemented + assert (interact.gravel-flint); REFERENCE % fixed to 10.
- leaves drop/decay NOT implemented -> leaves de-counted (functional:false); tracked in #019 (new).