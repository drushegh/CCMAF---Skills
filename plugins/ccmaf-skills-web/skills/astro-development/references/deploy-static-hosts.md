# Deploying static Astro

What changes when a static Astro build meets a host. The worked host is
Cloudflare Pages (git-integrated). Pages and Workers mechanics, `_headers`
and `_redirects` syntax, CI gating and preview deployments are covered in
depth by **cloudflare-workers-development**
(`references/pages-and-static-assets.md`); this file adds only the Astro
side. Host limits change — check the host's docs.

## Pages project settings for Astro

| Setting | Value |
|---|---|
| Root directory | the folder holding `package.json` (a subfolder in a monorepo) |
| Build command | `npm run build` — **not** `astro build` (pre/post steps) |
| Output directory | `dist` |
| Environment | `NODE_VERSION=22` (match local), plus public `astro:env` values if they differ from schema defaults |

Custom domains are added in the Pages project; for a zone on the same
account Pages creates the proxied DNS records. A new project gets a
`*.pages.dev` name — consider whether to keep it reachable.

## `_headers` for Astro output

- Generate `dist/_headers` at postbuild from a template **outside
  `public/`** so placeholders can't ship (scripts-islands-and-csp.md).
- **Keep CSP in exactly one `/*` rule.** Cloudflare comma-joins duplicate
  header names across matching rules, so a second CSP rule makes the policy
  stricter, it does not replace the first. A consequence: Pagefind's
  `'wasm-unsafe-eval'` cannot be scoped to `/search` without detaching the
  header (`! Content-Security-Policy`) on that path and re-stating the whole
  policy — usually it just lives site-wide.
- Cache fingerprinted assets hard; everything else stays revalidating:

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

- Limits on Pages: 100 rules, 2,000 characters per line. A hash list for
  many inline scripts can approach the line limit — another reason to keep
  inline scripts to one or two.

## CI is not a gate by default

A git-integrated Pages project deploys the production branch on every push,
whatever CI says. Make CI a gate: protect the branch, or turn off automatic
production deploys and let CI trigger the deploy after tests. Details:
cloudflare-workers-development.

## Build-time data and scheduled rebuilds

Data that changes (news, feeds, release lists) is fetched in `prebuild` and
refreshed by rebuilding on a schedule.

- A scheduled CI job POSTs the host's **deploy hook**. Store the hook URL
  as a CI secret and pass it through `env`, not by interpolating
  `${{ secrets.X }}` into the script text:

```yaml
on:
  schedule: [{ cron: '17 */6 * * *' }]
jobs:
  rebuild:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger rebuild
        env:
          DEPLOY_HOOK: ${{ secrets.DEPLOY_HOOK_URL }}
        run: curl -fsS -X POST "$DEPLOY_HOOK" > /dev/null
```

- A successful hook POST is not a successful build. Turn on failed-deploy
  notifications.
- The fetch script validates what it receives (it is untrusted input),
  writes JSON the site reads, and **keeps the last good data** (or fails
  the build) rather than publishing an empty page on a fetch error.

## Shared egress IPs and rate limits

Build hosts and CI runners share outbound IPs with many other builds, so
per-IP limits on third-party endpoints are already partly spent when your
build starts.

- Observed: a public feed endpoint allowing roughly one unauthenticated
  request per minute per IP returned 429 for the second to fourth of four
  separate requests locally, and nothing at all from the host's builds.
- Fix: one combined request where the source supports it, entries routed
  back to their source by a category field, and a **per-source cap** so
  one busy source cannot crowd out the rest.
- General rule: budget external requests per build, send a descriptive
  User-Agent, cache between builds where the host allows, and design for
  "the fetch failed" as a normal outcome.

## Edge features change your HTML after the build

Anything the host rewrites at the edge is invisible to `astro preview` and
to your postbuild CSP scan.

- Cloudflare Email Obfuscation rewrites `mailto:` links and injects a
  same-origin script under `/cdn-cgi/`; visitors without JavaScript see a
  placeholder instead of the address. Analytics beacons inject scripts too.
- Decide on each consciously, then check the live site: `curl -s
  https://example.com/contact | grep -i cdn-cgi` and look for CSP
  violations in the browser console.

## Post-deploy smoke

```bash
curl -sI https://example.com/            | grep -ci '^content-security-policy'   # expect 1
curl -sI https://example.com/about       | head -1                               # 200, no redirect loop
curl -sI https://example.com/_astro/<file> | grep -i cache-control              # immutable
curl -s  https://example.com/sitemap-index.xml | head
```

Other static hosts (Netlify, GitHub Pages, any object store) differ in
header files, slash and `.html` handling and redirects; the Astro side —
`npm run build`, generated headers, slash shape — is the same (verify each
host's handling of `build.format: 'file'` output).
