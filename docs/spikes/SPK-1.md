# SPK-1 — Chunked voxel renderer + greedy meshing (hand-written WebGL2)
Verdict: **GO**
Date: 2026-09-04. Throwaway: spike/spk1.html + spike/spk1.png (branch spike/bootstrap-01).

## Experiment
64x48x64 voxel heightmap world, 16 chunks (16x48x16), greedy per-slice meshing,
indexed-free WebGL2 draw, sun-shade + fog shader, orbit camera, fixed-timestep sim.

## Evidence
- Headless Edge (`--dump-dom`, virtual-time): SPK1 stats JSON in title:
  `{"meshMs":50.5,"tris":6816,"naiveTris":14548,"reduction":0.53,"chunks":16,"glErr":0}`
- Screenshot inspected (vision): terrain silhouette, correct per-face shading (green
  tops, gray/dirt sides), fog falloff. Initially flat renders exposed two real bugs
  (matrix convention mix; `#version` must end line) — both fixed in harness design.
- JS mesh budget: 3.2ms/chunk cold (noise-backed vox() dominates). Headless SwiftShader
  cannot represent real-GPU FPS; FPS at real GPU to be eyeballed at sprint review.

## Consequences (bake into design)
1. Chunk world data MUST be typed-array-backed (`Uint8Array`) — noise-on-query was the
   meshing bottleneck; array lookups are ~O(1).
2. Greedy meshing gives 53–83% triangle reduction (dense terrain lower) — keep it.
3. Row-major math + transpose-on-upload convention is settled (document in render.js).
4. `#version 300 es` must be followed by a newline; add shader compile check to harness.
5. Meshing must run incremental (1–2 chunks per tick), not world-at-once.
