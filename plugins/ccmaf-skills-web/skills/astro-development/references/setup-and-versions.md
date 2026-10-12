# Setup and versions

Getting a project to a state where `astro check`, `astro build` and a fresh
clone all agree. Versions below were read from npm on 2026-10-12; re-read
them before pinning.

## What was current (2026-10-12)

| Package | Version | Note |
|---|---|---|
| `astro` | 7.3.8 (`latest`) | 7.4.0-beta.1 on the `beta` tag; engines `node >=22.12.0` |
| `@astrojs/check` | 0.9.10 | peer `typescript ^5.0.0 \|\| ^6.0.0` |
| `typescript` | 7.0.2 (`latest`) | outside the checker's peer range |
| `@astrojs/rss` | 4.0.19 | |
| `@astrojs/sitemap` | 3.7.4 | |
| `@astrojs/mdx` | 8.0.3 | peers `astro ^7.2.10` |
| `pagefind` | 1.5.2 | CLI, run at postbuild |

```bash
npm view astro version engines
npm view @astrojs/check version peerDependencies
npm view typescript dist-tags
```

## Pin exactly

- `astro`, every `@astrojs/*`, Tailwind, Pagefind, Playwright: exact
  versions, no caret, plus a committed lockfile. A site that deploys on
  every push rebuilds from scratch each time; a caret means two builds of
  the same commit can differ.
- Upgrade deliberately: one bump per commit, `check` + `build` + e2e, read
  the upgrade guide for a new major (`docs.astro.build/en/guides/upgrade-to/v7/`
  and its successors).
- Pin the host's Node to the same major you develop on (for example
  `NODE_VERSION=22` on Cloudflare Pages) and add `"engines"` to
  `package.json`.

## The checker and TypeScript

- **Before pinning TypeScript, read the checker's peer range.** On
  2026-10-12 `@astrojs/check` 0.9.10 declared `^5 || ^6` while TypeScript's
  `latest` was 7.0.2. Installing TS 7 gives a peer conflict or a checker
  that misbehaves. Pin `typescript@6.x` until the range widens.
- **TS 6 no longer pulls in Node types implicitly.** `astro check` reported
  ts(2591) ("Cannot find name 'process'") on `process` and `node:fs` in
  `astro.config.mjs` and `playwright.config.ts`. Fix: add `@types/node`
  (matching your Node major) and in `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": { "types": ["node"] }
}
```

  Check the preset name exported by the installed `astro/tsconfigs/`
  (verify). TypeScript depth belongs to typescript-development.

## Fresh-clone failures

- **Static import of a generated, gitignored file.** A page that does
  `import items from '../data/feed.json'` passes locally (the file exists)
  and fails `astro check` and `build` on a fresh clone or CI. Fix: generate
  it in npm lifecycle scripts:

```json
{
  "scripts": {
    "precheck": "node scripts/fetch-feed.mjs --if-missing",
    "predev":   "node scripts/fetch-feed.mjs --if-missing",
    "prebuild": "node scripts/fetch-feed.mjs"
  }
}
```

  `--if-missing` keeps `check` and `dev` offline-friendly; `prebuild`
  refreshes unconditionally. Prove it with a fresh clone, not your
  working copy.
- **Dynamic import of a URL that exists only at runtime** (for example the
  Pagefind bundle in browser-side test code): `import('/pagefind/pagefind.js')`
  fails type-checking with TS2307. Import through a variable so the
  checker doesn't try to resolve it:

```ts
const url = '/pagefind/pagefind.js';
const pagefind = await import(/* @vite-ignore */ url);
```

  The `@vite-ignore` comment silences Vite's warning when this sits in
  bundled code (verify for your setup).

## Astro 7 changes to expect (from the official upgrade guide)

Not field-tested here; read the guide for detail.

- Vite 8 underneath; plugins relying on Vite internals may break.
- A Rust compiler replaces the Go one and is stricter: unclosed non-void
  tags are build errors and invalid nesting (a `<div>` in a `<p>`) is no
  longer auto-corrected, so output can change.
- The default Markdown processor is Sätteri; remark/rehype plugins need
  `@astrojs/markdown-remark` and `markdown.processor: unified()`.
- `compressHTML` defaults to `'jsx'`: whitespace between inline elements is
  stripped, so adjacent `<span>`/`<em>` lose the space. Use `{" "}` or
  `compressHTML: true`.
- `src/fetch.ts` is reserved for advanced routing (`fetchFile` to move it).
- `@astrojs/db` is removed.

## New project checklist

1. `npm create astro@latest` (verify the current scaffolder), then pin
   everything exactly.
2. Set `site`, `trailingSlash` + `build.format` (config-and-routing.md).
3. Add `@astrojs/check` + a compatible `typescript` + `@types/node`.
4. Scripts: `check`, `build` with `pre`/`post` hooks, `preview`, `test`.
5. Decide the CSP strategy (scripts-islands-and-csp.md) before the first
   `<script>`.
6. Fresh clone → `npm ci` → `npm run check && npm run build` in CI.
