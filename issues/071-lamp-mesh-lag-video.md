# Issue: 071 — lamp mesh lags its lit-swap by ~1s in headless video captures
- Type: FIX (P3 watch) | Status: READY | Epic: Quality | Sprint: 05 | Depends: #066

Video frame plate/f04 (qa/videos/2026-09-18/plate, t~194) shows lamp2 amber although the engine probe
recorded id=UNLIT + light 0 at t192 (swap-back happened at ~t183 when the player teleported off the plate).
Engine state (block id, light nibble, rs.power) is ALWAYS correct in every probe/assert - only the GL mesh
appeared to lag its re-upload during headless virtual-time capture. f05 (t214) is correctly dark.
Hypotheses: rAF cadence under --virtual-time-budget starving renderTick's 2-rebuild budget behind the
far-teleport regen storm, or screenshot taken inside the sub-frame window before rebuild. Not reproduced
in any live-play evidence or any other shot so far.
ACs:
- [ ] reproduces reliably in a capture (then: bump renderTick dirty budget or force rebuild on swap), OR
- [ ] deemed capture artifact after one focused repro attempt + documented (close honest)

## Evidence
- qa/videos/2026-09-18/plate f02 (LIT while stepping) / f04 (amber ~1 tick after engine-OFF) / f05 (dark).
