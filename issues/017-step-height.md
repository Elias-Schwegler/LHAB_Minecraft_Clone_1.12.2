# Issue: 017 — Step-up height 0.55 vs REFERENCE 0.6 (reconcile physics constant)
- Type: FIX | Severity: P2 (audit 2026-09-04, F8) | Status: READY
- Epic: docs/backlog/epics.md (E4) | Sprint: — | Depends on: — | Time-box: <= 0.5 iteration-day

## SMART
- [ ] Specific: one constant + one REFERENCE line
- [ ] Measurable: auto-step works on a 0.6-tall obstruction test cell; value matches doc
- [ ] Achievable / Relevant: Tier-1 player physics fidelity (§7) / Time-boxed 0.5d

## 1.12.2 Reference spec
docs/REFERENCE.md §player-physics: "step-up: auto step 0.6". src/player.js:6 uses
stepY = y + 0.55 (two call sites in tick()). One of the two documents is wrong;
1.12.2's step height is commonly documented 0.6 — research-confirm, then align
code+REFERENCE in the same change. Do not "fix" by silently editing REFERENCE to
0.55 without a citation-style confirmation line (no guessy mechanics §2).

## Reproduction (auditor)
grep step 0.55 src/player.js → stepY in the two sweep blocks; REFERENCE line 252-253 says 0.6.

## Acceptance criteria
- [ ] AC1: constant matches confirmed value in BOTH REFERENCE and player.js
- [ ] AC2: harness: scripted walk into a single 0.5-step obstruction → player ends on top (auto-step proven, currently unasserted)
- [ ] AC3: test.mjs green incl. existing move/land asserts (regression)

## Test plan
- Harness: new assert player.step-up; Shot: none (numeric). Vision: n/a.

## Evidence (fill at close)
- outputs:
