// test.mjs — quality gate. Usage:
//   node tools/test.mjs            -> all suites (~full sim time)
//   node tools/test.mjs --quick    -> skip slow suites (fast dev loop)
//   node tools/test.mjs --suites=world,light  -> selected suites
import { existsSync } from 'node:fs';
import { runBrowser, toFileUrl, p } from './lib.mjs';

const args = process.argv.slice(2);
let spec = 'all';
if (args.includes('--quick')) spec = 'quick';
const sArg = args.find((a) => a.startsWith('--suites='));
if (sArg) spec = sArg.slice(9);
const timeout = spec === 'all' ? 240000 : 120000;
// virtual budget only needs to cover timer waits (sync test code runs instantly); keep tight to cut wall time
const budget = spec === 'all' ? 16000 : 8000;

if (!existsSync(p('game', 'index.html'))) { console.error('run tools/build.mjs first'); process.exit(2); }

const url = toFileUrl(p('game', 'index.html')) + '#test=' + encodeURIComponent(spec);
const dom = runBrowser({ url, dumpDom: true, budget, timeout });
const m = dom.match(/<title>TESTRESULT:([^<]*)<\/title>/);
if (!m) { console.error('FAIL: no TESTRESULT in title (harness did not finish)'); process.exit(1); }
const r = JSON.parse(decodeURIComponent(m[1]));
const ok = r.fail.length === 0 && r.errors.length === 0;
console.log(ok ? 'TEST GREEN' : 'TEST RED', `(spec: ${spec})`);
const times = r.times || {};
const total = Object.values(times).reduce((a, b) => a + b, 0);
console.log('suites: ' + Object.entries(times).map(([k, v]) => `${k} ${v}ms`).join(', '));
console.log(`total in-page sim time: ${(total / 1000).toFixed(1)}s | asserts: ${r.pass.length} pass / ${r.fail.length} fail | registry blocks: ${r.registry}`);
if (r.fail.length) console.log(`  fail: ${r.fail.join(', ')}`);
if (r.errors.length) console.log(`  console errors: ${r.errors.join(' | ')}`);
process.exit(ok ? 0 : 1);
