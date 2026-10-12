# Licensing and Provenance

## What CC0 gives you

Kenney's support page says the game assets on its asset pages are
public-domain licensed (**CC0 1.0 Universal**). You may use, modify
and redistribute them, including in commercial games, and
**attribution is not required**. Credit is optional; if you give it,
mention "Kenney". Each download also ships a licence file. Keep it with
your provenance record. (Checked on kenney.nl/support, Oct 2026.
Re-check if a pack's page says otherwise.)

CC0 is about copyright. It does not:

- grant trademark rights. Don't present your game as made or endorsed
  by Kenney, and don't use the Kenney logo as your branding;
- cover lookalike packs. Third-party "Kenney-style" or remixed packs on
  other sites carry their own licences. Only assets downloaded from
  kenney.nl (or Kenney's official store pages) are covered by this
  note;
- make the separate paid tools free (for example Kenney's own asset
  creation software, which is sold separately). Assets you *make* with
  such a tool follow that tool's terms (verify).

## Provenance record (keep one per project)

Even with a permissive licence, record what you used. It answers
store-review and publisher questions in minutes and keeps a mixed-
licence project honest:

```markdown
| Kit | Version (zip name) | Source URL | Licence | Files used | Modified? |
|-----|--------------------|------------|---------|------------|-----------|
| city-roads | kenney_city-kit-roads_2.0.zip | https://kenney.nl/assets/… | CC0 1.0 | road-straight.glb, road-bend.glb, Textures/colormap.png | colormap recoloured |
```

- Record the **zip name with version** exactly as downloaded.
- Keep raw zips out of git (they are large and reproducible). Keep the
  extracted files you ship, plus this table and the licence file.
- Note modifications (recolours, merged meshes, re-rigs). This is not
  required by CC0, but it helps when an asset needs re-deriving after
  a pack update.

## Mixed-licence projects

Kenney assets often sit beside assets with real obligations
(CC-BY sounds, a commercial font, store-bought models). Keep one
provenance table for **all** third-party assets, with the licence per
row and an attribution screen generated from the rows that require
credit. Optionally credit Kenney there too. A CC0 pack in the table
costs nothing and documents intent.

## When unsure

If a pack page, its licence file or this note disagree, the pack's own
licence file wins. If none of them is clear, ask before shipping
rather than assuming CC0.
