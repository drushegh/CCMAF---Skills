# Azure product icons (embedded SVG)

An offline library of **617 official Microsoft Azure product icons** (Azure
Public Service Icons V23), vendored in `assets/azure-icons/` so branded Azure
diagrams render identically everywhere — desktop, web and export — with no
dependency on which shape libraries a given draw.io build ships. Use these for
Azure architecture diagrams instead of guessing at `shape=mxgraph.azure.*`
style strings (a wrong name renders as a blank box).

## Licensing — non-negotiable (Microsoft Terms of Use)

The pack ships under `assets/azure-icons/Microsoft_Terms_of_Use.pdf`. Permitted
use is **architecture diagrams, training materials, and documentation** — which
is exactly what this skill produces. Two rules are **mandatory** and are baked
into the recipe below:

- **Always label** the icon with the **full service name**, placed near but not
  overlapping it (use `verticalLabelPosition=bottom;verticalAlign=top;` and set
  the cell `value`).
- **Never distort** — no crop, flip, rotate, or non-uniform scale. Always keep
  `imageAspect=fixed;` and give the cell a **square** geometry.
- Use an icon only to represent the **Microsoft product it stands for** — never
  to brand your own product or service.

Keep the ToU PDF alongside the icons if you redistribute the skill.

## Workflow — placeholder, then resolve

Do **not** hand-embed base64 (long, transcription-prone). Instead reference an
icon by token and let the script embed the real SVG before delivery.

**1. Find the token** for the service you need:

```bash
python scripts/embed_azure_icons.py --find kubernetes
#   azure:Kubernetes-Services   (Kubernetes Services) [compute]
```

Tokens match the manifest `name` (hyphenated); matching is case- and
`-`/`_`/space-insensitive. `assets/azure-icons/manifest.json` is the full index.

**2. Author** the icon as an `image` vertex whose `image=` is the token:

```xml
<mxCell id="aks" value="Kubernetes Services"
    style="shape=image;html=1;imageAspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;image=azure:Kubernetes-Services;"
    vertex="1" parent="1">
  <mxGeometry x="260" y="80" width="48" height="48" as="geometry"/>
</mxCell>
```

Icons are square — use equal width/height (~48px is a good default; scale
uniformly). Space and connect them like any other vertex.

**3. Resolve** every `azure:<token>` to an embedded data-URI — run this **after
authoring, before `validate.py` and delivery**:

```bash
python scripts/embed_azure_icons.py diagram.drawio        # edits in place
python scripts/embed_azure_icons.py diagram.drawio -o final.drawio
```

Unresolved tokens abort the run (nothing written) and are listed with `--find`
suggestions — fix the token and re-run. After resolving, the file is
self-contained and exports normally (see `delivery-and-export.md`).

## Notes

- The resolver adds ~3.6 KB per distinct icon to the file (base64 of a ~2.7 KB
  SVG). Fine for typical diagrams; for very large icon-heavy diagrams prefer
  reusing the same few services.
- Icons draw.io already ships natively (`shape=mxgraph.mscae.*` / `azure*`) are
  also valid — but the embedded library is version-proof and covers the current
  V23 set. When in doubt, embed.
- Not every conceivable Azure service is in V23; if `--find` returns nothing,
  fall back to a generic shape or the built-in `mxgraph` Azure stencils.
