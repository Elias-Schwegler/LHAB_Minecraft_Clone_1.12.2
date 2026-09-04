// find seeds whose spawn area is plains (grass) biome
const hash = (a) => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function makeNoise(seed) {
  const n = new Float32Array(8192);
  for (let i = 0; i < 8192; i++) n[i] = hash(seed * 7919 + i);
  const hs = (x, y, z) => n[(((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) & 8191)];
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = x - xi, v = y - yi, w = z - zi;
    const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), sw = w * w * (3 - 2 * w), L = (a, b, t) => a + (b - a) * t;
    return L(L(L(hs(xi, yi, zi), hs(xi + 1, yi, zi), su), L(hs(xi, yi + 1, zi), hs(xi + 1, yi + 1, zi), su), sv),
      L(L(hs(xi, yi, zi + 1), hs(xi + 1, yi, zi + 1), su), L(hs(xi, yi + 1, zi + 1), hs(xi + 1, yi + 1, zi + 1), su), sv), sw);
  };
}
const good = [];
for (let s = 1; s < 400; s++) {
  const nT = makeNoise(s + 3);
  let plains = 0, tot = 0;
  for (let dx = -6; dx <= 6; dx += 3) for (let dz = -6; dz <= 6; dz += 3) {
    const t = nT(dx * 0.0015, 9, dz * 0.0015);
    tot++; if (t >= 0.36 && t <= 0.66) plains++;
  }
  if (plains === tot) good.push(s);
}
console.log('plains seeds:', good.slice(0, 20).join(','));
