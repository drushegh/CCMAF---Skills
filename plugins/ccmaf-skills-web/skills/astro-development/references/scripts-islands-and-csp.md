# Scripts, islands and CSP

The area that cost a production site the most review time. CSP theory and
directive choice belong to secure-development; this file covers what Astro
actually emits and how to keep a hash-based policy honest. Script rules
confirmed against the client-side scripts guide
(`docs.astro.build/en/guides/client-side-scripts/`); CSP options against the
configuration reference (`security.csp`), both read 2026-10-12. Field
behaviour observed on 7.3.8.

## Two kinds of `<script>`

| | Processed (`<script>`) | Unprocessed (`<script is:inline>`) |
|---|---|---|
| Output | Bundled, `type="module"`, imports and TS resolved | Emitted exactly as written, in place |
| Component used N times | Included once per page | Duplicated per instance |
| Good for | Interactive behaviour | Code that must run before first paint (theme) |
| `import.meta.env` | Replaced at build | Not touched |

- Astro **does not process a `<script>` with any attribute other than
  `src`** (docs). `<script data-foo>` is unprocessed even without
  `is:inline`; write `is:inline` anyway so intent is visible.
- The pre-paint theme script must be `is:inline` in `<head>`; a processed
  module runs after parse and you get a flash of the wrong theme.

## Traps

1. **Small processed scripts are inlined.** The docs: "If the script is
   small enough, Astro will inline it directly into the HTML" — no threshold
   given. A production build had two inline scripts: the approved
   `is:inline` one and a `<script type="module">` holding a whole small
   bundled module. Under a hash-based CSP every inline script needs a hash,
   and new ones appear silently as code changes size.
   - Fix observed on 7.3.8: `vite: { build: { assetsInlineLimit: 0 } }`,
     which kept bundled scripts external and left exactly one inline
     script per page.
   - No Astro-level script-inlining switch appears in the 7.x configuration
     reference (checked 2026-10-12); `build.inlineStylesheets` is the
     styles equivalent and also keys off `assetsInlineLimit`.
   - Side effects of `0`: Vite no longer inlines small assets as `data:`
     URIs and `'auto'` stylesheets stay external — both good for a strict
     CSP (`img-src`/`font-src` need no `data:`).
2. **A processed script ships even when its branch isn't rendered.** A
   component rendering either a live embed or a "coming soon" panel still
   loaded the embed's script with the flag off. Fix: move the script into
   a **child component rendered only in that branch**. An orphan chunk may
   still be written to `dist/_astro/` without being referenced (cosmetic;
   whether it can be avoided entirely is unknown — verify).
3. **Attribute escaping is minimal.** Astro escapes only `&` and `"` in
   attribute values, not `<` or `>` (read in
   `node_modules/astro/dist/runtime/server/render/util.js`, 7.3.8). Browsers
   are fine with that; a regex post-processor is not — external text in
   `title=` or `aria-label=` can look like markup to a scanner.
4. **`set:html` bypasses escaping.** Treat it like `innerHTML`: never with
   external or user data. Same in client code: Pagefind results are raw
   text except `excerpt` (integrations-and-search.md).
5. **Output is LF-normalised.** Hashes computed from a Windows build matched
   Linux CI and the host build (observed; still hash the built file, never
   the source).

## Choosing a CSP strategy

| | Built-in `security.csp` (since 6.0.0) | Header built at postbuild |
|---|---|---|
| Delivery | `<meta http-equiv>` in each page's `<head>` | HTTP header, e.g. host `_headers` |
| Hashes | Processed/bundled scripts and styles automatically; extra via `scriptDirective.hashes` / `styleDirective.hashes` | Whatever your scanner hashes |
| `is:inline` scripts | Not described in the docs (verify) | Hashed by the scanner if marked |
| `frame-ancestors`, `report-uri`/`report-to`, `sandbox` | **Ignored in a meta CSP** (CSP spec) | Work |
| Limits in docs | Not in `dev`; external scripts/styles need your hashes; no `<ClientRouter />`; no Shiki; no hashes on a directive that lists `'unsafe-inline'` | Host header limits (100 rules, 2,000 chars/line on Cloudflare Pages) |
| Effort | Config only | A tokenizer, tests, a template |

Pick the built-in option for a simple site that needs no framing or
reporting controls and whose host can't set headers. Pick headers when you
need `frame-ancestors` or reporting, or have unprocessed inline scripts.
You can combine: a meta CSP plus a header CSP both apply, and the stricter
result wins, so keep them consistent or use one. The production site behind
this skill used headers.

## Header recipe that held up in production

1. **Mark approved inline scripts** in source:
   `<script is:inline data-csp-inline>…</script>`. Astro keeps the attribute
   in the output.
2. **Postbuild scan** of every `dist/**/*.html` with a small **tokenizer,
   not regexes**. It must:
   - hash the bodies of marked scripts **byte-exact from the raw built
     source** (`sha256`, base64);
   - **fail the build** on: unmarked inline scripts, inline `style=`
     attributes, `<style>` elements, `on*=` handler attributes, and
     `javascript:` URLs in `href`/`src`/`action`/`formaction`/`xlink:href`
     (decode character references such as `&#106;` and `&colon;` and strip
     tab/newline/leading control characters before checking the scheme);
   - skip data blocks: `type="application/ld+json"`, `application/json`,
     `importmap`;
   - follow HTML comment rules: `<!-->` and `<!--->` close immediately,
     otherwise the first `-->` or `--!>` closes;
   - read attributes only from start tags; never treat attribute values as
     markup; skip quoted values inside end tags too;
   - treat `script`, `style`, `textarea` and `title` content as raw text —
     but `title` and `textarea` only in the HTML namespace, not inside
     `<svg>` or `<math>`.
3. **Write hashes into the headers file from a template kept outside
   `public/`** (for example `config/_headers.template` →
   `dist/_headers`). Anything in `public/` is copied verbatim, so a raw
   `{{SCRIPT_HASHES}}` token would ship if the postbuild step were skipped.
4. **Fail closed**: if the template token is missing or a page has a
   problem, exit non-zero so the deploy stops.

The regex version this replaced broke four ways across two review waves:
page text containing `style=` failed the build; comments desynchronised the
scan; a script body containing `<!--` was hashed wrong; and attribute values
could spoof markup.

### Tokenizer sketch (left to right)

```text
at '<!--'           -> skip comment per the rules above
at '<!' or '<?'     -> skip to next '>'            (doctype, bogus comment)
at '</' + letter    -> read end tag like a start tag (consume quoted values);
                       leaving svg/math decrements foreign depth
at '<' + letter     -> read name, then attributes (quoted / unquoted, first wins)
                       check style / on* / URL attrs
                       svg|math (not self-closing) -> foreign depth++
                       raw-text element (title/textarea only if depth == 0):
                         body = text up to '</name' followed by space, '/' or '>'
                         script without src, not a data type:
                           marked -> hash body; unmarked -> problem
otherwise           -> '<' is text, move on
```

### Test fixtures to keep

Each a tiny HTML string with an expected `{ hashes, problems }`:

- marked inline script → one hash, matching `openssl dgst -sha256 -binary | base64`
- unmarked inline script → problem
- `<script src=…>` and `type="application/ld+json"` / `importmap` → ignored
- text node containing `style="x"` → no problem
- `<div style="…">`, `<style>`, `onclick=` → problems
- `href="javascript:…"`, `href="&#106;avascript:…"`, `href="java&Tab;script:…"`,
  `href=" javascript:…"` → problems
- attribute value containing `<script>` (e.g. `title="<script>x</script>"`)
  → no script found
- script body containing `<!--` and `</scrip` fragments → hashed exactly
- comments `<!-->`, `<!--->`, `<!-- a --!>` followed by real markup → scan
  stays in sync
- end tag with a quoted attribute containing `>` → scan stays in sync
- `<svg><title><script>…` → the script is found (title not raw text in SVG)
- `<title><script>…</title>` in HTML → no script found
- template without the token, or with leftover `{{` → build fails

## CSP in tests

`astro preview` does not send host headers. In Playwright, read the
generated header file and inject the CSP on every response
(`page.route('**/*', …)` adding the header), then fail the test on any
`securitypolicyviolation` event or console CSP error. Re-check live with
`curl` after deploy, because edge features can add scripts
(deploy-static-hosts.md).

## Islands

Framework islands (`client:load`, `client:visible`, …) were not used by the
site behind this skill. Each island ships its framework runtime as
processed scripts; budget for it and re-run the CSP scan. Directive
behaviour: the directives reference (verify).
