# Issue: 058 — infinite streaming verify
- Type: FIX | Status: READY | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

PARITY mechanic row has '[ ] chunked infinite worldgen... streaming-unlimited pending' since sprint 01 (verify issue). Walk a FAR diagonal path (e.g. 400 blocks, teleport-free, real ticks only) asserting: chunks stream in AND behind-you chunks evict (memory bound: chunks map size capped), gen queue drains (no permanent queue growth), save/load at far coords, F3 numbers sane, render stays above budget (no >200ms tick). Output: streaming.png far-field + asserts in world suite. Flip PARITY row with evidence link.
ACs:
- [ ] harness world.stream-* asserts (bounded chunks, queue drains, far-coord save/load)
- [ ] far-field shot vision PASS
- [ ] PARITY row [x] w/ evidence


## Acceptance criteria
