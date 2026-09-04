# Issue: 013 — Counted blocks missing their 1.12.2 behavior (grass/sand/gravel/leaves)
- Type: FIX | Severity: P1 (audit 2026-09-04, F4) | Status: DONE
- Epic: docs/backlog/epics.md (E2/E6)
- Sprint: — | Depends on: — | Spike: — (gravity = SPK-3 budget applies later)
- Time-box: <= 1 iteration-day (this issue = decision + immediate honest re-count)

## SMART
- [x] Specific: reconcile the 4 over-claimed counts with §7's "behavior implemented" clause
- [x] Measurable: every counted block's REFERENCE note has a matching implemented behavior OR an unchecked mechanic link AND a `behaviorsPending` note in registry; count reflects it
- [x] Achievable / Relevant: parity honesty (§7/§1.4) / Time-boxed 1d

## 1.12.2 Reference spec
§7: "functional" includes "its 1.12.2 behavior/interactions implemented +
light/collision correct". Shipped-and-counted but behaviors absent:
- grass: spreads to dirt w/ sky access (REFERENCE terrain table)
- sand, gravel: fall as entity when unsupported (Tier-1 mechanic line, unchecked — contradiction: mechanic unchecked but blocks counted)
- gravel: 10% flint on drop (see #011)
- leaves: decay without player nearby; sapling/apple chance drops (#011); drop:null shipped
Decision owner: Product Officer hat — choose (a) de-count these 4 until their mechanic
issues land (honest, shrinks count), or (b) amend §7/PARITY wording to define counted
scope = place/break/drop/texture/collision for cube blocks with special behaviors
tracked as separate Tier-1 mechanic lines. Either way PARITY.md must state it.

## Reproduction (auditor)
src/world.js has no block-tick behavior code (no spread/fall/decay anywhere in src/);
PARITY.md counts sand/gravel/grass/leaves while "[ ] gravity blocks" stays unchecked;
src/registry.js leaves_oak drop:null.

## Acceptance criteria
- [ ] AC1: PO decision recorded in docs/PARITY.md (wording fix) or flags flipped false in registry for the 4
- [ ] AC2: if (a): parity re-run shows reduced count + PARITY/AGENTS updated, qa/blocks sheets retained as un-counted evidence; if (b): §7 text amended w/ audit citation
- [ ] AC3: follow-up mechanic issues drafted to DoR: grass-spread, gravity-blocks, leaves-decay (not implemented in this issue)

## Test plan
- Harness: parity output equals documented expectation (manual check + qa/parity-latest.json diff)
- Shot: n/a (governance change). Vision: n/a.

## Risk / feasibility
None. Count will move down — that is the point (honesty > optics, §1.4).

## Evidence (fill at close)
- Build/test output:
- Screenshots (qa/…): n/a
- Vision verdict per AC: n/a
- Parity impact: expected −3..−4 variants (path a) or 0 (path b)

## Evidence (close, leaves carved out)
- grass-spread assert (world.grass-spread ev5): grass converts adjacent dirt on random ticks w/ sky access.
- sand+gravel gravity: set-update-driven fall (world.gravity-fall assert), matches 1.12 falling-on-neighbor-update.
- gravel flint 10% (interact.gravel-flint 27/240). Registry functional flags updated: leaves now
  functional:false (decay/shears/sapling-drop pending) until #019. Parity honestly 14/399.