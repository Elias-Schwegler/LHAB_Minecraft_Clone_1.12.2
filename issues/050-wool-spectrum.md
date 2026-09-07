# Issue: 050 — wool spectrum
- Type: FEAT | Status: DONE | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

Depends: #038 (wool drop exists). 1.12: 16 wool colors (meta 0-15 WHITE..BLACK), each a registered variant; creative-tab colors; sheep dye NOT in scope.
Scope: 16 gen.py palette params (classic MC wool RGB), registry variants (id family), drops keep species-white simplification documented, breaking any color drops same color.
ACs:
- [x] parity +16 via tool incl. 16 sheets
- [x] registry.ids-unique still green; items.wool-color drop-mirror assert x3 colors
- [x] wool-wall shot (16 blocks) vision PASS


## Acceptance criteria

## Evidence (close 2026-09-07)
- +16 variants (t1): PARITY 29 -> 45/399 (11.3%) via tool (catalog labels added - families need variant NAMES in catalog.json to count).
- gen.py 16-color wool ramp tiles (77 tiles, 0 collisions); asserts registry.wool-spectrum + interact.drop-wool-red;
  gate 211 full / 195 quick GREEN; qa/blocks/wool-*.png x16 + wool-wall.png vision PASS (16 distinct soft-noise colors).
- Dye/craft chain (sheep dyeing, 8-wool shapes) -> later issues; blocks + colored drops are the countable core.
