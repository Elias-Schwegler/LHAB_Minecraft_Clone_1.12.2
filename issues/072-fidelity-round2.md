# Issue: 072 — texture fidelity round 2 (split from #048)
- Type: FIX (polish) | Status: READY | Epic: Assets | Sprint: 06 candidate | Depends: #048

Leftover taste-tuning from the #048 pass (core shipped: glowstone speckle, fluid-freeze sheets, 17 item
icons, lamp bloom, GRID14):
- [ ] furnace front: visible dark opening + lighter stone frame (gen.py ramp/mask)
- [ ] crafting_table: top grid + side tool silhouette faces (currently uniform planks-ish)
- [ ] glass: whiter frame at distance (near-invisible now, center alpha OK)
- [ ] water hue: brighter teal at grazing angles (deep blue acceptable - tune, don't churn)
- [ ] bucket sprite: MC handle loop (serviceable cup today)
- [ ] fluid-pool.png black rectangle patch (audit #6 F7 - light hole vs degenerate quad; only visible on the
      old sheet, re-shoot fluid-pool first and re-diagnose)
- [ ] regenerate ALL qa/blocks sheets on the GRID14 atlas + full vision re-pass (per-block thumbs may have
      shifted cells - manifest-keyed so likely fine, but 25 sheets deserve the once-over)
- [ ] mob texture sheets (from #044's deferred slice): Blender-baked 64px skins per species, box UVs sample
      per-face regions, palette fallback stays

## Acceptance
- [ ] per-tile zoom crops vision PASS; full gate green; parity count unchanged (names stable)
