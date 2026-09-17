# Issue: 065 — repeater with delay queue
- Type: FEAT | Status: DONE | Epic: Redstone | Sprint: 05 | Depends: #064

1.12: repeater reads ONLY its aligned input cell (orientation from place-yaw, 4 faces), re-boosts to 15,
delay 1-4 redstone ticks (default 2 game ticks per step - v1: fixed 1 step, 2gt delay). Delay = due-list
pattern (fReady precedent): [{dueTick, cellKey}] scanned in world.tick; output appears 2gt after input
change. Locked/extend modes OUT (needs two repeaters facing). Registry repeater (id 93) procedural,
yaw meta in flat bits (stairs precedent - flat bit packing exists).
ACs:
- [x] world.repeater-boost assert (input side caps at 13, output side back at 14/12)
- [x] world.repeater-delay assert (input@t -> output NOT at t, IS at t+2; OFF is instant)
- [x] interact.repeater-facing (yaw->meta, diode blocks backward feed, floor rule refuses)
- [x] video redstone phase extended - frames show dust|repeater|dust|torch, live title probe d5=10 d7=14

## Evidence (2026-09-17)
- Engine upgrade in src/redstone.js (SPK-8 passes now Jacobi-fixed-point, cap 6, PURE during passes):
  repeater conducts only when rs.on (delay elapsed); injection spreads ONLY into the output cell (DIODE -
  caught a backward-leak bug: spreading from the r cell in all dirs powered its own input side);
  post-stability sweep schedules rsDue = {w,k,due:ticks+2} (fReady pattern) and clears on/pend when the
  input dies (1.12: off is instant). rsTick fires dues before draining (fires in the live game loop too).
- TORCH INVERTER shipped here (deferred from #064): a torch's seed pass checks blockPowered(attach) =
  powered dust touching the attach cell OR a live repeater facing it; attach = torch+SUPV[code] (sign fix:
  SUPV maps torch->support, world.js pop precedent). Side-attach (code 6) proven by interact.redstone-invert
  (output dust 0 while input lit, 14 after cut). Ceiling attach not supported (v1 documented).
- Registry repeater (procedural painted tile (48,176) functional:false, honest - parity stays 59);
  flat bits 0-3 = OUTPUT dir = dirFromYaw ^ 1 (wiki: faces away from placer; XOR after 0E1W2S3N pairs -
  an early +1 stored the wrong axis, caught by the LIVE video probe). Interact: floor rule + pop (world.js
  gate extended repeater alongside wire/crop). Recipe = wiki-exact: dust,torch,dust / slab,_,slab -> 1
  (items.repeater-craft via craftOnce 3x3).
- +4 asserts (12 in suite now; 254/238 full/quick GREEN, 48 blocks). video-redstone extended: frames
  f02/f04 show the full torch->dust->REPEATER->dust line on the lit platform; live title probe at t100:
  d1=14 d5=10 (decayed) d7=14 (BOOSTED) d8=13, due=0 on=1 - engine verified end-to-end through the
  REAL game loop, not just suite-driving rsTick calls.
- Delay values: fixed 2 game ticks (v1 setting-1; RMB cycle 2/4/6/8 = deferred polish, noted for #066-era).
