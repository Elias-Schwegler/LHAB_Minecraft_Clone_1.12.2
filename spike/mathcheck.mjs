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
const P = [0, 62, 0], E = [0, 66, 0];
const VP = mm(persp(70 * Math.PI / 180, 854 / 480, 0.1, 300), view(E, 0.6, -1.4));
// GLSL: gl_Position = VP_col * v, VP_col = tr(VP) column-major == row math VP * v
const M = tr(VP); // column-major array of row-major VP
function mulC(m, v) { // column-major m
  const o = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) o[i] = m[0 * 4 + i] * v[0] + m[1 * 4 + i] * v[1] + m[2 * 4 + i] * v[2] + m[3 * 4 + i] * v[3];
  return o;
}
const clip = mulC(M, [...P, 1]);
console.log('clip', clip.map((x) => +x.toFixed(2)), 'ndc', clip.slice(0, 3).map((x) => +(x / clip[3]).toFixed(3)));
