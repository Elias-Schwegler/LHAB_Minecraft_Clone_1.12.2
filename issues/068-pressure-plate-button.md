# Issue: 068 — pressure plate + button (input glue)
- Type: FEAT | Status: DONE | Epic: Redstone | Sprint: 05 | Depends: #064

1.12 stone pressure plate (2 stone slab-ish tile, entity-activated via player/mob AABB overlap - reuse
cellBoxes/solidSpanXZ; activates on ANY entity, power 15 directly to adjacent dust/wire), wooden plate
(player+mobs only? v1 same rule), button (wall/floor, RMB-press, 10gt timer = due-list, power 15 while on).
Both = sources when on (torch class in flood: non-decaying 15 out).
ACs:
- [x] world.plate-press assert (player ON -> lamp ABOVE plate LIT via strong power; OFF restores; mob ON too;
      item-entities trigger v1-skip documented)
- [x] interact.button-press assert (floor/wall attach codes; stone = 20gt per CURRENT wiki (issue said 10gt -
      wiki wins, durations in def.dur: stone 20 / wood 30); idle off, press 14, mid-on re-press REFRESHES
      (+15t re-press, alive at +33, dead at +43))
- [x] items.plate-button-craft assert (2 stone / 1 stone etc); registry 4 entries functional:false honest
- [x] video plate demo: step-ON lamp=LIT light=15 frames, step-OFF dark frames (exit-circuit already LIT
      since #066; this adds the INPUT side). Mesh-lag artifact during capture -> #071 (engine state verified
      correct every probe).

## Evidence (2026-09-18)
- Engine (redstone.js): plates/buttons join rs.cells (isRS/RTYPE 'p'/'b'); rsTick PRE-scan = entity overlap
  (player pos + all mob positions; feet window y..y+1.6) -> press set diff -> dirty (idle = free); buttons
  self-expire (rs.bt Map until-timestamps, re-press overwrites = refresh); flood treats live plate/button as
  torch-class 15 sources; blockPowered rules: pressed PLATE powers block ABOVE; live BUTTON powers its own
  attach cell (wiki: buttons DO strongly power their attach - the one exception to the torch rule).
- Interact: RMB chain head -> CF.pressButton (works through the real aim event path); place floor rule +
  pop-gate extended for plates; button = cross attach codes reused (SUPV).
- Test-haul: (1) suite plate test stood the player inside the plate cell (no physics ticks) while the VIDEO
  scenario pushed the player up onto a solid lamp placed over his head - scenario rebuilt as plate->dust->lamp
  row (physics-safe), bug was in the TEST not the engine; (2) plate/button overlap scans must use cell centers
  (strict >/< edges bit an exact-edge tp); (3) craftOnce needs the full 9-slot lattice + count capture between
  the two crafts (2nd fill(null) wiped evidence).
- +3 asserts (plate-press, button-press, plate-button-craft) -> full 259/0, quick 243/0, 54 blocks (final gate below).
- video.mjs plate run f02/f05 = ON/OFF proof; f04 lag -> #071.
