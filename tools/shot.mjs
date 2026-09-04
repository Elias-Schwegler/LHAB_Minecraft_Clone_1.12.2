// shot.mjs — scripted scenario -> PNG into qa/YYYY-MM-DD/. Usage: node tools/shot.mjs NAME
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { runBrowser, toFileUrl, today, p } from './lib.mjs';

const name = process.argv[2];
const qs = process.argv.slice(3).filter((a) => a.includes('='));
if (!name) { console.error('usage: node tools/shot.mjs <scenario> [key=val ...]'); process.exit(2); }
if (!existsSync(p('game', 'index.html'))) { console.error('run tools/build.mjs first'); process.exit(2); }

const dir = p('qa', today());
mkdirSync(dir, { recursive: true });
const out = `${dir}\\${name}.png`;
const q = qs.length ? '?' + qs.join('&') : '';
runBrowser({ url: toFileUrl(p('game', 'index.html')) + q + `#shot=${name}`, screenshot: out, budget: 12000, timeout: 90000 });
if (!existsSync(out) || statSync(out).size < 500) { console.error(`FAIL: screenshot missing/too small: ${out}`); process.exit(1); }
console.log(`shot OK -> ${out} (${statSync(out).size} bytes) — run vision check per DoD before DONE`);
