# Issue: 035 — Mob core: entity system + zombie
- Type: FEAT
- Status: DONE
- Epic: docs/backlog/epics.md (Mobs)
- Sprint: 03
- Depends on: #020 light (DONE), #021 day/night (DONE), #026 survival (DONE), #024 items (DONE)
- Spike: docs/spikes/SPK-4.md (GO-WITH-ALT — heap A* deferred to #036; #035 needs no pathing)
- Time-box: 1 iteration-day

## SMART
- [x] Specific: a generic entity/mob system (box physics, lifecycle, lit box render) + the zombie type
- [x] Measurable: harness asserts (spawn rule, physics, burn, drop, render pixel) + night screenshot
- [x] Achievable: reuses proven world-light/day-factor/player-sweep/item-give; render is a contained pass (no shader/atlas change)
- [x] Relevant: Tier-1 mechanic "hostile mobs" (MASTERPROMPT §5 / REFERENCE §Mob spawn + zombie row) — night becomes dangerous
- [x] Time-boxed: 1 day (AI/pathing/attack deliberately split to #036)

## 1.12.2 Reference spec (behavior as acceptance source)
docs/REFERENCE.md §"Mob spawn-by-light" + §mob table (zombie row). Resolved spec:
- SPAWN LIGHT — **1.12.2 = light level <= 7** (combined = max(blockLight, effectiveSky)). The "light 0
  only" rule is 1.18+ (REFERENCE explicitly flags this trap); the sprint table's "spawn@light0" is WRONG
  and corrected here. Effective sky = stored-sky-nibble x dayFactor (surface sky-nibble=15 => spawns only
  at night; caves have low sky+no block light => spawn any time). Hostile also needs: solid ground block
  with 2 air above (2-block clearance), >= 24 blocks from a player, within a ~24-40 block shell.
- HOSTILE CAP — MC 70/player globally; our active-sim cap = 12 hostiles near player, hard ceiling 24
  loaded (per-chunk scheduler + global cap polish = #039). Despawn beyond 48 blocks (#039 refines the
  32-128 random window).
- ZOMBIE — HP 20; walks (speed ~2.1 m/s, slower than sprinting player); **burns in sunlight** when
  sky-exposed during daytime (dayFactor high + sky-nibble at head >= ~10): 1 dmg / ~1s until dead or dark.
  Drops on death: rotten flesh 0-2 (iron/gold/carrot rare = backlog). Melee attack + door-breaking on
  hard + baby zombies + villager convert = #036 / backlog (NOT in this issue).
- DEVIATIONS (documented): (a) Tier-1 has no dropped-item entities, so a mob killed BY THE PLAYER gives
  loot straight to inventory (matches how block drops already work in #006); env-killed (burn) mobs drop
  nothing pickupable — item entities are a backlog item. (b) Mobs are NOT persisted across save/load
  (they respawn); entity persistence = backlog. (c) Mob art = flat-color lit boxes via a runtime palette
  (no atlas/shader change, zero-download, block parity untouched); dedicated Blender mob texture sheets =
  backlog #044. None of these are parity claims (mobs never count toward block %).

## Acceptance criteria (each individually checkable)
- [x] AC1: a zombie is a persistent entity with a correct AABB — force-spawned high, it falls under
      gravity and rests on the ground (does not sink/float). evidence: harness asserts mob.land / mob.no-sink
- [x] AC2: box collision blocks horizontal movement into a solid wall. evidence: harness assert mob.wall-block
- [x] AC3: spawn rule obeys 1.12 light<=7: a fully dark enclosed pocket (sky0/blk0) CAN spawn; a spot lit
      by glowstone (block light > 7) CANNOT; open surface cannot spawn at noon but CAN at midnight.
      evidence: harness asserts mob.spawn-scan-found / mob.spawn-dark / mob.no-spawn-lit / mob.no-spawn-noon /
      mob.spawn-night (open surface midnight via scheduler; "enclosed pocket" simplified to midnight-surface +
      scan for open dark column — same light-gate path)
- [x] AC4: no hostile spawns within 24 blocks of the player and total hostiles respect the cap.
      evidence: harness asserts mob.min-dist (rule reject + post-scheduler min >=20) / mob.cap(<=12)
- [x] AC5: sunlight burn — a sky-exposed zombie at noon loses HP over time and dies; at midnight it does
      not burn. evidence: harness asserts mob.burn-setup / mob.burn-day / mob.no-burn-night
- [x] AC6: killing a zombie by player gives rotten flesh to inventory and removes the mob.
      evidence: harness asserts mob.drop (8 kills -> >=1 rotten flesh) + mob.env-kill-no-loot
- [x] AC7: mobs render as lit boxes in the scene without GL error and are visible (center pixel changes
      vs empty); night scene shows a green-ish humanoid blob. evidence: harness asserts mob.px-draw/mob.glErr
      + screenshot qa/2026-09-05/night-mobs.png (vision verdict below)
- [x] AC8: zero regression — full suite still GREEN (107 -> 125 asserts), 0 console errors, existing
      suites/baselines unaffected (mobs only spawn in survival; mobTick not called by other suites).
      evidence: tools/test.mjs full = 125 pass 0 fail; parity.mjs still 17/399

## Test plan
- Harness asserts (window.__test, new `mobs` suite): mob.land, mob.no-sink, mob.wall-block,
  mob.spawn-dark, mob.no-spawn-lit, mob.spawn-night, mob.no-spawn-noon, mob.min-dist, mob.cap,
  mob.burn-day, mob.no-burn-night, mob.drop, mob.glErr, mob.px-draw
- Screenshot scenario: `night-mobs` — timeOffset=18000, force-spawn 2 zombies 4-6 blocks out, freeCam
  aimed at them, tick physics, draw. Also `day-noburn`? (covered by asserts).
- Vision check looks for: green-skinned box humanoid(s) on terrain at night, shaded by scene darkness
  (not full-bright), NO magenta, blocks/HUD unaffected; compare vs empty night frame.

## Risk / feasibility
Trivial extension of proven subsystems: physics = copy of player sweep (parameterized box); spawn gate =
world.lightAt + CF.dayFactor (both proven #020/#021); loot = CF.give (#024). Render: mobs reuse the EXISTING
shader by drawing 7-float verts (pos+uv+shade+light) and switching sampler T to a 8x1 solid-color palette on
texture unit 1 for the mob pass only — atlas untouched (block parity safe), shader untouched, single dynamic
VAO, culled to render radius. Playbook §4 WebGL rules respected (NEAREST, CLAMP, single VAO per buffer).
Pathfinding is explicitly OUT (SPK-4 heap A* lands in #036); #035 mobs only wander/stand + gravity.

## Evidence (closed 2026-09-05, branch feature/035-mob-core)
- Build: game/index.html 175.6 KB. Full gate: **125 pass / 0 fail / 0 errors** (was 107; +18 mob asserts:
  land, no-sink, wall-block, spawn-scan-found, spawn-dark, no-spawn-noon, no-spawn-lit, min-dist(x2),
  spawn-night(scheduler), cap, burn-setup, burn-day, no-burn-night, drop, env-kill-no-loot, px-draw, glErr).
  Quick gate 114 (96 + the 18 mob asserts; mobs suite is not slow-tagged) - audit #5 F1 corrected the
  stale "96" claim here same iteration.
- Render integration shipped as designed: NO shader change, NO atlas change — mobs reuse the block shader
  via a solid-color 8x1 palette on texture unit 1, sampler T switched only for the (dynamic, culled) mob pass.
  stats.mtris/mobCount tracked; render.glErr stays 0; readCenter helper added for pixel-presence asserts.
- Wiring: CF.mobTick explicit in game loop (NOT onTick-wrapped) + scheduler survival-gated ->
  every existing suite runs mob-free. persist clears mobs on load (no entity save yet, #044).
- Spec correction: 1.12 hostile spawn light is **<=7** (max(blk, sky*dayFactor)); "light 0" is 1.18+.
  Sprint 03 table said spawn@light0 - corrected here + sprint doc annotated. Verified both ways in asserts.
- Dev caught by tests (honest): (1) first full run failed mob.spawn-dark(sky=15) - my test ran the dark-spot
  check while timeOffset was still noon; fixed test-side. (2) second full run failed spawn-dark(sky=14):
  the grass suite's 24k-tick regrowth had grown vegetation INTO the fixed test column - switched to the
  established scan-for-clean-spot pattern (PLAYBOOK §3). Both failures were TESTS correctly catching mess.
- Screenshot: qa/2026-09-05/night-mobs.png (seed 5, timeOffset 18000, 2 force-spawn zombies).
  VISION VERDICT AC7 = PASS: two blocky humanoids (green head cube + blue-grey body cube) stand mid-frame
  on the dark plain; brightness matches scene night level (not full-bright, silhouette readable vs sky);
  no magenta anywhere; hotbar/terrain/tree silhouettes unaffected. MVP art = boxes (see #044).
- Deviations honored & tracked -> NEW backlog issue #044: mob texture sheets (Blender), mob facing/anim,
  rotten_flesh poison effect, rare iron/gold/carrot drops, mob save persistence, item entities on death.
- Parity impact: none claimed (mobs aren't blocks) - verified still 17/399. NOTE: fixed stale PARITY tier
  table (said 14/399; verified truth 17/399 since #020/#024 - table drift, corrected with evidence).

