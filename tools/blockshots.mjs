// Per-block proof sheets: node tools/blockshots.mjs — for every registered block+variant,
// renders a centered pedestal shot into qa/blocks/<name>[-variant].png (parity evidence).
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { runBrowser, toFileUrl, p } from './lib.mjs';

const catalog = JSON.parse((await import('node:fs')).readFileSync(p('docs', 'catalog.json'), 'utf8'));
const reg = { /* filled from built artifact below */ };
const html = (await import('node:fs')).readFileSync(p('game', 'index.html'), 'utf8');
const m = html.match(/\/\*REGISTRY-START\*\/([\s\S]*?)\/\*REGISTRY-END\*\//);
Object.assign(reg, JSON.parse(m[1]));
const dir = p('qa', 'blocks');
mkdirSync(dir, { recursive: true });

const wanted = [];
for (const b of catalog.blocks) {
  if (!reg[b.n]) continue;
  for (const key of Object.keys(reg[b.n].variants)) wanted.push(b.n);
}
let n = 0;
for (const name of wanted) {
  const out = `${dir}\\${name}.png`;
  runBrowser({ url: toFileUrl(p('game', 'index.html')) + `?block=${name}&seed=5#shot=block`, screenshot: out, budget: 9000, timeout: 90000 });
  const ok = existsSync(out) && statSync(out).size > 2000;
  console.log(`${ok ? 'OK ' : 'BAD'} ${name} (${ok ? statSync(out).size : 0}B)`);
  n++;
}
console.log(`blockshots done: ${n} files -> qa/blocks/`);
