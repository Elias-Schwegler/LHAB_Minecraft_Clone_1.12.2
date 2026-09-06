# Issue: 036 — Mob AI: heap-A* chase + 1.9 combat cooldown
- Type: FEAT | Status: IN_PROGRESS | Epic: Mobs | Sprint: 03 | Depends: #035 (DONE) | Spike: SPK-4 GO-WITH-ALT

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
- [ ] AC1 A*: straight, around-wall (gap routing), unreachable-within-cap -> mob.ai.* asserts
- [ ] AC2 chase: mob 12 blocks away closes to melee range through open + 1-block-jump terrain -> mob.ai-chase/jump
- [ ] AC3 mob melee: player takes 3 dmg per 10t while adjacent; not while creative -> mob.ai-attack(+interval)
- [ ] AC4 player combat: charged sword full=4 wood / partial<full; entity priority over mining; kill drops loot -> mob.cbt-*
- [ ] AC5 budgets: pathfind calls/tick <=4, expansions per path <=1500, chase at cap still smooth (no tick blowup:
      simMs stays sane - structural counters, real-ms unobservable in virtual-time headless - PLAYBOOK note)
- [ ] AC6 zero regression: full gate green; #035 asserts unbroken (mobs at >24 don't chase in scheduler test)
- [ ] AC7 shot: mob-attack.png - zombie closing on player at night, hurt hearts + cooldown bar visible; vision PASS

## Evidence (fill at close)
