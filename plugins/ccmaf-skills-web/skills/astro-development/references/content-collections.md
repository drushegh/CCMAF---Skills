# Content collections

Typed content is Astro's main reason to exist for a content site: an invalid
entry stops the build instead of rendering wrong. Shapes below were observed
on 7.3.8 and match the content collections guide
(`docs.astro.build/en/guides/content-collections/`) on 2026-10-12. Read the
guide for the full loader and schema API.

## The shape (7.x)

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1),
        pubDate: z.coerce.date(),
        draft: z.boolean().default(false),
        hero: image().optional(),
        heroAlt: z.string().optional(),
        repo: z.url({ protocol: /^https$/, hostname: /^github\.com$/ }).optional(),
      })
      .refine((d) => !d.hero || !!d.heroAlt, {
        message: 'heroAlt is required when hero is set',
        path: ['heroAlt'],
      }),
});

export const collections = { blog };
```

- Config lives in `src/content.config.ts` (`.js`/`.mjs` also accepted).
- `glob` and `file` come from `astro/loaders`; `z` from `astro/zod`, which
  re-exports Zod 4 on 7.x. Older tutorials import `z` from `astro:content`
  and use `src/content/config.ts` — that is the legacy shape; check which
  your version expects.
- `image().refine()` is documented as unsupported; put image-related
  cross-field rules on the object, as above.

## URL fields: say what you accept

- A bare `z.url()` accepts any scheme the URL parser accepts, including
  `javascript:`, `http:` and `ftp:`. Review flagged this on a production
  site where frontmatter URLs became `href`s.
- Fix: `z.url({ protocol: /^https$/ })`, and `hostname` where the host is
  fixed. Zod 4 options; confirm in the Zod docs for the bundled version
  (verify).
- Cross-field rules (`heroAlt` required when `hero` is set) go in
  `.refine()` / `.superRefine()` so the build names the field.

## Images in schemas

`schema: ({ image }) => z.object({ hero: image() })` validates that the file
exists and gives typed image metadata for `<Image>`, `<img>` or
`getImage()`. Processed output is resampled — fine for photos, wrong for
pixel art (images-and-assets.md). Keep the alt text beside the image in the
same frontmatter so one image never gets two alts.

## Drafts, sorting and dates: one helper, written first

Agents re-implement "published, newest first" in every page by reflex. A
review found the same filter and sort, plus a date formatter, in three to
four places (blog index, `[slug]`, RSS, a news page). Write the helpers
before the second caller exists:

```ts
// src/lib/posts.ts
import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

export const byPubDateDesc = (a: Post, b: Post) =>
  b.data.pubDate.valueOf() - a.data.pubDate.valueOf();

export async function getPublished(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  );
  return posts.sort(byPubDateDesc);
}
```

```ts
// src/lib/dates.ts
const fmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' });
export const formatDate = (d: Date) => fmt.format(d);
```

- Decide whether drafts show in dev (above: yes) and make it the helper's
  job, not each page's.
- Fix the time zone in the formatter; build hosts run in UTC and your
  laptop doesn't.
- RSS, sitemap-adjacent pages and tag pages all call `getPublished()`.

## Routing entries

- Dynamic routes (`src/pages/blog/[slug].astro`) return paths from
  `getStaticPaths()` built on `getPublished()`, so drafts never get a page.
- Link with the routes module (`postHref(post.id)`) so the URL shape stays
  the one decided in config-and-routing.md. Check whether your version uses
  `entry.id` or a `slug` field for the URL segment (verify).

## Working rules

- Restart `astro dev` after changing a schema; the dev server caches the
  generated types and data store and can report stale errors.
- Run `astro check` after schema edits; it regenerates types
  (`.astro/` directory) and catches pages using removed fields.
- Content from outside the repo (APIs, feeds) is untrusted input: validate
  with the same Zod discipline in the fetch script, then write JSON the
  site reads.
- Live collections (runtime data, `src/live.config.ts`) need an adapter and
  are outside this skill's field evidence (verify).
