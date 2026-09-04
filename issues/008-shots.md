# Issue: 008 â€” Shot scenarios + qa/baseline
- Type: FEAT | Status: DONE | Epic: E5 (QA) | Sprint: 01 | Depends: #005

## Spec
Scenarios (CF.shotScenarios): starter-world (orbit-like 3rd person of spawn),
walking (player advanced ~6 blocks along ground, first person), mine (#006), plus
qa/baseline copies + harness shots asserts. Vision verdicts into issues.

## Acceptance criteria
- [x] AC1 PNGs exist under qa/<date>/ and qa/baseline/
- [x] AC2 vision verdict per criterion recorded (grass texture visible at 16px scale)

## Evidence (close)
- AC1 PASS: qa/2026-09-04/{starter-world,walking}.png + qa/baseline/{starter-world,walking,block-grass}.png.
- AC2 PASS vision: walking.png = first-person on green grass tiles, oak logs + leaves clumps, dirt/stone
  cliff band, fog horizon -> masterprompt §12 exit criterion MET (walking on Blender-textured grass).