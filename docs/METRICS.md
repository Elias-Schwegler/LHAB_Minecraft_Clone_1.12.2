# METRICS — velocity & quality

| Sprint | planned pts | done pts | velocity | escaped defects | notes |
|--------|------------|----------|----------|-----------------|-------|
| 00 (bootstrap) | 6 spikes + tooling | all done in 1 iteration | high | 0 | Retro: (1) branch BEFORE coding (tooling landed in scaffold commit); (2) matrix/GLSL conventions must be documented at spike exit — adopted as spike doc template line |
| 01 (walking) | #002-#009 (8 issues) | 8/8 in 2 iterations | high | 4 P1 + 5 P2 from audit #1 (all fixed in-iteration) | Renderer debug ate ~60% of effort (4 subtle GL bugs). Retro: proof-bound flags; screenshot-first debugging; audit before tag |

Definition: 1 point = 1 issue completed within one iteration-day (issue points = size
estimate). Escaped defect = P0/P1 opened by auditor against already-DONE work.
| 02 (light+matter) | #019-#028 + #029-#032 | 9 FEAT/FIX done, 2 iterations | high | 1 P1 escaped (false checkbox, audit-caught) | fluids debug cost ~50% of sprint; probe pattern adopted |

| 03 (night survival) | #032-#043 + #033/#034/#044-#048 | 14 issues done in 13 iterations (044/045/048 -> backlog, honest pull) | high | 1 P1 escaped from sprint02 found MID-sprint (atlas icon-stride #043 - parity tiles were pixel-colliding; audit #1-#4 missed it: nobody checked manifest-vs-PNG placement) + user-reported bounce/missing-faces pair (#046/#047) | +78 asserts (125->203), parity 17->20/399; retro improvements: (1) node-side repro harness pattern, (2) manifest collision check adopted in #043 close, (3) vision batch <=30 hard rule (agent-loop crash protection), (4) GitHub issue mirror w/ idempotent script |

| 04 (underworld+verify) | #049-#060 + #105/#106 (14 issues) | 14/14 in 14 iterations (045 shipped inside 059; 044/048 honest pull) | high | 0 auditor-escaped P0/P1; 2 user-reported (105 torch-triple-bug + 106 NaN-lightCell black faces - both #049-era renders, same-day fixes) | +38 asserts (203->241), parity 20->58/399, 25->44 blocks; first DIMENSION (portal/warp/persist-v2 + real nether gen); the two VERIFY tickets (#058/#059) each found a false Tier-1 'done' claim (no eviction ever; tools uncraftable in-game) -> VERIFY-then-claim rule adopted; SPK-8 redstone GO. |
