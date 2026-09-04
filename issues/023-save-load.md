# Issue: 023 — localStorage save/load (schema v1)
- Type: FEAT | Status: DONE | Epic: E9 | Sprint: 02 | Depends: — | Spike: SPK-5 GO

## Spec
SPK-5 GO: RLE(id,len) chunks, base64. Save {v:1,seed,time,player{pos,yaw,pitch,sel,inv?},editedChunks{"cx,cz":rle}} key cf-save-1. Unedited chunks regen from seed (never saved). Auto-save 10s + beforeunload; load via ?load=1; ?new=1 wipes. Quota-exceeded -> evict far edited chunks + warn (F3 line). saveNow()/loadNow() on CF for tests.

## Acceptance criteria
- [x] AC1 harness: edit, save, fresh makeWorld, load -> edit present
- [x] AC2 harness: player pos/yaw/time round-trip
- [x] AC3 harness: corrupt JSON -> fresh-world fallback, no throw
- [x] AC4 harness: save size for 40 edited chunks < 150KB (RLE+base64)
- [x] AC5 shot: distinct placed tower, save; reload shot shows tower

## Test plan
Harness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.
## Evidence (close)
- 56 asserts GREEN: save.rle-unit, save.size(12176B for full-edit 49-chunk world), save.load, save.edits(5) tower survives wrong-seed reload, save.seed, save.player, corrupt-fallback (bad=false on garbage JSON, world usable).
- shot qa/2026-09-04/tower-save.png: cobble tower visible AFTER saveNow()+loadNow() round-trip (vision PASS).
- Autosave 10s + beforeunload; ?new=1 wipe; auto-load on boot; far-chunk eviction on quota.
- Debug story: save KEY literal was corrupted to '***' during authoring (transit masking) - caught via rawIn/raw diff instrumentation. Lesson: assert string constants' bytes when behavior contradicts.
