# Issue: 056 — nether dimension gen
- Type: FEAT | Status: READY | Epic: Sprint04 plan | Sprint: 04 | Depends: per body

Depends: #055 (dims plumbing) + makeWorld genOpts hook (SPK-7 flagged: generate() monolith -> {dimension:'nether'} param).
1.12 nether: 128 high (already our CH), netherrack bulk (id family), bedrock ceiling y127 + floor y0 unbreakable-exists, LAVA SEAS y~31 (level 0 pools + falling curtains later), quartz_ore veins, glowstone clusters on ceilings, no sky light (skylight = 0 without world ceiling gaps; fire never spreads? skip), NETHERRACK harvest = any pickaxe? NO: hands ok drops itself; mob rules: ghast/zombie-pigmen = NEXT (not this issue; note in evidence), bed explodes (interact guard + 1.12 damage = full-blast at player pos: use #037 explode(power? bed blast = 5 with fire? keep simple crater), portals link: same coords /8 both ways + nearest-existing-portal search radius 128 (simplified: generate-on-arrival within 1-block pad), fog RED (render dim-fog override).
ACs:
- [ ] world.nether-gen asserts: netherrack majority, bedrock ceiling, lava sea levels, no sky light under ceiling
- [ ] portal pairing: warp over->nether generates reachable portal back; round trip restores exact overworld spot (scaled 8:1)
- [ ] bed-in-nether explodes assert (guard + crater)
- [ ] nether-view shot (red fog, glowstone ceiling) vision PASS
- [ ] parity: netherrack/quartz_ore/glowstone(already)/portal? portal NOT functional (can never break) - count netherrack+quartz = +2


## Acceptance criteria
