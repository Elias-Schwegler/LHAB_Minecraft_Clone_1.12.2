# Issue: 067 — piston-lite (push one block, animated)
- Type: FEAT | Status: READY | Epic: Redstone | Sprint: 05 | Depends: #064

Scope-lite per SPK-8 risk note: piston = block (id 29) with facing meta + 1s extend/retract ANIMATION
(render-side model offset via flat bits + anim table, like door open-state? simpler: two-stage render
offset 0->0.5->1.0 blocks over 4 ticks, mesher draws extended head box). Pushes exactly ONE adjacent
block (any solid, non-obsidian/bedrock), pulls nothing (not sticky). Refuses if push target blocked.
Full MC piston semantics (multi-block lines, immunity lists, BUDs) explicitly OUT.
ACs:
- [ ] world.piston-push (extends with signal, pushes one block, retracts w/o, refuses bedrock)
- [ ] piston.anim assert (head offset state machine, no stuck state on fast signal toggle)
- [ ] items.piston-craft (3x3: wood+cobble+iron+gear-less 1.12 table - use iron_ingot)
- [ ] video phase: piston door demo; shot piston-extend.png vision PASS
