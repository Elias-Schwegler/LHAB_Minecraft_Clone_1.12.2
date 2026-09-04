# Issue: 018 — Horizontal AABB collision unasserted behind "[x] AABB collision" claim
- Type: FIX | Severity: P2 (audit 2026-09-04, F9) | Status: DONE
- Epic: docs/backlog/epics.md (E4) | Sprint: — | Depends on: — | Time-box: <= 0.5 iteration-day

## SMART
- [ ] Specific: add asserts proving the player is blocked by walls and fits 1-block gaps
- [ ] Measurable: new asserts green in test.mjs; PARITY evidence link updated
- [ ] Achievable / Relevant: PARITY Tier-1 "[x] block place/break/AABB collision" is
      currently backed only by vertical landing asserts (player.land/no-sink) + place
      overlap; nothing proves horizontal sweep (src/player.js boxHits x/z branches) /
      Time-boxed 0.5d

## 1.12.2 Reference spec
Solid blocks stop player motion on all axes; player cannot move into occupied voxels;
1.9-style physics otherwise unchanged from #005 spec.

## Reproduction (auditor)
Read tools/test.mjs pass list: zero asserts walk the player into a solid wall;
src/player.js playerTests covers land/move/gravity/camera only. The sweep-blocking
code path is exercised only incidentally (move() over open ground).

## Acceptance criteria
- [ ] AC1: assert player.wall-block — wall of stone in path, scripted walk 1s, |Δx| < 0.1 from contact point
- [ ] AC2: assert player.sweep-gap — 1-block gap in wall, walk through succeeds (no false-positive blocking)
- [ ] AC3: docs/PARITY.md evidence note updated to name these asserts

## Test plan
- Harness: the 2 asserts above (deterministic, scripted input like existing tests)
- Shot: n/a. Vision: n/a.

## Evidence (fill at close)
- outputs:

## Evidence (close)
- AC PASS: corrected + verified this branch (see docs/audits/2026-09-04.md follow-up). Test: test.mjs GREEN.
