import { writeFileSync } from 'node:fs';
function T(n, slug, type, epic, spec, acs, spike, dep) {
  const body = `# Issue: ${n} — ${spec.title}
- Type: ${type} | Status: READY | Epic: ${epic} | Sprint: 02 | Depends: ${dep || '—'} | Spike: ${spike || '—'}

## Spec
${spec.body}

## Acceptance criteria
${acs.map((a) => '- [ ] ' + a).join('\n')}

## Test plan
Harness asserts named in ACs; shot scenario named in ACs; vision verdict into issue at close.
`;
  writeFileSync(`issues/${n}-${slug}.md`, body);
}

T('020', 'block-light', 'FEAT', 'E5', {
  title: 'Block light + torches',
  body: 'Per-chunk lightmap: 4 bits/block. Sources: torch=14, glowstone=15 (registry `light` field). BFS spread decay 1/block; solid opaque blocks block spread (glass/air pass). Mesh vertex carries brightness baked at mesh time; shader multiplies texel by brightness (per-vertex interp = smooth MC-style). Torch placeable from hotbar. Re-light neighbors on change, budgeted per tick.',
}, ['AC1 harness: torch -> light>0 at distance<=4, decreasing with distance',
    'AC2 harness: no light through a stone wall',
    'AC3 harness: relight budget: setBlock relight completes w/ tick cap, assert eventual consistency',
    'AC4 shot torch-night: radial falloff visible (vision), not flat',
    'AC5 torch block registered + blender tile + qa/blocks/torch.png + functional proof'], 'SPK-1/3 GO');

T('021', 'skylight-daynight', 'FEAT', 'E5', {
  title: 'Skylight + day/night cycle',
  body: 'Sky light: vertical columns no-decay, horizontal decay 1 (1.12). Day cycle 24000 ticks at 20 TPS; daylight factor curve (full day 1, dusk ramp, night 0); ambient = max(skylight*factor, blockLight). Sky clear-color + fog tint follow the curve. Nights dark enough for torches to matter.',
}, ['AC1 harness: covered cave block skylight=0 at noon; open surface=15',
    'AC2 harness: daylight factor monotonic segments over a day; night factor 0',
    'AC3 shot same-spot day vs night: night darker, torch-lit circle visible',
    'AC4 2 in-game days no crash, fps stable in virtual time'], 'SPK-3');

T('022', 'fluids', 'FEAT', 'E6', {
  title: 'Water/lava flow + interactions',
  body: 'Water/lava with level meta 0-7 (source=0, flow distance). Water: spreads 7, level+1 per step, falls reset; lava: distance 3 overworld, flows slower (every 4 ticks, random-ish). Dirty-region queue (SPK-3). RESOLVED for DoR: water touching lava SOURCE -> cobblestone; lava (source or flow) touching WATER -> stone. Water rendered translucent (separate blend pass, later z-sort note in AGENTS).',
}, ['AC1 harness: source on flat ground -> exactly distance-7 spread, then stops',
    'AC2 harness: water into lava source -> cobblestone assert',
    'AC3 harness: 16^3 flood region tick cost < 30ms',
    'AC4 shot pool: water surface translucent, no z-fight (vision)'], 'SPK-3 GO', '#020');

T('023', 'save-load', 'FEAT', 'E9', {
  title: 'localStorage save/load (schema v1)',
  body: 'SPK-5 GO: RLE(id,len) chunks, base64. Save {v:1,seed,time,player{pos,yaw,pitch,sel,inv?},editedChunks{"cx,cz":rle}} key cf-save-1. Unedited chunks regen from seed (never saved). Auto-save 10s + beforeunload; load via ?load=1; ?new=1 wipes. Quota-exceeded -> evict far edited chunks + warn (F3 line). saveNow()/loadNow() on CF for tests.',
}, ['AC1 harness: edit, save, fresh makeWorld, load -> edit present',
    'AC2 harness: player pos/yaw/time round-trip',
    'AC3 harness: corrupt JSON -> fresh-world fallback, no throw',
    'AC4 harness: save size for 40 edited chunks < 150KB (RLE+base64)',
    'AC5 shot: distinct placed tower, save; reload shot shows tower'], 'SPK-5 GO');

T('024', 'items-tools', 'FEAT', 'E4', {
  title: 'Items, tools, crafting',
  body: 'Item registry (stick, coal, iron/gold_ingot, diamond, apple, sapling, tools) w/ Blender-baked icons in atlas. Crafting API (GUI later): 1.12 recipes: log->4 planks; 2 planks->4 sticks; 4 planks crafting_table; 3x3? 3 head+2 sticks tools wood/stone/iron/diamond (pickaxe/axe/shovel/sword); 8 cobble furnace; coal+stick->4 torch. Tool speeds wood2/stone4/iron6/diamond8/gold12 w/ class+tier gates per REFERENCE. Drop table per REFERENCE drop fields already in registry.',
}, ['AC1 harness: recipe results exact (log->4 planks, stick x4, iron pickaxe pattern)',
    'AC2 harness: stone w/ wooden pick = 1.125s vs hand 7.5s',
    'AC3 harness: gold ore: iron pick -> gold_ingot; wood pick -> nothing',
    'AC4 harness: furnace smelt iron_ore->iron_ingot 200t w/ coal (fuel 1600t/8 items)',
    'AC5 qa/items sheet vision: icons readable at 16px'], '—');

T('025', 'inventory-gui', 'FEAT', 'E7', {
  title: 'Inventory + hotbar UI',
  body: 'CSS/HTML overlay: hotbar 9 w/ atlas-slice icons + selection; E opens 27+9 inventory + 2x2 grid; pointer drag-drop; furnace 3-slot UI w/ progress on right-click. State in CF.inv (shared w/ save v1).',
}, ['AC1 shot hotbar: icons + frame, legible 854x480',
    'AC2 harness: E toggles; scripted slot swap; stacks move',
    'AC3 harness: digits 1-9 select hotbar slots',
    'AC4 furnace UI: smelt progress advances (shot)'], '#024');

T('026', 'survival', 'FEAT', 'E8', {
  title: 'Survival: health/hunger/fall/respawn',
  body: 'Creative default; survival toggle (F4). Fall dmg floor(dist-3); sprint/dig exhaustion -> hunger; food<=6 no sprint; 0 food -> damage to death; death -> respawn spawn 20hp (items kept v1). HUD hearts+food v1. Apple from oak leaves drops (#019).',
}, ['AC1 harness: 10-block fall = 7 dmg; <=3 = 0',
    'AC2 harness: sprint requires food>6; exhaustion accrues sprinting',
    'AC3 harness: starvation damage ticks; death -> respawn',
    'AC4 shot hud: hearts + drumsticks legible'], '#019 #024');

T('027', 'f3-v2', 'CHORE', 'E7', {
  title: 'F3 v2 content',
  body: 'Add aimed-block sky/block light, biome, sim ms/tick, save-state + quota used.',
}, ['AC1 harness: f3.content2 asserts new substrings', 'AC2 shot f3-on readable'], '#020 #021 #023');

console.log('written');
