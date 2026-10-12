# `astro:env` and environment flags

Typed environment variables, how `.env*` files load, and how to test a flag
whose off state removes markup. Sources: the environment variables guide
(`docs.astro.build/en/guides/environment-variables/`), the configuration
reference (`env.schema`, added in astro@5.0.0) and Vite's env guide
(`vite.dev/guide/env-and-mode`), read 2026-10-12. Field behaviour observed
on 7.3.8.

## Declare variables with a schema

```js
// astro.config.mjs
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  env: {
    schema: {
      PUBLIC_EMBED_URL: envField.string({
        url: true,
        context: 'client',
        access: 'public',
        default: 'https://embed.example.com/',
      }),
      PUBLIC_EMBED_LIVE: envField.boolean({
        context: 'client',
        access: 'public',
        default: false,
      }),
    },
  },
});
```

```astro
---
import { PUBLIC_EMBED_LIVE, PUBLIC_EMBED_URL } from 'astro:env/client';
---
```

- Types: `string`, `number`, `boolean`, `enum`. Every field needs a
  `context` (`client` | `server`) and an `access` (`public` | `secret`);
  `client` + `secret` is not allowed.
- Prefer `url: true` on URL strings over a free string; it worked on 7.3.8
  but the option list lives in the `astro:env` reference (verify).
- Public client values are replaced into the bundles at build time. For a
  static site, every value is fixed when you build; changing it means
  rebuilding.
- `env.validateSecrets: true` validates secrets at build/dev start too; by
  default only public variables are validated then.
- `import.meta.env` cannot read `.env` files inside `astro.config.mjs`; use
  `process.env` or Vite's `loadEnv` there.

## Which `.env` files load when

Astro uses Vite's loading rules. Vite's docs:

| File | Loaded |
|---|---|
| `.env` | in all cases |
| `.env.local` | in all cases, gitignored |
| `.env.[mode]` | only in that mode |
| `.env.[mode].local` | only in that mode, gitignored |

A mode file beats the generic one; `astro dev` runs in `development` mode
and `astro build` in `production`.

**Consequence: `.env` reaches production builds.** A local flag placed in
`.env` ships in `astro build` output and breaks tests that expect the
default. Rule: **local flags go in `.env.development`** (or
`.env.development.local`), never `.env`. Keep `.env` for values that are
true everywhere, or don't have one.

**Variables already in the process environment win.** Vite: variables that
exist when Vite starts have the highest priority and `.env` files do not
overwrite them. This is how a Playwright `webServer.env`, a CI job or the
host's dashboard drives a build. Observed working for `astro:env` values on
7.3.8; that `astro:env` follows exactly the same precedence was not traced in
source (verify if you depend on it).

## Feature flags that remove markup

A flag that hides a section changes the HTML, so each state needs its own
build. The e2e suite typically builds with the flag **on** to test the
feature; the production default (**off**) then goes untested.

Pattern: a unit test that runs a second `astro build` into a separate
`outDir` with the flag forced off, then asserts on the HTML.

```js
// tests/unit/flag-off.test.mjs (node:test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const outDir = 'node_modules/.cache/build-flag-off'; // same drive as the project
test('embed is absent when PUBLIC_EMBED_LIVE is false', () => {
  execFileSync(process.execPath,
    ['node_modules/astro/bin/astro.mjs', 'build', '--outDir', outDir],
    { env: { ...process.env, PUBLIC_EMBED_LIVE: 'false' }, stdio: 'inherit' });
  const html = readFileSync(`${outDir}/index.html`, 'utf8');
  assert.doesNotMatch(html, /data-embed/);
});
```

- Keep `outDir` on the project's drive: Astro moves files with `rename()`,
  which fails with EXDEV across drives (Windows repo on `F:`, temp on `C:`).
- Read the CLI path from `bin` in `node_modules/astro/package.json`.
- Assert on the absence of the **script** too, not just the markup; a
  processed script can ship when its branch isn't rendered
  (scripts-islands-and-csp.md).

## Dev-only copy

User-facing failure text must suit production; developer hints belong
behind `import.meta.env.DEV`. A production page once told visitors to "run
npm run build" when search failed to load.

```astro
<p>Search is unavailable right now.</p>
{import.meta.env.DEV && <p>Dev: run the full build so the index exists.</p>}
```

In a processed client script, `import.meta.env.DEV` is replaced at build
time, so the hint is removed from production bundles. In an `is:inline`
script it is not processed — don't use it there.
