// audit7 helper: run the #test gate, print FULL parsed TESTRESULT summary.
import { runBrowser, toFileUrl, p } from '../tools/lib.mjs';

const spec = process.argv[2] || 'all';
const budget = spec === 'all' ? 16000 : 8000;
const timeout = Number(process.env.CF_TIMEOUT || 240000);
const url = toFileUrl(p('game', 'index.html')) + '#test=' + encodeURIComponent(spec);
const t0 = Date.now();
let dom = '';
let err = null;
try {
  dom = runBrowser({ url, dumpDom: true, budget, timeout });
} catch (e) {
  err = e.code || e.message;
  dom = e.stdout || '';
}
const wall = ((Date.now() - t0) / 1000).toFixed(1);
const m = dom.match(/<title>TESTRESULT:([^<]*)<\/title>/);
if (!m) { console.log(`spec=${spec} wall=${wall}s err=${err || 'none'} NO-TESTRESULT title=${(dom.match(/<title>([^<]*)<\/title>/) || [,'?'])[1]}`); process.exit(0); }
const r = JSON.parse(decodeURIComponent(m[1]));
console.log(`spec=${spec} wall=${wall}s pass=${r.pass.length} fail=${r.fail.length} errors=${r.errors.length} registry=${r.registry}`);
if (r.fail.length) console.log('FAILS:\n  ' + r.fail.join('\n  '));
if (r.errors.length) console.log('ERRORS:\n  ' + r.errors.join('\n  '));
