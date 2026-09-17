# Issue: 066 — redstone lamp
- Type: FEAT | Status: READY | Epic: Redstone | Sprint: 05 | Depends: #064

1.12: lamp unlit (light 0) becomes lit (light 15, brighter tile) when any of its 6 neighbor cells is
POWERED (adjacent dust power>0, direct torch, or repeater output face). Lit is a STATE (second block
variant or flat-bit like furnace-lit? - v1: separate block id redstone_lamp vs lit internal state via
flat bit + BY variant tile swap = furnace pattern precedent? DECIDE in DoR: cheap = one block + bit +
tile override at mesh time). Re-fires on power nibble change (flood marks dirty already). Recipe: 4 glowstone
+ 5 redstone dust. No natural state persistence needed (derived again).
ACs:
- [ ] world.lamp-on/off asserts (dust powers lamp; removing dust extinguishes; light 15 nibble)
- [ ] items.lamp-craft assert
- [ ] shot: lamp wall scene (lit vs unlit row) vision PASS + video phase
- [ ] registry: lamp functional:false honest (procedural) until Blender art (#048 queue)
