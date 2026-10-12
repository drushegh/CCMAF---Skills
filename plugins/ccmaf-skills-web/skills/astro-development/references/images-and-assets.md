# Images and assets

What `astro:assets` does to your files, when to keep it away from them, and
the asset-pipeline details that surprise. Facts from the images guide
(`docs.astro.build/en/guides/images/`) and fonts guide
(`docs.astro.build/en/guides/fonts/`) read 2026-10-12; traps observed on
7.3.8.

## What gets processed

- `src/` images imported or referenced through `image()` in a schema go
  through the image service (Sharp by default): resized, re-encoded,
  fingerprinted into `/_astro/`.
- `public/` files are copied as-is: never optimised, no responsive
  `srcset`. Use `public/` for files that must keep their exact bytes and
  URL (favicons, `robots.txt`, verification files) — and remember the
  copy is verbatim (a template with placeholders must live elsewhere).
- Read the `astro:assets` reference for the current `<Image>` /
  `<Picture>` props (`width`, `widths`, `densities`, `layout`); don't recall
  them.

## Pixel art: never through `<Image width>`

- `<Image>` with `width`/`widths` downscales with a smoothing kernel. A
  pixel-art piece rendered at 480 px and then shown ~1.59× larger with
  `image-rendering: pixelated` came out blurred and blocky at once. Seen
  twice on one site (a hub grid and a home hero).
- Rule: **astro:assets resampling is for photos.** For pixel art:
  1. a plain `<img>` of the original, sized by CSS, with
     `image-rendering: pixelated`; or
  2. pre-generated **integer-factor nearest-neighbour** derivatives.
- Large decimation aliases too: 1600×900 originals shown as 10–20× smaller
  row thumbnails both shimmered and weighed too much. Generate 400×225 or
  320×180 (exact divisors) instead.

```js
// scripts/thumbs.mjs — nearest-neighbour derivatives at integer factors
import sharp from 'sharp';
for (const factor of [4, 5]) {
  await sharp('art/scene.png')
    .resize({ width: 1600 / factor, kernel: 'nearest' })
    .png()
    .toFile(`src/assets/thumbs/scene-${factor}x.png`);
}
```

Commit the outputs (or generate them in `prebuild`) and display them at
1×, 2× or another integer multiple — never a fractional scale.

## Fonts

- A font referenced from imported CSS (`url(./fonts/x.woff2)`, including
  through Tailwind 4) is rebased and fingerprinted: it becomes
  `/_astro/x.<hash>.woff2`. That works, and is cacheable as immutable.
- **Licence files are not copied.** OFL and similar licences require
  shipping the licence with the font. A small integration fixes it:

```js
// astro.config.mjs
import { cp, mkdir, readdir } from 'node:fs/promises';

const fontSrc = new URL('./src/styles/fonts/', import.meta.url);
function fontLicences() {
  return {
    name: 'local:font-licences',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const out = new URL('fonts/', dir);
        await mkdir(out, { recursive: true });
        for (const f of await readdir(fontSrc)) {
          if (f.startsWith('LICENSE')) await cp(new URL(f, fontSrc), new URL(f, out));
        }
      },
    },
  };
}
// integrations: [fontLicences(), …]
```

- Astro also has a built-in Fonts API (`fonts` config, `<Font />` from
  `astro:assets`, a local provider) that copies font files to
  `_astro/fonts`. Its docs say nothing about licence files, so the same
  rule applies. It was not used on the production site; its stability
  status per version: verify.
- Font CSS added by any mechanism must satisfy your `style-src` /
  `font-src`; inline `@font-face` blocks fail a no-`<style>` policy.

## Alt text: stored once

The same artwork had two different alts on two pages. Store `alt` in the
content frontmatter beside the image (schema-enforced; content-collections.md)
and have every page read it. Writing good alt text and decorative-image
handling: accessibility-development.

## Small-asset inlining

Vite inlines assets under `build.assetsInlineLimit` (4 KiB by default) as
`data:` URIs. With a strict CSP, either allow `data:` in `img-src` /
`font-src` or set the limit to `0` (scripts-islands-and-csp.md), which also
stops script inlining.

## Performance

Formats, `loading`/`fetchpriority`, LCP image choice, `sizes` and caching:
web-performance-development. Fingerprinted `/_astro/*` files can be cached
for a year as immutable (deploy-static-hosts.md).
