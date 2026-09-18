# Issue: 048 â€” Texture fidelity pass (atlas P1 leftovers) + clean fluid proof sheets
- Type: FIX (P2-class: fidelity/polish) | Status: DRAFT | Epic: Assets | Sprint: 04 candidate | Depends: #043

## Context
#043 fixed the atlas row-stride P1 (icons overlapped blocks) and repainted/relocated procedural cells.
Blocks are all correct CELLS now; several TILE DESIGNS still undersell their 1.12 reference, and the
block-shot scenario floods itself for fluids. All vision-verified 2026-09-07 as "textured + identifiable",
but for the record:

## Scope
- [ ] -> #072 furnace front / crafting_table faces / glass frame / water hue / bucket handle (taste-tuning round 2)
- [x] glowstone: bright gold + dark amber voronoi speckles (was plain gold; sheet re-shot PASS - spotted reads
      at hotbar scale, block face gold+texture)
- [x] FLUID-FREEZE block-proof-shot: CF.fluidFreeze gate in world.tick (fluidTick skipped, gen/light/relight
      alive) + block scenario sets it -> water sheet = CLEAN pedestal source block (was flooded pad)
- [x] ITEM ICON PASS (the F5 bucket-list items): bone/arrow/gunpowder/string/feather/leather/ink_sac/egg/
      clay_ball/brick + ALL 8 meat items + rotten_flesh wired to real tiles (17 invisible blanks -> drawn,
      atlas cell zoom reviewed row-by-row); + fixed item_quartz's ORPHAN tile ref from #056
- [x] lit redstone lamp bloom: bright amber core, 2 thin glass seams (was muddy cage) - #066 note done
- [x] atlas GRID 12->14 (224px) - icons overflowed into runtime PAINT ROWS (caught by the collision audit,
      would have silently overwritten tnt/chest/bucket/plate/bottle tiles at load!) + ASZ/__ATLAS_SIZE consumers verified
- [x] torch flame: verified existing 3-tone flame pixels (special-case existed since #105 UV fix; F5 note stale)
- [ ] -> #072 fluid-pool black patch (F7) + full 25-sheet re-pass (only changed tiles re-shot this round)

## Acceptance criteria
- [ ] AC1: per-tile crops (x10 zoom PNGs in qa/blocks/) show the MC features listed above - vision PASS
- [ ] AC2: full gate stays green; parity count unchanged (tiles already counted, names stable)
- [ ] AC3: fluids get clean pedestal proof sheets (freeze rule), water/lava rows still counted


## Audit #7 F5 (2026-09-12)
- qa/blocks/quartz_ore.png: white veins BARELY read at pedestal scale (threshold 0.62/voronoi 4 + the EMIT palette
crush ~0.45x). Proof binding is real (blender src + world.nether-gen assert) - art pass may enlarge/brighten
veins. Same bucket as torch flame art + mob drop icons (bone/arrow/gunpowder/string/leather still blank?).
poisonous_potato item + hydration also queued here.

## #066 lamp art note (2026-09-17)
- Painted lit_redstone_lamp reads muddy-brown at distance (video lamp f01/f04): needs brighter core +
fewer dark (x+y)%5 frame lines; optional: emissive hint (lit tile bypass shade). Unlit casing ok.

