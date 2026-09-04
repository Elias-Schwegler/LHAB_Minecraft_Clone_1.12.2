# Issue: 019 — Leaves behavior (decay, sapling/apple drops, shears)
- Type: FIX | Status: READY | Epic: E2 | Sprint: 02 | Depends: #013 (audit F4 carve-out)
## Spec (REFERENCE §Wood family): leaves decay within radius 6 of a log after log removal
(oak/spruce 6? verify), oak leaves 5% sapling + 5%? apple drop **[verify 1.12 exact: 0.275 sapling?
apple: 0.5%/0.5%/2.5% by luck? research]**, shears instant-break w/ drop.
## AC: harness decay assert after log removal; drop stats assert; shot of decayed stump.
