import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('tools/tex/gen.py', 'utf8');
s = s.replace('import bpy, json, math, os, sys', 'import bpy, bmesh, json, math, os, sys');
s = s.replace(
  'def build_icons(names, atlas, tiles, start_idx):\n    """Render flat rect-composed icons via ortho emission quads."""',
  'def build_icons(names, atlas, tiles, start_idx):\n    """Render flat rect-composed icons via ortho emission quads."""\n    sc = bpy.context.scene');
writeFileSync('tools/tex/gen.py', s);
console.log('bmesh import:', s.includes('import bpy, bmesh,'), '| sc:', s.includes('sc = bpy.context.scene'));
