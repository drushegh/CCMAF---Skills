# Build, test and tooling

The build pipeline, testing the built site, Windows traps, and a set of
self-check prompts drawn from real failures. Playwright mechanics and test
strategy belong to testing-development; screenshot critique to
ui-verification. Observed on Astro 7.3.8, Playwright 1.64, Node 22,
Windows 11 dev with Linux CI.

## The pipeline is the npm script

```json
{
  "scripts": {
    "prebuild":  "node scripts/fetch-feed.mjs",
    "build":     "astro build",
    "postbuild": "pagefind --site dist --root-selector main && node scripts/csp-headers.mjs",
    "preview":   "astro preview",
    "check":     "astro check"
  }
}
```

- `npm run build` = prebuild (data fetch) → `astro build` → postbuild
  (search index, header file). Order is load-bearing: the CSP scan must see
  the final HTML, after anything else that writes to `dist`.
- **A bare `astro build` ships no search index and no `_headers`.** Configure
  the host to run `npm run build`, and say so in the deploy docs.
- Postbuild steps fail closed (non-zero exit) so a broken step stops the
  deploy.

## CLI entry

- The binary is `node_modules/astro/bin/astro.mjs` on 7.x (`bin` field:
  `./bin/astro.mjs`, checked on npm 2026-10-12); there is no `astro.js`.
  Read `bin` from `node_modules/astro/package.json` instead of guessing.
- Spawning it from a test: `execFileSync(process.execPath, [astroBin,
  'build', '--outDir', dir])` — no shell, so no quoting or orphan issues.

## Windows traps

- **`--outDir` must be on the project's drive.** Astro moves assets with
  `rename()`, which throws EXDEV across drives (repo on `F:`, `%TEMP%` on
  `C:`). Use `node_modules/.cache/<name>` or another in-repo, gitignored
  path.
- **Only one `astro preview` at a time on a port.** A leftover preview
  blocks the Playwright `webServer` for every later run. A preview spawned
  with `shell: true` survives `child.kill()` on Windows; kill the tree with
  `taskkill /pid <pid> /T /F`, or spawn without a shell.
- **The dev server breaks around dependency changes.** `npm ci` while
  `astro dev` runs broke it ("Cannot find module astro/compiler-runtime")
  and hit EPERM on locked native modules (lightningcss). Stop dev before
  installing; restart it after dependency or content-schema changes; test
  installs in a separate worktree or fresh clone.

## Test the built site

The dev server compiles on demand, has no search index, no generated
headers and different script output. Defects hide there.

```ts
// playwright.config.ts (sketch)
const port = Number(process.env.E2E_PORT ?? 4321);
export default defineConfig({
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: `npm run build && npm run preview -- --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    env: {
      FEED_FIXTURE: 'tests/fixtures/feed.json',   // offline data for prebuild
      PUBLIC_EMBED_URL: 'https://embed.test/',     // fake host, intercepted
      PUBLIC_EMBED_LIVE: 'true',
    },
  },
});
```

- Supply fixtures through env: offline data for the prebuild fetch, fake
  external hosts (`*.test`) intercepted with `page.route`, a port variable
  so parallel suites don't collide.
- Variables in the process environment beat `.env*` files, which is what
  makes `webServer.env` work (env-and-config-flags.md).
- **Preview does not apply `_headers`** or anything the host does at the
  edge. Inject the CSP header in tests (scripts-islands-and-csp.md), and
  check the live site with `curl -sI` after deploy.
- The off state of a feature flag needs its own build
  (env-and-config-flags.md).
- Accessibility smoke with `@axe-core/playwright` on each page type;
  depth in accessibility-development.

## Screenshots lie in two ways

- In full-page captures a `position: fixed` background stops after the
  first viewport, and lazy images render blank. These are capture
  artefacts, not page bugs — confirm in a real browser or scroll before
  capture.
- Playwright empties `test-results/` at the start of each run; keep review
  screenshots somewhere else.

## Self-check prompts

Run these against your own output when the skill is in use. Each pair is
the prompt and what a correct answer does.

1. **"Add a feature flag that hides X in production."** Uses `astro:env`
   with `envField.boolean` (`context: 'client'`, `access: 'public'`,
   `default: false`); puts the local `true` in `.env.development`, not
   `.env`; tests the off state with a separate build into an outDir on the
   project drive.
2. **"Make this site's CSP strict."** Chooses built-in vs header CSP
   deliberately; finds every inline script in `dist`; sets
   `vite.build.assetsInlineLimit: 0`; marks and hashes `is:inline` scripts
   at postbuild with a tokenizer; keeps the header template out of
   `public/`; no `'unsafe-inline'`; handles Shiki's inline styles.
3. **"Show these pixel-art thumbnails in a list."** No `<Image width>`;
   integer-factor nearest-neighbour derivatives or the original sized by
   CSS with `image-rendering: pixelated`.
4. **"Add an RSS feed and make it look nice."** Plain RSS plus an HTML
   subscribe page; no XSLT; item links match `trailingSlash`; built from
   the shared published-posts helper.
5. **"Build into a temp folder for a test"** (Windows, repo on a
   non-system drive). The outDir stays on the project drive.
6. **"Add search."** Pagefind at postbuild with `--root-selector`;
   `data-pagefind-ignore` on chrome; only `excerpt` inserted as HTML;
   `'wasm-unsafe-eval'` in `script-src`; tests against the built site.
7. **"Pull in a feed from several sources on the same host at build
   time."** One combined request where the source allows it, entries
   routed back by a category field, a per-source cap, and a request budget
   that assumes shared build-host IPs.
