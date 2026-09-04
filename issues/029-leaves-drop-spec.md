# Issue: 029 — Close leaves drop/decay spec honestly (#019 carry-over) + stick drop
- Type: FIX | Severity: P1 (audit 2026-09-04-b, F1) | Status: DONE
- Epic: docs/backlog/epics.md (E2)
- Sprint: 02 | Depends on: #019 (DONE on main) — reopens its spec honesty only
- Time-box: <= 1 iteration-day (research + doc/registry alignment + one assert)

## SMART
- [x] Specific: resolve the unresolved "[verify ... research]" spec markers in
  issues/019, fix REFERENCE leaves row, add 2% stick drop, correct false claims
- [x] Measurable: zero verify/[TBC] markers on leaves lines in issues/019 + REFERENCE;
  REFERENCE matches shipped 5%/0.5%/2%; harness stick assert green
- [x] Achievable: values already match Java 1.12.2 wiki; only docs + one drop-branch
  line + statistical assert remain
- [x] Relevant: leaves is a PARITY-COUNTED functional block; DoR "[TBC] remains →
  cannot be READY" violated at its close (audit #1 F2 recurrence)
- [x] Time-boxed: 0.5–1 day

## 1.12.2 Reference spec (CONFIRMED, Java 1.12.2 wiki — this is the resolution #019 claimed)
- Oak leaves broken without shears/silk: 5% sapling, 0.5% apple (1/200), 2% stick.
  (Shipped: 5% + 0.5%, stick MISSING at src/interact.js:75-78.)
- Decay: leaves with no log within distance 6 decay on random tick, but only if the
  leaf touches air; distance is connectivity-based path check, not straight-line.
  Clone simplification (Chebyshev-6, instant on log removal) must be stated in
  REFERENCE as the accepted approximation or fixed.
- Shears: instant break, always drop leaves block. Not implemented (no tools yet) —
  defer with #024 (items/tools), reference in body.

## Reproduction (auditor)
issues/019 lines 4-5 still read "[verify 1.12 exact: 0.275 sapling? apple:
0.5%/0.5%/2.5% by luck? research]" while line 9 claims "1.12 loot chances resolved in
issue body" (false). docs/REFERENCE.md:43 still says "decay radius 6 **[TBC]**" and
gives no drop numbers; issues/011 body says "believed ~10% sapling" contradicting the
shipped 5% — #011 AC1 ("[TBC] removed") closed incomplete for the leaves row.

## Acceptance criteria
- [ ] AC1: issues/019 spec markers replaced with the confirmed values (append a
      "## Spec resolution" section; do not rewrite history claims silently) + its
      false "resolved in issue body" line annotated
- [ ] AC2: docs/REFERENCE.md leaves row rewritten with confirmed 5%/0.5%/2% + decay-6
      [TBC] removed (or approximation explicitly labeled); issues/011 "~10%" note fixed
- [ ] AC3: stick 2% added to the leaves drop branch; harness statistical assert
      extended (600-break loop, sticks in 4–32 band) — leaves-drop stays green
- [ ] AC4: if decay fidelity (air-touch/connectivity) deferred, REFERENCE labels the
      Chebyshev-instant simplification as accepted-simplification with a backref

## Test plan
- Harness: interact.leaves-drop extended to count sticks (seedless band assert, same
  pattern as gravel-flint); all existing asserts remain green
- Shot: none (no visual change). Vision: n/a
- Vision verdict per AC: doc-only for AC1/AC2/AC4

## Risk / feasibility
No research risk (values confirmed); code change is one branch line + assert band.

## Evidence (fill at close — DoD gate)
- Build/test output:
- Screenshots: n/a
- Vision verdict per AC:
- Parity impact: none (leaves stays counted, now with honest spec)
## Evidence (close - audit #2 P1)
- Issue body [verify] markers REMOVED; Java 1.12.2 oak leaf drops resolved: sapling 0.05, apple 0.005, no sticks (Bedrock-only).
- REFERENCE [TBC] flint % + leaf drop lines fixed to exact values.
- Vacuous light.queue assert replaced w/ real pending-relight check (light.queue-stale, world.js).
- test.mjs GREEN 63 asserts.
