# Issue: 034 — SPK-7: nether-style dimension at scale (separate world instance vs region swap)
- Type: SPK | Status: DONE (verdict GO - see docs/spikes/SPK-7.md) | Epic: Tier-2 nether (pre-gate) | Sprint: 03 | Depends: #002

## Question (MASTERPROMPT §5: unproven subsystem => spike before any nether FEAT)
Can this engine host a second dimension (nether: 8:1 scale, lava seas, no skylight, beds explode) without
breaking the one-world assumptions baked through registry/world/render/mobs/persist? Measure, don't guess:
(a) closure purity: is makeWorld() safely instantiable twice (no shared mutable state)?
(b) cost: gen+light+tick throughput of a 2nd world; RAM per chunk; can both live simultaneously?
(c) renderer swap: meshMap keyed 'cx,cz' collides between dims - renderReset() re-mesh cost measured?
(d) surface area of "CF.world singleton" references in modules (grep count per file)?
Verdict options: GO (separate instances + explicit active-world pointer) / GO-WITH-ALT (region-swap: one
world, distant far-off area + biome-mode palette) / NO-GO (re-plan Tier-2 nether entirely).

## Time-box
1 iteration-day. Throwaway code in spike/; the ONLY shipped changes may be: CF.makeWorld export (already
done, 1 line, unused by game) + any measured constants the future design needs. No behavior changes.

## Acceptance criteria
- [x] AC1: docs/spikes/SPK-7.md with GO/GO-WITH-ALT/NO-GO + the four measurements above, each backed by
      a runnable spike script + printed numbers (paste outputs into the doc)
- [x] AC2: singleton-reference surface mapped (grep table per module) with the refactor estimate for the
      chosen approach
- [x] AC3: main stays green (203/191) with the export line in; no game code path uses the 2nd world

## Evidence (close)
AC1: docs/spikes/SPK-7.md - GO with all four measurements (a purity true/true, b 50ms/49ch+5ms/100t idle, c 1300ms mesh-all,
d) singleton surface table 195 refs/15 files) from spike/nether-dim.cjs + titleprobe2 output, same session.
AC2: per-file CF.world counts recorded in SPK-7 (d); swap design = reassign CF.world + renderReset (zero refactor).
AC3: gate re-run on this build (203 full / 191 quick GREEN - below), game never calls makeWorld.
