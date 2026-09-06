# Issue: 037 — Skeleton (ranged) + Creeper (fuse + crater explosion)
- Type: FEAT | Status: DONE | Epic: docs/backlog/epics.md (Mobs) | Sprint: 03
- Depends on: #035 (mob core DONE), #036 (AI/combat DONE) | Spike: SPK-4 (A* reused) | Time-box: 1d

## 1.12.2 Reference spec (researched via wiki, subagent-cited; difficulty pinned NORMAL)
- SKELETON: HP 20; speed 0.25 (~2.4-2.5 b/s); **burns in sunlight**; ranged - shoots a bow when the player is
  within followRange **20**, keeps **4-15** blocks (backs off if <4), needs line-of-sight; cadence ~40t (normal);
  arrow damage 1-5 (velocity/distance: closer = harder; formula dmg=clamp(round(5-dist/5),1,5)); arrows knock
  back. Drops 0-2 bone + 0-2 arrow (bow rare -> #044). [Modern 1.15+ changed to fixed per-difficulty damage +
  60t cadence - NOT used; this is 1.12.2.]
- CREEPER: HP 20; speed 0.25; **does NOT burn**; silent approach, when player <=3 blocks with LOS starts a
  **30-tick fuse** (swell anim grows + white flash near detonation); aborts/resets the fuse if the target leaves
  LOS or gets out of sense (35). On completion: explosion **power 3**, then the creeper is consumed (no loot on
  self-detonation; gunpowder 0-2 only when killed by a player). Charged creeper (lightning, power 6) -> backlog.
- EXPLOSION (shared with TNT #042, src/explode.js): the exact 1.12.2 model - 16^3 rays from the centre, each
  intensity=power*rand(0.7..1.3), marched 0.3/step, each solid crossed subtracts (blastRes/5 + 0.3)*0.3 then
  0.22500001; destroy while intensity>0. blastRes by name (obsidian/bedrock /5=240/720 -> survive). Entity
  damage impact=(1-dist/(2*power))*exposure; dmg=((impact^2+impact)/2)*(7*2*power)+1 (NORMAL). Block-drop-as-item
  (prob 1/power) deferred to item-entities #044; we do destruction + crater only.

## Acceptance criteria
- [x] AC1 explosion crater is bounded + resistance-aware (obsidian survives, center cleared) -> mob.explode-crater/obsidian
- [x] AC2 skeleton fires arrows in 4..15 with LOS; arrow despawns on hitting a block -> mob.skel-shoot / mob.arrow-block-hit
- [x] AC3 skeleton burns at noon (undead) -> mob.skel-burn
- [x] AC4 creeper swells then detonates at <=3 blocks, damaging the player + leaving a crater, self-removed -> mob.creeper-boom
- [x] AC5 creeper aborts the fuse if the player escapes sense range -> mob.creeper-abort
- [x] AC6 creeper never burns in daylight (burns:false) -> mob.creeper-no-burn
- [x] AC7 both new mobs render as distinct lit boxes (skeleton=pale, creeper=green) + arrows render -> shots
- [x] AC8 zero regression: full 144 -> 152 green (8 asserts), quick 141, parity stays 18/399, 0 errors

## Test plan
- Harness asserts: mob.explode-crater, mob.explode-obsidian, mob.skel-shoot, mob.arrow-block-hit, mob.skel-burn,
  mob.creeper-boom, mob.creeper-abort, mob.creeper-no-burn (deterministic synthetic sky platforms, no terrain dependence)
- Shots: mob-skel.png (skeleton + arrow in flight, torch-lit night), mob-creeper.png (swelling green creeper mid-fuse)
- Vision: skeleton=pale humanoid distinct from zombie/creeper with a visible arrow; creeper=green pillar distinct; no magenta

## Risk / feasibility
Reuses proven #035/#036 (spawn, physics, A*, sense gate, loot, lit-box render). New: projectile array + ballistic
aim; ray-marched explosion. Explosion unit-tested on a synthetic stone blob (no terrain variance).

## Evidence (closed 2026-09-06)
- Gate: full **152/152 GREEN** (+8 asserts: explode-crater/obsidian, skel-shoot, arrow-block-hit, skel-burn,
  creeper-boom/abort/no-burn), quick 141, 0 errors; parity unchanged 18/399 (mobs aren't blocks).
- New module src/explode.js (CF.explode + CF.blastRes + CF.shake counter) registered after mobs.js in manifest.
- mobs.js: CF.MOBS.skeleton (ranged) + CF.MOBS.creeper; aiChase branched melee/ranged/creeper with losClear()
  + pathToward() helpers; sense-fail now aborts the creeper fuse (1.12); M.explode(); arrow projectiles
  (CF.projectiles, fireArrow predictive aim, ARROW_G=20, block-hit + player-hit consume); buildMobVerts renders
  arrows + creeper swell-grow + on-fire/creeper-flash tint; scheduler now mixes zombie50/skel30/creeper20.
- Palette expanded 8->16 texels in render.js (skel/skelDark/cree/creeDark/creeFlash/arrow/bone/pig/cow/sheep) —
  still zero atlas/shader change (block parity untouched). items.js: bone/arrow/gunpowder + meat/wool/leather/etc
  added (blank icons, tiles tracked #044); loot arrays now support `extra` drop (skeleton bone+arrow).
- Bugs the tests/shots caught (all fixed + PLAYBOOK-logged): (1) blastRes must divide by 5 (stone 6->1.2) — without
  it a power-3 creeper destroyed 1/2197 blocks (real crash of realism, assert mob.explode-crater caught it);
  (2) creeper boom/abort tests were terrain-fragile (a tree blocked LOS / player fell into a hole the boom made)
  -> synthetic sky platform rebuilt each duel() (duel() must re-fill the floor the explosion craters);
  (3) sense-fail path didn't reset the fuse (abort never happened).
- Shots qa/2026-09-06/mob-skel.png + mob-creeper.png. VISION: skel=PASS (pale skeleton mid-ground + bright arrow
  speck mid-flight + torch pools, distinct from zombie/creeper); creeper=PASS (green swelling creeper pillar on the
  clearing, unmistakably a different mob, no magenta).
- Deviations -> #044: arrow block-drop, mob textures, charged creeper/lightning, skeleton strafe-to-keep-range
  (clone just backs off at <4), skeleton bow-in-hand render, explosion item drops, camera shake feel (CF.shake set).
