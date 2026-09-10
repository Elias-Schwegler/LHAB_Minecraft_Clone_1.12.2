# Issue: 058 — infinite streaming verify
- Type: FIX | Status: DONE | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

PARITY mechanic row has '[ ] chunked infinite worldgen... streaming-unlimited pending' since sprint 01 (verify issue). Walk a FAR diagonal path (e.g. 400 blocks, teleport-free, real ticks only) asserting: chunks stream in AND behind-you chunks evict (memory bound: chunks map size capped), gen queue drains (no permanent queue growth), save/load at far coords, F3 numbers sane, render stays above budget (no >200ms tick). Output: streaming.png far-field + asserts in world suite. Flip PARITY row with evidence link.
ACs:
- [x] harness world.stream-* asserts (bounded chunks, queue drains, far-coord save/load)
- [x] far-field shot vision PASS
- [x] PARITY row [x] w/ evidence


## Evidence (close 2026-09-10)
- THE BUG WAS REAL: nothing was ever evicted - chunks Map, meshMap GL buffers, lightDone and the per-frame draw list grew unboundedly with distance walked.
- world.js evictAround(R_KEEP=7) runs inside ensureAround(radius>=2): clean chunks beyond r=7 from the player are dropped (terrain re-derives bit-exact from seed via
  colHeight/biome noise; cave/ore placement is pure fn); EDITED chunks intentionally stay resident until persistence lands them (survival-memory polish -> logged);
  their pending dirty keys + stale lightDone entries + far genQueue entries drop with them. render.js frees the VAO/VBOs and guards rebuilds of gone chunks.
- world.stream-bounded: 48 hops to (1920,1920) + 600 real playerTick steps (held-jump, no teleports): clean resident <=225 at all times, queues drain to 0.
  world.stream-save: cobblestone tower at (2000,2000) -> full saveNow/loadNow roundtrip -> 5/5 blocks + seed intact (also proved persist wrappers must be
  installed BEFORE far edits or the edit-tracking misses them - warmup saveNow in test).
- far-field.png (budget 24000/timeout 600 envs added to shot.mjs - software-GL real-time needed it) vision PASS: endless lit oak forest at (219,222), no edge.
- Not covered (honest): simMs <200ms budget can not be asserted headless (game loop stopped by suite); far-field title records sim+drawn counts; F3 shows chunks/mapped.
- Gate 234 full / 218 quick GREEN.

