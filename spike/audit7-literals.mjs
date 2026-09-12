// audit7: proof-literal + evidence-file verifier for the sampled issues.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { p } from '../tools/lib.mjs';

const html = readFileSync(p('game', 'index.html'), 'utf8');
const L = {
  '#049': ['registry.species-variants', 'grass.sapling-grow-oak', 'grass.sapling-grow-birch', 'grass.sapling-grow-jungle', 'world.leaves-decay-all', 'interact.drop-birch'],
  '#052': ['registry.slab-model', 'physics.slab-stand', 'interact.slab-place-upgrade'],
  '#105': ['interact.torch-up', 'render.face-lit'],
  '#106': ['render.face-lit'],
  '#053': ['save.flat', 'registry.stairs-model', 'physics.stairs-walkup', 'interact.stairs-facing', 'items.stairs-craft'],
  '#054': ['items.hoe-craft', 'items.bread-craft', 'world.crop-grow', 'interact.till', 'interact.harvest', 'physics.farmland-trample', 'surv.bread'],
  '#058': ['world.stream-bounded', 'world.stream-save'],
  '#055': ['interact.portal-frame', 'game.warp', 'save.v2'],
  '#059': ['ui.book'],
  '#056': ['world.nether-gen', 'registry.nether', 'bed.nether-explode'],
};
for (const [k, arr] of Object.entries(L)) console.log(k + ': ' + arr.map((t) => (html.includes(t) ? 'OK' : 'MISSING:' + t)).join(' '));

const files = [
  'qa/2026-09-07/bucket-demo.png', 'qa/2026-09-07/torch-check2.png',
  'qa/2026-09-08/slab-scene3.png', 'qa/2026-09-08/torch-probe.png', 'qa/2026-09-08/faces-corner.png',
  'qa/2026-09-08/starter-world.png', 'qa/2026-09-08/slab-scene.png', 'qa/2026-09-08/place-black.png',
  'qa/2026-09-09/farm-scene.png', 'qa/2026-09-10/far-field.png', 'qa/2026-09-10/nether-warp.png',
  'qa/2026-09-12/nether-warp.png', 'qa/2026-09-12/nether-view.png', 'qa/2026-09-12/ui-book.png',
  'qa/2026-09-12/ui-inventory.png', 'qa/2026-09-12/drop-pickup.png', 'qa/2026-09-12/farm-scene.png',
  'qa/2026-09-12/stair-run.png', 'qa/2026-09-12/wool-wall.png', 'qa/2026-09-12/storage-wall.png',
  'qa/blocks/log-birch.png', 'qa/blocks/log-jungle.png', 'qa/blocks/planks-birch.png', 'qa/blocks/sapling-oak.png',
  'qa/blocks/stone_slab-stone.png', 'qa/blocks/stone_slab-cobblestone.png', 'qa/blocks/wooden_slab-oak.png',
  'qa/blocks/oak_stairs.png', 'qa/blocks/stone_stairs.png', 'qa/blocks/brick_stairs.png',
  'qa/blocks/netherrack.png', 'qa/blocks/quartz_ore.png', 'qa/blocks/wheat.png', 'qa/blocks/farmland.png',
];
for (const f of files) {
  const abs = p(...f.split('/'));
  console.log((existsSync(abs) ? String(statSync(abs).size).padStart(7) + ' B  ' : '  ABSENT ') + f);
}
for (const d of ['qa/2026-09-08', 'qa/2026-09-09', 'qa/2026-09-10', 'qa/2026-09-11', 'qa/2026-09-12']) {
  const abs = p(...d.split('/'));
  console.log(d + ': ' + (existsSync(abs) ? readdirSync(abs).join(', ') : '(dir absent)'));
}
