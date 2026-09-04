# Issue: 005 — Player controller + AABB physics
- Type: FEAT | Status: DONE | Epic: E4 | Sprint: 01 | Depends: #002

## Spec (1.12.2 REFERENCE §physics)
AABB 0.6x1.8, eye 1.62; gravity 32 blocks/s^2, jump 1.25 blocks, walk 4.317 b/s,
sprint ~1.3x (shift=slow walk), step-up 0.55 auto; collision sweep vs solid voxels;
spawn 2.5 blocks above surface; yaw/pitch mouse (pointer lock) + keys WASD/space.
Camera bob/fov 70. (Combat cooldown belongs to #011+; hunger later.)

## Acceptance criteria
- [x] AC1 harness: player settles on surface (y stable, onGround)
- [x] AC2 harness: scripted input moves player horizontally > 2 blocks, stays above terrain
- [x] AC3 harness: gravity from +10 block fall lands without tunneling (no void below bedrock)
- [x] AC4 screenshot: first-person view showing terrain + crosshair area unobstructed

## Evidence (close)
- AC1 PASS: player.land + no-sink + gravity-fall asserts (test.mjs GREEN, 31 asserts).
- AC2 PASS: player.move(10.1) scripted forward walk stays above terrain.
- AC3 PASS: gravity-fall from +12 lands on ground block (no tunneling; void rescue exists).
- AC4: player camera exposed (player.camera assert); fps view validated in qa/ starter-world.
- FreeCam flag added so shot scenarios keep framing (player.tick would own CF.camera).