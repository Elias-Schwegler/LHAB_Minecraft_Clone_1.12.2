# Issue: 038 — Passive mobs: pig/cow/sheep (wander, breed, drops)
- Type: FEAT | Status: DONE | Epic: docs/backlog/epics.md (Mobs) | Sprint: 03
- Depends on: #035 (core), #036 (AI/combat), #037 (roster) | Time-box: 1d

## 1.12.2 Reference spec (wiki/subagent-cited; NORMAL difficulty)
- PIG hp10 speed0.25 breed=carrot drop raw_porkchop 1-3; COW hp10 speed0.2 breed=wheat drop raw_beef 1-3 +
  leather 0-2; SHEEP hp8 speed0.23 breed=wheat drop wool 1 + mutton 1-2 (shearing -> #044).
- Wander: 1.12 RandomStroll (pick a direction every ~2-4s, walk, pause). Flee: passives run from the player
  when attacked. Babies: half-scale model, grow to adult in **6000t (5 min)**; babies drop nothing; breeding
  cooldown (parents) **6000t**; after feeding both love for 60t (3s) then a nearby ready pair makes a baby.
- Natural spawn (passive): on grass_block, daylight (sky>=9), within 24-40 of player, persistent (NEVER despawn).
- Deviations (-> #044): no baby-then-adult speed change, no milk/shearing, no sex/twin chance, cooked drops
  via Fire Aspect (no fire yet), rabbit/chicken/horse/etc species, entity loot (direct-to-inventory on kill).

## Acceptance criteria
- [x] AC1 correct per-species drops (pig porkchop, sheep wool+mutton, cow beef) + baby drops nothing -> mob.passive-*-drop, baby-nodrop
- [x] AC2 breed via feeding: RMB a passive with its food -> love + food consumed; two ready adults pair -> baby + 6000t parent cooldown; cooldown blocks re-breed -> mob.breed-feed/baby/cooldown
- [x] AC3 baby grows to adult at 6000t -> mob.baby-grow
- [x] AC4 wander (stroll) + flee-when-hurt -> mob.passive-wander / mob.passive-flee
- [x] AC5 passive spawn rule (grass+day ok; night no; non-grass no) + persistence (no despawn) -> mob.passive-spawn-day/no-spawn-night/no-spawn-nongrass/persist
- [x] AC6 zero regression: full 152 -> 166 green (+14 asserts), quick 155, parity stays 18/399, 0 errors
- [x] AC7 shot mob-farm.png: pig(pink)+baby(tiny)+cow(brown)+sheep(white/dark-face) on grass, distinct, no magenta

## Evidence (closed 2026-09-06)
- Gate: full **166/166 GREEN** (+14), quick 155, 0 errors; parity 18/399 (mobs not blocks).
- mobs.js: pig/cow/sheep MOBS entries (quadruped box models, per-palette colors); passive AI (aiPassive:
  grow/love/cooldown + RandomStroll wander + flee-away), M.breedScan (love-pair -> baby + BREED_CD=6000),
  CF.mobFeed (RMB breed, consume food, aim-ray reuse of mobHitAt), trySpawnAt passive branch (grass+sky>=9
  +PASSIVE_CAP=10+ignoreDist test opt), passive persist (no despawn), scheduler passive branch (daylight grass),
  buildMobVerts baby 0.5x scale + burn/creeper flash. items.js meat/wool/leather already added (#037).
- interact.js: RMB chain now useBlock -> mobFeed -> useHeld -> place (feeding beats placing the carrot/wheat).
- Bugs the tests caught: (1) #038 `const gx` collided with the #036 chase test's `gx` in the same mobTests
  function scope -> SyntaxError killed the WHOLE bundle (boot hung, "no TESTRESULT"): caught by `node --check`,
  which is now the pre-gate lint (PLAYBOOK); renamed to pgx/pgz. (2) mob-farm scenario referenced test-local
  `ID` not CF.IDOF -> SHOTERR (surfaced via dump-dom title probe); fixed.
- Pre-gate lint added habit: run `node --check src/*.js` after big edits (duplicate const in a shared function
  is invisible to build.mjs (concat-only) but breaks every suite — cost a debug cycle).
- Shots qa/2026-09-06/mob-farm.png. VISION PASS: 4 distinct passive forms (pink pig + smaller pink baby + brown
  cow + cream sheep w/ dark face) standing on grass in daylight; no magenta; correct per-species palette.
- Deviations logged -> #044.
