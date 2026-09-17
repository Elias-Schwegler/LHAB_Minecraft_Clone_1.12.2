# Issue: 068 — pressure plate + button (input glue)
- Type: FEAT | Status: READY | Epic: Redstone | Sprint: 05 | Depends: #064

1.12 stone pressure plate (2 stone slab-ish tile, entity-activated via player/mob AABB overlap - reuse
cellBoxes/solidSpanXZ; activates on ANY entity, power 15 directly to adjacent dust/wire), wooden plate
(player+mobs only? v1 same rule), button (wall/floor, RMB-press, 10gt timer = due-list, power 15 while on).
Both = sources when on (torch class in flood: non-decaying 15 out).
ACs:
- [ ] world.plate-assert (step on = adjacent dust lights 15; off restores; mob stands on too)
- [ ] interact.button-press (RMB = 10gt pulse, mid-timer re-press refreshes)
- [ ] items plate/button crafts; registry entries functional:false honest
- [ ] video: full door circuit demo end-to-end (button -> dust -> lamp) = sprint EXIT CRITERION
