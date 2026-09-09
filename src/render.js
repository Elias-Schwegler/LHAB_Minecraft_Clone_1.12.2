// Chunk renderer: greedy mesher + atlas UVs + sun-shade + fog (SPK-1 learnings applied).
// Convention: math in ROW-major, transpose on upload. Sim-independent draw.
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  const CX = 16, CH = 128, CZ = 16;
  let gl, prog, uVP, uFog, uTloc, tex, meshMap = new Map(), texReady = false;
  let palTex, mobVAO, mobVB, itemVAO, itemVB; // #035: mobs reuse this shader, sampling a solid-color palette on unit 1; #060: item billboards on the atlas
  const stats = { meshes: 0, tris: 0, rebuilds: 0, glErr: 0, missingTiles: new Set() };
  CF.rendererStats = stats;
  const SHADE = { 0: 0.8, 1: 1.0, 2: 0.6 }; // +x,+y,+z faces; opposite = slightly darker
  const ASZ = (window.__ATLAS_SIZE = 192); // #049: atlas GRID 8->12; NOT named A - buildMesh uses `const A = coord(...)` per cell!
  const MAGENTA_UV = [(ASZ - 0.75) / ASZ, (ASZ - 0.75) / ASZ, (ASZ - 0.25) / ASZ, (ASZ - 0.25) / ASZ];

  function buildMesh(cx, cz) {
    const W = CF.world;
    const pos = [], col = [], tris = [0];
    const off = [cx * CX, 0, cz * CZ];
    const dims = [CX, CH, CZ];
    const coord = (a, ua, va, d, u, v) => { const Q = [0, 0, 0]; Q[a] = d; Q[ua] = u; Q[va] = v; for (let i = 0; i < 3; i++) Q[i] += off[i]; return Q; };
    // #052/#053 multi-box model pass (slabs, stairs): per-cell boxes from CF.boxesOf(flat bits), generic
    // face culling: each face rect is SUBTRACTED by coplanar coverer rects (own-cell other boxes + neighbor
    // cell boxes at boundary planes) - stair treads/risers stay, buried interfaces vanish.
    const cellBoxesAbs = (bx0, by0, bz0) => {
      const id2 = W.get(bx0, by0, bz0);
      const v2 = id2 && CF.BY_ID[id2];
      if (!v2) return null;
      if (!CF.solidAt(id2)) return null;
      if (!v2.boxes) return [[bx0, by0, bz0, bx0 + 1, by0 + 1, bz0 + 1]];
      const fm2 = W.flatAt ? W.flatAt(bx0, by0, bz0) : 0;
      return CF.boxesOf(v2, fm2).map((b) => [bx0 + b[0], by0 + b[1], bz0 + b[2], bx0 + b[3], by0 + b[4], bz0 + b[5]]);
    };
    const subRect = (R, rs) => { // axis-aligned rect minus rect list (slices at cover edges, keep uncovered)
      const us = [R[0], R[1]], vs = [R[2], R[3]];
      for (const r of rs) { us.push(r[0], r[1]); vs.push(r[2], r[3]); }
      const clamp = (lo, hi) => (arr) => [...new Set(arr.map((t) => Math.min(hi, Math.max(lo, t))))].sort((p, q) => p - q);
      const U = clamp(R[0], R[1])(us), V = clamp(R[2], R[3])(vs), out = []; // #053 FIX: V was clamped to the U-range (collapsed every face to 0 pieces)
      for (let i = 0; i + 1 < U.length; i++) for (let j = 0; j + 1 < V.length; j++) {
        const cu = (U[i] + U[i + 1]) / 2, cv = (V[j] + V[j + 1]) / 2;
        if (!rs.some((r) => cu > r[0] + 1e-9 && cu < r[1] - 1e-9 && cv > r[2] + 1e-9 && cv < r[3] - 1e-9)) out.push([U[i], U[i + 1], V[j], V[j + 1]]);
      }
      return out;
    };
    const boxCells = [];
    for (let x = 0; x < CX; x++) for (let z = 0; z < CZ; z++) for (let y = 1; y < CH - 1; y++) {
      const id = W.get(cx * CX + x, y, cz * CZ + z);
      const v = id && CF.BY_ID[id];
      if (v && v.boxes) boxCells.push([x, y, z, v, id]);
    }
    for (const [x, y, z, v, id] of boxCells) {
      const fmeta = W.flatAt ? W.flatAt(cx * CX + x, y, cz * CZ + z) : 0;
      const boxes = CF.boxesOf(v, fmeta);
      const wx = cx * CX + x, wz = cz * CZ + z;
      const abs = boxes.map((b) => [wx + b[0], y + b[1], wz + b[2], wx + b[3], y + b[4], wz + b[5]]);
      for (let bi = 0; bi < boxes.length; bi++) {
        const bx = boxes[bi], ab = abs[bi];
        for (let a = 0; a < 3; a++) for (const sgn of [1, -1]) {
          const ua = (a + 1) % 3, va = (a + 2) % 3;
          const plane = sgn > 0 ? ab[3 + a] : ab[a];
          const rects = [];
          for (let j = 0; j < abs.length; j++) if (j !== bi) {
            const nb = abs[j];
            if (Math.abs((sgn > 0 ? nb[a] : nb[3 + a]) - plane) < 1e-6) rects.push([nb[ua], nb[3 + ua], nb[va], nb[3 + va]]); // own-cell cover
          }
          if (Math.abs(plane - Math.round(plane)) < 1e-6) { // cell-boundary plane: neighbor cell coverers too
            const nc = [wx, y, wz]; nc[a] += sgn;
            const nbs = cellBoxesAbs(nc[0], nc[1], nc[2]);
            if (nbs) for (const nb of nbs) if (Math.abs((sgn > 0 ? nb[a] : nb[3 + a]) - plane) < 1e-6) rects.push([nb[ua], nb[3 + ua], nb[va], nb[3 + va]]);
          }
          const pieces = subRect([ab[ua], ab[3 + ua], ab[va], ab[3 + va]], rects);
          const faceIdx = a * 2 + (sgn > 0 ? 0 : 1);
          const tile = v.tiles[faceIdx] || v.tiles[0];
          const meta = (window.__TEXMETA || {})[tile];
          if (!meta) stats.missingTiles.add(tile);
          const sh = SHADE[a] * (sgn > 0 ? 1 : (a === 1 ? 0.45 : 0.7));
          const du = bx[3 + ua] - bx[ua], dv = bx[3 + va] - bx[va];
          const tw = (meta ? (meta.w - 0.5) : 15.5) / ASZ / (du || 1), th = (meta ? (meta.h - 0.5) : 15.5) / ASZ / (dv || 1);
          const uv0 = meta ? [(meta.x + 0.25) / ASZ, (meta.y + 0.25) / ASZ] : MAGENTA_UV.slice(0, 2);
          for (const pc of pieces) {
            const P = (uaVal, vaVal) => { const Q = [0, 0, 0]; Q[a] = plane; Q[ua] = uaVal; Q[va] = vaVal; return Q; }; // absolute face corners
            const cs = [P(pc[0], pc[2]), P(pc[1], pc[2]), P(pc[1], pc[3]), P(pc[0], pc[3])];
            const S = [wx, y, wz]; S[a] = plane + sgn * 0.001; S[ua] = (pc[0] + pc[1]) / 2; S[va] = (pc[2] + pc[3]) / 2; // #105: boxes-passable cells carry real light; air side when at boundary
            const br = W.lightAt(S[0], S[1], S[2]) / 255;
            const order = a % 2 === 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
            const luv = cs.map((p) => { // local cell coords for UV (abs minus cell origin)
              const lx = [p[0] - wx, p[1] - y, p[2] - wz];
              return [uv0[0] + tw * (lx[ua] - bx[ua]), uv0[1] + th * (bx[3 + va] - lx[va])];
            });
            for (const oi of order) {
              pos.push(cs[oi][0], cs[oi][1], cs[oi][2]);
              col.push(luv[oi][0], luv[oi][1], sh, br);
            }
            tris[0] += 2;
          }
        }
      }
    }
    for (let a = 0; a < 3; a++) {
      const ua = (a + 1) % 3, va = (a + 2) % 3;
      // #052: does neighbor cell (id2, flat fm2) fully cover a face of the cell on axis a side sgn?
      const coverFace = (id2, fm2, ax, sg) => {
        if (!id2) return false;
        const v2 = CF.BY_ID[id2];
        if (!v2 || !CF.solidAt(id2)) return false;
        return CF.cellOpaque(v2, fm2); // #053: only a FULL cell box (cube/double slab) culls greedy faces; slabs/stairs/crosses keep them visible
      };
      for (const sgn of [1, -1]) { // #046: BOTH face signs (was +axis only -> 3 of 6 faces never meshed)
      if (a === 0 && sgn === 1) {
        // cross-model blocks (torch #024): two vertical quads, no greedy
        for (let x = 0; x < CX; x++) for (let z = 0; z < CZ; z++) for (let y = 1; y < CH; y++) {
          const id = W.get(cx * 16 + x, y, cz * 16 + z);
          const v = id && CF.BY_ID[id];
          if (!v || !v.cross) continue;
          const tile = v.tiles[0];
          const meta = (window.__TEXMETA || {})[tile];
          if (!meta) stats.missingTiles.add(tile);
          const wx = cx * 16 + x, wz = cz * 16 + z;
          const br = (W.lightAt(wx, y, wz) || 14 << 0) / 255;
          const uvf = meta ? [(meta.x + 0.25) / ASZ, (meta.y + 0.25) / ASZ, (meta.x + 15.75) / ASZ, (meta.y + 15.75) / ASZ] : MAGENTA_UV;
          const quad = (d) => {
            const ax = 0.35, az = 0.35 * d;
          // #105: positions must be ABSOLUTE world (renderer has no per-chunk model matrix; coord() adds
          // off[] for greedy quads - this pass forgot it -> torches drew at chunk-local spots near origin)
          const A = [wx + 0.5 - ax, y, wz + 0.5 - az], B = [wx + 0.5 + ax, y, wz + 0.5 + az];
          const C = [B[0], y + 1, B[2]], D = [A[0], y + 1, A[2]];
          // #049 fix, restored in #105 (my WIP 1-v remap sampled outside the tile -> black; #105 bug was the
          // missing mid-plane light offset, not this mapping): bottom verts sample PNG-bottom (stick), top = flame.
          const uvs = [[uvf[0], uvf[3]], [uvf[2], uvf[3]], [uvf[2], uvf[1]], [uvf[0], uvf[1]]];
            for (const oi of [0, 1, 2, 0, 2, 3]) {
              const P4 = [A, B, C, D][oi];
              pos.push(P4[0], P4[1], P4[2]);
              col.push(uvs[oi][0], uvs[oi][1], 0.94, br);
            }
            tris[0] += 2;
          };
          quad(1); quad(-1);        }
      }
      for (let d = 0; d < dims[a]; d++) {
        const mask = new Int32Array(dims[ua] * dims[va]);
        for (let u = 0; u < dims[ua]; u++) for (let v = 0; v < dims[va]; v++) {
          const A = coord(a, ua, va, d, u, v);
          const cur = W.get(A[0], A[1], A[2]);
          if (!cur) continue;
          if (CF.BY_ID[cur] && (CF.BY_ID[cur].cross || CF.BY_ID[cur].liquid || CF.BY_ID[cur].boxes)) continue; // drawn separately
          const B = A.slice(); B[a] += sgn;
          const nid = W.get(B[0], B[1], B[2]);
          if (coverFace(nid, W.flatAt ? W.flatAt(B[0], B[1], B[2]) : 0, a, sgn)) continue; // #049 non-solid + #052 half-cover aware culling
          // merge buckets split by id AND light quartile so greedy quads respect lighting (#020)
          const packed = W.lightAt(B[0], B[1], B[2]);
          const lv = Math.max(packed >> 4, packed & 15);
          mask[u * dims[va] + v] = cur | ((lv >> 2) << 12);
        }
        for (let u = 0; u < dims[ua]; u++) for (let v = 0; v < dims[va];) {
          const val = mask[u * dims[va] + v];
          if (!val) { v++; continue; }
          let w = 1; while (u + w < dims[ua] && mask[(u + w) * dims[va] + v] === val) w++;
          let hh = 1;
          scan: while (v + hh < dims[va]) { for (let k = 0; k < w; k++) if (mask[(u + k) * dims[va] + v + hh] !== val) break scan; hh++; }
          const shadeBase = SHADE[a];
          let shade = (a % 2 === 0) ? shadeBase : shadeBase * 0.85; // existing +face shading (baselines)
          if (sgn < 0) shade = (a === 1) ? 0.45 : shadeBase * 0.7; // #046 -faces: bottoms darkest, sides darker
          const tile = CF.tileFor(val & 0xfff, a * 2 + (sgn > 0 ? 0 : 1)) // #046 per-face tile (px,nx,py,ny,pz,nz); // #046 per-face tile (nx/ny/nz)
          pushQuad(a, ua, va, d, u, v, w, hh, tile, shade, tris, sgn);
          for (let uu = 0; uu < w; uu++) for (let vv = 0; vv < hh; vv++) mask[(u + uu) * dims[va] + v + vv] = 0;
          v += hh;
        }
      }
      }
    }
    function pushQuad(a, ua, va, d, u, v, w, hh, tile, shade, trisArr, sgn) {
      const plane = sgn > 0 ? d + 1 : d; // #046: -faces sit on the cell's min boundary
      const meta = (window.__TEXMETA || {})[tile];
      let uvAt;
      if (meta) {
        const S = ASZ, IN = 0.25;
        const tw = (meta.w - 2 * IN) / S / 16, th = (meta.h - 2 * IN) / S / 16;
        const u0 = (meta.x + IN) / S, v0 = (meta.y + IN) / S;
        // per-face UV orientation: texture-up (v0=PNG top) must follow world +Y on sides;
        // uvAt(du,dv) tiles one tile-cell per block; -faces mirror u (MC samples each face independently).
        uvAt = (du, dv) => (a === 1 ? [u0 + tw * du, v0 + th * dv]
          : a === 0 ? [u0 + th * dv, v0 + th * (hh - du)]
          : (sgn > 0 ? [u0 + tw * du, v0 + th * (hh - dv)] : [u0 + tw * (w - du), v0 + th * (hh - dv)]));
      } else { stats.missingTiles.add(tile); uvAt = () => MAGENTA_UV.slice(0, 2); }
      const P = (du, dv) => coord(a, ua, va, plane, u + du, v + dv);
      // pack raw light nibbles (sky<<4|block) into BR; daylight factor applied in shader (#021)
      const mid = coord(a, ua, va, plane, Math.min(dims[ua] - 1, u + (w >> 1)), Math.min(dims[va] - 1, v + (hh >> 1)));
      if (sgn < 0) mid[a] -= 0.001; // #106: -face plane is the cell's MIN boundary - floor() would land INSIDE the solid itself (light 0 = black faces); sample the air side
      const packed = CF.world.lightAt(mid[0], mid[1], mid[2]);
      const bright = packed / 255;
      const corners = [P(0, 0), P(w, 0), P(w, hh), P(0, hh)];
      const uvs = [[0, 0], [w, 0], [w, hh], [0, hh]].map(([du, dv]) => uvAt(du, dv));
      const order = a % 2 === 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
      for (const oi of order) {
        pos.push(corners[oi][0], corners[oi][1], corners[oi][2]);
        col.push(uvs[oi][0], uvs[oi][1], shade, bright);
      }
      trisArr[0] += 2;
    }
    // liquid faces: separate translucent buffer, per-face quads (v1, no merge) (#022)
    const wpos = [], wcol = [];
    for (let a = 0; a < 3; a++) {
      const ua = (a + 1) % 3, va = (a + 2) % 3;
      for (const sgn of [1, -1]) { // #046: side faces BOTH directions close the water box (rim gaps caused banding); NO -Y bottom (z-fights the floor, invisible underwater anyway - MC skips it too)
      if (a === 1 && sgn < 0) continue;
      for (let d = 0; d < dims[a]; d++) {
        for (let u = 0; u < dims[ua]; u++) for (let v = 0; v < dims[va]; v++) {
          const A = coord(a, ua, va, d, u, v);
          const id = W.get(A[0], A[1], A[2]);
          const v2 = id && CF.BY_ID[id];
          if (!v2 || !v2.liquid) continue;
          const B = A.slice(); B[a] += sgn;
          const bid = W.get(B[0], B[1], B[2]);
          if (bid) continue; // only against air (v1)
          const sideSgn = (a === 0 ? (sgn > 0 ? 0 : 1) : a === 1 ? 2 : (sgn > 0 ? 4 : 5)); // px,nx,py(2),pz,nz
          const tile = v2.tiles[sideSgn];
          const meta = (window.__TEXMETA || {})[tile];
          if (!meta) stats.missingTiles.add(tile);
          const plane = sgn > 0 ? d + 1 : d; // #046
          const P0 = coord(a, ua, va, plane, u, v), P1 = coord(a, ua, va, plane, u + 1, v);
          const P2 = coord(a, ua, va, plane, u + 1, v + 1), P3 = coord(a, ua, va, plane, u, v + 1);
          const packed = W.lightAt(B[0], B[1], B[2]);
          const br = v2.name === 'lava' ? 1 : packed / 255; // #043 lava self-luminous (eff=1 -> full bright, MC-like emissive)
          const uvf = meta ? [(meta.x + 0.25) / ASZ, (meta.y + 0.25) / ASZ, (meta.x + 15.75) / ASZ, (meta.y + 15.75) / ASZ] : MAGENTA_UV;
          if (!window.__DBGQ && a === 1 && sgn > 0) { // #049 debug: first liquid top-quad uv vs canvas truth
            const cx = (((uvf[0] + uvf[2]) / 2) * ASZ) | 0, cy = (((uvf[1] + uvf[3]) / 2) * ASZ) | 0;
            const dd = window.__ATLAS_CTX.getImageData(cx, cy, 1, 1).data;
            window.__DBGQ = { tile, uvf: uvf.map((n) => +n.toFixed(4)), canvasAtUv: [dd[0], dd[1], dd[2], dd[3]], worldCell: [A, ua, va, d, u, v] };
          }
          const c00 = [P0[0], P0[1], P0[2]], c10 = [P1[0], P1[1], P1[2]], c11 = [P2[0], P2[1], P2[2]], c01 = [P3[0], P3[1], P3[2]];
          if (a === 1 && sgn > 0) for (const q of [c00, c10, c11, c01]) q[1] -= 0.12; // water surface slightly below bank (MC-like, avoids coplanar z-fight)
          const uvs = [[uvf[0], uvf[1]], [uvf[2], uvf[1]], [uvf[2], uvf[3]], [uvf[0], uvf[3]]];
          for (const oi of [0, 1, 2, 0, 2, 3]) {
            const q = [c00, c10, c11, c01][oi];
            wpos.push(q[0], q[1], q[2]);
            wcol.push(uvs[oi][0], uvs[oi][1], 0.95, br);
          }
        }
      }
      }
    }
    return { pos: new Float32Array(pos), col: new Float32Array(col), wpos: new Float32Array(wpos), wcol: new Float32Array(wcol), tris: tris[0] };
  }

  const vs = `#version 300 es
layout(location=0) in vec3 P; layout(location=1) in vec3 Q; layout(location=2) in float BR;
uniform mat4 VP; uniform vec3 E;
out vec2 uv; out float sh; out float dist; out float br;
void main(){ gl_Position = VP*vec4(P,1.); uv=Q.xy; sh=Q.z; br=BR; dist=length(E-P); }`;
  const fs = `#version 300 es
precision mediump float;
 in vec2 uv; in float sh; in float dist; in highp float br;
 uniform sampler2D T; uniform vec3 FOG; uniform float uDay;
 out vec4 OC;
void main(){ vec4 t = texture(T, uv); float cut = 1.0 - smoothstep(0.30, 0.62, t.a); if (cut > 0.5) discard; // #049: numpy-baked cross/glass cells use true alpha 0; Cycles tiles (water .85) survive; 2xMSAA ~50% coverage at quad edges survives too
  float f = clamp((dist-40.)/50., 0., 1.);
 float q = floor(br*255.0+0.5);
 float skyN = floor(q/16.0)/15.0, blkN = mod(q,16.0)/15.0;
 float eff = max(skyN*uDay, blkN);
 float bright = mix(0.16, 0.25+0.75*eff, step(0.02, eff));
 vec3 c = t.rgb*sh*bright; c = mix(c, FOG, f);
 if (t.a < 0.5) discard;
 OC = vec4(c * t.a, t.a); }`;

  function initRenderer(gl2) {
    gl = gl2;
    const mk = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x);
      if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) CF.errors.push('shader: ' + gl.getShaderInfoLog(x)); return x; };
    prog = gl.createProgram();
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) CF.errors.push('prog: ' + gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    uVP = gl.getUniformLocation(prog, 'VP'); uFog = gl.getUniformLocation(prog, 'FOG');
    const uT = gl.getUniformLocation(prog, 'T'); uTloc = uT; gl.uniform1i(uT, 0);
    gl.enable(gl.DEPTH_TEST);
    tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 255, 255]));
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = ASZ; cv.height = ASZ;
      const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, ASZ, ASZ);
      px.data[((ASZ - 1) * ASZ + (ASZ - 1)) * 4 + 0] = 255; px.data[((ASZ - 1) * ASZ + (ASZ - 1)) * 4 + 1] = 0;
      px.data[((ASZ - 1) * ASZ + (ASZ - 1)) * 4 + 2] = 255; px.data[((ASZ - 1) * ASZ + (ASZ - 1)) * 4 + 3] = 255;
      ctx.putImageData(px, 0, 0);
      // #042/#040/#041/#043 procedurally painted tiles in FREE atlas cells (zero-download rule; these
      // blocks stay functional:false so parity is untouched). NOTE (#043 P1 fix): until the gen.py row-
      // stride fix these cells collided with real item icons; free row layout now = y96 (from x32) + y112.
      const cell = (ox, oy, fn) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = fn(x, y); ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, 1, 1); } };
      cell(16, 96, (x, y) => (y >= 6 && y <= 9) ? (x % 4 < 2 ? '#3a2018' : '#d8d2c0') : (y < 3 || y > 12 ? '#a83028' : '#c84030')); // tnt_side: red body, dark band, "TNT" hint
      cell(32, 96, (x, y) => (x > 6 && x < 9 && y > 6 && y < 9) ? '#e8d040' : (x > 5 && x < 10 && y > 7 && y < 9 ? '#3a3a3a' : ((x % 2) ^ (y % 2) ? '#6a6a6a' : '#4a4a4a'))); // tnt_top: grey gunpowder + fuse
      // #040 chest tiles: lid seam + latch
      cell(48, 96, (x, y) => (y === 4 || y === 5) ? '#6a4a22' : (x > 6 && x < 9 && y > 5 && y < 9) ? '#d8d2c0' : (y > 12 ? '#5a3c1a' : ((x + y) % 7 === 0 ? '#7a5528' : '#8a6230')));
      cell(64, 96, (x, y) => (y > 6 && y < 9) ? '#6a4a22' : ((x + y) % 6 === 0 ? '#7a5528' : '#96703a'));
      // #041 bed tiles: red blanket + white pillow (head), wooden frame edge
      cell(80, 96, (x, y) => (y < 3 || y > 12) ? '#6a4a22' : (x < 3 ? '#6a4a22' : '#c03830'));
      cell(96, 96, (x, y) => (y < 2 || y > 13) ? '#6a4a22' : (y < 5 ? '#e8e4da' : '#c03830'));
      const T43 = 'rgba(0,0,0,0)';
      const bucket = (fill) => (x, y) => { // #043 MC-style bucket sprites (empty/water/lava) on free row y=112
        if (y === 5 && x >= 3 && x <= 12) return '#d8d8d8'; // rim
        if (y === 4 && (x === 3 || x === 12)) return '#c0c0c0';
        if (y >= 6 && y <= 13 && x >= 3 && x <= 12) {
          if (fill && y >= 7 && y <= 9 && x >= 4 && x <= 11) return fill === 'lava' ? (y % 2 ? '#e86818' : '#f8c858') : (y % 2 ? '#3f76e4' : '#4a84f0');
          if (x <= 4 || x >= 11) return '#8a8a8a'; // side shading (MC buckets taper lighter->darker)
          return y >= 10 && !fill ? '#b4b4b4' : '#c6c6c6';
        }
        return T43;
      };
      cell(16, 112, bucket(null)); cell(32, 112, bucket('water')); cell(48, 112, bucket('lava'));
      // #049: Cycles PNG bakes flattened tile ALPHA to 255 (glass center & water translucency lost).
      // Restore it here in-canvas (same pipeline, still zero-download): glass hollow frame, water see-through.
      const alphaCell = (name, fn) => {
        const tt = (window.__TEXMETA || {})[name]; if (!tt) return;
        const d = ctx.getImageData(tt.x, tt.y, 16, 16);
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const a = fn(x, y); if (a !== null) d.data[(y * 16 + x) * 4 + 3] = a; }
        ctx.putImageData(d, tt.x, tt.y);
      };
      alphaCell('glass', (x, y) => (x > 1 && x < 14 && y > 1 && y < 14 ? 0 : null));
      { // water: see-through + MC-bright (Cycles baked it dark navy, flattened alpha)
        const tt = (window.__TEXMETA || {}).water;
        if (tt) {
          const d = ctx.getImageData(tt.x, tt.y, 16, 16);
          for (let i = 0; i < d.data.length; i += 4) { d.data[i] = Math.min(255, d.data[i] + 42); d.data[i + 1] = Math.min(255, d.data[i + 1] + 56); d.data[i + 2] = Math.min(255, d.data[i + 2] + 88); d.data[i + 3] = 170; }
          ctx.putImageData(d, tt.x, tt.y);
        }
      }
      CF.__tntCellsDrawn = true;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      window.__ATLAS_TEX = tex; window.__ATLAS_CANVAS = cv; window.__ATLAS_CTX = ctx; // #049 debug hooks (tile-dump scenario)
      texReady = true;
      // #043: hand the UI the PAINTED atlas (bucket/tnt/chest/bed/water cells) - hotbar icons then match GL
      try {
        const url = cv.toDataURL();
        window.__ATLAS_B64 = url.slice(url.indexOf(',') + 1);
        document.documentElement.style.setProperty('--cfatlas', 'url(' + url + ')');
      } catch (e) { /* tainted canvas impossible (same-origin data URL), keep static icons if so */ }
    };
    if (window.__ATLAS_B64) img.src = 'data:image/png;base64,' + window.__ATLAS_B64;
    // #035 solid-color palette for mob boxes (16x1, texture unit 1). Generated in-code: zero assets,
    // atlas untouched (block parity safe), shader untouched (mobs just switch sampler T -> unit 1).
    CF.MOBCOLOR = { white: 0, zskin: 1, zcloth: 2, zdark: 3, pig: 4, cow: 5, sheep: 6, ink: 7,
      skel: 8, skeleton: 8, skelDark: 9, cree: 10, creeDark: 11, creeFlash: 12, arrow: 13, bone: 14, tnt: 15 };
    const PAL = new Uint8Array([
      255, 255, 255, 255, 68, 118, 86, 255, 84, 92, 120, 255, 40, 54, 44, 255,
      232, 136, 136, 255, 96, 76, 60, 255, 226, 224, 214, 255, 24, 24, 28, 255,
      214, 214, 206, 255, 150, 150, 150, 255, 60, 160, 72, 255, 40, 120, 52, 255, 235, 235, 235, 255,
      180, 180, 180, 255, 236, 236, 224, 255, 120, 100, 80, 255, 180, 40, 36, 255]);
    palTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, palTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 16, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, PAL);
    gl.activeTexture(gl.TEXTURE0);
    mobVAO = gl.createVertexArray(); gl.bindVertexArray(mobVAO);
    mobVB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, mobVB);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(7), gl.STREAM_DRAW);
    gl.bindVertexArray(null);
    itemVAO = gl.createVertexArray(); gl.bindVertexArray(itemVAO); // #060 dropped-item billboards (atlas unit 0)
    itemVB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, itemVB);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(7), gl.STREAM_DRAW);
    gl.bindVertexArray(null);
  }

  function upload(cx, cz, m) {
    const k = cx + ',' + cz;
    let e = meshMap.get(k);
    if (!e) {
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
      gl.bindVertexArray(null);
      e = { vao, vb, n: 0 };
      const wvao = gl.createVertexArray(); gl.bindVertexArray(wvao);
      const wvb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, wvb);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
      gl.bindVertexArray(null);
      e.wvao = wvao; e.wvb = wvb; e.wn = 0;
      meshMap.set(k, e);
    }
    const arr = new Float32Array(m.pos.length + m.col.length);
    for (let i = 0, j = 0; i < m.pos.length / 3; i++) {
      arr[j++] = m.pos[i * 3]; arr[j++] = m.pos[i * 3 + 1]; arr[j++] = m.pos[i * 3 + 2];
      arr[j++] = m.col[i * 4]; arr[j++] = m.col[i * 4 + 1]; arr[j++] = m.col[i * 4 + 2]; arr[j++] = m.col[i * 4 + 3];
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, e.vb);
    gl.bufferData(gl.ARRAY_BUFFER, arr.length ? arr : new Float32Array(7), gl.STATIC_DRAW);
    e.n = arr.length / 7;
    const warr = new Float32Array(m.wpos.length + m.wcol.length);
    for (let i = 0, j = 0; i < m.wpos.length / 3; i++) {
      warr[j++] = m.wpos[i * 3]; warr[j++] = m.wpos[i * 3 + 1]; warr[j++] = m.wpos[i * 3 + 2];
      warr[j++] = m.wcol[i * 4]; warr[j++] = m.wcol[i * 4 + 1]; warr[j++] = m.wcol[i * 4 + 2]; warr[j++] = m.wcol[i * 4 + 3];
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, e.wvb);
    gl.bufferData(gl.ARRAY_BUFFER, warr.length ? warr : new Float32Array(7), gl.STATIC_DRAW);
    e.wn = warr.length / 7;
    stats.lastBuf = Array.from(arr.slice(0, 12));
  }

  function renderTick() {
    const W = CF.world;
    stats.ready = texReady;
    if (!W) return;
    let budget = 2;
    for (const k of W.dirty) {
      if (budget-- <= 0) break;
      W.dirty.delete(k);
      const [cx, cz] = k.split(',').map(Number);
      W.ensureLight(cx, cz);
      upload(cx, cz, buildMesh(cx, cz));
      stats.rebuilds++;
    }
    // progressive initial pass: mesh all existing chunks not yet mapped
    if (W.chunks.size) {
      let b2 = 2;
      for (const [k] of W.chunks) {
        if (b2 <= 0) break;
        if (meshMap.has(k)) continue;
        b2--;
        const [cx, cz] = k.split(',').map(Number);
        W.ensureLight(cx, cz);
        upload(cx, cz, buildMesh(cx, cz));
        stats.rebuilds++; stats.meshes++;
      }
    }
  }

  function persp(f, a, n, z) { const t = 1 / Math.tan(f / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (z + n) / (n - z), 2 * z * n / (n - z), 0, 0, -1, 0]; }
  function view(e, yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const f = [sy * cp, sp, cy * cp], r = [cy, 0, -sy];
    const u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
    const d = (a) => -(a[0] * e[0] + a[1] * e[1] + a[2] * e[2]);
    const rn = [-f[0], -f[1], -f[2]];
    return [r[0], r[1], r[2], d(r), u[0], u[1], u[2], d(u), rn[0], rn[1], rn[2], d(rn), 0, 0, 0, 1];
  }
  function mm(a, b) { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[i * 4 + k] * b[k * 4 + j]; o[i * 4 + j] = s; } return o; }
  const tr = (m) => [m[0], m[4], m[8], m[12], m[1], m[5], m[9], m[13], m[2], m[6], m[10], m[14], m[3], m[7], m[11], m[15]];

  function draw(cam) {
    if (!gl || !texReady) return;
    const c = CF.canvas;
    if (CF.shake > 0) cam = { pos: [cam.pos[0] + (Math.random() - 0.5) * 0.12 * CF.shake / 18, cam.pos[1] + (Math.random() - 0.5) * 0.1 * CF.shake / 18, cam.pos[2] + (Math.random() - 0.5) * 0.12 * CF.shake / 18], yaw: cam.yaw, pitch: cam.pitch }; // #037/#042 blast shake
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.useProgram(prog);
    gl.uniform1i(uTloc, 0);
    gl.viewport(0, 0, c.width, c.height);
    const dayF = CF.dayFactor ? CF.dayFactor() : 1;
    const skyDay = [0.6, 0.75, 1.0], skyNight = [0.02, 0.03, 0.07];
    const mixv = (i) => skyNight[i] + (skyDay[i] - skyNight[i]) * dayF;
    let sky = [mixv(0), mixv(1), mixv(2)];
    if (CF.raining && CF.raining()) { // #041 overcast (thunder = gloomier)
      const k = CF.weather.thunder ? 0.28 : 0.45, g = CF.weather.thunder ? 0.24 : 0.3;
      sky = sky.map((v, i) => v * k + [0.28, 0.3, 0.34][i] * g);
    }
    if (CF.lightFlash > 0) sky = [0.9, 0.92, 1]; // lightning frames the world white
    gl.clearColor(sky[0], sky[1], sky[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog);
    const VP = tr(mm(persp(70 * Math.PI / 180, c.width / c.height, 0.1, 300), view(cam.pos, cam.yaw, cam.pitch)));
    gl.uniformMatrix4fv(uVP, false, new Float32Array(VP));
    gl.uniform3f(uFog, sky[0], sky[1], sky[2]);
    gl.uniform1f(gl.getUniformLocation(prog, 'uDay'), Math.max(dayF, 0.25));
    gl.uniform3fv(gl.getUniformLocation(prog, 'E'), new Float32Array(cam.pos));
    let tris = 0, drawn = 0;
    for (const [, e] of meshMap) {
      if (!e.n) continue;
      gl.bindVertexArray(e.vao);
      gl.drawArrays(gl.TRIANGLES, 0, e.n);
      tris += e.n / 3; drawn++;
    }
    // #035 mob boxes: opaque, depth-tested, same shader via palette on unit 1 (dynamic VBO each frame)
    stats.mtris = 0; stats.mobCount = CF.mobs ? CF.mobs.list.length : 0;
    if (CF.buildMobVerts) {
      const mv = CF.buildMobVerts(cam);
      if (mv && mv.length) {
        gl.depthMask(true); gl.disable(gl.BLEND);
        gl.bindBuffer(gl.ARRAY_BUFFER, mobVB);
        gl.bufferData(gl.ARRAY_BUFFER, mv, gl.STREAM_DRAW);
        gl.bindVertexArray(mobVAO);
        gl.uniform1i(uTloc, 1);
        gl.drawArrays(gl.TRIANGLES, 0, mv.length / 7);
        gl.uniform1i(uTloc, 0);
        gl.bindVertexArray(null);
        stats.mtris = mv.length / 21;
      }
    }
    // #060 dropped-item billboards: two crossed textured quads sampled from the ATLAS (same unit 0, same shader)
    stats.itris = 0; stats.itemCount = CF.itemEnts ? CF.itemEnts.length : 0;
    if (CF.itemEnts && CF.itemEnts.length && texReady) {
      const iv = [];
      const S = ASZ, W = CF.world;
      for (const it of CF.itemEnts) {
        const d = CF.itemDef && CF.itemDef(it.name);
        const meta = d && (window.__TEXMETA || {})[d.tile];
        const uvf = meta ? [(meta.x + 0.25) / S, (meta.y + 0.25) / S, (meta.x + meta.w - 0.25) / S, (meta.y + meta.h - 0.25) / S] : MAGENTA_UV;
        const br = (W.lightAt(Math.floor(it.x), Math.max(1, Math.floor(it.y + 0.1)), Math.floor(it.z)) || 14 << 0) / 255;
        const bob = Math.sin(CF.ticks * 0.12 + it.ph) * 0.04;
        const py = it.y + 0.12 + bob;
        for (const dd of [1, -1]) { // two crossed quads (like cross-model blocks)
          const ax = 0.12, az = 0.12 * dd;
          const A = [it.x - ax, py, it.z - az], B = [it.x + ax, py, it.z + az];
          const C = [B[0], py + 0.26, B[2]], D = [A[0], py + 0.26, A[2]];
          const uvs = [[uvf[0], uvf[3]], [uvf[2], uvf[3]], [uvf[2], uvf[1]], [uvf[0], uvf[1]]];
          for (const oi of [0, 1, 2, 0, 2, 3]) { const P4 = [A, B, C, D][oi]; iv.push(P4[0], P4[1], P4[2], uvs[oi][0], uvs[oi][1], 0.98, br); }
        }
      }
      if (iv.length) {
        gl.depthMask(true); gl.disable(gl.BLEND); gl.uniform1i(uTloc, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, itemVB);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(iv), gl.STREAM_DRAW);
        gl.bindVertexArray(itemVAO);
        gl.drawArrays(gl.TRIANGLES, 0, iv.length / 7);
        gl.bindVertexArray(null);
        stats.itris = iv.length / 21;
      }
    }
    // translucent liquid pass (no depth write) (#022) - premultiplied blending
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(true); // #043: WRITE depth so a nearer liquid face occludes farther ones -> no double-blend banding (was depthMask(false))
    let wtris = 0;
    for (const [, e] of meshMap) {
      if (!e.wn) continue;
      gl.bindVertexArray(e.wvao);
      gl.drawArrays(gl.TRIANGLES, 0, e.wn);
      wtris += e.wn / 3;
    }
    stats.wtris = wtris;
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    stats.tris = tris; stats.drawn = drawn; stats.mapped = meshMap.size;
    stats.glErr = gl.getError();
  }

  CF.initRenderer = initRenderer;
  CF.renderTick = renderTick;
  CF.renderDraw = draw;
  CF.readCenter = () => {
    if (!gl) return [0, 0, 0];
    const q = new Uint8Array(4);
    gl.readPixels((CF.canvas.width / 2) | 0, (CF.canvas.height / 2) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, q);
    return [q[0], q[1], q[2]];
  };
  CF.renderReset = () => {
    if (!gl) { meshMap.clear(); return; }
    for (const [, e] of meshMap) { gl.deleteBuffer(e.vb); gl.deleteVertexArray(e.vao); gl.deleteBuffer(e.wvb); gl.deleteVertexArray(e.wvao); }
    meshMap.clear();
    stats.meshes = 0; stats.tris = 0; stats.rebuilds = 0; stats.mtris = 0;
  };

  CF.rendererTests = async (r) => {
    const t0 = performance.now();
    CF.world.ensureAround(0, 0, 4);
    for (let i = 0; i < 40 && CF.world.stats().queue; i++) CF.world.tick();
    for (let i = 0; i < 100 && (!stats.ready || meshMap.size < CF.world.chunks.size - 2); i++) {
      CF.renderTick(); await new Promise((res) => setTimeout(res, 50));
    }
    stats.meshAllMs = +(performance.now() - t0).toFixed(0);
    CF.renderDraw({ pos: [0, CF.world.heightAt(0, 0) + 12, 0], yaw: 0.6, pitch: -1.4 });
    CF.assert(r, 'render.mesh-all(' + stats.meshAllMs + 'ms)', stats.meshAllMs < 6000);
    const rp = new Uint8Array(4);
    gl.readPixels(Math.max(1, (CF.canvas.width / 2) | 0), Math.max(1, (CF.canvas.height / 2) | 0), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rp);
    stats.px = [rp[0], rp[1], rp[2]];
    CF.assert(r, 'render.px(' + stats.px + ')', rp[0] + rp[1] + rp[2] < 500);
    // #021: same camera, night vs day pixel luminance
    const cam = { pos: [0, CF.world.heightAt(0, 0) + 12, 0], yaw: 0.6, pitch: -1.4 };
    const lum = () => { CF.renderDraw(cam); const q = new Uint8Array(4); gl.readPixels((CF.canvas.width / 2) | 0, (CF.canvas.height / 2) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, q); return q[0] + q[1] + q[2]; };
    CF.timeOffset = 0; const dayL = lum();
    CF.timeOffset = 18000; const nightL = lum();
    CF.timeOffset = 0; CF.renderDraw(cam);
    CF.assert(r, 'time.pixel-night(' + nightL + '<' + dayL + ')', nightL < dayL * 0.6 && dayL > 100);
    stats.mapped = meshMap.size;
    CF.assert(r, 'render.atlas', stats.ready === true);
    CF.assert(r, 'render.merged(' + stats.mapped + '/' + CF.world.chunks.size + ')', stats.mapped >= CF.world.chunks.size - 2);
    CF.assert(r, 'render.tris(' + stats.tris + ',rebuilds=' + stats.rebuilds + ')', stats.tris > 1000);
    CF.assert(r, 'render.glErr', stats.glErr === 0);
    CF.assert(r, 'render.no-missing-tiles', stats.missingTiles.size === 0);
    const before = stats.rebuilds;
    CF.world.set(3, 40, 3, CF.IDOF['stone']);
    CF.renderTick(); CF.renderTick();
    CF.assert(r, 'render.dirty-fast', stats.rebuilds >= before + 1);
    // #046: back (-X/-Z) faces must mesh - mesher used to emit only +axis faces, so a block viewed
    // from the opposite corner was a hole. Deterministic sky platform (vegetation can never occlude).
    {
      const W = CF.world, px0 = 96, rx = 44, rz = 100;
      W.ensureAround(rx, rz, 1);
      for (let i = 0; i < 30 && W.stats().queue; i++) W.tick();
      for (let x = rx - 4; x <= rx + 4; x++) for (let z = rz - 4; z <= rz + 4; z++) { W.set(x, px0, z, CF.IDOF['stone']); for (let y = px0 + 1; y <= px0 + 6; y++) W.set(x, y, z, 0); }
      W.ensureLight(rx >> 4, rz >> 4); for (let i = 0; i < 8; i++) W.tick();
      const drain = () => { for (let i = 0; i < 300 && W.dirty.size; i++) CF.renderTick(); };
      const shot = (id) => {
        W.set(rx, px0 + 1, rz, id); drain();
        CF.renderDraw({ pos: [rx - 1.4, px0 + 2.4, rz - 1.4], yaw: Math.atan2(1.9, 1.9), pitch: -0.32 });
        const q = new Uint8Array(4); gl.readPixels((CF.canvas.width / 2) | 0, (CF.canvas.height / 2) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, q);
        return [q[0], q[1], q[2], stats.tris];
      };
      const e0 = shot(0), e1 = shot(CF.IDOF['log']);
      shot(0);
      const d = Math.abs(e0[0] - e1[0]) + Math.abs(e0[1] - e1[1]) + Math.abs(e0[2] - e1[2]);
      CF.assert(r, 'render.face-back(' + d + ',t0=' + e0[3] + ',t1=' + e1[3] + ',b=' + e1.slice(0, 3) + ')', d > 40);
      // #106: back faces must be TEXTURED+LIT, not black (light sampled on the air side of the min-boundary plane)
      {
        const W2 = CF.world, rx = 88, rz = 88;
        W2.ensureAround(rx, rz, 1);
        for (let i = 0; i < 20 && W2.stats().queue; i++) W2.tick();
        const g0 = W2.heightAt(rx, rz) - 1; // solid surface level (heightAt returns the first air cell)
        for (let x = rx - 4; x <= rx + 4; x++) for (let z = rz - 4; z <= rz + 4; z++) {
          for (let y = g0 + 1; y < g0 + 8; y++) W2.set(x, y, z, 0); // clear air above the surface only
          W2.set(x, g0, z, CF.IDOF['cobblestone']); // wall block ON the surface - never delete the floor!
        }
        W2.ensureLight(rx >> 4, rz >> 4);
        for (let i = 0; i < 10; i++) W2.tick();
        for (let i = 0; i < 200 && W2.dirty.size; i++) CF.renderTick();
        CF.renderDraw({ pos: [rx - 2.6, g0 + 1.5, rz], yaw: Math.PI / 2, pitch: -0.2 }); // dead-on the -X cobble face center
        const q = new Uint8Array(4);
        const cx = (CF.canvas.width * 0.5) | 0;
        CF.gl.readPixels(cx, (CF.canvas.height * 0.52) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, q);
        const c1 = [q[0], q[1], q[2]];
        CF.gl.readPixels(cx, (CF.canvas.height * 0.46) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, q);
        const c2 = [q[0], q[1], q[2]];
        const lum = (p) => p[0] + p[1] + p[2];
        const hit = [c1, c2, [0, 0, 0], [0, 0, 0]];
        for (const [fx, fy, idx] of [[0.44, 0.5, 2], [0.56, 0.5, 3]]) {
          CF.gl.readPixels((CF.canvas.width * fx) | 0, (CF.canvas.height * fy) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, q);
          hit[idx] = [q[0], q[1], q[2]];
        }
        CF.assert(r, 'render.face-lit(' + hit.map(lum).join(',') + ')',
          hit.every((p) => lum(p) > 150)); // ALL probes on the cobble -X face: textured+lit (black-bug era = <60)
        for (let x = rx - 4; x <= rx + 4; x++) for (let z = rz - 4; z <= rz + 4; z++) W2.set(x, g0, z, 0);
      }
    }
  };
})();
