import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const p = (...s) => join(ROOT, ...s);
export const rel = (s) => s.slice(ROOT.length).replaceAll('\\', '/');

const CANDIDATES_EDGE = [
  process.env.EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

const CANDIDATES_BLENDER = [
  process.env.BLENDER_PATH,
  'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe',
  'C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe',
  'C:\\Program Files\\Blender Foundation\\Blender\\blender.exe',
].filter(Boolean);

export function findEdge() {
  for (const c of CANDIDATES_EDGE) if (existsSync(c)) return c;
  throw new Error('No headless browser found. Install Edge/Chrome or set EDGE_PATH. §1.3: STOP.');
}

export function findBlender() {
  for (const c of CANDIDATES_BLENDER) if (existsSync(c)) return c;
  try {
    const out = execFileSync('where', ['blender'], { encoding: 'utf8' }).trim().split(/\r?\n/)[0];
    if (out && existsSync(out)) return out;
  } catch {}
  throw new Error('Blender not found (set BLENDER_PATH). §1.3: STOP.');
}

export function tmpProfile() {
  return mkdtempSync(join(tmpdir(), 'cf-edge-'));
}

export function runBrowser({ url, screenshot, dumpDom = false, width = 854, height = 480, budget = 6000, timeout = 60000 }) {
  const edge = findEdge();
  const profile = tmpProfile();
  const args = [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-translate', '--mute-audio',
    `--user-data-dir=${profile}`,
    `--virtual-time-budget=${budget}`,
    `--allow-file-access-from-files`,
  ];
  if (dumpDom) args.push('--dump-dom');
  if (screenshot) { args.push(`--window-size=${width},${height}`, `--screenshot=${screenshot}`); }
  args.push(url);
  try {
    const out = execFileSync(edge, args, { encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
    return out;
  } catch (e) {
    if (e.stdout && dumpDom) return e.stdout; // edge may exit non-zero after dump-dom
    throw e;
  }
}

export function toFileUrl(absPath) {
  return 'file:///' + absPath.replaceAll('\\', '/');
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function readJson(f) { return JSON.parse(readFileSync(f, 'utf8')); }
