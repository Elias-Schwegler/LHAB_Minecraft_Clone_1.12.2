// Chunk renderer: greedy mesher + atlas UVs + sun-shade + fog (SPK-1 learnings applied).
// Convention: math in ROW-major, transpose on upload. Sim-independent draw.
window.CF = window.CF || {};
(function () {
  const CF = window.CF;
  const CX = 16, CH = 128, CZ = 16;
  let gl, prog, uVP, uFog, uTloc, tex, meshMap = new Map(), texReady = false;
  let palTex, mobVAO, mobVB; // #035: mobs reuse this shader, sampling a solid-color palette on unit 1
  const stats = { meshes: 0, tris: 0, rebuilds: 0, glErr: 0, missingTiles: new Set() };
  CF.rendererStats = stats;
  const SHADE = { 0: 0.8, 1: 1.0, 2: 0.6 }; // +x,+y,+z faces; opposite = slightly darker
  const MAGENTA_UV = [127.25 / 128, 127.25 / 128, 127.75 / 128, 127.75 / 128];

  function buildMesh(cx, cz) {
    const W = CF.world;
    const pos = [], col = [], tris = [0];
    const off = [cx * CX, 0, cz * CZ];
    const dims = [CX, CH, CZ];
    const coord = (a, ua, va, d, u, v) => { const Q = [0, 0, 0]; Q[a] = d; Q[ua] = u; Q[va] = v; for (let i = 0; i < 3; i++) Q[i] += off[i]; return Q; };
    for (let a = 0; a < 3; a++) {
      const ua = (a + 1) % 3, va = (a + 2) % 3;
      if (a === 0) {
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
          const uvf = meta ? [(meta.x + 0.25) / 128, (meta.y + 0.25) / 128, (meta.x + 15.75) / 128, (meta.y + 15.75) / 128] : MAGENTA_UV;
          const quad = (d) => {
            const ax = 0.35, az = 0.35 * d;
            const A = [x + 0.5 - ax, y, z + 0.5 - az], B = [x + 0.5 + ax, y, z + 0.5 + az];
            const C = [B[0], y + 1, B[2]], D = [A[0], y + 1, A[2]];
            const uvs = [[uvf[0], uvf[1]], [uvf[2], uvf[1]], [uvf[2], uvf[3]], [uvf[0], uvf[3]]];
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
          if (CF.BY_ID[cur] && (CF.BY_ID[cur].cross || CF.BY_ID[cur].liquid)) continue; // drawn separately
          const B = A.slice(); B[a]++;
          if (W.get(B[0], B[1], B[2])) continue;
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
          const tile = CF.tileFor(val & 0xfff, a * 2);
          const shade = (a % 2 === 0) ? shadeBase : shadeBase * 0.85;
          pushQuad(a, ua, va, d, u, v, w, hh, tile, shade, tris);
          for (let uu = 0; uu < w; uu++) for (let vv = 0; vv < hh; vv++) mask[(u + uu) * dims[va] + v + vv] = 0;
          v += hh;
        }
      }
    }
    function pushQuad(a, ua, va, d, u, v, w, hh, tile, shade, trisArr) {
      const meta = (window.__TEXMETA || {})[tile];
      let uvAt;
      if (meta) {
        const S = 128, IN = 0.25;
        const tw = (meta.w - 2 * IN) / S / 16, th = (meta.h - 2 * IN) / S / 16;
        const u0 = (meta.x + IN) / S, v0 = (meta.y + IN) / S;
        // per-face UV orientation: texture-up (v0=PNG top) must follow world +Y on sides;
        // uvAt(du,dv) tiles one tile-cell per block.
        uvAt = (du, dv) => (a === 1 ? [u0 + tw * du, v0 + th * dv]
          : a === 0 ? [u0 + th * dv, v0 + th * (hh - du)]
          : [u0 + tw * du, v0 + th * (hh - dv)]);
      } else { stats.missingTiles.add(tile); uvAt = () => MAGENTA_UV.slice(0, 2); }
      const P = (du, dv) => coord(a, ua, va, d + 1, u + du, v + dv);
      // pack raw light nibbles (sky<<4|block) into BR; daylight factor applied in shader (#021)
      const mid = coord(a, ua, va, d + 1, Math.min(dims[ua] - 1, u + (w >> 1)), Math.min(dims[va] - 1, v + (hh >> 1)));
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
      for (let d = 0; d < dims[a]; d++) {
        for (let u = 0; u < dims[ua]; u++) for (let v = 0; v < dims[va]; v++) {
          const A = coord(a, ua, va, d, u, v);
          const id = W.get(A[0], A[1], A[2]);
          const v2 = id && CF.BY_ID[id];
          if (!v2 || !v2.liquid) continue;
          const B = A.slice(); B[a]++;
          const bid = W.get(B[0], B[1], B[2]);
          if (bid) continue; // only against air (v1)
          const tile = v2.tiles[a * 2];
          const meta = (window.__TEXMETA || {})[tile];
          if (!meta) stats.missingTiles.add(tile);
          const P0 = coord(a, ua, va, d + 1, u, v), P1 = coord(a, ua, va, d + 1, u + 1, v);
          const P2 = coord(a, ua, va, d + 1, u + 1, v + 1), P3 = coord(a, ua, va, d + 1, u, v + 1);
          const packed = W.lightAt(B[0], B[1], B[2]);
          const br = packed / 255;
          const uvf = meta ? [(meta.x + 0.25) / 128, (meta.y + 0.25) / 128, (meta.x + 15.75) / 128, (meta.y + 15.75) / 128] : MAGENTA_UV;
          const c00 = [P0[0], P0[1], P0[2]], c10 = [P1[0], P1[1], P1[2]], c11 = [P2[0], P2[1], P2[2]], c01 = [P3[0], P3[1], P3[2]];
          if (a === 1) for (const q of [c00, c10, c11, c01]) q[1] -= 0.12; // water surface slightly below bank (MC-like, avoids coplanar z-fight)
          const uvs = [[uvf[0], uvf[1]], [uvf[2], uvf[1]], [uvf[2], uvf[3]], [uvf[0], uvf[3]]];
          for (const oi of [0, 1, 2, 0, 2, 3]) {
            const q = [c00, c10, c11, c01][oi];
            wpos.push(q[0], q[1], q[2]);
            wcol.push(uvs[oi][0], uvs[oi][1], 0.95, br);
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
void main(){ vec4 t = texture(T, uv); float f = clamp((dist-40.)/50., 0., 1.);
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
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
      const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, 128, 128);
      px.data[(127 * 128 + 127) * 4 + 0] = 255; px.data[(127 * 128 + 127) * 4 + 1] = 0;
      px.data[(127 * 128 + 127) * 4 + 2] = 255; px.data[(127 * 128 + 127) * 4 + 3] = 255;
      ctx.putImageData(px, 0, 0);
      // #042 TNT tiles drawn procedurally into free atlas cells (no Blender, zero-download; block
      // stays functional:false so parity is untouched). tnt_side at (32,48), tnt_top at (48,48).
      const cell = (ox, oy, fn) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = fn(x, y); ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, 1, 1); } };
      cell(32, 48, (x, y) => (y >= 6 && y <= 9) ? (x % 4 < 2 ? '#3a2018' : '#d8d2c0') : (y < 3 || y > 12 ? '#a83028' : '#c84030')); // red body, dark band, "TNT" hint
      cell(48, 48, (x, y) => (x > 6 && x < 9 && y > 6 && y < 9) ? '#e8d040' : (x > 5 && x < 10 && y > 7 && y < 9 ? '#3a3a3a' : ((x % 2) ^ (y % 2) ? '#6a6a6a' : '#4a4a4a'))); // grey gunpowder top + fuse
      // #040 chest tiles (free cells): lid seam + latch
      cell(64, 48, (x, y) => (y === 4 || y === 5) ? '#6a4a22' : (x > 6 && x < 9 && y > 5 && y < 9) ? '#d8d2c0' : (y > 12 ? '#5a3c1a' : ((x + y) % 7 === 0 ? '#7a5528' : '#8a6230')));
      cell(80, 48, (x, y) => (y > 6 && y < 9) ? '#6a4a22' : ((x + y) % 6 === 0 ? '#7a5528' : '#96703a'));
      // #041 bed tiles: red blanket + white pillow (head side of top), wooden frame edge
      cell(96, 48, (x, y) => (y < 3 || y > 12) ? '#6a4a22' : (x < 3 ? '#6a4a22' : '#c03830'));
      cell(112, 48, (x, y) => (y < 2 || y > 13) ? '#6a4a22' : (y < 5 ? '#e8e4da' : '#c03830'));
      CF.__tntCellsDrawn = true;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      texReady = true;
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
    // translucent liquid pass (no depth write) (#022) - premultiplied blending
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
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
  };
})();
