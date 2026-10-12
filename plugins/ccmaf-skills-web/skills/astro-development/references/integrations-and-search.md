# Integrations and search

Sitemap, RSS, MDX, Pagefind, writing your own integration, and Tailwind 4.
Versions are what a production site ran on 2026-10-10 (still `latest` on
2026-10-12); options change between majors — read each integration's guide
under `docs.astro.build/en/guides/integrations-guide/`.

## Sitemap (`@astrojs/sitemap` 3.7.4)

```js
import sitemap from '@astrojs/sitemap';
export default defineConfig({
  site: 'https://example.com',
  integrations: [
    sitemap({ filter: (page) => !/\/(search|404)\/?$/.test(page) }),
  ],
});
```

- Needs `site`. Emits URLs in the shape `trailingSlash`/`build.format`
  produce; check `dist/sitemap-0.xml` once after changing either.
- Filter out utility pages (404, search results, thank-you pages) — they
  also get `noindex` and no canonical (config-and-routing.md).

## RSS (`@astrojs/rss` 4.0.19)

- An endpoint at `src/pages/rss.xml.ts` built from the shared
  `getPublished()` helper (content-collections.md), with `site` from
  `context.site`.
- Item links use the slashless (or slashed) form your routing decided.
  Build them with the routes module.
- **Don't style the feed with XSLT.** Chromium now shows an "XSLT is being
  removed" warning on styled feeds; the XSL view ignores site fonts and dark
  mode; and it needs inline styles a strict CSP blocks (seen live in 2026;
  check the current Chromium status). Instead keep `rss.xml` plain and add
  an HTML **subscribe page** that explains feeds and lists the URL with a
  copy button.
- Validate with a feed validator before announcing the feed.

## MDX (`@astrojs/mdx` 8.0.3 on 2026-10-12)

Official; peers `astro ^7.2.10` and the Markdown packages. Components in
content are powerful and are also how unreviewed markup enters a page —
keep MDX for authored content, not external text. Not exercised by the
field evidence beyond installation (verify options).

## Pagefind (1.5.2)

Static full-text search with no server.

- Run at postbuild, after `astro build`:
  `pagefind --site dist --root-selector main`. `--site` is required;
  `--root-selector` (default `html`) limits indexing to the main content.
- Add `data-pagefind-ignore` to chrome and repeated rosters inside `main`
  (badges, "copy" buttons, back links, related-post lists); children are
  ignored too. Otherwise excerpts fill with UI text.
- **Pagefind stores raw text.** Only `excerpt` (text plus `<mark>`) is safe
  to insert as HTML; `meta.title`, other `meta.*` and `content` go through
  `textContent`. Never `innerHTML` them.
- Its WebAssembly needs `'wasm-unsafe-eval'` in `script-src`. On
  Cloudflare Pages that ends up site-wide, because CSP lives in one `/*`
  rule (deploy-static-hosts.md).
- The index only exists after a full build: search tests must run against
  the built site, and `astro dev` shows search as broken — handle that
  with dev-only copy (env-and-config-flags.md).
- Load the bundle with a variable import to keep `astro check` happy
  (setup-and-versions.md).

## Writing a custom integration

An object with a `name` and `hooks` is enough. Prefer it to an ad-hoc npm
script when the step belongs to the build output — it runs whenever
`astro build` runs, including from tests.

```js
function copyLicences() {
  return {
    name: 'local:copy-licences',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        // dir is a URL of the output directory
      },
    },
  };
}
```

- `astro:build:done` gets the output `dir` as a URL; use `new URL(rel, dir)`
  rather than string paths (Windows).
- Hook names and arguments: the integration API reference (verify for the
  installed major).
- Steps that need the *finished* site including other tools' output
  (Pagefind, CSP hashing that must see the final HTML) stay as ordered
  `postbuild` scripts, where the order is visible.

## Tailwind 4

- Add `@tailwindcss/vite` to `vite.plugins`; no PostCSS config. The old
  `@astrojs/tailwind` integration is for Tailwind 3 (verify before using
  any guide that installs it).
- **Cascade layers bite when a vendored CSS pack is involved.** Unlayered
  CSS beats anything in `@layer components`, whatever the specificity.
  Site token overrides that must beat an unlayered pack's `:root` tokens
  were re-set on `body` instead. Layer the vendor CSS explicitly or set
  overrides where the cascade reaches them.
- Font `url()`s are rebased and fingerprinted (images-and-assets.md).
- Everything else about Tailwind and tokens: frontend-development.
