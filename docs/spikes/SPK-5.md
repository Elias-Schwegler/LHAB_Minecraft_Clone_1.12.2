# SPK-5 — Save/load via localStorage
Verdict: **GO**
Date: 2026-09-04. Throwaway: spike/spk5-bench.mjs (+ localStorage smoke via headless
page earlier in phase 0 env checks).

## Experiment
Noise terrain chunk 16x128x16: raw 32768 bytes → RLE (id,len pairs) = 2048 bytes,
**ratio 0.063**. base64 (storage) adds 4/3 → ~2731 bytes/chunk.

## Capacity math (5MB localStorage)
- ~1900 chunks per quota at RLE+base64 (plains; caves increase entropy — worst case
  measured-ish ~0.15 ratio → ~800 chunks).
- Chunk radius 10 view ⇒ ~441 chunks live; save-window radius 15 (~2891) exceeds
  budget → eviction policy needed: save only chunks within radius 12 + player-inventoried
  modified chunks, LRU eviction, versioned schema key, `quota-exceeded` fallback that
  prunes oldest chunks and records a warning in save meta (F3-visible).

## Consequences
1. Serialize: RLE byte pairs, store as base64; header {seed, spawn, time, difficulty,
   player, entities-lite, schema v}.
2. Save on interval (every ~10s) + on unload; load = parse + chunk decode; corrupt key →
   fresh world with warning (never crash the boot).
3. Cave-dense worlds need the eviction policy above; no IndexedDB fallback needed
   (§1.1 offline ok, but localStorage chosen for simplicity — revisit if audits demand).
