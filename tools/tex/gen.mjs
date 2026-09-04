// gen.mjs — regenerate the Blender texture atlas + manifest. Usage: node tools/tex/gen.mjs [script.py]
// Blender is mandatory here (no silent fallback, §1.2/§1.3).
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { findBlender, p } from '../lib.mjs';

const py = process.argv[2] || 'gen.py';
const script = p('tools', 'tex', py);
if (!existsSync(script)) { console.error(`missing ${script}`); process.exit(2); }
const bl = findBlender();
console.log('blender:', bl);
const out = execFileSync(bl, ['--background', '--python', script], { encoding: 'utf8', timeout: 600000, windowsHide: true });
const okLine = out.split(/\r?\n/).filter((l) => /TEXGEN/.test(l)).join('\n');
console.log(okLine || out.slice(-500));
if (!/TEXGEN_OK/.test(out)) { console.error('TEXGEN FAILED (no TEXGEN_OK line)'); process.exit(1); }
