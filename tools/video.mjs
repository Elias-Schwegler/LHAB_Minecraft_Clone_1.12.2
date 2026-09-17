// video.mjs — QA gameplay "video": deterministic scripted playback captured as frame sequence.
// Each frame = one headless boot cut off at virtual-time budget T_k (Edge --screenshot fires exactly at
// budget expiry). Same seed + scripted inputs => same play in every boot (timers/rAF are virtual-deterministic;
// Math.random spots = weather/lightning/drop rolls only, cosmetic variance).
// Usage: node tools/video.mjs [name] [seed=N] [frames=N] [step=ms] [start=ms] [--clean]
// Output: qa/videos/YYYY-MM-DD/<name>/f<kk>.png (+ index.json). VIEW frames in <=8-image batches + write
// per-batch verdicts into the issue Evidence (DoD 4b law 2026-09-12).
// FRAMES ARE TEMPORARY (user 2026-09-17): qa/videos/ is .gitignored; the durable artifact is the verdict
// text in the issue. --clean deletes qa/videos/ entirely; each run also auto-prunes day-dirs older than KEEP_DAYS.
import { existsSync, mkdirSync, statSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { runBrowser, toFileUrl, today, p } from './lib.mjs';

const KEEP_DAYS = 5;
const vroot = p('qa', 'videos');
if (process.argv.includes('--clean')) {
  if (existsSync(vroot)) { rmSync(vroot, { recursive: true, force: true }); console.log('cleaned', vroot); }
  process.exit(0);
}
function pruneOld() { // best-effort hygiene: drop dated dirs beyond KEEP_DAYS (never the just-written one)
  if (!existsSync(vroot)) return;
  const now = Date.now();
  for (const d of readdirSync(vroot)) {
    const ms = Date.parse(d + 'T12:00:00Z');
    if (!isNaN(ms) && now - ms > KEEP_DAYS * 864e5) rmSync(vroot + '\\' + d, { recursive: true, force: true });
  }
}

const argv = process.argv.slice(2);
const kv = (k, d) => { const a = argv.find((x) => x.startsWith(k + '=')); return a ? +a.split('=')[1] : d; };
const name = argv[0] && !argv[0].includes('=') ? argv[0] : 'basic';
const seed = kv('seed', 5);
const frames = kv('frames', 16);
const step = kv('step', 3600);
const start = kv('start', 2600);

if (!existsSync(p('game', 'index.html'))) { console.error('run tools/build.mjs first'); process.exit(2); }
const dir = p('qa', 'videos', today(), name);
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const idx = [];
for (let k = 0; k < frames; k++) {
  const budget = start + k * step;
  const out = `${dir}\\f${String(k).padStart(2, '0')}.png`;
  const t0 = Date.now();
  let ok = false, err = '';
  for (let a = 0; a < 2 && !ok; a++) {
    try {
      runBrowser({ url: toFileUrl(p('game', 'index.html')) + `?seed=${seed}#shot=video-play`, screenshot: out, budget: budget + (a ? 8000 : 0), timeout: 180000 + budget * 12 });
    } catch (e) { err = String(e.message).slice(0, 80); }
    ok = existsSync(out) && statSync(out).size > 3000;
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const tickAt = Math.max(0, Math.round((budget - 900) / 50)); // ~20Hz sim after ~900ms boot
  console.log(`f${String(k).padStart(2, '0')} t~${tickAt}tick budget=${budget}ms -> ${ok ? statSync(out).size + 'B' : 'FAIL ' + err} (${secs}s)`);
  idx.push({ k, budget, tickAt, file: out.slice(dir.length + 1), ok, size: ok ? statSync(out).size : 0 });
  if (!ok) { console.error('video frame failed twice - aborting'); process.exit(1); }
}
writeFileSync(`${dir}\\index.json`, JSON.stringify({ name, seed, frames: idx }, null, 2));
pruneOld();
console.log(`VIDEO OK -> ${dir} (${frames} frames, TEMPORARY - verdicts belong in issue Evidence; ${vroot} is gitignored, auto-pruned >${KEEP_DAYS}d).`);
