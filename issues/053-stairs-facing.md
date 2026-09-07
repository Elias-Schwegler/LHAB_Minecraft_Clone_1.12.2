# Issue: 053 — stairs facing
- Type: FEAT | Status: READY | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

Depends: #052 (multi-box model). 1.12: stairs = 2 boxes (full half + step half), facing = direction of ASCENDING side (6 horiz metas: 0E1W2S3N4UP-5DN-flipped variants: keep horiz 4 + upside-down flag like slabs, craft 6 wood/stone in stair pattern (3+2+1... exact: row3 + row2-centered + row1? -> 4 wood -> 6 stairs), placement rotates by player yaw.
Scope: oak planks + cobblestone + stone stairs first (3 variants).
ACs:
- [ ] collision: walk-up-one-step WITHOUT jump assert (physics uses box list)
- [ ] facing-from-yaw assert x4
- [ ] parity +3 variants
- [ ] stair-run shot vision PASS w/ both boxes textured


## Acceptance criteria
