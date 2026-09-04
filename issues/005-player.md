# Issue: 005 — Player controller + AABB physics
- Type: FEAT | Status: READY | Epic: E4 | Sprint: 01 | Depends: #002

## Spec (1.12.2 REFERENCE §physics)
AABB 0.6x1.8, eye 1.62; gravity 32 blocks/s^2, jump 1.25 blocks, walk 4.317 b/s,
sprint ~1.3x (shift=slow walk), step-up 0.55 auto; collision sweep vs solid voxels;
spawn 2.5 blocks above surface; yaw/pitch mouse (pointer lock) + keys WASD/space.
Camera bob/fov 70. (Combat cooldown belongs to #011+; hunger later.)

## Acceptance criteria
- [ ] AC1 harness: player settles on surface (y stable, onGround)
- [ ] AC2 harness: scripted input moves player horizontally > 2 blocks, stays above terrain
- [ ] AC3 harness: gravity from +10 block fall lands without tunneling (no void below bedrock)
- [ ] AC4 screenshot: first-person view showing terrain + crosshair area unobstructed
