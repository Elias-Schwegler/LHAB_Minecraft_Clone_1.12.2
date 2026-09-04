# SPK-3 — Game-loop + world/sim simulation budget
Verdict: **GO**
Date: 2026-09-04. Throwaway: spike/spk3-bench.mjs (branch spike/bootstrap-01).

## Experiment (node, value-noise world 64 chunks 16x128x16)
- Worldgen 64 chunks: 15ms total = **0.23ms/chunk**
- 100k set+get ops on Uint8Array: 7ms
- Water BFS flood (304k nodes, array+Set): 61ms (naive Array.shift(); index-pointer
  queue will be faster — still < 1s for a 96x64x96 region)
- Redstone graph BFS (20k nodes, 100 full activations): 482ms ≈ 4.8ms/activation —
  worst case far exceeds needs; real redstone is local (frontier ~10–500 nodes).

## Consequences
1. 20 UPS tick budget (50ms/tick): worldgen, setBlock/getBlock, and localized fluid/
   redstone BFS all fit comfortably.
2. Fluid simulation: index-pointer queue + dirty-chunk marking, flow limited to
   changed-region (16x16x16 tick regions).
3. Redstone: keep global adjacency cache; cap BFS per tick (work-stealing over ticks
   for huge updates) to guarantee 50ms.
4. Chunk = Uint8Array(16*256*16) with palette indirection when >256 block types arrive
   (flattening-lite); single byte fits starter registry.
