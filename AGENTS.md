# AGENTS.md — project STATE memory (1-minute grounding)
Law: docs/MASTERPROMPT.md · How we work: docs/PLAYBOOK.md (READ IT FULLY each session) · Spec: docs/REFERENCE.md

## Current state (2026-09-18, SPRINT 05 CLOSED - tag v0.5.0 @ 69bc47f. Sprint 06 NEXT: nether-II per SPK-9 (ghast+pigmen+fortress+nether-brick), #069 spider/enderman, #072 fidelity round 2; #071 watch.)
- #067 SHIPPED (piston-lite): push-1 + flush head (ext bit, greedy mask bit24), not-sticky, immovable list,
  alias tiles. LATENT FIX: rsOnSet/rsRescan unified isRsDef() - repeater/lamp/plate/button/piston had NEVER
  survived save->load (only wire/torch rescanned). 261/245 GREEN, 55 blocks. Smooth slide = out of lite scope.
- #044 SHIPPED (mob polish): visual yaw (part-orbit in buildMobVerts), poison II hook (surv.poison timer,
  floors 1hp, HUD tag), rare zombie table 2.5%x4, ACTIVE-DIM MOB PERSISTENCE (save v2 dims entry + respawn),
  loot = item entities for ALL deaths (burn-loss bug fixed; CF.dropItemEnt shared; +found #035's duplicate
  give line = silent 2x loot). Texture sheets stay #048's job. +5 asserts 263/247, video basic f08 zombie
  faces player. NEXT: #048 fidelity.
- #048 SHIPPED (core fidelity pass): 17 item icons (bone/arrow/gunpowder/string/feather/leather/ink_sac/egg/
  clay/brick/8 meats + rotten flesh) + item_quartz orphan fixed, glowstone = gold+dark-speckle, lit-lamp bloom,
  CF.fluidFreeze proof-shot gate (water sheet = clean pedestal), atlas GRID 12->14 (icons had overflowed the
  runtime paint rows - collision audit caught what would have silently eaten tnt/chest/bucket paints).
  Taste leftovers (furnace/table/glass/water-hue/bucket handle/F7 pool/all-sheet re-pass/mob skins) -> #072.
  263/247 GREEN, parity unchanged (honest). NEXT: #069 roster OR CLOSE ceremonies (video re-eval + audit #8 + v0.5.0).
- #068 SHIPPED: plates (entity-overlap scan in rsTick pre-pass, press set, strong-powers block ABOVE) +
  buttons (RMB chain head CF.pressButton, rs.bt until-map, stone 20gt/wood 30gt wiki-current, re-press
  refresh, powers own attach - the torch-rule exception). Full circuit complete: plate->dust->lamp live.
  Watch: #071 lamp mesh ~1s lag in headless captures only (engine state verified correct).
- #066 SHIPPED: lamp pair (123/124 1.12 ids), post-flood swap sweep, torch powers opposite-attach cell
  (lamp-over-floor-torch classic; inverter intact). Live video finale: lamp=LIT light=15 at end of
  torch->dust->repeater->dust. 256/240 GREEN, 50 blocks. Art polish (lit tile bloom) -> #048.
- #065 SHIPPED: repeater (painted tile functional:false, flat bits 0-3 = OUTPUT dir = yaw XOR 1, floor rule,
  pop; engine = Jacobi fixed-point passes (PURE), diode output-only injection, rsDue delay list fires +2gt in
  rsTick, off instant) + TORCH INVERTER (torch dies while attach block carries dust-on-top/repeater power;
  SUPV sign fixed to torch+vec). Live video probe: d5=10 -> repeater -> d7=14 boost through the REAL loop.
  +4 asserts -> 254/238 GREEN, 48 blocks. RMB delay-cycle 2/4/6/8 deferred. NEXT: #066 lamp (consumer of
  CF.rsPowerAt - first VISIBLE circuit state), then #067 piston-lite / #068 plate+button (exit criterion).
- #064 SHIPPED: src/redstone.js = SPK-8 model A (cells Set + full re-flood on dirty, idle 0, NO persistence,
  rsRescan on load). Blocks: redstone_wire (painted, functional:false) / redstone_torch (source 15, no light,
  painted) / redstone_ore (BLENDER +1 -> parity 59/399, y<16 veins). CF.rsPowerAt API ready for #065/#066.
- Sprint 05 issues 064-070 mirrored: redstone chain 064->065->066 (+067 piston/068 plate/button), carried
  #044/#048/#061, 069 spider/enderman, 070 SPK-9 nether scout. Exit: in-game lamp circuit + FULL video
  re-eval before audit #8 + v0.5.0.
- QUALITY LAW (user 2026-09-17): verify = DoD 4b GAMEPLAY VIDEO (`node tools/video.mjs basic seed=5` ->
  scripted-playback frames, REVIEW all, verdicts in Evidence; qa/videos is TEMPORARY/gitignored, auto-pruned,
  --clean; NEVER commit frames) + FULL re-evaluation video at SPRINT CLOSE before audit/tag. First run CAUGHT
  #063 (leaves blocked skylight = black tree shade + noon zombie farms; fixed + light.leaves-pass-sky assert;
  cellOpaque is THE light-opacity choke point - name 'leaves' now returns false). Rig = #062. Gate 242/226.
- Tags: v0.0.0 scaffold → v0.1.0 sprint01+fixes → v0.2.0 sprint02 closed -> v0.3.0 SPRINT 03 CLOSED (audit #6 READY-WITH-NOTES, 7 P3 fixed same-close) -> v0.4.0 SPRINT 04 CLOSED (audit #7 READY-WITH-NOTES, 0 P0/P1) -> v0.5.0 SPRINT 05 CLOSED (audit #8 READY-WITH-NOTES, 1 P1 fixed same-close).
- Sprint 03 CLOSED: #033 #035 #032 #036 #037 #038 #042 #039 #040 #041 #046 #047 #043 #034 ALL DONE (#043 closed
  #031 + fixed P1 atlas icon-stride bug; README+GitHub origin+issue mirror done).
  SPRINT 04 CLOSED: audit #7 READY-WITH-NOTES (0 P0/P1, 1 P2 + 5 P3 - F1 test.mjs budget-retry + F6 workbench
  title fixed same-close; F4 -> #061; F5 -> #048). (docs/sprints/04.md, issues 049-060 mirrored): nether/dimension FEAT (SPK-7 GO design!), #044 mob polish, #045 3x3 GUI,
  #048 fidelity (+F7 black patch), spider/enderman, redstone SPK (Tier-2 gate), infinite-streaming verify, recipe book.
    #049 #050 #051 #052 DONE (wood 29/399, wool 45, storage 50, SLABS multi-box model 53/399=13.3%).
    URGENT user reports #105 (torch upside-down = 3 bugs: chunk-local cross verts, emitter overwrote packed
    sky -> black flames, +UV verify) & #106 (3 faces black = lightCell float-index undefined->NaN -faces;
    +faces-corner stale-light; ALL lit now - biggest visual win) FIXED same-day, gate now 218/202.
    #053 DONE (stairs 56/399): oak/stone(=COBBLE!)/brick via centralised CF.boxesOf/cellOpaque model resolver
    (kills the 4-file bit-re-derivation that caused #105/#106); subRect per-face culling; CAUGHT+FIXED my own
    box-pass rewrite bug (subRect V-clamped-to-U -> every box face 0 pieces = all slabs/stairs flat, found by
    RE-checking slab-scene in vision); + latent CF.place undeclared `p` (bed RMB crash) + flat-array never
    saved (slab/torch/bed meta lost on reload) - both fixed w/ asserts; walkup/facing/craft/save.flat; 224/208.
    #060 DONE (polish, no parity): Q-drop item entities (throw/magnet/0.5s-delay/despawn) as atlas-icon
    billboards + pause-on-mouse-release/inventory with controls overlay + RMB contextmenu suppressed;
    +interact.q-drop; 225/209. (self-inflicted: my #053 edit had comment-swallowed cellHitsPlayer's
    `const p` -> every place crashed; caught instantly by the new test.)
    #054 DONE (farming v1, parity unchanged 56 - crop blocks functional:false procedural): hoe x4, farmland+
    trample, wheat/carrot/potato stage-growth (randomTick+CF.growCrop), 1.12 harvest tables, bread; +7 asserts
    232/216; latent-bug haul: tryCraft width-pad hole (hoe matched PICKAXE recipe), torch-code vs crop-stage
    clobber, #060 boot-pause = shot framing drift, makeWorld-touched CF.growCrop global, arena stomps AGAIN.
    #059 DONE (recipe book UI + THE 3x3 WORKBENCH GUI it exposed missing - UI had only 2x2, tools uncraftable in-game!; book =
    materials-filtered click-to-fill list; TDZ boot-killer + len-4 craft reset found; ui.book assert; overlay gated for shots)
    #058 DONE (streaming VERIFY - found NOTHING was ever evicted! R_KEEP=7 clean-chunk eviction + GL buffer free + dirty/genQueue/lightDone prune; stream-bounded
    (1920-block replay, resident<=225, queue drains) + stream-save (far tower roundtrip) asserts; far-field.png PASS; Tier-1 worldgen row flipped [x]).
    #055 DONE (NETHER PORTAL centerpieces, SPK-7 design executed): portal block (light11 cross, functional:false) +
    1.12 frame validation (corners OPTIONAL!) + flint&steel ignite ahead of TNT + CF.warp 8:1 (dims/BE-swap/
    renderReset/entity-wipes/search-or-build destination/warpArmed cooldown, trackWorld-before-edits re-earned)
    + PERSIST V2 {active,dims} w/ v1 auto-migration; +3 asserts (portal-frame/warp/save.v2), nether-warp.png
    reload-past-warp vision PASS; nether terrain = placeholder until #056. #045 closed via #059 (3x3 GUI).
    #056 DONE (REAL nether gen +2 parity=58/399): makeWorld{ nether } netherrack shell/lava-seas<=31/quartz/
    glowstone-hang (look-ahead - bottom-up loop can't read arr[y+1])/bedrock plates/NO sky/NO spawns + grounded
    portal BUILD (base=floor+1, was >=64 float) + red fog + bed-explodes(power5) + quartz item; CAUGHT
    blockshots harness using 1.12 id FIELD not sequential IDOF (mid-JSON inserts rendered WRONG blocks - sheets
    re-shot; PLAYBOOK); nether-view+nether-warp vision PASS; +3 asserts 241/225, 44 blocks.
    #057 DONE (SPK-8 GO - docs/spikes/SPK-8-redstone.md, src untouched): full re-flood per change = 0.07-2.6ms at
    bell->village scale (relight pattern, idle 0ms, power is DERIVED -> zero persistence work); dirty-graph not
    needed; sprint-05 redstone FEAT chain UNBLOCKED (dust/torch, repeater+fReady-style delay queue, lamp, piston-lite).
    SPRINT 04 CLOSED: audit #7 READY-WITH-NOTES (0 P0/P1, 1 P2 + 5 P3 - F1 gate-flake retried in test.mjs + F6
    workbench title fixed same-close; F2/F3 doc drift fixed here; F4 -> #061 suite-coupling, F5 quartz sheet -> #048).
    Backlog to 05: #044/#048/#061 (+poisonous_potato, +F7-black leftovers + torch flame tile art + mob drops/chain
    icons). - Gate: TEST GREEN 256 full / 240 quick (WALL ~180s since two-sided mesher - sim-time lies), 0 errors.
    Parity: 58/399 (TNT/chest/bed/portal functional:false -
  procedural tiles, not Blender; mechanics shipped+tested, not counted: honest)
  proof-bound: t1 43/125 (wood/wool/storage/slabs/stairs/farm-items era), t2 15/163 (+netherrack+quartz #056).
- Tier-1 mechanics done: worldgen/biomes/ores/caves/trees, render(greedy TWO-SIDED faces+AO-less shaded+light+fog),
  break/place/drops/tiers+crafting+smelting, items/inventory/UI, physics(snap-ratchet fixed #046), day/night, block+sky light,
  fluids v1, survival stats+HUD, save/load, F3 v2, torch per-face, MOB CORE v1 (entity physics, light<=7
  night/cave spawning survival-gated, sun burn, player-kill loot; mobs render as palette-lit boxes),
  MOB AI v1 (heap-A* chase + 1.12 melee + player 1.9 charge-meter combat, knockback, entity-over-mining),
  MOB ROSTER v2 (skeleton ranged+arrows, creeper fuse+1.12 ray-marched crater via src/explode.js).
  Remaining Tier-1: NONE (streaming verify #058 + recipe book #059 shipped; redstone-gated items are Tier-2).
  (mob roster + combat + spawn rules + TNT + chests + beds/sleep + weather + farming + nether-warp plumbing all DONE)
- Carried FIXes: #031 CLOSED via #046+#043 (banding 3 causes + buckets). #032 CLOSED it9.
- Nice dev seed: 5 = plains (all baselines use it). Play mode = open game/index.html (F4 survival, E inv,
  F3 debug; ?new=1 wipes saves, ?seed=N new world).

## Recent merges (newest first)
- SPRINT 05 CLOSE (this commit): audit #8 READY-WITH-NOTES - F1 P1 FOUND ON MY OWN WORK (mob.rare computed-
  but-never-asserted = phantom +1 claim; wired real, 263->264) + F2-F7 swept same-close (#048 evidence,
  tree/lava.png, PARITY 44/15 honest-fix, GH dedupe #108/#120, GIT-DEBT line deduped). Video re-eval: basic
  16f PASS (icons+glowstone+speckled-leaf sky+pigs+dusk) on final build. Review/retro/METRICS in sprints/05.
  TAG v0.5.0. Carries: #069 roster, #072 fidelity r2; watch #071 (headless-only lamp mesh lag).
- #044 mob polish bundle (sprint-05 it8): steer() already kept m.yaw for every movement mode - render now
  orbits box-part offsets (visual yaw, AABB hitboxes intact, mob.face assert + video f08 facing camera);
  survival S.poison (II-style 1dmg/40t floor-at-1, rotten 80%/chicken 30%, death-cleanses, HUD tag,
  CF.__roll seam); rare zombie drops 2.5%x4 no-looting ([TBC] resolved as the unenchanted row); save v2
  gained per-active-dim mobs list (cap64, type/pos/hp/baby, save.mobs respawn assert); ALL death loot
  becomes item entities (burn/fall loot-loss FIXED; dropItemEnt shared spawner; passive tests now
  walk-the-loot) + found a duplicated give line from #035 (2x loot) - removed. Mob texture sheets
  explicitly routed to #048. +5 asserts 263/247 GREEN; video basic re-recorded PASS.
- #070 SPK-9 nether-II scout (docs+spike only): fortress district stamp 44ms/16k-sets GO (trees-style
  in-generate pass, spread over genQueue budget), ghast fireball = CF.explode pwr1 0.05ms GO (explode.js +
  arrows projectile pattern), fly steering ~free (no A* for fliers), current nether gen 2.8ms/chunk noted
  (225ms full-view first-look, amortized by 2-chunk/tick budget). Sprint-06 split planned in
  docs/spikes/SPK-9-nether-ii.md (ghast, pigmen aggro-table, fortress stamp, nether-brick art).
- #067 piston-lite (sprint-05 it6): flood post-sweep actor - powered piston moves ONE ahead block (landing
  must be air; obsidian/piston/bedrock refuse), ext flat bit 4 -> mesher paints all faces 'piston_head'
  (bright plate) via greedy mask bit24 bucket (merge-consistent); retract unconditional on signal loss,
  moved block STAYS (not-sticky v1); smooth vertex slide deliberately CUT from lite (logged). Side/bottom
  tiles ALIAS planks/stone cells (zero atlas growth), face/head painted (0,160)/(160,176). Wiki recipe
  (3 planks, 4 cobble, iron, redstone). IMPORTANT latent fix: world.set hook + rsRescan now use one
  isRsDef() - before this, repeater/lamp/plate/button/piston blocks never re-entered rs.cells on LOAD
  (rescan was wire/torch-only) - circuits silently dead after reload; #064-era save test only proved dust.
  Live video probe: cobbleAt14=true ext=16. +2 asserts 261/245 GREEN, 55 blocks, parity honest.
- #068 pressure plate + button (sprint-05 it5, input glue): rsTick PRE-scan = player+mob feet-overlap for
  plates (idle-cheap, items skipped v1-documented) with press-diff -> dirty; buttons = until-map self-expiry,
  RMB pressButton at chain head, durations per CURRENT wiki (stone 20/wood 30 - issue's 10gt was stale);
  blockPowered + plate->above and button->own-attach (wiki exception). 4 registry blocks painted
  functional:false (parity honest). Test-haul: suite stood player in-plate (no physics) vs LIVE scenario
  lamp-over-head pushbug - scenario rebuilt as plate->dust->lamp ROW, engine was right both times; edge-
  centered teleports; craftOnce 9-slot + capture-before-fill. +3 asserts, 259/243 GREEN, 54 blocks.
  video plate run: ON (f02 amber+probe) / OFF (f05) frames prove input side live; f04 mesh-lag (engine OFF,
  mesh ~1s behind, headless-capture only) -> #071. NEXT: #067 piston-lite.
- #066 redstone lamp (sprint-05 it4, EXIT CRITERION): 1.12 pre-flatten id pair redstone_lamp(123)/
  lit_redstone_lamp(124), both painted functional:false (parity honest 59); lamps join rs.cells as '0' sinks;
  post-flood SWEEP sets/unsets lit via blockPowered (instant on; 1.12 2gt off-delay omitted v1).
  blockPowered + torch rule: lit torch powers cell OPPOSITE its attach (lamp-above-floor-torch) and never
  its own attach (inverter invariant). Craft corners/cross swapped first try - items.lamp-craft caught it.
  video-redstone finale: live probe lamp=LIT light=15; frames show warm glowing lamp at line end.
  +2 asserts, 256/240 GREEN, 50 blocks. Lit-tile art bloom -> #048.
- #065 repeater + torch inverter (sprint-05 it3): redstone.js passes became a pure Jacobi fixed-point
  (cap 6) with a post-stability sweep: repeaters conduct only when rs.on; switch-on scheduled on CF.rsDue
  (+2 game ticks, fReady pattern) and fires in rsTick BEFORE drain; signal loss = instant off. DIODE fix:
  injection spreads ONLY into the output cell (all-dir spread leaked power backward through the input).
  Inverter: torch seeds suppressed while blockPowered(attach) - attach = torch+SUPV[code] (sign fixed via
  world.js pop precedent); dust-on-top-of-attach powers it (interact.redstone-invert: out 0->14 across cut).
  Repeater block: painted (48,176) tile, floor rule + pop, flat bits 0-3 = OUTPUT dir = dirFromYaw ^ 1
  (a +1 vs XOR axis bug slipped past the single-direction assert, caught by the live video probe), recipe
  dust+torch+dust / slab+slab (wiki-verified). video-redstone extended: live probe d5=10 -> d7=14 BOOST.
  +4 asserts (delay/boost/facing+nofloor/invert), 254/238 GREEN, 48 blocks. Delay-setting cycle deferred.
- #064 redstone power core (sprint-05 it2, SPK-8 executed): new src/redstone.js module - per-world cells+power
  maps, full clear+BFS re-flood ONLY when an RS block changes (world.set hook; idle free verified by assert
  counter), game-loop rsTick, CF.rsPowerAt consumer API, load-time rsRescan (power derived, save bytes clean -
  save.redstone-derive). Blocks: wire (thin quad, floor rule + drop-table pop), rstorch (source, NO light 1.12,
  painted tiles y160/176 rows), redstone_ore (blender tile, y<16 vein, iron+, smelt->dust) -> +7 asserts
  (flood decay/cut/idle/dead, ore+pop, place rules, craft, smelt, registry), PARITY 58->59, 249/233 GREEN.
  video-redstone frames PASS (dust line + unlit torch + live d1=14/d5=10 title probe). THIRD sighting of the
  JSON-id-field landmine (hotId -> IDOF now) + my suite re-taught: restore inv after craft tests (ui.icon-live
  downstream) + re-capture CF.world after loadNow. Torch inverter -> #065.
- #061 suite decoupling (sprint-05 it1): runTests PRELUDE (CF.ready+CF.gl wait, ensureAround(player,4)+drain+
  ground, stopGameLoop for boot-less selections; boot still proves live ticking first) + save.v2 self-
  provisions the nether instance like CF.warp does. 11 suite singles + audit-F4 combos all GREEN (was 4 red);
  full 242/0, quick 226/0. Surgical --suites repro now works.
- #062+#063 (user video-QA law): tools/video.mjs + harness 'video-play' scripted driver (9 phases: walk/place/
  mine/jump-fall/GUI+book/combat-night/surface-walk-stream); law in DoD 4b + PLAYBOOK 7b (sprint-close
  re-evaluation pass; frames temporary, verdicts durable). Recording #1 caught #063: leaves opaque to skylight
  -> pitch-black canopies + noon zombie spawns (1.12 opacity=0); fix = cellOpaque leaves false + own-instance
  assert. Recording #2 all-PASS (lit shade, pig/sheep day herds, zombie fight + damage, stable streaming).
  Driver v2: 5s surface re-seat + tunnel-ahead stress (v1 wandered into caves = useless frames). 242/226 GREEN.
- SPRINT 04 CLOSE (this commit): audit #7 READY-WITH-NOTES (0 P0/P1; gate 241/225 + parity 58/399 independently
  reproduced by auditor). Same-close fixes: F1 test.mjs auto-retry w/ doubled virtual budget (boot starvation
  flake), F6 workbench panel title 'Crafting (E to close)' (ui.js titleEl + refresh, ui-book.png re-shot vision
  PASS), F2/F3 AGENTS parity/wall drift, #061 opened (suite order-coupling), F5 noted on #048. Review/retro in
  sprints/04.md; METRICS row 04 added. TAG v0.4.0.
- #057 SPK-8 redstone budget (docs+spike only, src untouched): pure-Node bench (spike/redstone-sim.mjs) of
  full re-flood (relight pattern) vs dirty-graph at chain-30/chain-200/village-2.4k scales. GO: A = 0.07-2.6ms/event,
  worst-case B == A, idle 0ms, power DERIVED -> NO persistence work (same trick as light). Escape hatch:
  per-region re-flood. Verdict + sprint-05 FEAT chain (dust/torch, repeater+delay queue, lamp, piston-lite) in
  docs/spikes/SPK-8-redstone.md. Tier-2 gate OPEN.
- #056 REAL NETHER GEN (+2 parity 58/399, 44 blocks): makeWorld(seed,{nether:true}) - netherrack floor/ceiling shell w/
  noise blobs, static lava seas (open cells <=31; un-edited chunks never tick fluids so seas don't churn), quartz_ore 1.4%,
  glowstone clusters hanging UNDER solids (look-ahead helper - bottom-up gen loop must NOT read arr[y+1]: first build had
  glow=0/lava=0/plates-broken, 3 bugs found by the world.nether-gen assert ITSELF), bedrock plates y0+y127, skylight
  seed =0 (1.12: no sun even through holes), no trees, natural mob spawns disabled. Portal build GROUNDED
  (base=max(heightAt+1,5); #055's >=64 float was built for placeholder terrain - nether-warp.png now shows sill on the
  floor w/ sea behind). Red fog override (activeDim) + bed-in-nether power-5 explode guard in trySleep. Blocks:
  netherrack (hand-harvest) + quartz_ore (pickaxe->NEW quartz item). HARNESS BUG CAUGHT: blockshots pedestal used the
  JSON id FIELD (matched sequential only by luck for old entries; my mid-JSON inserts rendered wool:red as quartz_ore!)
  -> now IDOF[name(:variant)] + debug titles; blockshots.mjs gained positional name filter. Palette calibrated ~2.2x
  (EMIT pipeline crush). +3 asserts (world.nether-gen, registry.nether, bed.nether-explode), 241/225 GREEN;
  nether-view.png + nether-warp.png re-shot vision PASS; qa/blocks/{netherrack,quartz_ore}.png counted honestly.
- #055 NETHER PORTAL + warp + persist v2 (SPK-7 design executed): portal block (light 11, cross tile_portal, functional:false)
  + 1.12 frame validation (2x3 interior, obsidian sill/cap/pillars, CORNERS OPTIONAL - issue body over-strict, 1.12 wins)
  + flint&steel ignite brute-forcing 6 origins, routed ahead of TNT in useFlintSteel; CF.warp = dim map + per-dim BE
  swap + renderReset + mob/tnt/itemEnt/projectile wipes + 8:1 both ways + destination portal SEARCH (r<=16) else
  deterministic BUILD (base>=64; needs ensureAround+drain first - set() is silent no-op on ungenerated chunks) +
  warpArmed cooldown; nether world = seed^0x5EED made lazily w/ CF.trackWorld BEFORE first edit. PERSIST V2:
  {active, dims:{over,nether}} per-dim chunks/flats/bes, player on active dim, v1 blobs auto-migrate
  (loadNow._migrated), per-dim BE orphan prune. +3 asserts (interact.portal-frame, game.warp, save.v2), 238/222;
  nether-warp.png (ignite->warp->save->reload->sill camera w/ LOS carve; title probe proves pos+dim survive) vision PASS.
  Nether terrain still overworld-placeholder -> #056. #045 (3x3 GUI) verified closed via #059.
- #059 recipe book UI + THE 3x3 WORKBENCH GUI it exposed missing: right-click crafting_table -> uiOpenWorkbench (9-slot
  CF.ui.craft, 2x2 mode = lattice 0/1/3/4 hidden+guarded, close returns all); book = panel of recipes the current
  inventory can pay for AND that fit the lattice (2x2 correctly hides tool shapes - matches MC), click = bookFill
  (grid->inv return, take ingredients, place pattern). MC "discovered" persistence deferred. OUTED: pre-#059 tools
  were NOT craftable in-game (2x2-only UI; items tests hit tryCraft directly - parity row honesty note added);
  TDZ let-bookEl killed boot page-wide (module lets must precede build()); an old test reset craft to len-4; pause
  overlay now gated on CF.shotName for all shots. +1 assert ui.book, 235/219; ui-book/ui-inventory vision PASS.
- #058 streaming verify: the Tier-1 "infinite world" claim was UNVERIFIED - nothing was ever evicted (chunks/meshMap GL/
  lightDone grew unboundedly). Added R_KEEP=7 clean-chunk eviction (edited chunks stay until persistence lands them),
  VAO/VBO free on evict, dirty/genQueue/lightDone prune, renderTick guards. 1920-block diagonal replay + 600-tick real
  walk: resident chunks capped <=225, queues drain 0, far tower survives save/load (found: persist wrappers must be
  installed BEFORE edits or edits go unsaved). world.stream-bounded/save asserts, far-field.png PASS (needed
  CF_BUDGET/CF_TIMEOUT env in shot.mjs - software GL). Tier-1 worldgen row flipped [x]. 234/218 GREEN.
- #054 farming v1: hoe x4 (1.12 patterns) till->farmland (+trample revert on empty-landing, sneak/crop safe),
  wheat/carrot/potato cross crops with flat-bit stages -> stageTiles in the SAME cross pass, randomTick growth +
  CF.growCrop API (light-gated; force=bone-meal hook), 1.12 harvest tables, bread(+5). Farm item icons landed.
  Test-haul: tryCraft width-padding hole (hoe matched the PICKAXE recipe - could have shipped a wrong table!),
  torch face-code clobbering crop stage bits, #060 boot-pause = shot-framing drift (pause now only after first
  lock), makeWorld() must not touch CF globals (deterministic-test world hijacked CF.growCrop), crop-test arena
  stomped the 120,120 mob/bed turf -> moved to 200,200. +7 asserts 232/216 GREEN; farm-scene vision PASS;
  blocks functional:false honest (procedural art -> #048; poisonous_potato/hydration deferred).
- #060 Q-drop/pause/RMB polish: item entities (throw physics w/ solidSpanXZ + cellTopAt rest + 0.5s pickup
  delay + 1.6 magnet + 6000t despawn + 200 cap) rendered as atlas-icon crossed billboards (new dynamic VBO
  pass, same shader/unit0); sim freezes on pointer-unlock or inventory-open w/ controls overlay (freeCam/
  scripted/sleeping exempt so harness safe); contextmenu preventDefault. Caught my own #053 self-inflicted
  wound: an Edit had comment-swallowed cellHitsPlayer's `const p` -> EVERY CF.place threw. +1 assert 225/209.
- #053 stairs (56/399): centralised CF.boxesOf/cellOpaque model resolver (slab+stairs, mesher+physics+placement+
  relight all consume it - ends the per-file flat-bit drift behind #105/#106); 1.12-true mapping (stone_stairs=
  cobble tex, brick 108); subRect face-culling; FOUND+FIXED my own rewrite bug (subRect V-clamped-to-U zeroed all
  box faces -> slab/stairs flat, caught by RE-running slab-scene vision) + 2 latent gaps (CF.place undeclared `p`
  = bed RMB in-game crash; chunk flat-array never SAVED = slab/torch/bed meta lost on reload); box-vs-box physics
  + footprint-aware landing; +5 asserts, 224/208, 4 sheets+stair-run vision PASS.
- #105+#106 same-day user-report fix (torch triple-bug: chunk-local cross verts + emitter overwrote packed
  sky light + UV verify; black -faces: lightCell() float-index -> undefined->NaN on every plane-0.001 sample;
  faces-corner stale-light scenario bug; slab skylight passability RE-ADDED post-bisect; 6 new PLAYBOOK
  lessons incl. "never rationalize suspicious black in vision QA"); 218/202 GREEN, 4 scenes vision PASS.
- GIT DEBT: #051 direct-commit on main (90a1fe3) - rule restored from #052; see PLAYBOOK process line.
- #052 slabs: multi-box model class (v.boxes + flat bits 2/4; mesher coverFace; physics cellTopAt
  stand@+0.5; top-face upgrade->double drops 2; slabs pass skylight 1.12). Found+fixed 5 latent bugs incl.
  boxes-at-chunk-origin + abs-UV. stone_slab cobble/stone + wooden oak; 216/200; slab-scene vision PASS.
- #049 wood II: birch/jungle (log/planks/leaves) + sapling blocks w/ deterministic growSapling API + name-based
  decay + 20pct birch gen; atlas GRID12 192px + numpy icon pass (Cycles flattened icon alpha = black boxes);
  fixed 4 latent bugs: NaN liquid UVs (const A shadowed by coord A - water rendered green since #043!),
  torch flip since #024, faces culled under non-solid neighbors, water/glass alpha restore; 209/193, 29/399
- #050 wool: 16 colors (ramp tiles; catalog needs labels[] for families!) wool-wall vision PASS; 211/195, 45/399
- #051 storage: gold/iron/diamond/brick/clay + 9<->1 recipes + clay_ball smelt + dropN (clay x4) +
  storage-wall vision PASS; interact tests must NOT inv.fill before place-test; 214/198, 50/399; mossy->vines
- #043 fluids+buckets: 1.12 buckets (7 asserts, stack-1, source-only fetch, place=source, self-refuse),
  water5/lava30 spread delay + mover-resolves-contact + lava-light-seeding fix, live --cfatlas painted
  icons, P1: gen.py icon stride (items baked OVER blocks all sprint 02) -> atlas regenerated collision-
  free, paints -> y96/112 free cells, relight perf rule (covered-cell test), 203/191 GREEN, PARITY 20/399,
  #031 closed, 25 sheets + bucket-demo vision PASS; fidelity leftovers -> #048
- 1dbbc8e #034 SPK-7 GO: dual makeWorld instances measured pure (49ch/50ms gen, 5ms/100 idle ticks both
  alive, 96KB/chunk, mesh-all swap 1300ms, 195 CF.world refs all dynamic -> swap = reassign + renderReset);
  shipped only the CF.makeWorld export; nether FEAT design recorded for sprint 04+ (persist v2 dims map!)
- #043 fluids+buckets: 1.12 buckets (7 asserts, stack-1, source-only fetch, place=source, self-refuse),
  water5/lava30 spread delay + mover-resolves-contact + lava-light-seeding fix, live --cfatlas painted
  icons, P1: gen.py icon stride (items baked OVER blocks all sprint 02) -> atlas regenerated collision-
  free, paints -> y96/112 free cells, relight perf rule (covered-cell test), 203/191 GREEN, PARITY 20/399,
  #031 closed, 25 sheets + bucket-demo vision PASS; fidelity leftovers -> #048
- #047 game-feel: crosshair #xh (mix-blend difference, hidden in GUIs) + rAF camera
  interpolation (prevPos lerp) + ui.crosshair/ui.stand-rock-still asserts (195 full/184 quick); HUD append
  made synchronous; the "bounce" root fix itself shipped under #046
- 2055be6 #046 two-sided faces: mesher -axis passes (solids+liquid sides, UV-mirror, shade 0.7/0.45) +
  landing-snap RATCHET fix (penetrated-pos + push-up; player bounce was center/feet round line) +
  W.dirty-drain pixel-test rule + render.face-back + faces-corner/mob-px shots vision PASS + quick-timeout 240s;
  fluid banding shots PASS only in #043-tree state (repaint+depthMask unmerged there); #031 closes with #043
- 40ce5d7 #041 bed+weather: 2-cell bed (flat dir/head bits), sleep night-window + monster guard + spawn@head +
  dawn skip + rain clear; rain/thunder cycles + lightning strike (overcast sky, flash, blast camera shake);
  +10 asserts; bed-sleep/storm-sky vision PASS
- #040 chest: 27-slot container UI ('cs' slots on #032 plumbing), chest<->inv quickmove, break-ejects contents,
  procedural chest tiles in free atlas cells, **BE save/load added (fixes latent furnace-contents-lost bug)**;
  +7 asserts; ui-chest.png vision PASS; chest functional:false honest (not Blender-sourced)
- #039 spawn rules: per-chunk scheduler (attempt-budget), MC caps 70/10/15 via CF.spawnRules, 24..128 band,
  aged-random despawn (1/(d-31) after 600t), passives persistent; +3 asserts; mob-crowd.png vision PASS;
  break-on-visit-budget bug caught+fixed (always-scanned same near chunks -> zero spawns)
- 242c1c1 #042 TNT: src/tnt.js (prime/fuse80/chain) + power-4 via #037 explode; flint&steel RMB; procedural TNT
  atlas tile in free cell (parity untouched, functional:false honest); +6 asserts (172 full/161 quick); tnt-fuse.png
- #038 passives: pig/cow/sheep (wander RandomStroll + flee + breed feed->love->baby 6000t grow + per-species
  drop + passive spawn grass/day + never-despawn); mob-farm.png vision PASS; +14 asserts; `node --check` added
  to gate (duplicate const in shared fn scope silently kills bundle/boot-hangs)
- #037 skeleton+creeper: src/explode.js (1.12 ray-marched crater, blastRes/5, shared w/ #042) + skeleton ranged
  (arrow projectiles, ballistic aim, keep 4-15) + creeper fuse/swell/abort; palette 8->16; +8 asserts; mob-* shots
- #036 mob AI: heap-A* (SPK-4 ALT: cap1500, budget2/tick, sense35, step-up) chase + 1.12 melee (3dmg NORMAL,
  10t invuln) + player 1.9 charge meter (sword12/tool20/hand5t, entity-over-mining priority, knockback);
  +12 asserts, mob-fight.png/mob-chase.png vision PASS; stopGameLoop-in-shot = black-frame lesson -> PLAYBOOK
- #032 furnace GUI: ui.js container slots+panel (burn/cook bars), RMB useBlock routing, furnaceBreak
  returns contents; furnace functional:true proof-bound -> parity 18/399; +7 ui.furn-* asserts
- #035 mob core: src/mobs.js (CF.mobs entity store, physics sweep, light<=7 spawn, sun burn, loot) +
  render mob pass (palette tex unit1, SAME shader, atlas untouched) + night-mobs.png; +18 asserts
- be32c08 #033 suite split (--quick 32s; CF.stopGameLoop fix)
- v0.2.0 close: sprint02 review/retro + audit#4 (1 P1 escaped: false furnace-UI checkbox -> #032)
- #028 torch per-face attach+pop · #027 F3v2 · #026 survival+HUD · #025 UI · #022 fluids+obsidian/
  cobble/stone rules (banding carved #031) · #024 items/craft/smelting/cross-torch · #021 day/night ·
  #020 light engine+glowstone · #019 leaves decay/drops · #023 save/load · audits #2/#3 + #029/#030
- v0.1.x: #002-#009 sprint01 core + audit#1 (#010-#019) · #001 spikes (SPK-1..6: GO / SPK-4 ALT=heap A*)

## Architecture pointers (code comments are authoritative)
registry.js → world.js (chunks/light/flat-fluids/decay) → render.js (opaque|cross|liquid + MOB passes) →
player.js → items.js → interact.js → ui.js → survival.js → persist.js → f3.js → mobs.js (entities;
CF.mobTick in game loop, spawn survival-gated) → game.js → harness.js.
tools/: build/test/shot/parity/blockshots/tex. All zero-dependency. PowerShell quirks + WebGL rules
+ probe patterns: see PLAYBOOK §4 before touching render/fluids/harness — each gotcha cost hours once.

## Update ritual (every merge, in the merge commit)
This file's state+merges sections · docs/PARITY.md rows (evidence-annotated) · sprint tracker row +
daily · issue Evidence+vision verdicts · GAMEPLAY CHANGES ALSO: video.mjs frames reviewed + verdicts
(DoD 4b; sprint close = full re-record + review BEFORE audit/tag). New hard process lesson → PLAYBOOK.md, not here.
- GIT DEBT: #066 direct commit 42639e6 + #067 direct commit 6a3ede6 on main (branch slipped after it3; #068/#044/#048 went back on branches). Rule stands: branch BEFORE coding.
