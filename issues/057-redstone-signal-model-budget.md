# Issue: 057 — redstone signal model + budget
- Type: SPK | Status: DONE (GO) | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

Tier-2 gate question (MASTERPROMPT §11(3)/§5): can the 20Hz tick budget + dirty-graph approach host redstone dust power propagation + torch/repeater state without frame collapse at scale (village-sized builds)? Options: per-cell power (1.12-like BFS w/ 70 max + wire update graph) vs signal-tick queue. Timebox 2 iterations; deliverable docs/spikes/SPK-8-redstone.md GO/ALT/NOGO with measured ms on 200-cell torch->dust->repeater chains at 3 scales + memory + save/load implications. NO game behavior changes.
ACs:
- [x] spike doc w/ measurements + verdict + chosen propagation model
- [x] main stays green; throwaway code kept under spike/ (SPK-4 precedent), src/ untouched

## Evidence (2026-09-12)
- `docs/spikes/SPK-8-redstone.md` - verdict **GO with MODEL A** (full re-flood per change, relight pattern).
  Measured (spike/redstone-sim.mjs, Node 24): chain-30 0.11ms, chain-200 0.07ms, village 2.4k-cell dense
  2.61ms full recompute/event; dirty-graph B worst-case == A (2.45ms) and only wins small (0.016ms chain-200);
  idle 0ms (event-driven); heap +4.5MB at village. Persistence: NONE needed (power is derived state - same
  trick as light). Escape hatch: per-region re-flood (flood is O(powered neighborhood)).
- Sprint-05 FEAT chain proposed in the doc (dust/torch -> repeater+delay-queue -> lamp -> piston-lite).
- 241/225 gate untouched (no src edits; docs + spike only).


## Acceptance criteria
