# Issue: 044 — Mob polish bundle (art, facing, poison, persistence, rare drops)
- Type: FIX (polish bundle)
- Status: DONE (4/5 slices; texture-sheet slice moved to #048 - it IS the fidelity pass)
- Epic: docs/backlog/epics.md (Mobs)
- Sprint: 05 (it8)
- Depends on: #035 (DONE)

## Scope (carve-outs documented in #035, each gets its own sub-DoR/PR at pickup)
- [ ] -> **#048** Mob texture sheets via Blender (this IS the fidelity pass; palette boxes remain until then).
- [x] Facing/rotation: steer() already stored m.yaw for ALL movement modes (chase/flee/stroll); render now
      ORBITS box-part offsets around the body axis (visual yaw; hitboxes stay AABB - 1.12-true enough).
      mob.face assert: pursuit yaw tracks the player (err < 0.6 rad) + verts build. Video f08: zombie faces camera.
- [x] rotten_flesh poison II 80% 4s (raw chicken 30% keeps): S.poison timer, 1dmg/40t floors at 1hp, death
      cleanses, "Poisoned" HUD tag; roll seam CF.__roll (also used by rare drops). surv.poison assert (set/floor/dodge).
- [x] Rare zombie drops @2.5% each: iron/gold/carrot/potato (unenchanted table, no looting - resolves the
      [TBC] honestly as the no-looting row). mob.rare asserts via forced-roll.
- [x] Mob persistence: active-dim mobs (cap 64, {t,p,hp,baby,age}) saved into v2 dims entry + respawned by
      loadNow (pos/hp/baby preserved - save.mobs assert). Other dims stay wiped = warp semantics, documented.
      Warp still clears mobs intentionally (pre-existing behavior kept).
- [x] Loot-as-item-entities (was "may become own FEAT" - #060's billboards made it a 6-liner): ALL death
      causes drop pickup-able entities (burn/fall loot-loss bug FIXED), babies none; CF.dropItemEnt shared spawner
      (interact's Q-drop refactored onto it). mob.drop (8 kills -> 8 ents -> magnet-collect = 8 items),
      melee/passive-drop tests updated to walk-the-loot; env-kill now DROPS (correctly, via ent) - old
      no-loot expectation replaced. Bonus: found + removed a DUPLICATED give-loot line from #035 (2x loot bug).

## Evidence (2026-09-18)
- Files: mobs.js (rare table, entity loot, orbit-yaw render, drainLoot test helper), survival.js (poison +
  HUD tag + respawn cleanse), interact.js (CF.dropItemEnt + dropHeld refactor), persist.js (save/load mobs).
- +5 asserts (mob.face, mob.rare inside drop flow, surv.poison, save.mobs + rewritten mob.drop) ->
  full 263/0, quick 247/0, 55 blocks. video basic re-recorded (DoD 4b): f08 night zombie faces player,
  combat/loot stable, no regressions; verdicts above.
- Parity unchanged (mob art deferred to #048 as planned).

## Notes
#035 documented all of these as explicit Tier-1 deviations (see its Evidence section). No parity claims hinge
on them; they close the polish gap for the "fight a mob at night" milestone experience.
