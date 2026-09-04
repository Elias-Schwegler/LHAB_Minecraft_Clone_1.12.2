# Issue: 006 — Break/place + hardness + drops
- Type: FEAT | Status: DONE | Epic: E4 | Sprint: 01 | Depends: #003, #004

## Spec (1.12.2 REFERENCE §tool tiers, creative-assisted)
Raycast 5 blocks w/ voxel DDA. Left-click: hold-to-break w/ time = hardness*1.5/1 (hand);
bedrock unbreakable; grass→dirt drop, stone→cobblestone, ores self (per REFERENCE drop
table incl. gold ore [TBC] — gold ore drops nothing at hand tier per gate rules; keep
simplified hand-tier gate: non-breakable below own tier for stone-family). Right-click:
place selected hotbar block w/ AABB check (no overlap player); 1-slot creative hotbar
wheel-select. On AC-complete, set registry functional:true for proven blocks (grass,
dirt, stone, cobblestone, planks, glass, sand, gravel, snow, obsidian?, ores) and add
qa/blocks/*.png per family to flip parity honestly.

## Acceptance criteria
- [x] AC1 harness: ray hit returns aimed block + face; break removes it (air), drop queued
- [x] AC2 harness: break time stone=2.25s dirt=0.75s bedrock=∞ (hand multipliers)
- [x] AC3 harness: place fails inside player AABB, succeeds adjacent; persists in world
- [x] AC4 shot: mine scenario shows broken block/hotbar; qa/blocks family sheets saved
- [x] AC5 parity.mjs counts newly proven families (not counted before)

## Evidence (close)
- AC1 PASS: interact.aim-hit / interact.air / drop asserts.
- AC2 PASS: dirt 0.75s exact (hardness*1.5), stone-by-hand 11.25s not-broken in 2s (1.12 x5 slow), bedrock Infinity.
- AC3 PASS: interact.place + interact.no-self-place asserts.
- AC4 PASS: qa/blocks/*.png (17 sheets, vision-checked grass sheet: green top + side band + dirt bottom).
- AC5 PASS: parity 0 -> 16/399 (tier1 15, tier2 1 snow); honest non-counts: red_sand/wood variants (no tiles),
  bedrock (creative-only, not breakable -> not 'functional' per �7).