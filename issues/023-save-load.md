# Issue: 023 — localStorage save/load (schema v1)
- Type: FEAT | Status: READY | Epic: E9 | Sprint: 02 | Depends: — | Spike: SPK-5 GO

## Spec
SPK-5 GO: RLE(id,len) chunks, base64. Save {v:1,seed,time,player{pos,yaw,pitch,sel,inv?},editedChunks{"cx,cz":rle}} key cf-save-1. Unedited chunks regen from seed (never saved). Auto-save 10s + beforeunload; load via ?load=1; ?new=1 wipes. Quota-exceeded -> evict far edited chunks + warn (F3 line). saveNow()/loadNow() on CF for tests.

## Acceptance criteria
- [ ] AC1 harness: edit, save, fresh makeWorld, load -> edit present
- [ ] AC2 harness: player pos/yaw/time round-trip
- [ ] AC3 harness: corrupt JSON -> fresh-world fallback, no throw
- [ ] AC4 harness: save size for 40 edited chunks < 150KB (RLE+base64)
- [ ] AC5 shot: distinct placed tower, save; reload shot shows tower

## Test plan
Harness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.
