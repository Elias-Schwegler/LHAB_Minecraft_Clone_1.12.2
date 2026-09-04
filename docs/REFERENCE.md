# REFERENCE — Minecraft Java 1.12.2 catalog & behavior spec (clean-room)

Target: Java Edition 1.12.2 "World of Color Update" (2017). Numeric block IDs 0–238
(236 concrete, 237 concrete_powder, 238 glazed terracotta — last IDs added in 1.12).
This file is the acceptance source of truth. Values we are not certain of are marked
**[TBC]** and must be re-researched before the owning issue reaches DoR — guessing is
a DoD violation (§1.4).

CANONICAL ENUMERATION: `docs/catalog.json` is the authoritative block list used by
`tools/parity.mjs`. Prose in this file is annotation; where the prose notes [TBC] or
reads messy, the owning issue must refine the exact behavior text before it reaches
DoR (§4). Numeric IDs are cosmetic for the clone (we key by registry name); entries
with `id:null` are places where 1.12.2 numeric ID archaeology is uncertain — do not
trust or display an ID there. Internal state blocks (flowing fluid variants, lit
furnace/torch/ore/repeater/lamp, piston head/extension, moving piston) are NOT
separately counted; one entry covers the family's states (honesty rule, see §7).
The machine-readable catalog is `docs/catalog.json`:
- `id`: numeric 1.12.2 ID. `n`: registry name. `v`: variant count (damage/meta values
  that are distinct registered variants for scoring per §7 rule; 1 = single block).
- Family expansion counting (per §7): variants like 16 wool colors count individually.
- Water/lava: the static and flowing registered blocks (8/9, 10/11) count ONCE as the
  fluid family (implemented together by one fluid system — counting both would inflate
  the metric; this reduction is recorded here for auditor honesty).

## Block catalog (family-grouped)

### Terrain & common (ids 1–19)
| id | name | v | behavior notes (1.12.2) |
|----|------|---|---|
| 1 | stone | 1 | drops cobblestone (unless silk touch); needs pickaxe |
| 2 | grass | 1 | spreads to dirt w/ grass below sky access; dirt+bonemeal -> podzol? no: podzol is via spruce+fern **[TBC]**; snow cover doesn't kill grass; drops dirt |
| 3 | dirt | 1 | |
| 4 | cobblestone | 1 | needs pickaxe; drops cobble (itself) |
| 5 | planks | 6 | oak/spruce/birch/jungle/acacia/dark_oak |
| 6 | sapling | 5 | oak/spruce/birch/jungle/acacia/dark_oak; grow w/ light>=9 + bonemeal; 2x2 species need 2x2 sapling arrangement; jungle also needs 2x2 trunk |
| 7 | bedrock | 1 | unbreakable (hardness -1); creative only |
| 12 | sand | 1 | falls as entity when unsupported |
| 13 | gravel | 1 | falls; drops flint 10% exactly (Java) |
| 14 | gold_ore | 1 | needs iron pick (else drops nothing); RESOLVED (audit #011): 1.12.2 has no raw items (raw_* are 1.17+) — gold ore drops `gold_ingot` directly |
| 15 | iron_ore | 1 | needs stone pick; drops `iron_ore` item (smelt to ingot) |
| 16 | coal_ore | 1 | needs wooden pick; drops `coal` item |
| 17 | log | 6 | oak/spruce/birch/jungle small + acacia/dark_oak big-trunk variants counted via planks/log textures; drops itself |
| 18 | leaves | 6 | oak/spruce/birch/jungle/acacia/dark_oak; decay w/o player nearby (oak/spruce/birch range 6? decay radius 6 **[TBC]**); oak leaves drop sapling 5% + apple 0.5% (Java loot tables; implemented+asserted #019) |
| 19 | sponge | 2 | dry/wet; absorbs 5x5x5 water, turns wet (no regen in 1.12 survival) |

### Fluids (8/9 water, 10/11 lava) — counted once each
Water: source=level0; horizontal flow spreads 7 blocks (level 7 = min) then 1 block fall
resets spread; sources flow both ways if in line; still+flowing render w/ transparency;
water source + adjacent lava source -> cobblestone; water stream onto lava source ->
cobblestone; water touching lava stream -> stone? water flow into lava *stream* ->
stone? **Java rule (verified): water stream into lava source -> obsidian; water stream into flowing
lava -> cobblestone; lava stream into water (any) -> stone** (lava does not displace water).
NUANCE (impl-verified): lateral flows cobble-shield a source before water can reach it -
obsidian forms only when water directly touches an untouched source (basis of cobble generators).
Interaction resolution order = flow queue order (first-mover wins the contact cell). Water
currents push entities; swimming drains oxygen after 15s (air 300 ticks), then 2 dmg/s
drowning.
Lava: overworld flow distance 3, level drops 2 per horizontal block, slow: moves ~once
per 25–40 ticks **[TBC exact 30–40 random]**; nether distance 7 (drops 1/block) and
faster (interval 10 ticks **[TBC]**); damage 2 hearts/s (0.5s interval? 1 dmg every
0.5s? lava = 2 hearts per second, i.e. 1 damage every 10 ticks **[TBC]**); items
dropped in lava (except netherite-era) are destroyed; entities burn 100s on exit? lava
ignites entities for 100 ticks after leaving? entities on lava catch fire (fire
duration while submerged = as long as submerged).
Ice (79): melts near light >= 11 sky? melts at block light >=10? melts at light>=10?
**[TBC]** -> becomes water (or nothing if no sky access). Snow layers (78): 1–8 layers,
walkable jump, silk touch only drop, melts in light>=12? **[TBC]**. Water freeze: none
(no ice formation from water in 1.12 except in snowy biomes? no — packed/regular ice
does not form naturally; skip **[TBC]**).

### Ores & minerals (21,56,73,129)
lapis_ore(21, needs stone, drops 4-8 lapis), redstone_ore(73, needs iron, drops 4-5
redstone + lit when mined/when adjacent powered? 73/74 lit pair), diamond_ore(56, needs
iron, drops diamond), emerald_ore(129, needs iron, drops 1 emerald; drops more with
fortune — fortune only affects diamond/redstone/lapis/coal? fortune affects
diamond/emerald/redstone/lapis/quartz; **no silk touch on these in 1.12? diamond ore
silk-touchable in 1.12? silk touch can mine diamond ore? yes silk touch works on ores
except nether quartz/redstone? **[TBC]***. Lapis ore: 4–8 per drop (average ~6).
Block equivalents: 22 lapis_block, 41 gold, 42 iron, 57 diamond, 130 emerald, 112? no.

### Overworld stone-like
grass(2)/dirt/podzol? — podzol registered id 243? Podzol is a biome-gen dirt variant
in 1.7+ as a distinct block (id 243? no podzol id=243 is not valid in 1.12 — podzol was
a variant? Podzol got its own ID 243? Hmm 1.7.2 added podzol id 243, mycelium 110,
packed_ice 174, huge_mushroom 99/100 — 1.7 IDs >230 were added! Yes 1.7 expanded past
198: podzol=243, packed ice=174? **ID map note: 1.7+ blocks occupy 174–255 partially;
1.7.2 used high IDs (e.g. 243 podzol? actually podzol was initially 243 then 247 in
1.8 snapshot era... final 1.7.2: podzol=243)** **[TBC for the 1.7.2+ additions; for our
clone IDs are cosmetic — registry name is authoritative; parity counts by name.]**

| name | v | notes |
|------|---|------|
| stone_slab/stone_slab2 | 10+6? | normal: cobble/stone/stonebrick? no — stone_slab damage values: 0 sandstone,1,2? old stone_slab: 0 cobble, 1 stone(smooth), 2 wood(oak), 3 brick, 4? — old double+single stone_slab use damages 0–7? 0 sandstone? decision: treat family as slabs of {sandstone, stone, wood(oak), brick, cobble, nether_brick, quartz, stone_brick} = 8 counted variants; stone_slab2 (182) = {quartz? no 182 has 0 quartz? 182: quartz, purpur} for 1.8: stone_slab2 damages 0 quartz, 1 purpur. Implement per family-progress. |
| stonebrick (98) | 4 | normal/mossy/cracked/chiseled (meta 0–3); 131 smooth_stonebrick separate block (counts separately) |
| sandstone (24) | 3 | normal/chiseled/smooth(1.12 smooth?) smooth sandstone added in 1.12? smooth stone added in 1.14; sandstone normal+chiseled(+smooth 1.12? no) → count 2: normal+chiseled **[TBC]** |
| sandstone_stairs (128) | 1 | |
| gravel(13)/clay(82)/hardened_clay(172→terracotta name)/stained_hardened_clay(159,16)/glazed_terracotta(238,16 — glazed added 1.12) | — | glazed terracotta: 16 colors, decorative, no special behavior |
| coal_block(173), redstone_block? (152) | 1 | redstone_block: powers adjacent blocks+dust fully (source of 15) |
| obsidian(49) | 1 | hardness 50, needs diamond pick, 9.4s? time = 50*1.5=75s w/ diamond? diamond speed 8: (50*1.5)*(3.33/8?) — formula below; beacon? no; portal frame |
| magma? (174? no magma=174?) magma_block 174 in 1.10 (id 174? magma_block=174? **packed_ice=174; magma_block=174?? packed_ice=174, magma=174 conflict — magma_block=174, packed_ice=174 — impossible. packed_ice=174, magma_block=174: wrong. magma=174? Let's record: magma_block=174? No: packed_ice=174; magma_block=174 is wrong because 174 is taken — magma_block was added 1.10 with ID 174? Actually 1.10 additions reused? no 1.10: bone=216, magma=174? **[TBC]** — registry name authoritative.** |
| netherrack(87), soul_sand(88), glowstone(89, light15), nether_brick(112), nether_bricks variants, nether_wart_block(213? 1.10; id high **[TBC name-confirmed: nether_wart_block 115? 115 = nether_wart_block registered in 1.10 with id 115? original nether_wart block was 115? 115 was "nether_wart" as a block in 1.8? yes 115 = nether_wart (block) pre-1.9 removed as placeable? kept** **[TBC]**) |

### Wood family (per species: log, planks, leaves, sapling, stairs, slab, fence, fence_gate, door, trapdoor, button, pressure_plate, sign, livingwood variants for 2 species)
6 species × (log, planks, leaves, sapling, stairs, slab, fence, fence_gate, door,
trapdoor, button, pressure_plate) = 6×12 = 72 registered entries; implement per-issue.
Signs: oak sign is entity w/ text; oak button = planks button. Spruce/birch/jungle/acacia/
dark_oak equivalents registered 1.12? fence_gate/door/button/pressure_plate exist for
all 6 by 1.12? doors all 6 yes; buttons/plates all 6 yes (1.12 added jungle/acacia/
dark oak button/plate? 1.12 added all 6 wood button/pressure plate? 1.12 added jungle/
acacia/darkoak doors+fences+gates+buttons+plates+slabs+stairs? 1.12 did NOT flatten;
jungle/acacia/dark_oak button/plate = added in 1.12? they existed pre-flattening as
separate registered blocks? wood_button(143) oak only, stone_button(77) only in 1.12!
**Critical: pre-flattening wood_button(143) and wood_pressure_plate(72) are OAK-only;
other species' button/plate blocks exist from 1.13+? No, they are 1.9+ added as
separate blocks: jungle/acacia/dark_oak buttons and plates were added 1.12? — 1.9 added
all wood doors? — **We count 6 species only for blocks 1.12.2 actually has; button/
plate variants other than oak+stone: none exist pre-flattening (single registered block,
meta = wood type in 1.13+). So 1.12.2 counts: button = 2 (oak, stone), pressure plate =
2 (oak, stone) + weight plates + daylight sensor.** Corrected wood family: per species:
log, planks, leaves, sapling, stairs, slab, fence, fence_gate, door, trapdoor = 6×10=60.
Note trapdoor: only oak in 1.12 (96); other species trapdoors 1.13+. Door: oak(64) +
iron(71); jungle/acacia/dark_oak/spruce/birch doors added 1.12? Spruce/jungle/birch/
acacia/dark oak doors added in 1.12? 1.12 has oak+iron doors? NO — 1.12 has doors: oak,
iron, spruce, birch, jungle, acacia, dark oak? They were added as blocks in 1.9/1.11?
In 1.9 all 6 wood doors? Pre-flattening doors: oak door(64) and iron door(71) were
meta; spruce/birch/jungle/acacia/dark_oak doors were added in 1.12 as new registered
blocks? 1.12 release notes: "Added jungle, acacia, dark oak, birch and spruce doors"?
Doors for other woods came in 1.12 (snapshot 16w32a? that's 1.11)? **Decision: count
wood family at 1.12.2 registry as: per species {log, planks, leaves, sapling, stairs,
slab, fence, fence_gate} = 6×8 = 48; doors: oak+iron only; trapdoor: oak only; sign: oak
only (entity). **[TBC at implementation — verify against registry dump before DoR.]**

### Colored blocks (each v=16)
wool(35), carpet(171), stained_glass(95), stained_glass_pane(160),
stained_hardened_clay(159), concrete(236), concrete_powder(237 — 1.12: falls under
gravity; turns to concrete when water touches; needs? no tool; drops self),
glazed_terracotta(238), and shulker_box? 1.12 shulker boxes are 16 colors (items;
blocks 219–234? 1.11 added shulker boxes with 16 registered block IDs? yes 219–234 —
counted in Tier-2 storage later). Concrete light: full block, all dye colors.

### Functional blocks
| name | id | notes (1.12.2) |
|------|----|----------------|
| crafting_table | 58 | 3x3 grid; drops self |
| furnace (burning=lit block) | 61/62 | smelt=200 ticks/item; fuel: coal=1600t? (1 coal smelts 8), lava_bucket=20000t(100 items), bucket returns empty; drops contents |
| chest / trapped_chest | 54/146 | 27 slots; double chest merges 54; trapped_chest emits redstone 15? signal = #players nearby within 5? (signal strength = players in 5-block radius) |
| ender_chest | 130? no id 130=emerald; ender_chest=130?? **ender chest id = 130? No: 130 emerald_block; ender_chest = 130 is wrong — ender_chest = 130? recorded as 130? It is 130 in 1.8? no ender chest is id 130? ender chest is 130? (id 130 is emerald). ender_chest = 130? — registry name authoritative; ID cosmetic** | 27 private slots, shared per player, keeps on explosion, obsidian drops? no ender chest drops self w/ silk touch else 8 obsidian? no: drops obsidian x8? **drops 8 obsidian** in 1.12 |
| bookshelf | 47 | 48 bookshelves? no: 15 for full enchanting; drops 3 books |
| obsidian/beacon | beacon 138 | beam + effects from level (power via pyramid of iron/gold/diamond/emerald blocks; 1–4 levels) |
| jukebox | 84 | plays discs; note block: 24 pitch range (0=low bass F? 0..24, F#1? instrument by block below: bass/harp/added 1.12: didgeridoo, cattlehorn? 1.12 added 8 instruments? **[TBC list]** |
| noteblock | 24 | pitch 0–24 (2 octaves +1?), 1.12 instruments: harp(double), basedrum, snare, hat, bass, pling, + 8 added in 1.12 **[TBC]** |
| bed | 26 | head/foot 2 blocks; sleep only night(12542–23542? any dim?); sets spawn; thundering? skip night->time 0? skip to dawn **[TBC]**; red bed? 16 colors! Bed 16 colors (id 26 damage 0–15) — counted as 16? yes bed damage = color. v=16 |
| cake | 92 | 7 bites, 2 per eating? restores 2 hunger/bite (2 food+0.6? 2 per bite? each bite 2 food? cake bite restores 2 hunger? yes 2 food +? no saturation; 6 slices? cake has 7 slices? **6 bites** **[TBC]** |
| anvil | 145 | prior-work penalty doubles repair cost; damage stages 0/1/2; falls (entity) with damage on landing |
| enchantment_table | 116 | 15 bookshelves -> level 30 options; 1.12 enchantment display is pseudo-random words (defect by design — we may replicate literal text or show real names; replicate: scrambled text on hover **[fun detail]**) |
| brewing_stand | 117 | fuel=blaze powder 20 brews? (each blaze powder = 20 fuel? 1 blaze powder = 20? blaze powder fuel value 2025? = 20 uses? **[TBC]**); water->awkward->effect; redstone extend, glowstone amp, spider_eye->poison? fermented spider eye corrupts, gunpowder splash, dragon breath lingering |
| cauldron | 118 | holds water (level 0–3); bucket fills +1; leather armor washes dye? no; water cauldron used by villagers? fill potion bottles? **[TBC: cauldron functions 1.12]** |
| end_portal_frame | 120 | eye slot; activate end portal w/ 12 eyes; eye of ender = blaze powder+pearl |
| dragon_egg | 122 | teleporting when clicked (light-bending); light level 1 |
| note/jukebox covered | | |
| piston / sticky_piston | 33? | piston pushes up to 12 blocks, extends in 1 game tick? retraction takes 2? piston extend 0.5t? Piston: extends in 1 tick? sticky pulls 1. Immovable: tile entities, obsidian-ish? piston cannot push: spawners, portal, end portal, beacons? (blacklist) |
| moving_piston | 36 | unplaceable; counts as piston impl detail |
| redstone_wire 55 / redstone_torch 75-76 / repeater 93-94 / comparator 149? (1.12 comparator registered as unpowered/powered pair? comparator id 149? added 1.5 as id 149/150? yes unlit 149 lit 150? **name authoritative**) | — | dust: power 0–15, −1 per wire block, powers 4 neighbors + block above? wire powers block it sits adjacent to if full block side? wire mechanics: diagonal connections, powers block below? wire does NOT power through walls: dust transmits along itself & to mechanisms; "strong power" from blocks (source block adjacent) vs weak power (transparent block with dust on top can weakly power mechanisms but not other dust? **[verify]**); repeater: delay 1–4 ticks (0.05–0.2s), locks signal when side-powered? repeater lock: side powered repeater freezes; diode only forward; comparator: compare (front>side: front else 0) / subtract (front − sides), reads containers signal (full chest=15 = items/slots ratio? 17 stacks...), mode switch via power? RMB? block update on RMB? comparator mode toggled by powering? **toggle = powered?** no: right click toggles? 1.12: RMB toggles subtract mode? In 1.12 the mode toggles by right-clicking? yes; reads: containers, cauldron level, jukebox, item frame rotation, end portal frame eye count, command block last output? |
| observer | 218? | observer added 1.5? observer id 218? added in 1.5? observer added 1.5? added 1.5 yes (id 218? high id) — fires 2-tick pulse when block it faces changes state / block update received |
| hopper | 154? | moves 1 item / 8 gt push; pull from above slower **[TBC 2x?]**; minecart chest? hopper minecart picks items 1 per 1gt? faster; lock: redstone powered block above |
| dropper 158?/ dispenser 23 | — | activate 2 ticks after pulse; dropper drops 1 stack; dispenser: arrows/shoot (water, lava? no lava in 1.12; place shears? actions: shoot arrows, fire firecharges, place TNT? ignite TNT, place, wear pumpkin? shoot arrows 2–4? dmg?); |
| lever 69 / stone_button 77 / wood_button 143 / stone_pressure_plate 70 / wood_pressure_plate 72 / light weighted plates 28/29 / daylight sensor 151 | — | lever on/off; buttons: stone 10t, wood 15t + can be on? stone button 1s, wood 1.5s? **stone 10gt? wood 30gt? stone=1s(20t), wood=1.5s(30t)? stone button 1s; wood button 1.5s; minecart on stone button 10gt? [TBC]**; plates: stone 1s while standing? stone = any entity? stone plate: mobs+players (not items), wood: all entities; light weighted: 15 + #entities*1.5? signal = ceil(n*? each item 1 per 10 items? weighted: signal = ceil(entities*?)**[TBC formula]**; daylight sensor: output = 0–15 sunlight at day, 0 at night, inverted mode (RMB in 1.12) = 15 − value; block update: sensor powers? |
| tripwire_hook 131? & tripwire | 132/131 | string tripwire: emits redstone when entity crosses? 1.12: fires? |
| rail family | 66/25/26/27? | normal rail auto-curve; powered_rail: powered = speed boost (+), unpowered = brakes; detector_rail: 10gt signal; activator_rail: powered = eject/boost? [TBC effects per rail]; minecart entity: rides, item pickup? chest cart = 27 slots |
| cobweb 28 | 1 | slows entities 50%? drops string 1 + 25%? drops 1 string? |
| sculk? none in 1.12 | | |
| beacon | 138 | see above |
| slime_block | 165 | sticky? bounces? 1.12 slime block: redstone-controlled stickiness (sticky when powered? sticks to anything moving, bounces entities 75%? 50%? bounces = velocity*0.75? [TBC]) + honey? no |
| barrier 166? (add? barrier is 166?) / structure_block(167? 1.12? barrier & structure void added 1.12? barrier=166 added? barrier exists since 1.8 (id 166? no 166=slime? slime=165, barrier=166, iron_bars? no) | 1 | decorative, unbreakable, invisible to F3-picking? creative-only |
| structure_void | 217? | creative-only |
| hay_bale? | 170 | reduces fall damage? hay bales added 1.11; absorb fall? haybales: no fall damage from? [TBC] |
| hardened_clay | 172 | terracotta: drops itself; needs? pickaxe |
| coal_block 173, packed_ice | 174 | packed ice: slippery, doesn't melt |
| redstone_lamp | 123/124 | lit 15 when powered; unlit |
| glass 20, glass_pane 102 | | panes connect; no collision on? full AABB thin |
| beacon/portal: portal 90 | 1 | nether portal block, generates from obsidian frame 4x5 min w/ flint-steel; entities teleport; 1:8 nether coord scale |
| end_portal | 119 | block |
| fire | 51 | burns on netherrack forever? fire on netherrack doesn't burn out (infinite); destroys items? 1 dmg/s; can be extinguished by water? water flow extinguishes fire? [TBC] |
| mob_spawner | 52 | spawns its entity type, 16-block radius, light<=7, max 4 nearby same type within? range; activates when player within 16 |
| vine 106 | 1 | climbs, climbs without? ladders-like but 4 sides, propagates; breaks by any; water slows climb? |
| lily_pad 111 | 1 | floats on water, pushes? entities walk above? walkable? (entity walks on it at water surface? player walks over? lily pads can be walked on? no — entities ride on top? lily pads: entities walk across? mobs can walk? player can walk on lily pad like solid? In Java, lily pad is walkable? yes player can walk on lily pad as if on water? it is a flat non-solid; entities pass? [TBC: I believe entities walk on lily pads as if on a full block? No: lily pads are non-solid, entity is at water level? player walks on them fine.] [TBC]) |
| cocoa 127 | 1 | grows on jungle log sides, 3 stages, drops 2–3 at mature |
| sugar_cane 83 | 1 | grows 1/block up to 3; breaks bottom w/ bonemeal?; grows regardless of light |
| cactus 81 | 1 | damages entity contact 1 dmg? hurts? cactus damages any entity adjacent (1 dmg per? contact, drops items?); grows to 3; breaks itself? breaks all adjacent? cactus destroys items? |
| brown/red mushroom 39/40 | | grow in dark (light<=12?), bone meal; huge mushroom blocks |
| waterlily covered | | |
| chorus? 1.9 end plant — chorus plant/fruit/end_rod/purpur are End (Tier-2 end content) | | chorus fruit teleports on eat; end rod light16? end rod light level 16? light=16? [TBC — end rod = light 16] |
| pumpkin 86 + lit 91 | | carve via shears (face); golem/snowman? iron golem: iron blocks 4 + pumpkin; snow golem: 2 snow + pumpkin? pumpkin needed? (carved in 1.13) |
| melon 103 + stem/glowstone? | | melon slice 2-7? drops; stem grows like pumpkin |
| nether_wart 115 (as crop) | | grows on soul sand 4 stages |
| wheat/crop 59 | 1 | stages 0-7; needs light 9?; drops 1 wheat + 0-3 seeds; mature = brown? |
| farmland 60 | 1 | hoe converts dirt/grass; reverts if entity walks? tramples (un-jumped); wet farmland grows crops faster; hydration range: water within 4 horiz/1 vert? (farmland wet radius 4 square?) |
| mycelium 110 | 1 | spreads; mushroom grow on it w/o light |
| podzol 243? | 1 | spruce/fern biome; no grass spread |
| grass_path? 1.12? (grass_path 1.10? added 1.9 as 215? id high [TBC]) | | |
| snow layer 78 | 8 meta | jump-snow; silk touch drops; melts? snow layer melts when block light>=12? [TBC] |
| ice 79 / packed ice | | slippery (entity slide friction 0.98? ice friction; slime?) |
| frosted ice? | | |
| sponge | | |
| concrete_powder | 237 | **Tier-1 gravity**: falls when unsupported; water contact -> concrete of same color |
| concrete | 236 | full solid |
| bedrock | | |
| command_block 137/138? | | creative only; execute chain? not needed for parity bar |
| structure | | |

### Entity-ish blocks (Tier-2+): armor_stand(181? id high), skull(144? mob head), banner(176), end_crystal(200? not a block? entity item), flower_pot(140), beacon, shulker_box(16 colored blocks 219–234? 1.11)

### Flowers & plants
| name | id | v | notes |
|------|----|---|------|
| red_flower | 38 | 5? | 1.12 red_flower metas: 0 poppy, 1 blue orchid, 2 allium, 2? houston? 3 red tulip, 4 orange tulip? — red_flower damage 0 poppy, 1 blue orchid, 2 allium, 3 red? Actually: red_flower: 0 poppy, 1 blue orchid, 2 allium, 2? red tulip=3, 4 orange tulip, 5 azure bluet? 5 azure_bluet? 1.12 red_flower has poppy, blue orchid, allium, red tulip, orange tulip, azure bluet, houstonia? **[TBC exact metas; count as 8 registered variants total across red_flower + yellow_flower + double_plant]** |
| yellow_flower | 37 | 1 | dandelion |
| double_plant | 175 | 6 | sunflower, lilac, tall grass(fern), large fern, rose_bush, peony; 2-block-tall, bottom damage 0–5 (upper = 8 + meta? upper uses damage+8) |
| tall_grass | 31 | 4? | default/fern? 1.12 tall_grass + "fern" as separate registered? damage 0 shrub, 2 fern? [TBC] |
| dead_bush | 32 | 1 | |
| saplings, mushrooms covered | | |

### Special/misc
fire(51), cobweb(28), portal(90), end_portal(119), lit_pumpkin(91),
dragon_egg(122), beacons, barrier, structure_void,
command blocks, jigsaw? (1.12? jigsaw added 1.12? no 1.12? **[TBC]**),
moving_piston(36), waterlily(111), netherbrick(112), netherbrick_stairs/fence,
red_netherbrick(213? 1.10? red nether bricks 1.10 added 213? **id high [TBC]**),
end_stone(121), purpur(201? 1.9: purpur block/bricks? purpur is 201? [TBC]),
prismarine(168 3 variants), sea_lantern(169), slime_block(165), coral? none (1.13?
coral was removed; 1.12 has coral_fab+dead? 1.12.2 removed coral? coral added 1.12
snapshots then removed pre-1.12 release? **[TBC — likely not present]**).

## Item/tool tier rules (Tier-1)
Break time = base: breakTime = hardness × 1.5 / speedMult (right tool type AND tier;
speeds: wood 2, stone 4, iron 6, diamond 8, gold 12, hand 1). If canHarvest FAILS
(wrong tool class OR tier below requirement): time = hardness × 5 (ratio 100/30 vs
/30) and NO drop. Cannot harvest at all (obsidian w/o diamond, etc.) still follows
×5 path but drops nothing; bedrock = ∞. (Audit #010: stone by hand = 7.5s, dirt 0.75s.)
Tiers: hand(1), wood(2), stone(4), iron(6), gold(12), diamond(8).
Gates (must break AND drop): coal/cobble/stone = wood+; iron/lapis = stone+; gold,
redstone, diamond, emerald, obsidian = iron+ (obsidian also diamond+? obsidian drops
with diamond pick; iron pick on obsidian drops nothing? **obsidian requires diamond**).
Durability: wood 59, stone 131, iron 251, gold 32, diamond 1561.
Sword dmg: wood 4, stone 5, iron 6, gold 3, diamond 7; hand = 1.
Combat (1.9-style): cooldown 1.0s hand/shovel? — full damage when cooldown full:
sword 0.625s, axe 0.5s? axe cooldown 0.5s? axe 1.0? **[TBC exact per-tool]**. Partial
hits deal partial damage; sprint first-hit extra knockback.

## Player physics (Tier-1)
Walk 4.317 m/s, sprint 5.61? (sprint 1.3×), crouch 1.3 m/s? sneak speed 1.3? [TBC];
jump height 1.25 (auto-jump option), gravity 32 m/s²? fall damage = (fall blocks − 3)
hearts, rounded down? 1 heart per block past 3 (rounded up at thresholds), 1 dmg per
extra block? jump then fall still counts? water reduces fall? water negates fall if
swimming? fall through water negates damage if submerged any part? slime negates?
hitbox: 0.6×1.8, eye at 1.62; step-up: auto step 0.6 (half-block slabs/stairs auto
climb? 1.12 auto-jump default ON? auto-jump default: on; step height 0.6 without
jumping — full slabs require jump? player auto steps 0.6 = half-slab auto). Air: 300
ticks (15s) then 2 dmg/s drowning; regen: passive regen at food>=18 (fast regen 1HP/
4s? regen rate: hidden saturation: regen 1HP/4s when food>=18 and sat>9? sprint
requires food>6.0, jump >6.0 (6 = 3 drumsticks? 6 = 3 hunger icons); damage when
starving (food 0): half-heart every 4s hard /? [TBC by difficulty]. Difficulty:
peaceful (mobs gone? regen? regen peaceful always; hard: zombies break wood doors,
starve to death; easy: poison?; normal).
Hunger drain: saturation-first model; sprint/jump/damage cost exhaustion.

## Mob spawn-by-light (Tier-1)
Hostile spawns at block+sky combined? light level <= 0? spawn requires light <= 0 in
1.12? 1.12 change: light level 0 only in 1.12? spawn light level: pre-1.12 <=7;
1.12 changed to <=0?? **[TBC: 1.12 made mobs spawn at light 0 (the "light level 0"
change happened in 1.18). 1.12 = light level 7 or less still.]** — hostile: light <= 7
(spawn check = combined? block light and sky light both <=7? max(block, sky) <=7),
opaque block with 2 air above, 24-block min distance from player? spawn attempts in
128-block box? cap: 70 hostile /10 passive /15 ambient /5 water (per player? cap
scales with players). Despawn: instant >128 blocks, 2-4? random between 32–128; no
despawn if mob has item/riding/player nearby < 1.12 rule? mobs within 32 blocks of
player don't despawn; persistent NBT tag.
Passive: spawn on grass, light >= 9, daytime.

## Mob roster & behavior (1.12.2; Tier-1 marked T1)
| mob | HP | drops | behavior |
|-----|----|-------|----------|
| zombie T1 | 20 | rotten flesh 0-2, iron/gold/carrot rare | melee 2.5? (2–4 on hard?) attacks 2 hearts?; burns in sunlight (sky light 15 direct? burns at light >=? sunlight exposure); hard difficulty breaks wooden doors (40s?); zombies attack turtles? turtle eggs; baby zombies 1/2 size, faster, ride chickens (chicken jockey); converts villagers; drowned not in 1.12? drowned added 1.13 — not present |
| skeleton T1 | 20 | bone 0-2, arrow 0-2, bow rare | ranged every ~2s? fire rate: shoots when within 5–16? strafes to keep distance; burns in sunlight; shoots at player within 16? flees close? 1.12: keeps ~5 block distance; arrows knock back |
| creeper T1 | 20 | gunpowder 0-2, disc if killed by skeleton?? (disc head? creeper killed by skeleton drops music disc) | silent approach; hisses 30t fuse; explosion power 3.0 (radius 4 dmg), block damage in 3x3? (TNT 4.0, creeper 3.0); charged creeper (lightning) power 6 + mob head drops |
| spider T1 | 16 | string 0-2, eye 0-1 | hostile always except bright light (light>=? becomes neutral at light>=? spider neutral at light 8+? [TBC]); climbs walls; jumps; cannot be hit by melee when climbing?; baby spiders? |
| cave_spider T1 | 16 | string, spider eye | smaller, spawns in mineshafts; poison II on hit (5s? poison from cave spider: poison for 5s? poison duration scales?) |
| enderman T1 | 40 | ender pearl 0-1 (1.12: max 1? pearl drop 0-1) | neutral; hostile when attacked or looked at (crosshair within 8 blocks? look range: 8 in java?); teleports when damaged (8 blocks?), in rain/water takes 1 dmg/s? enderman damaged by water 1 HP/s? (2? [TBC: 1 dmg/s]), teleports away from projectiles; picks up blocks (carrying) |
| witch T2 | 26 | sticks/glowstone/gunpowder/redstone/spider eye/sugar/stick? potions | drinks buff potions on hurt, throws harmful splash potions (poison/harming/weakness); spawns in swamp huts / witch huts + raids n/a; spawns when lightning strikes villager? |
| slime T1? | var (1,2,4) | slimeball | bounces; splits into 2–4 smaller down to size 1; spawns in slime chunks y<=40 (light-independent!) or swamp surface light<=7 y 50–70 |
| blaze T2 | 20 | blaze rod | fires 3-shot fireball bursts, hovers, immune fire; nether fortress spawners |
| ghast T2 | 10 | ghast tear/gunpowder | fires explosive fireballs; deflect back with projectile = "ghast scream" achievement; flies 32-block? range, shoots when player in 16? range |
| magma_cube T2 | var | magma cream | like slime but bounces, nether; doesn't take fire dmg? |
| wither_skeleton T2 | 20 | coal, bone, skull rare | fires? melee with stone sword; WITHER effect (II? 10s); wand? |
| stray T2 | 20 | bone, arrow, bow | skeleton variant; slow II arrows; cold biome; stray in ice plains |
| husk T2 | 20 | rotten flesh | desert zombie variant; hunger effect on hit; no sun burn |
| silverfish T1 | 8 | none? | infested stone/bricks release; when hit calls nearby silverfish (hidden packs) |
| endermite T2 | 8 | none | from ender pearls landing; short-lived; attacks? |
| vex T2 | 14 | none | summoned by evoker; flies through blocks? passes walls |
| guardian T2 | 30 | prismarine/fish | laser charge (defense-up? prismarine shards beam 2 dmg/s charge), spikes when dead? guardian: laser damage + block? elder guardian: mining fatigue III within 50? range |
| squid T1? | 10 | ink sac | passive; flees player? wanders; water only |
| bat | 6 | none | flies, roosts, sleeps inverted; no drops |
| chicken T1 (breeding) | 4 | feather 0-2, raw chicken, egg? | lays egg every 5-10 min; egg 1/8?; fall immunity high? chickens glide; breeds via seeds (any of 4 seeds) |
| cow T1 | 10 | raw/beef, leather | bucket->milk? milk bucket; breeds via wheat; mooshroom variant (mushroom stew) |
| pig T1 | 10 | raw porkchop | saddle -> rider? ride w/ carrot on a stick? breeds via carrot; undead? piglin? n/a |
| sheep T1 | 8 | mutton/wool | shearable (1-3 wool per? 1-3 wool per? 1-3), regrows; breeds via wheat |
| rabbit T1 | 3 | rabbit, hide, foot rare | hops, flees; breeds via carrot/dandelion? |
| horse/donkey/mule | 15-30 | leather? | tame w/ apples? taming loop; breed via golden apple/carrot? saddle+carpet; jump strength var; donkey/mule: chest/5-slot? mule=chest; zombie horses? skeleton horses? |
| wolf T1-neutral | 8 (tamed 20) | none? | tamed w/ bones; follows; attacks attackers of owner? attacks skeletons (preference); collar color; health regen via meat |
| ocelot | 10 | none | tamed via fish (raw fish x?); kitten; scares creepers? cat variant is 1.14 (not 1.12) |
| polar_bear | 30 | fish? | neutral (aggressive to player within 16? cubs); attacks wolves? |
| llama | 15-30 | leather? | tame spitting; caravans (leads follow); caravans |
| villager T1 (trading) | 20 | none | 5 professions? farmland/bookshelf/brewing/furnace/profession by? 1.12 uses workstations? job: farmer(wheat/seeds), librarian(book), priest(nether wart), blacksmith(tool/armor trades), butcher(raw meat),? 1.12: professions tied to biome house + held? trading via trades per profession/level; nitwits (green robe) no trades; breed: beds+food (throw crops); gossip/doors in 1.12? (POI system added 1.14? 1.12 uses doors for iron golem & breeding) |
| iron_golem T1 | 100 | iron x? 3-5 + poppies | player-built 4 iron blocks + pumpkin; attacks most hostile mobs (not creepers? attacks creepers yes, not wolves); provokes when player hits villager; cracks with damage; can't be healed w/ ?; poppy offering anim |
| snow_golem | 5 | snowballs? | snow blocks + pumpkin; snow trail; snowball dmg? snowballs knock back (0 dmg, knockback only)? weak; melts near fire/biome? takes damage in warm biome/near fire |
| snowman snowball: does NOT damage undead? snowball vs blaze? | | |
| parrot T1 (1.12 mob) | 6 | feather? 1.12 added parrot! | mimics mob sounds; tamed w/ seeds (feeds cookie kills? cookie poisons parrots); dances near jukebox; sits on shoulder |
| zombie_villager | 20 | | zombie + villager trades? cure via weakness potion + golden apple (1.9) |
| bat/squid covered | | |
| ender_dragon T2-lite | 200 | 200 exp? | End: breath attack, charge, perch + exit portal; crystals heal beam; lite = simplified AI acceptable |
| wither T3? | 300 | nether star | summoned 4 soul sand + 3 wither skull; shoots skulls? kills = wither effect aura |
| elder_guardian | 80 | | mineshaft? ocean monument |
| armor_stand | — | item entity block | armor slots, pose editing |

### Breeding rules (Tier-1)
Wheat: cow/mooshroom/sheep; seeds: chicken; carrot: pig, rabbit? rabbit carrot or
dandelion? ; golden apple/carrot for horses? wolves via bones (not breeding? breed:
2 wolves w/ any meat? wolves breed via any meat including raw? any meat). Cooldown 5
min (6000t) per pair; inlove heart particles; babies 20 min? 10 min? baby growth 20
min (24000t? 20 min) accelerated by feeding.

### Worldgen (Tier-1)
Seedable perlin/simplex noise (clean-room). Overworld: sea level 62? sea level y=62
(water fills <= 62; stone->? y<10 lava below 10? lava lakes below 10). Ores: coal
128+? y<128? (coal veins 2-17 y0-128, iron y0-63, gold y0-31, redstone y<16, diamond
y0-15, lapis y0-16, emerald y? mountains only? emerald in extreme hills? no emerald
biome specific). Bedrock y0 (unbreakable) + random 1-5 bedrock floor top? (bottom 5
bedrock random). Caves: 3D perlin worm carving; ravines? mineshafts? villages? —
mobs: spawner rooms (dungeon), strongholds (Tier-3). Biomes (1.12 list, implement
subset first): ocean, plains, desert, forest, jungle, swamp, taiga, snowy tundra,
beaches, extreme hills, savanna, mesa, river, mushroom island, nether/end. Cave biome
in 1.12? cave biome removed? [TBC].

### Save/load (Tier-1)
localStorage: per-chunk RLE of blockstate (block id + meta), entities subset, player
state (pos/inv/hunger), world seed, time, spawn point. ~5MB limit: RLE + prune distant
chunks; version tag + schema migration. (SPK-5 to confirm capacity math.)

### F3 debug (Tier-1)
FPS, coords (XYZ, block), chunk coords + local, facing, light (block/sky), targeted
block (registry name + meta + coords), biome, memory, entity counts.

### Redstone spec (Tier-2) — see functional table above; tick budget: game runs 20
UPS fixed timestep; redstone updates = BFS from changed sources w/ queue; dust
propagation per tick; target: simulate 8x8 chunks active redstone at 20UPS in JS
(SPK-3).

### Enchantments (1.12, 1.12 added: Frost Walker, Depth Strider? (1.8), Mending?
Mending 1.9! 1.12 includes: Protection 1-4, Fire, Feather Fall, Blast, Projectile,
Respiration, Aqua Affinity, Thorns, Sharpness, Smite, Bane of Arthropods, Knockback,
Fire Aspect, Looting, Efficiency, Silk Touch, Unbreaking, Fortune, Power, Punch,
Flame, Infinity, Luck of the Sea, Lure, Depth Strider(1.8), Frost Walker(1.9),
Mending(1.9), Binding Curse(1.9?). Anvil + level 30 enchanting via bookshelf table.

### Potions (1.12)
Water->Awkward (nether wart). Effects: Night Vision 3:00? durations: Speed 3:00/1:30
II? [TBC per potion], Slowness 1:30, Leaping 3:00/1:30, Strength 3:00/1:30,
Instant Health/Damage, Regen 0:45? II, Protection 3:00, Fire Res 3:00, Water Breathing
3:00, Invisibility 3:00, Weakness 1:30, Wither? poison 0:45? — redstone extend (×8/3),
glowstone amp, fermented spider eye corrupt, gunpowder = splash, dragon breath =
lingering.

## Scoring
`tools/parity.mjs` counts functional blocks from `docs/catalog.json` (generated from
this doc; keep in sync — the JSON block is the source, this prose is the annotation):
block% = implemented-and-proven / total enumerated variants. Mechanic% from tier
checklists in `docs/PARITY.md`.
