// test.mjs — runs the built game headless, executes window.__test-style harness
// (hash #test), parses TESTRESULT from document.title, exits 0 only if all green.
import { existsSync } from 'node:fs';
import { runBrowser, toFileUrl, p } from './lib.mjs';

if (!existsSync(p('game', 'index.html'))) { console.error('run tools/build.mjs first'); process.exit(2); }

const url = toFileUrl(p('game', 'index.html')) + '#test';
const dom = runBrowser({ url, dumpDom: true, budget: 20000, timeout: 200000 });
const m = dom.match(/<title>TESTRESULT:([^<]*)<\/title>/);
if (!m) { console.error('FAIL: no TESTRESULT in title (harness did not finish)'); process.exit(1); }
const r = JSON.parse(decodeURIComponent(m[1]));
const ok = r.fail.length === 0 && r.errors.length === 0;
console.log(ok ? 'TEST GREEN' : 'TEST RED');
console.log(`  pass: ${r.pass.join(', ') || '(none)'}`);
if (r.fail.length) console.log(`  fail: ${r.fail.join(', ')}`);
if (r.errors.length) console.log(`  console errors: ${r.errors.join(' | ')}`);
console.log(`  ticks: ${r.ticks}, registry blocks: ${r.registry}`);
process.exit(ok ? 0 : 1);
