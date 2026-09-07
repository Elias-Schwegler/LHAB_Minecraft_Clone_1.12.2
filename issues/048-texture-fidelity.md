# Issue: 048 — Texture fidelity pass (atlas P1 leftovers) + clean fluid proof sheets
- Type: FIX (P2-class: fidelity/polish) | Status: DRAFT | Epic: Assets | Sprint: 04 candidate | Depends: #043

## Context
#043 fixed the atlas row-stride P1 (icons overlapped blocks) and repainted/relocated procedural cells.
Blocks are all correct CELLS now; several TILE DESIGNS still undersell their 1.12 reference, and the
block-shot scenario floods itself for fluids. All vision-verified 2026-09-07 as "textured + identifiable",
but for the record:

## Scope
- [ ] furnace front: visible dark opening + lighter stone frame (gen.py ramp/mask tuning)
- [ ] crafting_table: top grid lines + side tool silhouettes
- [ ] glass: white frame + transparent center (currently near-invisible at distance)
- [ ] glowstone: voronoi spots more contrasty (reads as plain gold now)
- [ ] water hue: MC surface reads brighter teal-blue at grazing angles (deep blue acceptable, tune)
- [ ] bucket sprite: MC-shaped handle loop (current is a serviceable cup+rim)
- [ ] block 'block' shot scenario: freeze worldTick for fluid blocks (lava/water sources spread over the
      whole pedestal pad during the 300ms virtual wait -> sheets show floods, not pedestals)
- [ ] regenerate atlas + all 25 qa/blocks sheets + vision re-pass after changes

## Acceptance criteria
- [ ] AC1: per-tile crops (x10 zoom PNGs in qa/blocks/) show the MC features listed above - vision PASS
- [ ] AC2: full gate stays green; parity count unchanged (tiles already counted, names stable)
- [ ] AC3: fluids get clean pedestal proof sheets (freeze rule), water/lava rows still counted
