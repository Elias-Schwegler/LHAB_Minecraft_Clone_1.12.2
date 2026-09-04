# Issue: 004 — Starter registry (18 blocks)
- Type: FEAT | Status: READY | Epic: E1/E4 | Sprint: 01 | Depends: #001

## Spec
Register with 1.12.2 ids, tiles (per-face top/side/bottom from atlas manifest),
hardness, drop name, solid, tier: stone, grass, dirt, cobblestone, planks(oak),
log(oak), leaves(oak), bedrock, sand, gravel, snow, glass, obsidian, coal/iron/gold/
diamond ore, air. Registry JSON stays strictly parsable (parity markers).
functional:false until #006 proves drops/interaction (honest counting).

## Acceptance criteria
- [ ] AC1 harness: registry parse + every block's tile exists in atlas manifest
- [ ] AC2 harness: variant keys follow labels rule (planks→oak etc.)
- [ ] AC3 parity.mjs lists them as registered-but-unproven (not counted)
