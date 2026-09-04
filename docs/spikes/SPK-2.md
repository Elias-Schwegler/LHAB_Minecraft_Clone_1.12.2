# SPK-2 — Blender-headless texture pipeline -> atlas -> base64 embed
Verdict: **GO**
Date: 2026-09-04. Promoted: tools/tex/gen.py (19 tiles), atlas.png, atlas.json, atlas_sheet.png.

## Experiment
Headless Blender 5.2: per-tile procedural materials (noise/wave/brick/voronoi ->
ColorRamp -> Emission for exact colors), Cycles CPU 8 samples, 16x16 renders, composited
into a 128x128 RGBA atlas via numpy (Blender-bundled), nearest-x8 sheet for vision QA,
manifest atlas.json with `src:"blender:gen.py"` per tile. build.mjs base64-embeds atlas;
test harness decodes and asserts dimensions.

## Evidence
- `node tools/tex/gen.mjs` -> `TEXGEN_OK 19 tiles -> atlas.png 128x128` (~40s total).
- Vision check on atlas_sheet.png: all 19 tiles show grain, correct palettes
  (grass green speckle, dirt/gravel browns, stone/cobble grays, plank banding, ore
  speckles on stone, water blue, obsidian dark violet). No flat tiles; no magenta.
- `node tools/build.mjs` -> "atlas embedded"; `node tools/test.mjs` green incl.
  `atlas.decoded` (browser decodes data-URL, 128x128).

## Consequences
1. Use EMISSION (not Principled+lights) for exact texture colors; Cycles CPU is fast
   enough (~2s/tile).
2. Textures needing rework (sprint polish issues): log_top rings too subtle, glass
   border, grass_side band edge jitter too strong.
3. 128x128 atlas fits 64 tiles; grow to 256x256 when >64 tiles (tile coords are
   manifest-driven, renderer must not hardcode).
4. atlas.json is the parity manifest — parity.mjs already requires `blender:` src.
