# Config and routing

`astro.config.mjs` decisions that are cheap on day one and expensive later.
Option names confirmed against the configuration reference
(`docs.astro.build/en/reference/configuration-reference/`) on 2026-10-12
for Astro 7.x.

## URL shape: one decision, made first

| Option | Values | Default |
|---|---|---|
| `trailingSlash` | `'always'` \| `'never'` \| `'ignore'` | `'ignore'` |
| `build.format` | `'file'` \| `'directory'` \| `'preserve'` | `'directory'` |

`build.format` sets the trailing-slash shape of `Astro.url` at build time.
The docs pair them: `'always'` with `'directory'` (`/about/` →
`about/index.html`), or `'never'` with `'file'` (`/about` → `about.html`).

What went wrong with defaults: canonicals came out as `/about/` while nav
hrefs and the content contract used `/about`. Nothing failed; search
engines and the sitemap just saw two shapes.

Rule: pick the pair, write it down as a decision, then make canonicals,
sitemap, RSS item links and every internal link use it. Choose before the
sitemap or RSS code exists, or each copies its own form.

```js
// astro.config.mjs — slashless example
export default defineConfig({
  site: 'https://example.com',
  trailingSlash: 'never',
  build: { format: 'file' },
});
```

Check how your host serves `about.html` at `/about` (Cloudflare Pages does,
with its own redirect behaviour for `.html` and slashes — verify on a
preview deployment). In dev, `trailingSlash: 'never'` makes `/about/` a 404;
that is the point.

## `site`

- The deployed origin (`https://example.com`). Sitemap, RSS, canonical URLs
  and `Astro.site` need it; `@astrojs/sitemap` does nothing useful without it.
- Never repeat the domain in components, RSS code or test fixtures. Review
  of a production site found it hard-coded in three places.
- Tests that need a different origin should override via env, not edit
  literals.

## A single routes module

Literal hrefs (`'/search'`, `'/rss.xml'` five times) drift from the routing
decision. Put them in one module:

```ts
// src/lib/routes.ts
export const ROUTES = {
  home: '/',
  blog: '/blog',
  search: '/search',
  rss: '/rss.xml',
} as const;

export const postHref = (slug: string) => `${ROUTES.blog}/${slug}`;
export const absolute = (path: string, site: URL) => new URL(path, site).href;
```

Use it in nav, pages, RSS and sitemap filters. A grep for `href="/` outside
the module is a cheap review check.

## The 404 page and other utility pages

- By default the 404 page gets a canonical like `https://example.com/404/`
  and appears in the sitemap. Observed on 7.3.8.
- Fix: give the base layout `canonical?: string | false` and `noindex?:
  boolean`, and pass `canonical={false} noindex` from `src/pages/404.astro`.
  Do the same for search results and other utility pages.
- Drop them from the sitemap with the integration's `filter`
  (integrations-and-search.md).

## Markdown syntax highlighting

- The option is **`markdown.syntaxHighlight`** (not `syntaxHighlighting`):
  `false`, `'shiki'`, `'prism'`, or `{ type, excludeLangs }`. Default is
  Shiki with `excludeLangs: ['math']`. Confirmed in the config reference.
- Default Shiki output puts inline `style=` attributes on `<pre>` and
  `<span>`. They override site code styles and a CSP without
  `style-src 'unsafe-inline'` blocks them. The docs also state Shiki is not
  supported by Astro's built-in CSP.
- Choices:
  1. `markdown: { syntaxHighlight: false }` — what the production site did.
  2. Prism (class-based output) plus your own stylesheet.
  3. Shiki with `shikiConfig.defaultColor: false` and CSS variables
     (`themes: { light, dark }`) — still emits `style=` with variables
     (verify), so it does not remove the CSP problem.
  4. Highlight at build time with a class-emitting transformer.
  5. Allow inline styles — weakens the CSP; avoid.
- On Astro 7 the Markdown pipeline changed (Sätteri by default); check that
  the highlighter you choose works with the configured processor (verify).

## Other config worth deciding early

- `compressHTML` (7.x default `'jsx'`): watch for lost spaces between inline
  elements in templates.
- `build.inlineStylesheets` (`'auto'` default): inlines stylesheets smaller
  than `vite.build.assetsInlineLimit`. `'never'` keeps every stylesheet
  external, which a strict `style-src` wants.
- `output`: leave static unless you have an adapter and a reason
  (on-demand rendering is outside this skill's field evidence).
