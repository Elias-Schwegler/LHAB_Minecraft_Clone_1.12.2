# Issue: 010 — Fix wrong-tool break multiplier (×5 → ×10/3)
- Type: FIX | Severity: P1 (audit 2026-09-04, F1) | Status: READY
- Epic: docs/backlog/epics.md (E4)
- Sprint: — | Depends on: — | Spike: — (trivial extension of proven #006 subsystem)
- Time-box: <= 1 iteration-day

## SMART
- [x] Specific: correct the wrong-tier mining slowdown in interact.js + REFERENCE + test
- [x] Measurable: stone-by-hand breakTime == 7.5s; assert renamed accordingly
- [x] Achievable: trivial extension of proven #006 code path
- [x] Relevant: Tier-1 "wood→tools→mining tiers" gate timing (§7) fidelity
- [x] Time-boxed: <= 0.5 iteration-day

## 1.12.2 Reference spec
1.12.2 damage-per-tick = digSpeed/hardness/30 when the block CAN drop (canHarvest),
else digSpeed/hardness/100. Bare hand digSpeed=1 → time = hardness×30 ticks (0.75s dirt ✓)
or hardness×100 ticks when wrong tier → the slow factor is 100/30 = ×10/3 (3.333),
NOT ×5. Consequence: stone (hardness 1.5) by hand = 150 ticks = **7.5s**, not the
currently shipped 11.25s. docs/REFERENCE.md "wrong tier that can break = ×5" is itself
the guessy error (no [TBC], violates §1.4) — fix the doc line to ×10/3 with the
/100-vs-/30 derivation. Also fix the wrong AC text in issues/006 (says stone=2.25s).

## Reproduction (auditor)
`node tools/test.mjs` prints `interact.slow-time(11.25s)`; src/interact.js:52 `t *= 5`;
docs/REFERENCE.md §tool-tiers states ×5 as fact.

## Acceptance criteria
- [ ] AC1: breakTime(stone, hand) == 7.5s — harness assert (replaces slow-time 11.25)
- [ ] AC2: dirt-by-hand still 0.75s (regression assert unchanged)
- [ ] AC3: REFERENCE.md ×5 line replaced with ×10/3 + one-line derivation comment
- [ ] AC4: issues/006 AC2 text corrected (evidence annotation, no history rewrite)

## Test plan
- Harness: `interact.slow-time(7.5s)` exact-match assert ±0.01; keep not-broken-in-2s.
- Screenshot: none needed (non-visual). Vision: n/a.

## Risk / feasibility
Trivial extension of #006 (proven). Risk: none.

## Evidence (fill at close)
- Build/test output:
- Screenshots: n/a — assert evidence
- Vision verdict per AC: n/a
- Parity impact: none (no count change)
