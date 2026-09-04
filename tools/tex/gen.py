# gen.py — Cubeforge texture generator (SPK-2, becomes sprint pipeline). Headless Blender:
# blender --background --python tools/tex/gen.py
# Procedural per-tile Cycles renders (emission = exact colors), packed to RGBA atlas
# tools/tex/atlas.png (8x8 grid of 16px tiles) + manifest atlas.json + sheet for vision QA.
import bpy, json, math, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE
SIZE = 16
GRID = 8  # 8x8 tile grid

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
    add("stone", lambda m, nt, em: nt.links.new(
        ramp(nt, noise(nt, 5.0), [hexc("#7e7e82"), hexc("#9a9aa0"), hexc("#6e6e74")]), em.inputs["Color"]))
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
        
    add("water", water)
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
    return T

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
