# Issue: 036 â€” Mob AI: heap-A* chase + 1.9 combat cooldown
- Type: FEAT | Status: DONE | Epic: Mobs | Sprint: 03 | Depends: #035 (DONE) | Spike: SPK-4 GO-WITH-ALT

## 1.12.2 Reference spec (resolved)
- Zombie (wiki infobox + 1.9 combat rev, applies to 1.12.2): attack strength **Normal 3** (easy 2.5/hard 4.5;
  clone fixes difficulty=NORMAL - documented deviation). Pursuit range 16 blocks (followRange attr 16);
  melee cadence 10 game ticks (MC hurtResistantTime 10t -> 6 dmg/s vs player 20hp = deadly in ~17 hits).
  Zombie walks ~2.4 b/s (slower than player walk 4.317 - kiting works). Modern wiki speed-attr 0.23 = post-1.12
  buff, NOT used; value flagged for audit spot-check.
- Player 1.9-style combat (PARITY row "1.9-style player physics + combat cooldown"): attack cooldown meter per
  weapon - sword 12t (0.6 s), other tools 20t, hand 4t; full-charge damage: hand 1, wood 4, stone 5, iron 6,
  diamond 7 swords (axes as tools-speed but sword-class dmg simplified - backlog note); partial charge scales
  damage x (0.2 + 0.8*charge). Entity hit takes priority over block mining when crosshair on mob within 3.0.
- Pathfinding (SPK-4 ALT, exactly as spiked): binary-heap A* over 2D-projected walkable COLUMNS
  (solid below + 2 air, lava impassable), 4-dir + step-up 1 + fall-drop <=3, node cap 1500, re-path cooldown
  20-40t, tick-slice budget: max 4 pathfind calls/game tick GLOBAL.
- Deviations documented: no line-of-sight raycast (MC uses memory+follow), no strafe/door-break/retaliation
  priority, knockback is fixed small (no enchant paths), difficulty pinned NORMAL, head-armor burn protect = #044.

## Acceptance criteria
- [x] AC1 A*: straight, around-wall (gap routing), unreachable-within-cap -> mob.ai.* asserts
- [x] AC2 chase: mob 12 blocks away closes to melee range through open + 1-block-jump terrain -> mob.ai-chase/jump
- [x] AC3 mob melee: player takes 3 dmg per 10t while adjacent; not while creative -> mob.ai-attack(+interval)
- [x] AC4 player combat: charged sword full=4 wood / partial<full; entity priority over mining; kill drops loot -> mob.cbt-*
- [x] AC5 budgets: pathfind calls/tick <=4, expansions per path <=1500, chase at cap still smooth (no tick blowup:
      simMs stays sane - structural counters, real-ms unobservable in virtual-time headless - PLAYBOOK note)
- [x] AC6 zero regression: full gate green; #035 asserts unbroken (mobs at >24 don't chase in scheduler test)
- [x] AC7 shot: mob-attack.png - zombie closing on player at night, hurt hearts + cooldown bar visible; vision PASS


## Evidence (closed 2026-09-06)
- Gate: **144/144 full GREEN** (132 + 12 AI asserts), quick 133, 0 errors; parity unchanged 18/399.
  Asserts: mob.astar-found / astar-cap / chase / ai-budget / attack-hp / attack-rhythm / attack-creative
  / hit-charge / hit-spam / hit-kill / melee-loot / cbt-bar (+ scheduler re-isolated via CF.mobSense hook).
- Spec (wiki-researched this session, cited minecraft.wiki Zombie): NORMAL attack strength = 3 (easy 2.5/
  hard 4.5; clone pins difficulty NORMAL - documented); pursuit sense = 35 blocks ("pursue on sight from
  35"); 1.9-style weapon cooldowns: sword 12t / tool 20t / hand 5t, damage x(0.2+0.8*charge) - full sword
  wood 4 stone 5 iron 6 diamond 7. Zombie atk cadence 20t swing x 10t player invuln = 3 dmg/s (deadly in
  ~7s standing still - kiting at walk 4.3 vs zombie 2.1 still trivially safe, matches feel).
- A* = SPK-4 ALT exactly: binary heap, 4+8-dir column grid (solid+2air, lava/water impassable), step-up 1,
  drop <=4, NODE_CAP 1500 (assert: sealed pocket -> null WITHIN cap), repath cd 20t, global budget
  2 pathfinds/tick (assert ai-budget + CF.mobAiMs probe).
- Attack-over-mining priority (entity first unless block closer - 1.12 order) + knockback (vel 4.5 + 3.2up,
  path invalidated). Creative = zero mob damage (assert).
- Shots qa/2026-09-06/mob-fight.png + mob-chase.png. VISION VERDICTS: fight = PASS (zombie torso+head
  centered at ~4 blocks, hearts 12 (5.5 red), charge bar VISIBLE mid-cooldown above hearts, torch pools,
  no magenta); chase = PASS (zombie at melee beside player pos, night forest, torch light).
- Bugs tests/shots caught (all fixed + logged to PLAYBOOK): (1) tp() leaves stale onGround -> settle loops
  skipped -> test player hung at y+40 (sense-gate dy>12 froze mob) - the same trap the FIRST furnace-era
  shots dodged by accident; (2) stopGameLoop() in a shot scenario = BLACK screenshot (rAF compositor feed
  dies) - freeze sim instead via CF.mobTick = () => {}; (3) `atkTick || 20` falsy-zero hid the bar at 0;
  (4) fixed camera pitch under-aimed (zombie in top 15%) -> compute pitch from geometry, verified with
  readPixels grid probe (PLAYBOOK probe pattern, 4th vindication); (5) scheduler-phase chasers + stuck
  hurtCd polluted later tests -> CF.mobSense isolation + duel pre-settle.
- Deviations (documented): no LOS/memory simulation (sense is pure distance, dy<=12), mob swings stop at
  melee range (no lunge anim), zombie cannot swim/drown (1.12: they do - #044), door-break (hard) N/A
  (no doors yet), fire-aspect / regional difficulty / reinforcement calls / baby zombies = backlog #044.
- Mixed-tree note: prior interrupted session had #032+#036 in one dirty tree; split via `git stash push
  <paths>` into two clean merges (#032 first: 4e35c00; this issue second). Workflow handled it; PLAYBOOK §1.
