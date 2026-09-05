# Issue: 044 — Mob polish bundle (art, facing, poison, persistence, rare drops)
- Type: FIX (polish bundle)
- Status: DRAFT (backlog; split further at DoR)
- Epic: docs/backlog/epics.md (Mobs)
- Sprint: — (grab after core mobs #035-#039 land)
- Depends on: #035 (DONE)

## Scope (carve-outs documented in #035, each gets its own sub-DoR/PR at pickup)
- [ ] Mob texture sheets generated via Blender pipeline into the atlas (zombie skin/cloth, later mobs);
      mobs.js box UVs sample per-face regions instead of solid palette texels. Palette path stays as fallback.
- [ ] Facing/rotation: box model yaws toward movement/target (render + hitbox sweep stay AABB; visual yaw only).
- [ ] rotten_flesh poison: 80% chance poison II 4s when eaten (needs tiny status-effect hook in survival.js).
- [ ] Rare zombie drops: iron_ingot 0-1 @2.5%, gold_ingot @2.5%, carrot/potato @2.5% (1.12 looting table = [TBC]).
- [ ] Mob persistence: serialize live mobs into the save (RLE + type/pos/hp); respawn-on-load parity.
- [ ] Dropped-item entities (mob loot as pickupable world items instead of direct-inventory; also fixes
      burn-kill loot loss). Touches render (billboard quads) + pickup AABB; bigger carve, may become own FEAT.

## Notes
#035 documented all of these as explicit Tier-1 deviations (see its Evidence section). No parity claims hinge
on them; they close the polish gap for the "fight a mob at night" milestone experience.
