# Issue: 054 — farming v1
- Type: FEAT | Status: READY | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

1.12 core loop: HOE (4 mat, 2x2 head pattern? -> 2 mat + 2 sticks V like shovel) tills grass/dirt -> farmland (block w/ trampled top, reverts if no solid below). SEEDS: wheat_seeds item (from grass break 0-1 - wire to #019 drop table), planted on farmland, randomTick growth 8 stages (stages visual = cross-model age tiles gen.py param), mature -> 1-3 wheat + seeds; bread = 3 wheat; carrots/potatoes: drop from zombie/creeper-mob loot EXISTS (#037/038 - carrots? verify: carrot item registered), plant whole item, 7 stages, drop 2-4 + bonus. Hydration/neighbor speedup = SKIP (document). Farmland + wheat_carrot_potato = Tier-2 farming begins (mechanic row update).
ACs:
- [ ] items.hoe + farmland till/revert asserts
- [ ] world.crop-grow assert (tick budget -> age increases, drops on break mature)
- [ ] survival.bread assert (3 wheat->bread->eat +5)
- [ ] farm shot vision PASS (stages visible as cross models)


## Acceptance criteria
