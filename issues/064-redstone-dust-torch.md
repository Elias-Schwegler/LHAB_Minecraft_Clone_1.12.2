# Issue: 064 — redstone dust + torch: power propagation core
- Type: FEAT | Status: READY | Epic: Redstone | Sprint: 05 | Depends: SPK-8 GO (read FIRST)

SPK-8 design: power = derived per-cell nibble (Map "x,y,z"->0..15 or parallel light-array), re-flood on
world.set() beside queueRelight (same 5x5 region discipline, same budget), NO persistence (re-derive on
load/first-look). 1.12 rules: dust decays 15->1 per hop (incl. diagonal turns), source (torch) = 15
non-decaying OUT, dust attaches to solid under, powering neighbor BLOCKS = read max(dust adj, torch adj)
- keep v1 to dust+torch+consumer-reads-API (CF.powerAt(x,y,z,face?)). Registry: redstone_torch (id 76)
+ redstone_wire (id 55), procedural tiles functional:false, recipes (torch: stick+redstone; dust: 1->3?
1.12: 1 dust+stick = 4 torches; dust from block? redstone_block 9<->1 later). redstone item: mining drop
source = NO natural gen this issue (nether quartz is our Tier-2 ore; redstone_ore WORLDGEN = separate slice
in this issue: 1.12 deepslate-less y<16 vein ~2.5% - DO IT: gen hook exists). Smelting redstone_ore->redstone
item (furnace).
ACs:
- [ ] world.redstone-flood assert (torch->15 line decay, gap-breaks-signal, re-flood on remove)
- [ ] region budget: flood only within edited 5x5 (perf assert or stats)
- [ ] items.redstone-craft + smelt asserts; registry.redstone (tiles/proof)
- [ ] interact.redstone-place (dust on solid only; torch attaches any solid face like wall torches)
- [ ] save roundtrip: power re-derived (no bytes stored) - save.redstone-derive assert
- [ ] video: extend video-play with circuit phase OR dedicated `video.mjs redstone`; frames in Evidence
