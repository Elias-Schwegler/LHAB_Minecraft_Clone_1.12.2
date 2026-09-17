# Definition of Done (DoD)
An issue is DONE only if ALL true (verified against the built `game/index.html` of that commit):
1. Feature works in BUILT artifact (not just src): `node tools/build.mjs` included it.
2. `node tools/test.mjs` green (harness asserts; zero console errors in TESTRESULT JSON).
3. `node tools/shot.mjs <scenario>` wrote PNG(s) under `qa/YYYY-MM-DD/`.
4. Vision check: agent inspected the PNGs against each visual criterion; verdict text
   written into the issue's Evidence section (per criterion: PASS/FAIL + observation).
   Missing texture pattern (magenta) = instant FAIL/P0.
4b. GAMEPLAY VIDEO QA (user law 2026-09-12): for any issue touching gameplay behavior,
   `node tools/video.mjs <run-name> seed=5` records a scripted basic-gameplay clip (frames ->
   qa/videos/<date>/<run-name>/) covering place/break, physics (walk/jump/fall/step), block
   orientation + textures, items/decor, mobs, inventory/craft GUIs, and stability-over-time
   navigation. EVERY frame is inspected (<=8 images per batch) with a one-line verdict per frame
   in the issue Evidence; new regressions vs previous video = FIX issue + re-record before close.
   AT SPRINT CLOSE, after ALL implementation merged: re-run the FULL video fresh and review it as a
   whole (final re-evaluation pass) BEFORE the audit/tag - bugs at any point in the sprint's total
   state must surface there, not in the auditor's lap.
   Frames are TEMPORARY (gitignored qa/videos/, auto-pruned, `node tools/video.mjs --clean`): keep only
   the per-frame verdict TEXT in the issue Evidence - never commit frame PNGs (storage hygiene).
5. `node tools/parity.mjs` updated & re-run; counts reflect reality (honesty check §1.4).
6. Texture(s) Blender-sourced (tools/tex script committed; no flat colors; no downloads).
7. Merged to `main` via `--no-ff` (conventional commit w/ issue number); branch deleted.
8. Issue status DONE w/ Evidence filled; `AGENTS.md` + `docs/PARITY.md` updated in merge.
No partial credit: carve broken remainder into a new FIX issue.
