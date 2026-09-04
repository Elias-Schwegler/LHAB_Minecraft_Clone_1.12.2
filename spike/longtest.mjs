import { runBrowser, toFileUrl, p } from '../tools/lib.mjs';
const t0 = Date.now();
const o = runBrowser({ url: toFileUrl(p('game', 'index.html')) + '#test', dumpDom: true, budget: 20000, timeout: 300000 });
const m = o.match(/<title>TESTRESULT:([^<]*)</);
console.log('wall-ms:', Date.now() - t0);
if (!m) { console.log('NO TITLE'); process.exit(1); }
const r = JSON.parse(decodeURIComponent(m[1]));
console.log('fails:', r.fail.join(' | ') || 'none');
console.log('asserts:', r.pass.length + r.fail.length);
