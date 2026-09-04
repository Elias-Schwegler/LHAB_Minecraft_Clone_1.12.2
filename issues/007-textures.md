# Issue: 007 — Texture polish + missing tiles
- Type: FEAT | Status: DONE | Epic: E3 | Sprint: 01 | Depends: #001 | Spike: SPK-2 GO

## Spec
Add leaves_oak tile (transparent-corner, dense green noise w/ holes). Fix: log_top rings
visible, grass_side band less jitter, glass faint frame (mostly empty w/ white edge).
All via tools/tex/gen.py, regen atlas, vision-check sheet. No flat tiles (§1.2).

## Acceptance criteria
- [x] AC1 sheet vision: leaves readable, log rings visible, glass frameless-ish w/ edge
- [x] AC2 atlas + manifest regenerated (blender src intact), build+test green

## Evidence (close)
- AC1 VISION PASS: atlas_sheet.png re-inspected — leaves_oak green w/ dark hole speckles
  (readable), log_top_oak shows concentric growth rings (first attempt: stripes -> fixed
  via radial-length sine; verified), bedrock now dark-dominant w/ light speckles, grass_side
  band edge calm (jitter 0.25->0.12, thr 0.86), glass near-empty w/ pale frame (interior
  alpha=0 via Transparent BSDF).
- AC2 PASS: TEXGEN_OK 20 tiles; atlas.json src=blender:gen.py intact; build "atlas
  embedded"; test.mjs GREEN (atlas.decoded).
- Remaining nits -> FIX backlog: log_side_oak grain subtle; glass frame thin at 16px.
