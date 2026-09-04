# ENVIRONMENT (verified 2026-09-04)

All checks run on Windows / PowerShell 5.1. Re-verify in Phase 0 of every iteration.

| Tool | Status | Details |
|---|---|---|
| git | OK | 2.54.0.windows.1 (on PATH) |
| node | OK | v24.18.0, npm 11.16.0 (on PATH) — tools use ZERO npm deps (offline policy) |
| blender | OK | Blender 5.2.1 LTS, **not on PATH**: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe` |
| headless browser | OK | Edge `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |

## Smoke tests (all PASSED)

1. **Blender headless render**: `blender --background --python smoke_tex.py` rendered a
   16x16 noise-textured PNG (workbench engine, procedural color-ramp on noise texture).
   Output valid PNG. Note: a BlenderMCP addon prints noise on startup; ignore it.
2. **Edge headless screenshot**: `--headless=new --disable-gpu --window-size=WxH
   --virtual-time-budget=2000 --screenshot=out.png file:///...` produced valid PNG.
3. **WebGL in headless Edge**: WebGL2 context created, `clear+readPixels` returned
   `(0,255,0,255)` — software rasterizer (SwiftShader). FPS in headless will be far
   below a real GPU; use software FPS only as relative benchmark.

## Harness design decisions (drive tooling)

- No npm dependencies anywhere: CDP avoided in favor of
  `--dump-dom` (assertions via `document.title` set by `window.__test` harness),
  `--screenshot` (visual evidence), `--virtual-time-budget` (deterministic sim time).
- Game reads `location.hash` (`#test`, `#shot=NAME`) to enter harness modes; the
  harness writes `TESTRESULT:{json}` into `document.title` when finished.
- Blender invoked with absolute path via a resolver in tools (PATH first, then known
  install locations).
- Console errors captured by game harness installing `window.onerror`/`console.error`
  hooks and including the list in TESTRESULT JSON.

## Commands

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python tools/tex/gen.py
node tools/build.mjs ; node tools/test.mjs ; node tools/shot.mjs <scenario>
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu `
  --window-size=854,480 --virtual-time-budget=5000 --screenshot=out.png "file:///...index.html#shot=x"
```
