// render.mjs — deterministic frame renderer for motion pieces built to the
// render contract (see references/render-pipeline.md).
//
// Usage:
//   node render.mjs <file.html|url> [seconds=6] [fps=24] [options]
//
// Options:
//   --size WxH         viewport / canvas size        (default 1080x1080)
//   --out DIR          output directory              (default out/frames)
//   --frames 0,24,48   render only these frames (stills pass)
//   --subframes S      motion blur: render S subframes per frame across a
//                      shutter window (see --shutter); blend afterwards with
//                      the ffmpeg command this script prints
//   --shutter 0.5      fraction of a frame the shutter is open (0.5 = 180°)
//   --scale 1|2        device scale factor; 2 = supersample, downscale later
//   --gpu              launch Chromium with GPU flags (WebGL/three.js pieces)
//   --file             load via file:// instead of the built-in local server
//                      (module imports will fail under file://)
//
// Frames rendered are 0..N-1 where N = round(seconds * fps). Frame N is
// frame 0 of the next loop and is never rendered.

import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, dirname, join, normalize, extname, basename, sep } from 'node:path';

const argv = process.argv.slice(2);
const positional = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};

const [target = 'anim.html', secs = '6', fpsArg = '24'] = positional;
const FPS = Number(fpsArg);
const N = Math.round(Number(secs) * FPS);
const [W, H] = String(opt('size', '1080x1080')).split('x').map(Number);
const OUT = opt('out', 'out/frames');
const S = Math.max(1, Number(opt('subframes', 1)));
const SHUTTER = Number(opt('shutter', 0.5));
const SCALE = Number(opt('scale', 1));
const GPU = Boolean(opt('gpu', false));
const only = opt('frames', null);
const frameList = only ? String(only).split(',').map(Number) : [...Array(N).keys()];

// Local files are served over http://127.0.0.1 rather than file://, because
// Chromium blocks ES-module imports (e.g. ./motion-tokens.js) from file:// pages.
// --file forces file:// if a piece genuinely needs it.
let server = null;
let url;
if (/^https?:\/\//.test(target)) {
  url = target;
} else if (opt('file', false)) {
  url = pathToFileURL(resolve(target)).href;
} else {
  const root = dirname(resolve(target));
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
  server = createServer(async (req, res) => {
    const path = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    // Compare against root + separator so a sibling like "<root>-other" can't match.
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(path);
      res.writeHead(200, { 'Content-Type': types[extname(path).toLowerCase()] || 'application/octet-stream' }).end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${server.address().port}/${encodeURIComponent(basename(target))}`;
}
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: GPU ? ['--use-angle=default', '--enable-gpu', '--ignore-gpu-blocklist'] : [],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });

await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  await document.fonts.ready;
  // Pieces that need async setup (textures, SDF bakes) set window.__ready = true.
  const t0 = performance.now();
  while ('__ready' in window && !window.__ready && performance.now() - t0 < 30000) {
    await new Promise((r) => setTimeout(r, 50));
  }
});

const hasRenderAt = await page.evaluate(() => typeof window.renderAt === 'function');
if (!hasRenderAt) console.warn('No window.renderAt(t): relying on CSS/WAAPI animations only.');

async function freezeAt(t) {
  await page.evaluate(async (time) => {
    if (typeof window.renderAt === 'function') await window.renderAt(time);
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = time * 1000; }
    // Let the compositor present the new state before capture.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, t);
}

const pad = (n, w) => String(n).padStart(w, '0');
let written = 0;
for (const i of frameList) {
  for (let k = 0; k < S; k++) {
    // Centre the shutter window on the frame time.
    const offset = S === 1 ? 0 : ((k + 0.5) / S - 0.5) * SHUTTER;
    const t = (((i + offset) % N) + N) % N / FPS; // wrap so loops blur across the seam
    await freezeAt(t);
    const name = S === 1 ? `${pad(i, 4)}.png` : `${pad(i * S + k, 6)}.png`;
    await page.screenshot({ path: `${OUT}/${name}` });
    written++;
  }
}
await browser.close();
if (server) server.close();

console.log(`Wrote ${written} PNGs to ${OUT} (${frameList.length} frames, N=${N}, ${FPS} fps).`);
if (S > 1) {
  console.log('Blend subframes into motion-blurred frames:');
  console.log(`  ffmpeg -framerate ${FPS * S} -i ${OUT}/%06d.png -vf "tmix=frames=${S},select='not(mod(n+1\\,${S}))'" -fps_mode passthrough ${OUT}/blur_%04d.png`);
} else if (!only) {
  console.log('Encode:');
  console.log(`  ffmpeg -framerate ${FPS} -i ${OUT}/%04d.png -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 18 -movflags +faststart out/anim.mp4`);
}
