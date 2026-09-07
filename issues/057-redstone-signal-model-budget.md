# Issue: 057 — redstone signal model + budget
- Type: SPK | Status: READY | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

Tier-2 gate question (MASTERPROMPT §11(3)/§5): can the 20Hz tick budget + dirty-graph approach host redstone dust power propagation + torch/repeater state without frame collapse at scale (village-sized builds)? Options: per-cell power (1.12-like BFS w/ 70 max + wire update graph) vs signal-tick queue. Timebox 2 iterations; deliverable docs/spikes/SPK-8-redstone.md GO/ALT/NOGO with measured ms on 200-cell torch->dust->repeater chains at 3 scales + memory + save/load implications. NO game behavior changes.
ACs:
- [ ] spike doc w/ measurements + verdict + chosen propagation model
- [ ] main stays green; throwaway code deleted after (spike/ branches)


## Acceptance criteria
