# Issue: 065 — repeater with delay queue
- Type: FEAT | Status: READY | Epic: Redstone | Sprint: 05 | Depends: #064

1.12: repeater reads ONLY its aligned input cell (orientation from place-yaw, 4 faces), re-boosts to 15,
delay 1-4 redstone ticks (default 2 game ticks per step - v1: fixed 1 step, 2gt delay). Delay = due-list
pattern (fReady precedent): [{dueTick, cellKey}] scanned in world.tick; output appears 2gt after input
change. Locked/extend modes OUT (needs two repeaters facing). Registry repeater (id 93) procedural,
yaw meta in flat bits (stairs precedent - flat bit packing exists).
ACs:
- [ ] world.repeater-boost assert (decays stop at repeater, output 15)
- [ ] world.repeater-delay assert (input flips at t, output at t+2; mid-tick frames correct)
- [ ] interact.repeater-facing (yaw->meta, re-place rotates)
- [ ] video redstone phase extended (torch->dust->repeater->dust chain lights with visible lag)
