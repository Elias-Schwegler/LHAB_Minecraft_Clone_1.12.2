# gen.py — Cubeforge texture generator (SPK-2, becomes sprint pipeline). Headless Blender:
# blender --background --python tools/tex/gen.py
# Procedural per-tile Cycles renders (emission = exact colors), packed to RGBA atlas
# tools/tex/atlas.png (8x8 grid of 16px tiles) + manifest atlas.json + sheet for vision QA.
import bpy, bmesh, json, math, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE
SIZE = 16
GRID = 12  # 12x12 tile grid (192px) - #049 pushed past 64 cells (species + saplings + room for paints)

def srgb2lin(c):
    return tuple((v/12.92 if v <= 0.04045 else ((v+0.055)/1.055)**2.4) for v in c)

def hexc(h):
    return srgb2lin(((int(h[1:3],16))/255,(int(h[3:5],16))/255,(int(h[5:7],16))/255)) + (1.0,)

def new_mat():
    m = bpy.data.materials.new("t")
    m.use_nodes = True
    nt = m.node_tree
    em = nt.nodes.new("ShaderNodeEmission")
    out = nt.nodes.get("Material Output")
    for l in list(out.inputs["Surface"].links): nt.links.remove(l)
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return m, nt, em  # color -> em.inputs["Color"]; alpha: add transparency manually

def ramp(nt, fac, colors, interpol='EASE'):
    r = nt.nodes.new("ShaderNodeValToRGB")
    cr = r.color_ramp
    while len(cr.elements) > 2: cr.elements.remove(cr.elements[-1])
    e0, e1 = cr.elements[0], cr.elements[1]
    if len(colors) > 2:
        for i, c in enumerate(colors):
            el = e0 if i == 0 else (e1 if i == len(colors)-1 else cr.elements.new(i/(len(colors)-1)))
            el.color = c
    else:
        e0.color, e1.color = colors[0], colors[1]
    e0.position, e1.position = 0.0, 1.0
    cr.interpolation = interpol
    nt.links.new(fac, r.inputs["Fac"])
    return r.outputs["Color"]

def noise(nt, scale):
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = 2.0
    return n.outputs["Fac"]

def voronoi(nt, scale):
    v = nt.nodes.new("ShaderNodeTexVoronoi")
    v.inputs["Scale"].default_value = scale
    return v.outputs["Distance"]

def wave(nt, scale, rot=0.0):
    w = nt.nodes.new("ShaderNodeTexWave")
    w.inputs["Scale"].default_value = scale
    mp = nt.nodes.new("ShaderNodeMapping")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp.inputs["Rotation"].default_value = (0, 0, rot)
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], w.inputs["Vector"])
    return w.outputs["Fac"]

def mix(nt, fac, a, b):
    m = nt.nodes.new("ShaderNodeMix")
    m.data_type = 'RGBA'
    if isinstance(fac, str): fac = float(fac)
    if hasattr(fac, 'node'): nt.links.new(fac, m.inputs["Factor"])
    else: m.inputs["Factor"].default_value = fac
    if hasattr(a, 'node'): nt.links.new(a, m.inputs[6])
    else: m.inputs[6].default_value = a
    if hasattr(b, 'node'): nt.links.new(b, m.inputs[7])
    else: m.inputs[7].default_value = b
    return m.outputs[2]

def gen_tiles():
    T = {}
    def add(name, build): T[name] = build
    add("grass_top", lambda m, nt, em: nt.links.new(
        ramp(nt, noise(nt, 7.0), [hexc("#3a7d22"), hexc("#54a03a"), hexc("#2f6b1c")]), em.inputs["Color"]))
    def grass_side(m, nt, em):
        dirt = ramp(nt, noise(nt, 8.0), [hexc("#7a5b3a"), hexc("#8b6b46")])
        gr = ramp(nt, noise(nt, 6.0), [hexc("#3a7d22"), hexc("#54a03a")])
        tc = nt.nodes.new("ShaderNodeTexCoord")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
        edge = nt.nodes.new("ShaderNodeMath"); edge.operation = 'GREATER_THAN'
        edge.inputs[1].default_value = 0.0  # placeholder, set below: y + jitter > 0.85
        jit = nt.nodes.new("ShaderNodeMath"); jit.operation = 'MULTIPLY_ADD'
        nt.links.new(noise(nt, 5.0), jit.inputs[0]); jit.inputs[1].default_value = 0.12; jit.inputs[2].default_value = 0.0
        addn = nt.nodes.new("ShaderNodeMath"); addn.operation = 'ADD'
        nt.links.new(sep.outputs["Y"], addn.inputs[0]); nt.links.new(jit.outputs[0], addn.inputs[1])
        nt.links.new(addn.outputs[0], edge.inputs[0]); edge.inputs[1].default_value = 0.86
        nt.links.new(mix(nt, edge.outputs[0], dirt, gr), em.inputs["Color"])
    add("grass_side", grass_side)
    add("dirt", lambda m, nt, em: nt.links.new(
        ramp(nt, noise(nt, 9.0), [hexc("#6b4a2c"), hexc("#8a6a42"), hexc("#5b3f26")]), em.inputs["Color"]))
    def stone(m, nt, em):
        nt.links.new(ramp(nt, noise(nt, 5.0), [hexc("#7e7e82"), hexc("#9a9aa0"), hexc("#6e6e74")]), em.inputs["Color"])
    add("stone", stone)
    def cobble(m, nt, em):
        b = nt.nodes.new("ShaderNodeTexBrick")
        b.inputs["Scale"].default_value = 2.5
        b.inputs["Mortar Size"].default_value = 0.06
        b.inputs["Color1"].default_value = hexc("#8a8a8e")
        b.inputs["Color2"].default_value = hexc("#75757b")
        b.inputs["Mortar"].default_value = hexc("#4a4a4e")
        mx = nt.nodes.new("ShaderNodeMix"); mx.data_type='RGBA'; mx.blend_type='MULTIPLY'; mx.inputs["Factor"].default_value=0.35
        nt.links.new(b.outputs["Color"], mx.inputs[6])
        nt.links.new(ramp(nt, voronoi(nt, 3.0), [hexc("#606066"), hexc("#ffffff")]), mx.inputs[7])
        nt.links.new(mx.outputs[2], em.inputs["Color"])
    add("cobblestone", cobble)
    # ---- #052 slab materials: builder,mat-fn -> slab_<mat>_{top,bottom,side} ----
    def slab_variant(suffix, matfn, scale_y, shift):
        def f(m, nt, em):
            matfn(m, nt, em)
            tc = nt.nodes.new("ShaderNodeTexCoord")
            mapn = nt.nodes.new("ShaderNodeMapping")
            mapn.inputs["Scale"].default_value = (1.0, scale_y, 1.0)
            mapn.inputs["Location"].default_value = (0.0, shift, 0.0)
            nt.links.new(tc.outputs["Generated"], mapn.inputs["Vector"])
            for nd in nt.nodes:
                if nd.type == 'TEX_NOISE' or nd.type == 'TEX_BRICK' or nd.type == 'TEX_VORONOI':
                    for l in list(nd.inputs['Vector'].links):
                        nt.links.remove(l)
                    nt.links.new(mapn.outputs["Vector"], nd.inputs["Vector"])
        return f
    for smat, sfn in [("stone", stone), ("cobblestone", cobble)]:
        add("slab_" + smat + "_top", sfn)
        add("slab_" + smat + "_bottom", slab_variant("bottom", sfn, 1.0, 0.5))
        add("slab_" + smat + "_side", slab_variant("side", sfn, 0.5, 0.0))
    def planks(m, nt, em):
        b = nt.nodes.new("ShaderNodeTexBrick")
        b.inputs["Scale"].default_value = 2.0
        b.inputs["Mortar Size"].default_value = 0.035
        b.inputs["Color1"].default_value = hexc("#9c7f4e")
        b.inputs["Color2"].default_value = hexc("#8d7143")
        b.inputs["Mortar"].default_value = hexc("#5b431f")
        w = wave(nt, 14.0, 0.0)
        grain = ramp(nt, w, [hexc("#8a6f42"), hexc("#a08454")])
        mx = nt.nodes.new("ShaderNodeMix"); mx.data_type='RGBA'; mx.blend_type='MULTIPLY'; mx.inputs["Factor"].default_value=0.4
        nt.links.new(b.outputs["Color"], mx.inputs[6]); nt.links.new(grain, mx.inputs[7])
        nt.links.new(mx.outputs[2], em.inputs["Color"])
    add("planks_oak", planks)
    def log_side(m, nt, em):
        w = wave(nt, 6.0, math.radians(90))
        bark = ramp(nt, w, [hexc("#5a4324"), hexc("#7a5c33"), hexc("#4a361c")])
        nt.links.new(bark, em.inputs["Color"])
    add("log_side_oak", log_side)
    def log_top(m, nt, em):
        tc = nt.nodes.new("ShaderNodeTexCoord")
        sub = nt.nodes.new("ShaderNodeVectorMath"); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = (0.5, 0.5, 0.5)
        nt.links.new(tc.outputs["Generated"], sub.inputs[0])
        ln = nt.nodes.new("ShaderNodeVectorMath"); ln.operation = 'LENGTH'
        nt.links.new(sub.outputs[0], ln.inputs[0])
        muln = nt.nodes.new("ShaderNodeMath"); muln.operation = 'MULTIPLY'; muln.inputs[1].default_value = 28.0
        nt.links.new(ln.outputs["Value"], muln.inputs[0])
        sn = nt.nodes.new("ShaderNodeMath"); sn.operation = 'SINE'
        nt.links.new(muln.outputs[0], sn.inputs[0])
        nt.links.new(ramp(nt, sn.outputs[0], [hexc("#c8a060"), hexc("#6a4c22")]), em.inputs["Color"])
    add("log_top_oak", log_top)
    add("sand", lambda m, nt, em: nt.links.new(
        ramp(nt, noise(nt, 12.0), [hexc("#dbd0a0"), hexc("#e8dfb8"), hexc("#cfc290")]), em.inputs["Color"]))
    add("gravel", lambda m, nt, em: nt.links.new(
        ramp(nt, voronoi(nt, 6.0), [hexc("#7d7d80"), hexc("#9a938a"), hexc("#5f5f63")]), em.inputs["Color"]))
    add("bedrock", lambda m, nt, em: nt.links.new(
        ramp(nt, voronoi(nt, 5.0), [hexc("#8f8f97"), hexc("#585860"), hexc("#2a2a2e")]), em.inputs["Color"]))
    def ore(base, blob):
        def f(m, nt, em):
            st = ramp(nt, noise(nt, 5.0), [hexc(base), hexc("#9a9aa0")])
            mask = nt.nodes.new("ShaderNodeMath"); mask.operation = 'GREATER_THAN'; mask.inputs[1].default_value = 0.55
            nt.links.new(voronoi(nt, 4.0), mask.inputs[0])
            nt.links.new(mix(nt, mask.outputs[0], st, hexc(blob)), em.inputs["Color"])
        return f
    add("coal_ore", ore("#7e7e82", "#1a1a1a"))
    add("iron_ore", ore("#7e7e82", "#c8a878"))
    add("gold_ore", ore("#7e7e82", "#f8d858"))
    add("diamond_ore", ore("#7e7e82", "#5cdcd4"))
    def water(m, nt, em):
        c = ramp(nt, noise(nt, 6.0), [hexc("#2253c8"), hexc("#3a6fd8")])
        nt.links.new(c, em.inputs["Color"])
        tp = nt.nodes.new("ShaderNodeBsdfTransparent")
        mixs = nt.nodes.new("ShaderNodeMixShader")
        mixs.inputs["Fac"].default_value = 0.15
        nt.links.new(tp.outputs[0], mixs.inputs[1])
        nt.links.new(em.outputs[0], mixs.inputs[2])
        out = nt.nodes.get("Material Output")
        for l in list(out.inputs["Surface"].links): nt.links.remove(l)
        nt.links.new(mixs.outputs[0], out.inputs["Surface"])
    add("water", water)
    def lava(m, nt, em):
        c = ramp(nt, noise(nt, 5.0), [hexc("#c8380a"), hexc("#e86818"), hexc("#f8a028")])
        v = ramp(nt, voronoi(nt, 4.0), [hexc("#601000"), hexc("#f8c858")])
        mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = 'RGBA'; mx.blend_type = 'OVERLAY'; mx.inputs["Factor"].default_value = 0.5
        nt.links.new(c, mx.inputs[6]); nt.links.new(v, mx.inputs[7])
        nt.links.new(mx.outputs[2], em.inputs["Color"])
    add("lava", lava)
    def glass(m, nt, em):
        tc = nt.nodes.new("ShaderNodeTexCoord")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
        def edge_of(ch):
            inv = nt.nodes.new("ShaderNodeMath"); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
            nt.links.new(sep.outputs[ch], inv.inputs[1])
            mn = nt.nodes.new("ShaderNodeMath"); mn.operation = 'MINIMUM'
            nt.links.new(sep.outputs[ch], mn.inputs[0]); nt.links.new(inv.outputs[0], mn.inputs[1])
            return mn.outputs[0]
        m1 = edge_of("X"); m2 = edge_of("Y")
        m0 = nt.nodes.new("ShaderNodeMath"); m0.operation = 'MINIMUM'
        nt.links.new(m1, m0.inputs[0]); nt.links.new(m2, m0.inputs[1])
        fr = nt.nodes.new("ShaderNodeMath"); fr.operation = 'LESS_THAN'; fr.inputs[1].default_value = 0.08
        nt.links.new(m0.outputs[0], fr.inputs[0])
        em.inputs["Color"].default_value = hexc("#d8f0f4")
        tp = nt.nodes.new("ShaderNodeBsdfTransparent")
        mixs = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(fr.outputs[0], mixs.inputs["Fac"])
        nt.links.new(tp.outputs[0], mixs.inputs[1])
        nt.links.new(em.outputs[0], mixs.inputs[2])
        out = nt.nodes.get("Material Output")
        for l in list(out.inputs["Surface"].links): nt.links.remove(l)
        nt.links.new(mixs.outputs[0], out.inputs["Surface"])
    add("glass", glass)
    def leaves(m, nt, em):
        nv = noise(nt, 9.0)
        base = ramp(nt, nv, [hexc("#2f6b1c"), hexc("#4f8f2f"), hexc("#3a7d22")])
        holes = nt.nodes.new("ShaderNodeMix"); holes.data_type='RGBA'; holes.blend_type='MULTIPLY'; holes.inputs["Factor"].default_value = 0.55
        nt.links.new(base, holes.inputs[6])
        nt.links.new(ramp(nt, voronoi(nt, 3.5), [hexc("#1e4a12"), hexc("#e8ffe0")]), holes.inputs[7])
        nt.links.new(holes.outputs[2], em.inputs["Color"])
    add("leaves_oak", leaves)
    # ---- #049 wood species II: birch + jungle (parameterized oak builders, 1.12 palettes) ----
    def planks_c(c1, c2, mort):
        def f(m, nt, em):
            b = nt.nodes.new("ShaderNodeTexBrick")
            b.inputs["Scale"].default_value = 2.0
            b.inputs["Mortar Size"].default_value = 0.035
            b.inputs["Color1"].default_value = hexc(c1)
            b.inputs["Color2"].default_value = hexc(c2)
            b.inputs["Mortar"].default_value = hexc(mort)
            w = wave(nt, 14.0, 0.0)
            grain = ramp(nt, w, [hexc(c2), hexc(c1)])
            mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs["Factor"].default_value = 0.4
            nt.links.new(b.outputs["Color"], mx.inputs[6]); nt.links.new(grain, mx.inputs[7])
            nt.links.new(mx.outputs[2], em.inputs["Color"])
        return f
    add("planks_birch", planks_c("#c4b89a", "#b3a483", "#77715f"))
    add("planks_jungle", planks_c("#b7a166", "#a28d55", "#6f5f3a"))
    def log_side_c(pal, ring):
        def f(m, nt, em):
            w = wave(nt, 6.0, math.radians(90))
            bark = ramp(nt, w, [hexc(x) for x in pal])
            if ring:
                n2 = noise(nt, 3.0)
                gt = nt.nodes.new("ShaderNodeMath"); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.75
                nt.links.new(n2, gt.inputs[0])
                mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = 'RGBA'; mx.blend_type = 'MIX'; mx.inputs["Factor"].default_value = 0.0
                nt.links.new(bark, mx.inputs[6]); nt.links.new(ramp(nt, gt.outputs[0], [hexc(ring), hexc(ring)]), mx.inputs[7])
                nt.links.new(mx.outputs[2], em.inputs["Color"])
            else:
                nt.links.new(bark, em.inputs["Color"])
        return f
    add("log_side_birch", log_side_c(["#c4c0ac", "#d8d4c2", "#a09c8c"], "#6e6a58"))  # near-white bark, dark spots
    add("log_side_jungle", log_side_c(["#584330", "#6b5238", "#483624"], "#3a2c1c"))  # dark streaky
    def log_top_c(ring_a, ring_b):
        def f(m, nt, em):
            tc = nt.nodes.new("ShaderNodeTexCoord")
            sub = nt.nodes.new("ShaderNodeVectorMath"); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = (0.5, 0.5, 0.5)
            nt.links.new(tc.outputs["Generated"], sub.inputs[0])
            ln = nt.nodes.new("ShaderNodeVectorMath"); ln.operation = 'LENGTH'
            nt.links.new(sub.outputs[0], ln.inputs[0])
            muln = nt.nodes.new("ShaderNodeMath"); muln.operation = 'MULTIPLY'; muln.inputs[1].default_value = 28.0
            nt.links.new(ln.outputs["Value"], muln.inputs[0])
            sn = nt.nodes.new("ShaderNodeMath"); sn.operation = 'SINE'
            nt.links.new(muln.outputs[0], sn.inputs[0])
            nt.links.new(ramp(nt, sn.outputs[0], [hexc(ring_a), hexc(ring_b)]), em.inputs["Color"])
        return f
    add("log_top_birch", log_top_c("#c8b078", "#7a5c2e"))
    add("log_top_jungle", log_top_c("#b98f52", "#6a4522"))
    def leaves_c(g1, g2, g3, dk):
        def f(m, nt, em):
            nv = noise(nt, 9.0)
            base = ramp(nt, nv, [hexc(g1), hexc(g2), hexc(g3)])
            holes = nt.nodes.new("ShaderNodeMix"); holes.data_type = 'RGBA'; holes.blend_type = 'MULTIPLY'; holes.inputs["Factor"].default_value = 0.55
            nt.links.new(base, holes.inputs[6])
            nt.links.new(ramp(nt, voronoi(nt, 3.5), [hexc(dk), hexc("#e8ffe0")]), holes.inputs[7])
            nt.links.new(holes.outputs[2], em.inputs["Color"])
        return f
    add("leaves_birch", leaves_c("#4a8a30", "#5aa03a", "#3f7f28", "#254f14"))   # slightly yellower green
    add("leaves_jungle", leaves_c("#2f6b1c", "#3f8426", "#2a6018", "#16380c"))  # deep dark green
    # ---- #050 wool spectrum: 16 MC 1.12 colors, soft noise on base tone ----
    def hexsh(h, f):
        return "#%02x%02x%02x" % (min(255, int(int(h[1:3], 16) * f)), min(255, int(int(h[3:5], 16) * f)), min(255, int(int(h[5:7], 16) * f)))
    WOOL = {"white": "#c7c7c7", "orange": "#d87d23", "magenta": "#b24ab2", "light_blue": "#3abada",
            "yellow": "#9ba022", "lime": "#5fa123", "pink": "#bd6498", "gray": "#4f5053",
            "light_gray": "#88878d", "cyan": "#307092", "purple": "#7a3898", "blue": "#3538a0",
            "brown": "#633d21", "green": "#4f7a24", "red": "#9b2d26", "black": "#1c1b1e"}
    def wool(hx):
        def f(m, nt, em):
            nt.links.new(ramp(nt, noise(nt, 11.0), [hexc(hexsh(hx, 0.86)), hexc(hx), hexc(hexsh(hx, 1.12))]), em.inputs["Color"])
        return f
    for wk, wv in WOOL.items():
        add("wool_" + wk, wool(wv))
    # ---- #051 storage + clay chain ----
    add("gold_block", lambda m, nt, em: nt.links.new(ramp(nt, noise(nt, 6.0), [hexc("#d8a828"), hexc("#f8d858"), hexc("#c89018")]), em.inputs["Color"]))
    add("iron_block", lambda m, nt, em: nt.links.new(ramp(nt, noise(nt, 6.0), [hexc("#c0c0c0"), hexc("#e8e8e8"), hexc("#a8a8ac")]), em.inputs["Color"]))
    add("diamond_block", lambda m, nt, em: nt.links.new(ramp(nt, noise(nt, 6.0), [hexc("#40b8b0"), hexc("#7cf0e8"), hexc("#30a0a8")]), em.inputs["Color"]))
    add("clay_block", lambda m, nt, em: nt.links.new(ramp(nt, noise(nt, 8.0), [hexc("#d6d6da"), hexc("#e6e6ea"), hexc("#c6c6cc")]), em.inputs["Color"]))
    def brick_block(m, nt, em):
        b = nt.nodes.new("ShaderNodeTexBrick")
        b.inputs["Scale"].default_value = 2.0
        b.inputs["Mortar Size"].default_value = 0.03
        b.inputs["Color1"].default_value = hexc("#9c5242")
        b.inputs["Color2"].default_value = hexc("#8a4638")
        b.inputs["Mortar"].default_value = hexc("#b8a89a")
        nt.links.new(b.outputs["Color"], em.inputs["Color"])
    add("brick_block", brick_block)
    add("snow", lambda m, nt, em: nt.links.new(
        ramp(nt, noise(nt, 10.0), [hexc("#e8f0f8"), hexc("#ffffff")]), em.inputs["Color"]))
    def glowstone(m, nt, em):
        base = ramp(nt, noise(nt, 7.0), [hexc("#d8a838"), hexc("#f0c858"), hexc("#b88820")])
        spots = nt.nodes.new("ShaderNodeMix"); spots.data_type='RGBA'; spots.blend_type='ADD'; spots.inputs["Factor"].default_value = 0.4
        nt.links.new(base, spots.inputs[6])
        nt.links.new(ramp(nt, voronoi(nt, 5.0), [hexc("#201800"), hexc("#fff0a0")]), spots.inputs[7])
        nt.links.new(spots.outputs[2], em.inputs["Color"])
    add("glowstone", glowstone)
    add("obsidian", lambda m, nt, em: nt.links.new(
        ramp(nt, noise(nt, 6.0), [hexc("#0d0716"), hexc("#1f1430"), hexc("#3a2450")]), em.inputs["Color"]))
    def furnace(m, nt, em):
        st = ramp(nt, noise(nt, 5.0), [hexc("#6e6e74"), hexc("#8a8a90"), hexc("#5c5c62")])
        tc = nt.nodes.new("ShaderNodeTexCoord")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
        mx = nt.nodes.new("ShaderNodeMath"); mx.operation = 'SUBTRACT'
        nt.links.new(sep.outputs["X"], mx.inputs[0]); mx.inputs[1].default_value = 0.5
        my = nt.nodes.new("ShaderNodeMath"); my.operation = 'MULTIPLY_ADD'
        nt.links.new(mx.outputs[0], my.inputs[0]); my.inputs[1].default_value = 0; my.inputs[2].default_value = 0
        # dark arch = rect via abs distance
        ax = nt.nodes.new("ShaderNodeMath"); ax.operation = 'ABSOLUTE'
        nt.links.new(mx.outputs[0], ax.inputs[0])
        ay = nt.nodes.new("ShaderNodeMath"); ay.operation = 'SUBTRACT'
        nt.links.new(sep.outputs["Y"], ay.inputs[0]); ay.inputs[1].default_value = 0.35
        a2 = nt.nodes.new("ShaderNodeMath"); a2.operation = 'ABSOLUTE'
        nt.links.new(ay.outputs[0], a2.inputs[0])
        inx = nt.nodes.new("ShaderNodeMath"); inx.operation = 'LESS_THAN'; inx.inputs[1].default_value = 0.22
        nt.links.new(ax.outputs[0], inx.inputs[0])
        iny = nt.nodes.new("ShaderNodeMath"); iny.operation = 'LESS_THAN'; iny.inputs[1].default_value = 0.22
        nt.links.new(a2.outputs[0], iny.inputs[0])
        arch = nt.nodes.new("ShaderNodeMath"); arch.operation = 'MULTIPLY'
        nt.links.new(inx.outputs[0], arch.inputs[0]); nt.links.new(iny.outputs[0], arch.inputs[1])
        outc = nt.nodes.new("ShaderNodeMix"); outc.data_type = 'RGBA'
        nt.links.new(arch.outputs[0], outc.inputs["Factor"])
        nt.links.new(st, outc.inputs[6])
        outc.inputs[7].default_value = hexc("#141414")
        nt.links.new(outc.outputs[2], em.inputs["Color"])
    add("furnace", furnace)
    def workbench(m, nt, em):
        pl = ramp(nt, noise(nt, 7.0), [hexc("#8d7143"), hexc("#9c7f4e")])
        tc = nt.nodes.new("ShaderNodeTexCoord")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
        gx = nt.nodes.new("ShaderNodeMath"); gx.operation = 'GREATER_THAN'; gx.inputs[1].default_value = 0.92
        nt.links.new(sep.outputs["X"], gx.inputs[0])
        gy = nt.nodes.new("ShaderNodeMath"); gy.operation = 'GREATER_THAN'; gy.inputs[1].default_value = 0.92
        nt.links.new(sep.outputs["Y"], gy.inputs[0])
        grid = nt.nodes.new("ShaderNodeMath"); grid.operation = 'MAXIMUM'
        nt.links.new(gx.outputs[0], grid.inputs[0]); nt.links.new(gy.outputs[0], grid.inputs[1])
        edge = nt.nodes.new("ShaderNodeMath"); edge.operation = 'ADD'
        nt.links.new(grid.outputs[0], edge.inputs[0]); edge.inputs[1].default_value = 0
        outc = nt.nodes.new("ShaderNodeMix"); outc.data_type = 'RGBA'
        nt.links.new(edge.outputs[0], outc.inputs["Factor"])
        nt.links.new(pl, outc.inputs[6]); outc.inputs[7].default_value = hexc("#5b431f")
        nt.links.new(outc.outputs[2], em.inputs["Color"])
    add("crafting_table", workbench)
    return T

ICONS = {
    "item_stick":        ([(7,9,3,3),(9,6,3,3),(6,11,3,3),(10,4,3,3)], "#6b4a2c"),
    "item_coal":         ([(5,5,6,6),(4,7,8,4),(7,3,4,3),(6,10,4,3)], "#1a1a1a"),
    "item_iron_ingot":   ([(4,10,8,3),(5,7,6,3),(6,5,4,2)], "#d8d8d8"),
    "item_gold_ingot":   ([(4,10,8,3),(5,7,6,3),(6,5,4,2)], "#f8d858"),
    "item_diamond":      ([(7,3,2,2),(5,5,6,2),(4,7,8,2),(5,9,6,2),(7,11,2,2)], "#5cdcd4"),
    "item_apple":        ([(4,5,8,8),(5,4,6,1),(3,6,1,6),(12,6,1,6)], "#c02020"),
    "item_sapling":      ([(4,4,8,4),(5,2,6,2),(7,8,2,5)], "#3a7d22"),
    "item_flint":        ([(4,7,8,6),(6,5,5,3),(7,4,3,2)], "#26262c"),
    "item_stick_dark":   ([(7,9,3,3),(9,6,3,3),(10,4,3,3)], "#5b3a1c"),
    "tile_torch":        ([(6,4,4,12)], "#6b4a2c"),
    # #049 sapling BLOCK tiles (cross-model, transparent px) - brown stem added in icon_quads
    "sapling_oak":       ([(4,3,8,3),(5,5,7,2),(6,1,5,2)], "#3a7d22"),
    "sapling_birch":     ([(4,3,8,3),(5,5,7,2),(6,1,5,2)], "#5aa03a"),
    "sapling_jungle":    ([(3,2,10,4),(5,5,8,2),(6,1,5,2)], "#2f6b1c"),
}
TOOL_SHAPES = {
    "pickaxe": [(4,2,8,2),(3,2,2,3),(11,2,2,3)],
    "axe":     [(4,2,7,2),(4,4,5,2),(4,6,3,1)],
    "shovel":  [(6,2,4,4),(7,5,2,2)],
    "sword":   [(7,2,2,6),(8,1,1,1),(6,8,4,1)],
    "shears":  [(5,4,2,6),(9,4,2,6),(7,9,2,2),(4,11,3,3),(9,11,3,3)],
}
TOOL_MATS = {"wood": "#9c7f4e", "stone": "#7e7e82", "iron": "#d8d8d8", "diamond": "#5cdcd4", "gold": "#f8d858"}

def icon_quads(name):
    """Returns [(x,y,w,h,color)] pixel rects for an icon/tile name."""
    if name == "item_shears":
        return [(x, y, w, h, "#d8d8d8") for (x, y, w, h) in TOOL_SHAPES["shears"]]
    if name in ICONS:
        rects, col = ICONS[name]
        out = [(x, y, w, h, col) for (x, y, w, h) in rects]
        if name == "item_apple":
            out += [(8,2,2,3,"#5a3a1c"),(10,3,3,2,"#3a8a2a")]
        if name == "item_iron_ingot":
            out += [(7,6,2,1,"#f4f4f4"),(5,8,2,1,"#f4f4f4")]
        if name == "item_gold_ingot":
            out += [(7,6,2,1,"#fff0a0"),(5,8,2,1,"#fff0a0")]
        if name == "item_diamond":
            out += [(6,6,4,2,"#a8f0ec")]
        if name == "tile_torch":
            out += [(5,0,6,5,"#f8d858"),(7,1,3,3,"#fff8c0")]
        if name.startswith("sapling_"):
            out += [(7,7,2,4,"#5b3a1c"),(7,11,2,3,"#4a2f16")]  # stem below the crown
        return out
    for mat, mc in TOOL_MATS.items():
        for shape, srects in TOOL_SHAPES.items():
            if name == "item_%s_%s" % (mat, shape):
                out = [(7,10,2,3,"#5b3a1c"),(7,13,2,3,"#5b3a1c") if shape != "sword" else (6,12,4,3,"#5b3a1c")]
                if shape == "sword":
                    out = [(5,8,6,1,"#8a8a8e")] + [(x,y,w,h,mc) for (x,y,w,h) in srects] + [(7,10,2,3,"#5b3a1c"),(7,13,2,3,"#5b3a1c")]
                    return out
                if shape == "shears":
                    return [(x,y,w,h,mc) for (x,y,w,h) in srects]
                return out + [(x,y,w,h,mc) for (x,y,w,h) in srects]
    return None

def build_icons(names, atlas, tiles, start_idx):
    """#049: flat pixel-rect icons composited DIRECTLY into the atlas numpy (was a Cycles
    per-icon render pass, which lost transparency: backgrounds baked as opaque dark pixels and
    cross-model tiles drew black boxes in-game). Rect colors are sRGB hex -> byte values, matching
    what the Cycles+PNG pipeline produced for lit pixels; alpha=1 on rects, 0 elsewhere."""
    S = SIZE
    for i, name in enumerate(names):
        rects = icon_quads(name)
        if rects is None:
            raise SystemExit("no icon def for " + name)
        idx = start_idx + i
        tx, ty = (idx % GRID) * S, (idx // GRID) * S
        for (x, y, w, h, col) in rects:
            r, g, b = (int(col[1:3], 16), int(col[3:5], 16), int(col[5:7], 16))
            for yy in range(y, y + h):
                for xx in range(x, x + w):
                    if 0 <= xx < S and 0 <= yy < S:
                        atlas[ty + yy, tx + xx] = (r / 255.0, g / 255.0, b / 255.0, 1.0)
        tiles[name] = {"x": tx, "y": ty, "w": S, "h": S, "src": "blender:gen.py:icons"}
    return start_idx + len(names)


def main():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 8
    sc.render.resolution_x = SIZE; sc.render.resolution_y = SIZE
    sc.render.image_settings.file_format = 'PNG'
    sc.render.film_transparent = True
    sc.world = bpy.data.worlds.new("w")
    sc.world.use_nodes = True
    sc.world.node_tree.nodes["Background"].inputs[0].default_value = (1,1,1,1)
    # full-frame quad
    mesh = bpy.data.meshes.new("q"); import bmesh
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.71)
    bm.to_mesh(mesh); bm.free()
    ob = bpy.data.objects.new("q", mesh); sc.collection.objects.link(ob)
    cd = bpy.data.cameras.new("cam"); cd.type = 'ORTHO'; cd.ortho_scale = 1.0
    cam = bpy.data.objects.new("cam", cd); sc.collection.objects.link(cam)
    cam.location = (0,0,1); sc.camera = cam
    T = gen_tiles()
    names = list(T.keys())
    atlas = np.zeros((GRID*SIZE, GRID*SIZE, 4), dtype=np.float32)
    tiles = {}
    for i, name in enumerate(names):
        mat, nt, em = new_mat()
        T[name](mat, nt, em)
        mesh.materials.clear(); mesh.materials.append(mat)
        sc.render.filepath = os.path.join(OUT, "_t_%s.png" % name)
        bpy.ops.render.render(write_still=True)
        img = bpy.data.images.load(sc.render.filepath, check_existing=False)
        px = np.empty(len(img.pixels), dtype=np.float32)
        img.pixels.foreach_get(px)
        px = px.reshape(SIZE, SIZE, 4)[::-1]  # bottom-up -> top-down
        bpy.data.images.remove(img)
        tx, ty = (i % GRID) * SIZE, (i // GRID) * SIZE
        atlas[ty:ty+SIZE, tx:tx+SIZE] = px
        tiles[name] = {"x": tx, "y": ty, "w": SIZE, "h": SIZE, "src": "blender:gen.py"}
        os.remove(sc.render.filepath)
    icon_names = [n for n in ICONS if n != "item_stick_dark"]
    for mat in ["wood", "stone", "iron", "diamond"]:
        for shp in ["pickaxe", "axe", "shovel", "sword"]:
            icon_names.append("item_%s_%s" % (mat, shp))
    icon_names.append("item_shears")
    build_icons(icon_names, atlas, tiles, len(tiles))
    out_img = bpy.data.images.new("atlas", GRID*SIZE, GRID*SIZE, alpha=True)
    out_img.pixels.foreach_set(atlas[::-1].ravel())  # top-down -> bottom-up
    out_img.filepath_raw = os.path.join(OUT, "atlas.png")
    out_img.file_format = 'PNG'
    out_img.save()
    sheet = bpy.data.images.new("sheet", GRID*SIZE*8, GRID*SIZE*8, alpha=True)
    big = np.repeat(np.repeat(atlas, 8, axis=0), 8, axis=1)
    sheet.pixels.foreach_set(big[::-1].ravel())
    sheet.filepath_raw = os.path.join(OUT, "atlas_sheet.png")
    sheet.file_format = 'PNG'
    sheet.save()
    with open(os.path.join(OUT, "atlas.json"), "w") as f:
        json.dump(tiles, f, indent=1)
    print("TEXGEN_OK %d tiles -> atlas.png %dx%d" % (len(tiles), GRID*SIZE, GRID*SIZE))

main()
