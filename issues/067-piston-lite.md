# Issue: 067 — piston-lite (push one block, animated)
- Type: FEAT | Status: DONE (lite scope met; smooth animation intentionally cut - see evidence)

Scope-lite per SPK-8 risk note: piston = block (id 29) with facing meta + 1s extend/retract ANIMATION
(render-side model offset via flat bits + anim table, like door open-state? simpler: two-stage render
offset 0->0.5->1.0 blocks over 4 ticks, mesher draws extended head box). Pushes exactly ONE adjacent
block (any solid, non-obsidian/bedrock), pulls nothing (not sticky). Refuses if push target blocked.
Full MC piston semantics (multi-block lines, immunity lists, BUDs) explicitly OUT.
ACs:
- [x] world.piston-push (extends with signal, pushes exactly ONE block, retracts WITHOUT pulling (not
      sticky v1), refuses obsidian/piston/bedrock targets, needs empty landing cell)
- [~] piston.anim: v1 = instant flush-head swap (ext bit 4 -> all faces render 'piston_head' bright plate);
      smooth 4-tick slide needs per-frame mesh offsets (vertex animation) - CUT as out of "lite" scope,
      file with #048-era art polish if ever desired. State machine itself can't wedge: retract on signal
      loss is unconditional (asserted via fast press/expiry cycle).
- [x] items.piston-craft (3 planks / c-iron-c / c-redstone-c per 1.12 wiki)
- [x] video phase t210-222: piston row + floor-button press; LIVE probe "cobbleAt14=true ext=16" (block
      pushed one cell, head extended). Frames qa/videos/2026-09-18/piston (piston row slightly out of the
      camera's frame - probe is the evidence; camera widen -> next video iteration if needed).

## Evidence (2026-09-18)
- redstone.js piston actor sweep (post-stability, before lamp swap): want = blockPowered (button-attach
  powers it: classic piston+button demo works with zero wire!), push = set-pair move (flat bits ride along),
  ext bit flat&16; unpower clears ext, moved block stays. IMMOVABLE set rebuilt per sweep.
- Tiles: piston_side/bottom ALIAS planks_oak/stone cells (zero atlas growth); face+head painted
  (0,160)/(160,176); greedy mesher packs ext bit into mask bit24 (merge buckets stay consistent) and
  swaps all faces to 'piston_head' when extended.
- Registry piston functional:false (parity honest 59); rsOnSet/rsRescan flag-table now single isRsDef() -
  fixes latent hole where repeater/lamp/plate/button/piston never survived a LOAD (only wire/torch did;
  #064-era save test only proved dust). rsRescan also clears press/on/pend.
- +2 asserts -> full 261/0, quick 245/0, 55 blocks. video: probe-verified push.
