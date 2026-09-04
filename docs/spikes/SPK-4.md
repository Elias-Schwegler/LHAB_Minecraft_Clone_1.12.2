# SPK-4 — Mob pathfinding at scale
Verdict: **GO-WITH-ALT(binary heap A*, node cap, tick-sliced agents)**
Date: 2026-09-04. Throwaway: spike/spk4-bench.mjs.

## Experiment
128x48x128 noise world, 50 random A* agents, naive open-list (sort), 3D 8-dir grid.
Result: 2851ms total → **57ms/agent** (avg 4927 nodes expanded), 21/50 reached
(goal selection ignored height validity — benchmark artifact, not algorithm limit).

## Why ALT required
57ms/agent >> 2ms/agent budget for a mob cap of ~40 within 50ms tick. Naive sort-open
A* is the bottleneck; JS 3D A* with binary heap is ~5–10x faster, plus:
- node cap ~1500 per path (MC-like give-up + re-path every N ticks)
- tick-slicing: re-path at most K agents per tick (MC itself pathfinds sparsely)
- coarsened 2D nav grid (walkable column scan) instead of full 3D node per voxel

## Consequences
1. Implement heap A* on 2D-projected columns with jump-up handling (1-block step-up),
   node cap, and re-path cooldown (MC 1.12 mobs steer ~every few ticks).
2. Expected after ALT: ~5–8ms/agent worst case, amortized ≤2ms avg — fits Tier-1 mob
   counts. Re-measure in mob issue's harness assert.
3. NO-GO would have been voxel-per-node with sort — rejected, as done here.
