import { readFileSync, writeFileSync } from 'node:fs';
const L = readFileSync('src/world.js', 'utf8').split('\n');
const seg = (a, b) => L.slice(a - 1, b).join('\n');
const head = L.slice(0, 398).join('\n');

const fn = (name, body) => `  CF.${name} = async (r) => {\n${body}\n  };`;

const block = [
  '(function () {',
  '  const CF = window.CF;',
  fn('lightTests', '    const w = CF.world;\n' + seg(404, 450)),
  fn('worldTests', '    const w = CF.world;\n' + seg(451, 475) + '\n    const ID = CF.IDOF;\n' + seg(493, 520)),
  fn('grassTests', '    const w = CF.world;\n    const ID = CF.IDOF;\n' + seg(487, 492)),
  fn('timeTests', '    const w = CF.world;\n' + seg(477, 484)),
  fn('fluidTests', '    const w = CF.world;\n    const ID = CF.IDOF;\n' + seg(522, 574)),
  '})();',
].join('\n');

writeFileSync('src/world.js', head + '\n' + block + '\n');
// sanity: balanced braces-ish check
const src = readFileSync('src/world.js', 'utf8');
for (const [open, close] of [['{', '}'], ['(', ')']])
  console.log(open + close + ':', src.split(open).length - 1, 'vs', src.split(close).length - 1);
console.log('dup IDOF?', /const IDOF = CF\.IDOF;\n\s*const IDOF/.test(src));
