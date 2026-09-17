# Issue: 066 — redstone lamp
- Type: FEAT | Status: DONE | Epic: Redstone | Sprint: 05 | Depends: #064

1.12: lamp unlit (light 0) becomes lit (light 15, brighter tile) when any of its 6 neighbor cells is
POWERED (adjacent dust power>0, direct torch, or repeater output face). Lit is a STATE (second block
variant or flat-bit like furnace-lit? - v1: separate block id redstone_lamp vs lit internal state via
flat bit + BY variant tile swap = furnace pattern precedent? DECIDE in DoR: cheap = one block + bit +
tile override at mesh time). Re-fires on power nibble change (flood marks dirty already). Recipe: 4 glowstone
+ 5 redstone dust. No natural state persistence needed (derived again).
ACs:
- [x] world.lamp-on/off asserts (dust beside lamp, lamp ABOVE torch via opposite-attach rule, repeater-facing
      lamp -> all LIT; cut dust -> back to OFF; lit nibble = 15 verified via lightAt)
- [x] items.lamp-craft assert (wiki-verified 4 glowstone corners + redstone cross; first attempt had the
      corners/cross swapped - assert caught it)
- [x] video phase t=108: real player path places lamp beside the boosted dust line; t=130 title probe
      lamp=LIT light=15; frames qa/videos/2026-09-17/lamp f01/f04 show the glowing lamp (warm tile + light
      pooling on the platform) at the end of torch->dust->REPEATER->dust line. = SPRINT EXIT CRITERION MET.
- [x] registry: redstone_lamp (123) + lit_redstone_lamp (124) exactly the 1.12 pre-flatten id PAIR (lit is a
      real block id, swap = w.set like the furnace-lit precedent); both functional:false honest (painted tiles
      y176; art polish queued on #048: lit tile reads muddy at distance + no bloom).

## Evidence (2026-09-17)
- Engine: lamp cells tracked in rs.cells (isRS extended, RTYPE=0 sinks); post-flood SWEEP compares
  blockPowered vs current id and w.set()s across the pair (instant on; 1.12's 2gt off-delay omitted v1 -
  documented). blockPowered gained the torch rule: a lit torch powers the cell OPPOSITE its attach
  (classic floor-torch-under-lamp), never its own attach (inverter invariant preserved - redstone-invert
  still green).
- +2 asserts -> suite 16, full 256/0 quick 240/0, 50 registry blocks, parity unchanged 59 (honest).
- Video: `node tools/video.mjs lamp seed=5 frames=8 step=2600 start=7000 scenario=video-redstone`.
