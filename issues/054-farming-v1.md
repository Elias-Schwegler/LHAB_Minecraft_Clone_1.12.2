# Issue: 054 — farming v1
- Type: FEAT | Status: DONE | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

1.12 core loop: HOE (4 mat, 2x2 head pattern? -> 2 mat + 2 sticks V like shovel) tills grass/dirt -> farmland (block w/ trampled top, reverts if no solid below). SEEDS: wheat_seeds item (from grass break 0-1 - wire to #019 drop table), planted on farmland, randomTick growth 8 stages (stages visual = cross-model age tiles gen.py param), mature -> 1-3 wheat + seeds; bread = 3 wheat; carrots/potatoes: drop from zombie/creeper-mob loot EXISTS (#037/038 - carrots? verify: carrot item registered), plant whole item, 7 stages, drop 2-4 + bonus. Hydration/neighbor speedup = SKIP (document). Farmland + wheat_carrot_potato = Tier-2 farming begins (mechanic row update).
ACs:
- [x] items.hoe + farmland till/revert asserts
- [x] world.crop-grow assert (tick budget -> age increases, drops on break mature)
- [x] survival.bread assert (3 wheat->bread->eat +5)
- [x] farm shot vision PASS (stages visible as cross models)

## Evidence (close 2026-09-10)
- Blocks: farmland(60, drops dirt, trample rule), wheat(59, 8 stages -> 4 tiles), carrot(141, 7 stages), potato(142,
  8 stages) - all cross:true, functional:false (numpy-procedural tiles, not Blender - honest; parity 56 unchanged).
  Growth = randomTick hook (34% of samples landing on crops) + CF.growCrop API (light-gated sky>=9 or block>=8;
  force = bone-meal hook). Trample: landing on EMPTY farmland reverts it to dirt (sneaking/crop above spare it).
- Items: 4 hoes (1.12 diagonal pattern), bread (3 wheat -> 1, +5 food), wheat/seeds/carrot/potato item tiles landed
  (blank-icons era over). useHoe wired into the RMB chain AFTER mobFeed (feeding beats planting, MC-style).
  Seeds plant ONLY with farmland directly below (stage 0); torch pop-rule treats crops as always below-supported
  (stage bits must not be read as torch attach codes).
- Harvests (1.12): mature wheat = 1-3 grain + 1-2 seeds; carrot/potato 2-4; immature returns the seed/item.
  poisonous_potato deferred (#048). Hydration/neighbor speedups documented as skipped per issue.
- LATENT BUGS THE TESTS FORCED OUT (the ticket's real value):
  (1) tryCraft compared only the normalized-grid width - a 2-wide hoe grid silently matched the 3-wide PICKAXE
      (its col-2 never checked); pattern compare now pads BOTH sides. (This could have shipped a wrong recipe table.)
  (2) place()'s torch face-code line clobbered crop stage bits once wheat gained cross:true -> gated !v.crop.
  (3) #060's pause gate paused at BOOT (pointer never locked yet) -> shot scenarios scanned queue-starved terrain
      (explains the starter-world framing drift); pause now requires "was locked before" or inventory-open; boot
      shows the controls overlay while the sim keeps ticking.
  (4) makeWorld() must never touch CF.* globals: worldTests' makeWorld(deterministic) had repointed CF.growCrop
      to a throwaway instance; growCrop now lives on the world object + a module-level delegate.
  (5) test arenas must not stomp shared coords (again): crop test moved to (200,200) - (120,120) is mob/bed turf.
- +7 asserts: items.hoe-craft, items.bread-craft, world.crop-grow, interact.till, interact.harvest,
  physics.farmland-trample, surv.bread -> 232 full / 216 quick GREEN, 41 registry blocks.
- qa/2026-09-09/farm-scene.png vision PASS: furrows + green seedlings -> golden wheat + carrot orange tip +
  potato flowers; torch-probe/starter-world regressions sane.



