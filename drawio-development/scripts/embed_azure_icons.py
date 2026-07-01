#!/usr/bin/env python3
"""Resolve Azure-icon placeholders in a .drawio into embedded SVG data-URIs.

Two modes:

  Search for an icon token (before you author):
      python scripts/embed_azure_icons.py --find kubernetes

  Resolve placeholders in a diagram (before you deliver):
      python scripts/embed_azure_icons.py diagram.drawio          # edits in place
      python scripts/embed_azure_icons.py diagram.drawio -o out.drawio

Authoring: give an image vertex the placeholder token instead of a data-URI, and
keep the icon undistorted + labelled (Microsoft Terms of Use — see
assets/azure-icons/Microsoft_Terms_of_Use.pdf):

    <mxCell id="vm" value="Virtual Machine"
        style="shape=image;html=1;imageAspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;image=azure:Virtual-Machine;"
        vertex="1" parent="1">
      <mxGeometry x="120" y="120" width="48" height="48" as="geometry"/>
    </mxCell>

Then run this script; every `image=azure:<Name>` becomes the real embedded SVG.
Unresolved tokens are reported (non-zero exit) with `--find` suggestions.
"""
import argparse, base64, json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(ROOT, "..", "assets", "azure-icons"))
MANIFEST = os.path.join(ASSETS, "manifest.json")
TOKEN_RE = re.compile(r"azure:([^;\"']+)")


def norm(s):
    """Case/'- _ space'-insensitive key."""
    return re.sub(r"[-_\s]+", "-", s.strip().lower()).strip("-")


def load_index():
    with open(MANIFEST, encoding="utf-8") as fh:
        man = json.load(fh)
    by_key = {}
    for ic in man["icons"]:
        by_key[norm(ic["name"])] = ic
        by_key.setdefault(norm(ic["display"]), ic)
    return man, by_key


def data_uri(icon):
    svg = open(os.path.join(ASSETS, "svg", icon["file"]), "rb").read()
    return "data:image/svg+xml," + base64.b64encode(svg).decode("ascii")


def cmd_find(query, man, limit=25):
    q = norm(query)
    hits = [ic for ic in man["icons"] if q in norm(ic["name"]) or q in norm(ic["display"])]
    if not hits:
        print(f"no Azure icon matches '{query}'.")
        return 1
    print(f"{len(hits)} match(es) for '{query}' - use the token in image=azure:<token>:")
    for ic in hits[:limit]:
        print(f"  azure:{ic['name']:<45} ({ic['display']}) [{ic['category']}]")
    if len(hits) > limit:
        print(f"  ... {len(hits) - limit} more; refine the query.")
    return 0


def cmd_resolve(path, out, man, by_key):
    xml = open(path, encoding="utf-8").read()
    unresolved, resolved = [], [0]

    def repl(m):
        tok = m.group(1)
        icon = by_key.get(norm(tok))
        if not icon:
            unresolved.append(tok)
            return m.group(0)
        resolved[0] += 1
        return data_uri(icon)

    new = TOKEN_RE.sub(repl, xml)
    if unresolved:
        uniq = sorted(set(unresolved))
        print(f"ERROR: {len(uniq)} unresolved icon token(s); nothing written:", file=sys.stderr)
        for t in uniq:
            print(f"  azure:{t}   -> try: embed_azure_icons.py --find {t.split('-')[0]}", file=sys.stderr)
        return 2
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(new)
    print(f"resolved {resolved[0]} icon(s) -> {out}")
    if resolved[0] == 0:
        print("note: no azure: placeholders found (nothing to do).")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="Embed Azure SVG icons into a .drawio.")
    ap.add_argument("file", nargs="?", help=".drawio file to resolve")
    ap.add_argument("--find", metavar="QUERY", help="search icon tokens and exit")
    ap.add_argument("-o", "--out", help="output path (default: edit FILE in place)")
    args = ap.parse_args(argv)

    if not os.path.exists(MANIFEST):
        sys.exit(f"manifest not found: {MANIFEST}")
    man, by_key = load_index()

    if args.find is not None:
        return cmd_find(args.find, man)
    if not args.file:
        ap.error("provide a .drawio file to resolve, or use --find QUERY")
    if not os.path.exists(args.file):
        sys.exit(f"file not found: {args.file}")
    return cmd_resolve(args.file, args.out or args.file, man, by_key)


if __name__ == "__main__":
    sys.exit(main())
