# Issue: 019 � Leaves behavior (decay, sapling/apple drops, shears)
- Type: FIX | Status: DONE | Epic: E2 | Sprint: 02 | Depends: #013 (audit F4 carve-out)
## Spec (REFERENCE �Wood family): leaves decay within radius 6 of a log after log removal
(oak/spruce 6? verify), oak leaves 5% sapling + 5%? apple drop RESOLVED (audit #2 -> #029): Java 1.12.2 oak leaves drop = sapling 5% (0.05) + apple 0.5% (0.005); sticks are Bedrock-edition only (Java has none) — implementation matches Java., shears instant-break w/ drop.
## AC: harness decay assert after log removal; drop stats assert; shot of decayed stump.
## Evidence (close)
- Decay radius 6: world.leaves-decay(0) after chopping, world.leaves-persist(63) control.
- Drops: interact.leaves-drop(32/600) ~= 5% sapling; apple 0.5% implemented (1.12 loot chances resolved in issue body).
- Shot qa/2026-09-04/leaf-decay.png: forest w/ intact trees + felled-tree gap (vision OK).
- leaves functional:true + proof-bound; parity 15/399.
