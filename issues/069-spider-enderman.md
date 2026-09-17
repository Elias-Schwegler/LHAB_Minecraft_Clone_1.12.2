# Issue: 069 — spider + enderman (roster III)
- Type: FEAT | Status: READY | Epic: Mobs | Sprint: 05 | Depends: #044 (art pass lands first)

Mobs ROSTER v3: spider (1.12: 2-hit 2dmg normal? spider difficulty-scaled, climbs walls = step-any-height
while chasing, hostile night+spawner, neutral daylight? no - hostile; drops string+spider_eye) + enderman
(tall black box w/ purple eye band, teleports on player-hit (MC: ender pearl projectile OUT - teleport-when-
attacked only), hates being looked at = look-at-target aggro (crosshair ray hits it), drops ender_pearl
(item, unstackable flavor only)). Both per SPEC mob table; palette boxes + species palettes (16 slots:
need 2 new palettes or reuse - atlas palette grows to 24? DoR: palette slots audit).
ACs:
- [ ] mobs.spider-wallclimb / spawn-night asserts; mobs.enderman-aggro-look + teleport asserts
- [ ] species palettes render (mob-spider.png / mob-enderman.png shots vision PASS)
- [ ] drops (string already used, spider_eye + ender_pearl items blank-ok -> #048 icons)
- [ ] video: night scene w/ all 4 hostiles present
