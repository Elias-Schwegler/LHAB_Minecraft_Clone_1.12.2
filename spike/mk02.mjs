import { writeFileSync } from 'node:fs';
const T = (n, slug, type, epic, sprint, spec, acs, spike, dep) => writeFileSync(
  `issues/${n}-${slug}.md`,
  `# Issue: ${n} — ${spec.title}\n- Type: ${type} | Status: READY | Epic: ${epic} | Sprint: ${sprint} | Depends: ${dep || '—'} | Spike: ${spike || '—'}\n\n` +
  `## Spec\n${spec.body}\n\n## Acceptance criteria\n${acs.map((a) => `- [ ] ${a}`).join('\n')}\n\n## Test plan\nHarness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.\n`));

T('020', 'block-light', 'FEAT', 'E5', '02', {
  title: 'Block light + torches',
  body: 'Per-chunk lightmap: 4 bits/block. Sources: torch=14, glowstone=15, lava=15 (fluid later). `light` field in registry drives emission. BFS spread with decay 1/block through non-opaque (air, glass, leaves attenuate? MC: leaves opacity 1), solid blocks block spread. Mesh vertex carries sky*16+block brightness baked at mesh time; shader multiplies texel by brightness ramp (MC-style smooth lighting w/ per-vertex interp). Torch item placeable via hotbar. Cross-chunk propagation via re-lighting neighbors on change (cap work/tick).',
}, ['AC1 harness: torch place -> light>0 at distance<=4 same y; light decreases with distance',
    'AC2 harness: light does not pass through stone wall (occlusion)',
    'AC3 harness: lightmap relight on setBlock within 2 ticks (budgeted)',
    'AC4 shot torch-night: torch glow visible on ground (vision: radial falloff, not flat)',
    'AC5 torch block registered+textured (Blender) + qa/blocks/torch.png, functional w/ proof'], 'SPK-1/3 GO');

T('021', 'skylight-daynight', 'FEAT', 'E5', '02', {
  title: 'Skylight + day/night cycle',
  body: 'Sky light column-BFS from world top: vertical no-decay, horizontal decay 1 (1.12 rule). Time: 24000-tick day, phases: day(0-12000)/dusk/sunrise; skyColor + ambient light multiplier curve; at night skylight ambient ~0.2? (MC: skylight * (daylight factor 0..1, night=0 -> mob spawn possible). Mesh rebuild on light change batched; sky shown as gradient sky color + fog matched to it. F3 shows block/sky light.',
}, ['AC1 harness: cave interior light=0 at day with ambient off (light-only render assert via pixel or lightmap)',
    'AC2 harness: time advances 20 ticks/s virtual; daylight factor curve monotonic',
    'AC3 shot day-vs-night: two shots of same spot at t=1000 vs t=18000, night visibly darker except lights',
    'AC4 no crash on 48000 ticks (2 days)'], 'SPK-3');

T('022', 'fluids', 'FEAT', 'E6', '02', {
  title: 'Water/lava flow + interactions',
  body: 'Fluid blocks water(id8)/lava with level 0-7 meta (spread level, 7 gone). Source block placed by bucket later; bucket deferred. Flow tick: per tick, expand flowing blocks in region-dirty queue (SPK-3 budget); water distance 7, lava 3 overworld, lava slower (moves every 2nd/4th tick random). Water on lava source -> cobblestone; water on lava flow -> stone? (per REFERENCE resolved: water onto lava source=cobblestone; water into lava stream=stone? verify 1.12: lava+water stream -> cobble? **[TBC before DoR — issue not sprint-ready until resolved: check: water flowing onto lava source block -> cobblestone; water touching lava flowing -> cobblestone in 1.12? no: stone] research**). Water flows around player push? defer. Render water semi-transparent, alpha via tile + shader blend pass.',
}, ['AC1 harness: source spreads to distance 7 then stops; level decreases',
    'AC2 harness: water+lava source -> cobblestone assert',
    'AC3 harness: flow work <= tick budget (tick-time assert <30ms region 16^3)',
    'AC4 shot: pool with visible water surface (vision: translucency, no z-fight)'], 'SPK-3 GO', '#020');
T('023', 'save-load', 'FEAT', 'E9', '02', {
  title: 'localStorage save/load (schema v1)',
  body: 'SPK-5: RLE(id,len) chunk serialization base64, ~2.7KB/chunk. Save {v:1,seed,time,player{pos,yaw,pitch,hotbar,inv},chunks{"cx,cz":rle}} key=cf-save-1. Auto-save every 10s + beforeunload; load on boot if ?load=1 (and offer in F3). Modified-chunk tracking (edited set) so unedited chunks regenerate from seed — saves quota. Quota-exceeded: evict oldest radius>12 chunks, warn in F3. New-game wipes via ?new=1.',
}, ['AC1 harness: build world, edit blocks, save, makeWorld fresh, load -> edits present at same coords',
    'AC2 harness: unedited chunks byte-identical to regen (no save needed) — quota math assert saves <1MB for 60 chunks',
    'AC3 harness: round-trip of player pos/yaw/time',
    'AC4 harness: corrupt-save JSON throws -> clean fallback to fresh world (no crash)',
    'AC5 shot: place distinctive block, save, reload via query, screenshot shows block (pixel-diff vs baseline != walking)'], 'SPK-5 GO');

T('024', 'items-tools', 'FEAT', 'E4', '02', {
  title: 'Items, tools, crafting',
  body: 'Item registry (non-block items: stick, coal, iron_ingot, gold_ingot, diamond, apple, sapling, tools). Crafting: 2x2 player grid + 3x3 at table (GUI comes #025; logic now w/ programmatic + GUI later): recipes per 1.12 REFERENCE: planks(1 log->4), stick(2 planks->4), crafting_table, wooden/stone/iron/diamond pickaxe+axe+sword shovel patterns, furnace(cobble 8), torch(coal+stick->4). Smelting (furnace block+UI #025; smelt logic ready: iron_ore->ingot 200t). Tool speeds per REFERENCE (wood 2/stone 4/iron 6/diamond 8/gold 12), gates with tiers -> stone by wood pick = 0.75s? per formula. Break with pickaxe drops ores; wood axe -> log drop? (axes speed logs, sword leaves? no shears #019).',
}, ['AC1 harness: crafting API: log->planks->stick+pickaxe recipe results exact 1.12 outputs',
    'AC2 harness: breakTime(stone, wood pick)=1.15s? (1.5/2*1.5=1.125) vs hand 7.5 — assert formula',
    'AC3 harness: gold ore with iron pickaxe -> gold_ingot drop; with wood -> nothing',
    'AC4 hotbar renders item icons (atlas tiles for items: tools procedurally in gen.py) + qa/items sheet',
    'AC5 furnace smelt iron_ore->iron_ingot after 200t with coal fuel'], '—');

T('025', 'inventory-gui', 'FEAT', 'E7', '02', {
  title: 'Inventory + hotbar UI',
  body: 'HTML/CSS overlay (no WebGL needed): hotbar 9 slots w/ icons (css background from atlas slices), selection frame; E opens inventory: 27 main + 9 hotbar + 2x2 crafting grid; drag-drop via pointer events (MC-style pickup/split? basic move); shift-click stack; creative picker? later. Furnace UI when furnace GUI-opened (right click block): 3 slots + burn progress.',
}, ['AC1 shot hotbar: 9 slots, icons from atlas, selection frame visible',
    'AC2 harness: UI state: E toggles, slot swap via drag sim (dispatch pointer events), stack move',
    'AC3 harness: hotbar select 1-9 mirrors CF.sel',
    'AC4 vision: legible at 854x480, no overlap w/ F3'], '#024');

T('026', 'survival', 'FEAT', 'E8', '02', {
  title: 'Survival: health, hunger, fall damage, respawn',
  body: 'Modes: creative default (fly? later; current walk fine), survival toggle. Health 20: fall damage = floor(dist-3) (REFERENCE), suffocation? later, drowning later. Hunger 20 + hidden saturation; sprint/jump/dig drain exhaustion; <6 no sprint; 0 -> half-heart/4s down to? hard: death. Eat items (apple 4, bread? TBD). Death: respawn at spawn w/ 20hp, items kept (drop-to-void deferred). HUD hearts+food bar v1.',
}, ['AC1 harness: 10-block fall -> 7 damage? floor(10-3)=7 assert; <=3 blocks -> 0',
    'AC2 harness: sprint blocked at food<=6; exhaustion accumulates w/ sprint+dig',
    'AC3 harness: death at 0 hp -> respawn full, at spawn',
    'AC4 shot hud: hearts+food bar render, legible'], '—');

T('027', 'f3-v2', 'CHORE', 'E7', '02', {
  title: 'F3 v2 content',
  body: 'Add lines: light (block/sky of aimed block), biome name, chunk local coords, ms per tick (sim cost), FPS min/max, save state/quota used.',
}, ['AC1 harness: f3.content2 asserts new substrings present', 'AC2 shot f3-on: vision readable'], '#020 #021 #023');

T('019b', 'noop', 'CHORE', 'E2', '02', { title: 'noop', body: 'placeholder' }, ['x']);
console.log('sprint 02 issues written');
