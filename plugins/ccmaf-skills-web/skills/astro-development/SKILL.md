---
name: astro-development
description: >-
  Astro site engineering as decision rules and field-tested traps, not an
  API tutorial: when to choose Astro for a content site (and when not),
  version pinning and the astro check/TypeScript peer range, astro.config
  (site, trailingSlash with build.format, markdown highlighting), content
  collections with Zod schemas, astro:env typed variables and .env loading
  by mode, processed vs is:inline scripts under a strict hash-based CSP,
  astro:assets and when not to resample (pixel art), sitemap, RSS, Pagefind
  search, Tailwind 4 via Vite, testing the built site with Playwright, and
  static deploys. Use whenever an astro.config.*, a .astro file,
  src/content.config.ts, astro:env, astro:content, astro:assets or an
  @astrojs/* package is involved, for "build a blog/docs/marketing site",
  "which framework for a content site", "add RSS/sitemap/search to my Astro
  site", "make the CSP strict", or Astro build, check or deploy failures.
  PROACTIVELY verify Astro APIs against the installed version's docs.
---

# Astro Development

Astro for content-first sites: Markdown/MDX plus components, HTML out, no
JavaScript unless you add it. This skill holds the **decisions to make early
and the traps the docs don't put in front of you**, learnt on a production
content site (static output, Cloudflare Pages). It deliberately does not
reproduce the API.

**Version stance.** Facts here were observed on **Astro 7.3.8** (the
`latest` npm tag on 2026-10-12; 7.0.0 shipped 2026-06-22, 6.0.0 on
2026-03-10). Astro ships a major roughly yearly and API detail is what goes
stale. For any signature, option name or import path, read
`docs.astro.build` for the installed major, or `node_modules/astro` itself
(read-the-damn-docs). Anything not confirmed is marked "(verify)".

## When to choose Astro

Choose it when:

- **The site is content-first** — blog, guides, docs, project pages,
  marketing. Content collections with Zod schemas turn a malformed post
  into a **build error** instead of a broken page.
- **JavaScript should be the exception.** Output is HTML; JS ships only
  where you add a `<script>` or an island. Little JS is what makes a strict
  hash-based CSP practical.
- **Static output is enough.** Deploy to any static host; data that changes
  is fetched **at build time** and refreshed by a scheduled rebuild.
- **You want first-party integrations** (sitemap, RSS, MDX) and Tailwind 4
  through its Vite plugin.

Prefer something else when:

- **It's an app, not a site** — heavy client state, auth-gated dashboards.
  A React/Next-style stack fits better (react-development); islands are the
  exception path in Astro, not the main road.
- **The team already runs Next.js and the site is small.** Use what's there.
- **It's a pure blog with no components and no typed content.** Eleventy or
  Hugo are lighter; Astro's edge is typed content plus components.

## Decision Rules (make these before writing pages)

1. **Decide URL shape first: `trailingSlash` together with `build.format`.**
   Defaults are `'ignore'` and `'directory'`, which give canonicals ending in
   `/`. Pair `'never'` with `'file'` (`/about` served from `about.html`) or
   `'always'` with `'directory'`. Then canonicals, sitemap, RSS links and
   nav hrefs all use that one form — decide before any of them is written,
   or each copies its own.
2. **Set `site`** to the deployed origin. Sitemap, RSS, canonicals and
   `Astro.site` depend on it; derive every absolute URL from it, never a
   hard-coded domain. One routes module owns hrefs.
3. **Schemas are the contract.** Every collection gets a schema; URL fields
   state their protocol (`https` only) and host where it is fixed. Write the
   shared "published, newest first" helper **before** the second page needs
   it.
4. **Local flags go in `.env.development`, never `.env`.** `.env` loads in
   every mode, including `astro build`, so a local flag ships to production.
5. **Pick the CSP strategy before writing scripts** — Astro's built-in
   `security.csp` (meta tag) or a header built at postbuild. See the table
   in [scripts-islands-and-csp.md](references/scripts-islands-and-csp.md).
6. **Test the built site, never the dev server.** `build` then `preview`,
   with fixtures through env. The dev server hides missing indexes, inlined
   scripts and absent headers.
7. **Never resample pixel art** through `<Image width>`; resampling is for
   photos. Use the original sized by CSS, or integer-factor nearest-neighbour
   derivatives.
8. **Deploy through the npm script, not a bare `astro build`.** Prebuild
   (data fetch) and postbuild (search index, headers) are part of the build.
9. **Pin exactly**, `astro` and every `@astrojs/*`, with a lockfile. Check
   the checker's TypeScript peer range before pinning TypeScript.
10. **Budget external requests per build** and assume the build host shares
    its egress IP with strangers' builds.

## Top Traps (one line each)

- `@astrojs/check` 0.9.10 peers `typescript ^5 || ^6`; TypeScript 7 is the
  `latest` tag — pin 6.x until the checker widens its range.
- TS 6 drops implicit Node types: `process`/`node:fs` in config files fail
  `astro check` until `@types/node` and `"types": ["node"]`.
- A static import of a gitignored generated file breaks `astro check` on a
  fresh clone — generate it in `pre*` scripts.
- The 404 page gets a canonical (`/404`) and lands in the sitemap unless the
  layout takes `canonical={false}`/`noindex` and the sitemap `filter` drops it.
- Default Shiki highlighting writes inline `style=` attributes: they beat
  your code styles and a strict CSP blocks them.
- Small processed scripts get inlined into the HTML, so new inline scripts
  appear silently under a hash-based CSP.
- A component's processed `<script>` ships even when the branch that uses
  it isn't rendered — move it into a child component.
- Astro escapes only `&` and `"` in attribute values; a regex post-processor
  can mistake attribute text for markup.
- `astro build --outDir` on another drive fails (EXDEV) on Windows — keep
  temp outDirs on the project drive.
- `astro preview` ignores `_headers` and any host-edge behaviour; check
  headers with `curl` after deploy.
- Astro 7's compiler no longer repairs invalid nesting, and `compressHTML`
  now defaults to `'jsx'`, stripping whitespace between inline elements
  (from the v7 upgrade guide).

## Verify Against Current Docs (every time)

Do not recall these; look them up for the installed version.

| Item | Where |
|---|---|
| Config keys: `markdown.syntaxHighlight`, `markdown.processor`, `security.csp.*`, `build.*`, `compressHTML` | Configuration reference |
| `envField` options (`url`, `optional`, `default`), `astro:env/*` import paths | `astro:env` module reference |
| Loader API (`glob`, `file` from `astro/loaders`), `z` from `astro/zod` (Zod 4 on 7.x) | Content collections guide |
| CLI entry path | `bin` in `node_modules/astro/package.json` (7.x: `./bin/astro.mjs`) |
| Checker ↔ TypeScript peer range | `npm view @astrojs/check peerDependencies` |
| Integration versions and options (rss, sitemap, mdx) | Each integration's guide + npm |
| Pagefind CLI flags | pagefind.app config options |
| `_headers` limits and merge semantics | The host's docs (cloudflare-workers-development) |
| Whether small-script inlining has an Astro-level switch | Config reference; none found on 7.3.8 |

Quick checks:

```bash
npm view astro version
npm view @astrojs/check peerDependencies
node -p "require('./node_modules/astro/package.json').version"
```

## Not Covered by Field Evidence

SSR and adapters, on-demand rendering, server islands, live content
collections, island frameworks (React, Svelte, Vue) and view transitions
(`<ClientRouter />`) were **not exercised** by the site behind this skill.
The docs exist and the features are real; treat every claim about them as
"(verify)". Two documented interactions worth knowing: live collections
need an adapter, and the built-in CSP does not support `<ClientRouter />`
on 7.x (verify for your version).

## How to Verify Your Work

- `npm run check` (`astro check`) clean, then `npm run build` — the real
  script with pre/post steps.
- Grep the output: `grep -c "<script" dist/index.html`; inline scripts
  should be exactly the ones you approved.
- Run e2e against `preview` of that build, with the CSP header injected by
  the test (preview won't send it).
- After deploy: `curl -sI https://example.com/ | grep -i content-security`
  — once, and matching the build's hashes.

## Boundaries

| Concern | Owner |
|---|---|
| Visual design, tokens, Tailwind classes, colour, type | frontend-development, design-taste |
| Layout reasoning and rendered critique | ux-design, ui-verification |
| WCAG, ARIA, keyboard | accessibility-development |
| Core Web Vitals, caching strategy | web-performance-development |
| Playwright mechanics, test strategy, flake control | testing-development (this skill adds only "test the built site") |
| CSP theory, OWASP, supply chain | secure-development (this skill adds Astro's actual script output and how to hash it) |
| Cloudflare Pages/Workers, `_headers`, `_redirects`, CI gating | cloudflare-workers-development |
| Version-verification discipline | read-the-damn-docs |
| TypeScript types and tsconfig | typescript-development |
| React islands, if you add them | react-development |
| Fetching third-party pages at build time | web-scraping-development |

## Reference Index

| Load when the task involves... | File |
|---|---|
| New project, pins, `astro check`, TypeScript and Node versions, tsconfig, fresh-clone failures | [references/setup-and-versions.md](references/setup-and-versions.md) |
| `astro.config`: `site`, trailing slashes, build format, 404, canonicals, markdown highlighting, routes module | [references/config-and-routing.md](references/config-and-routing.md) |
| Content collections: loaders, schemas, URL validation, images in schemas, drafts, shared helpers | [references/content-collections.md](references/content-collections.md) |
| `astro:env`, `.env*` files by mode, feature flags and testing the off state, dev-only copy | [references/env-and-config-flags.md](references/env-and-config-flags.md) |
| `<script>` processing vs `is:inline`, inlining, hoisting, `set:html`, CSP strategy, postbuild hashing rules and fixtures | [references/scripts-islands-and-csp.md](references/scripts-islands-and-csp.md) |
| `astro:assets`, `public/`, pixel art, thumbnails, fonts and licence files, alt text | [references/images-and-assets.md](references/images-and-assets.md) |
| Sitemap, RSS (and why not XSLT), MDX, Pagefind, custom integrations, Tailwind 4 | [references/integrations-and-search.md](references/integrations-and-search.md) |
| CLI entry, build pipeline order, preview, Windows traps, e2e on the build, screenshots; self-check prompts | [references/build-test-and-tooling.md](references/build-test-and-tooling.md) |
| Static deploys (Cloudflare Pages), `_headers` for Astro output, deploy hooks, build-time fetching, edge rewrites | [references/deploy-static-hosts.md](references/deploy-static-hosts.md) |
