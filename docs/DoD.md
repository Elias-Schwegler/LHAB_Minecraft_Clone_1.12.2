# Definition of Done (DoD)
An issue is DONE only if ALL true (verified against the built `game/index.html` of that commit):
1. Feature works in BUILT artifact (not just src): `node tools/build.mjs` included it.
2. `node tools/test.mjs` green (harness asserts; zero console errors in TESTRESULT JSON).
3. `node tools/shot.mjs <scenario>` wrote PNG(s) under `qa/YYYY-MM-DD/`.
4. Vision check: agent inspected the PNGs against each visual criterion; verdict text
   written into the issue's Evidence section (per criterion: PASS/FAIL + observation).
   Missing texture pattern (magenta) = instant FAIL/P0.
5. `node tools/parity.mjs` updated & re-run; counts reflect reality (honesty check §1.4).
6. Texture(s) Blender-sourced (tools/tex script committed; no flat colors; no downloads).
7. Merged to `main` via `--no-ff` (conventional commit w/ issue number); branch deleted.
8. Issue status DONE w/ Evidence filled; `AGENTS.md` + `docs/PARITY.md` updated in merge.
No partial credit: carve broken remainder into a new FIX issue.
