# Issue: 041 — Bed (place/sleep/set-spawn) + thunder weather v1
- Type: FEAT | Status: DONE | Epic: docs/backlog/epics.md (Sleep/Weather) | Sprint: 03
- Depends on: #021 (day/night), #026 (survival) | Time-box: 1d

## 1.12.2 Reference spec
- Bed: white wool+planks craft; occupies 2 cells (foot+head, facing meta); break either half = both drop.
  RMB SLEEP only in night window 12542..23541 ("You can only sleep at night" otherwise); refuses if any
  hostile within 16 of the bed; fades to black, TIME SKIPS TO DAWN (0), sets respawn on the head cell,
  clears rain/thunder. (Nether/explosion-in-bed: out of scope, no nether yet.)
- Weather v1 (1.12 timings): rain 12k..24k ticks, 25% of rains are thunderstorms, dry gaps 96k..187k ticks;
  thunderstorm = overcast sky + occasional lightning strikes (flash + ~5 dmg within 3.5 blocks of a column).
- Deviations (logged): only WHITE bed (catalog's 16 colours -> unregistered => uncounted, honest; #044),
  bed is a full-cube collision (no 0.5625 slab shape), no bed-in-water/lava check, lightning spawns no
  fire/no charged creeper (#044), no rain sound/particles (grey sky + gloom only), monster-radius 16
  (MC exact value is [TBC] in REFERENCE — flagged; audit can re-verify), no "wake by怪物 proximity".

## Acceptance criteria
- [x] AC1 place = foot+head cells with facing/head bits in flat[] (no collision with torch/fluid codes) -> bed.place
- [x] AC2 break either half removes both -> bed.break-both
- [x] AC3 day-refusal + monster-refusal + happy sleep -> wake time is dawn + spawn moved to head cell -> bed.no-sleep-day / no-sleep-monsters / sleep-ok / wake-dawn / spawn-head
- [x] AC4 weather cycle counts down + stops; strikeAt finds surface, damages mob, triggers flash; shake decays -> bed.weather-stops / strike / shake-decays
- [x] AC5 render: rain/thunder overcast tint + lightning white flash + blast camera shake (shader untouched) -> shots below
- [x] AC6 zero regression: full 182 -> 192 green (+10), quick 181, parity stays 18/399 (bed functional:false, procedural tile + only 1 of 16 colours - honest)

## Evidence (closed 2026-09-06)
- Gate: full **192/192 GREEN** (new suite `bed`: place/break-both/no-sleep-day/no-sleep-monsters/sleep-ok/
  wake-dawn/spawn-head/weather-stops/strike/shake-decays), quick 181, 0 errors; parity 18/399 unchanged.
- src/bed.js: bedPlace/bedBreak (2-cell + flat dir<<4|head64), trySleep (window+proximity+foes+fade DOM),
  finishSleepAtPeak (time->0 via offset, spawn=head cell, weather clear), CF.weather + bedTick (cycle,
  natural strikes ~1/2400 during thunder, flash/shake decay), strikeAt, useBed hooked into useBlock BEFORE
  containers; bed tiles in last 2 free atlas cells (procedural); bed recipe (3 wool + 3 planks).
- render.js: sky/fog blend to overcast when raining (gloomier under thunder), full-white on lightning flash,
  camera shake for explosions (CF.shake) - shader & atlas untouched (parity safe).
- Shots: qa/2026-09-06/bed-sleep.png VISION PASS (2-cell bed on grass, scene bright = dawn after sleep skip
  - "can sleep through the night" proven visually; player hearts low from boot-fall = pre-existing harness
  start state, not a bug); storm-sky.png VISION PASS (flat grey overcast vs the clear-blue baselines, same
  seed/camera => weather render provably changed the sky).
- Follow-ups -> #044: 16 bed colours, slab shape, wake-guard, lightning fire/charged creepers, rain particles.
