#!/usr/bin/env python3
"""Encode a .drawio XML file into a diagrams.net browser URL.

Browser fallback for when the draw.io desktop CLI is unavailable (Cowork,
claude.ai sandbox, any host without draw.io Desktop). The diagram XML is
carried in the URL fragment (after ``#``), so nothing is uploaded to a server.

  (default)  read-only viewer  -> https://viewer.diagrams.net/...#R<payload>
  --edit     editable editor   -> https://app.diagrams.net/...#create=<payload>

Usage:  python3 encode_drawio_url.py [--edit] <path/to/input.drawio>

Stdlib only. Adapted from Agents365-ai/drawio-skill
(https://github.com/Agents365-ai/drawio-skill), used under the MIT License,
whose notice is reproduced below as that license requires. See also
references/delivery-and-export.md.

    MIT License

    Copyright (c) 2026 Agents365-ai

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
"""
import base64
import json
import sys
import urllib.parse
import zlib


def _deflate_b64(xml: str) -> str:
    # draw.io's loader runs JS decodeURIComponent on the inflated string, so the
    # XML MUST be percent-encoded (encodeURIComponent) BEFORE deflate — otherwise
    # a literal `%` or any non-ASCII (e.g. CJK) label makes the browser throw
    # "URI malformed" and the diagram never opens.
    pre = urllib.parse.quote(xml, safe="!~*'()")
    c = zlib.compressobj(9, zlib.DEFLATED, -zlib.MAX_WBITS)
    compressed = c.compress(pre.encode("utf-8")) + c.flush()
    return base64.b64encode(compressed).decode("utf-8").replace("\n", "")


def encode(xml: str) -> str:
    """Read-only viewer URL (mxGraph ``#R`` raw-inflate format)."""
    return (
        "https://viewer.diagrams.net/?tags=%7B%7D&lightbox=1&edit=_blank#R"
        + urllib.parse.quote(_deflate_b64(xml), safe="")
    )


def edit_url(xml: str) -> str:
    """Editable editor URL — opens directly in the draw.io editor."""
    payload = json.dumps({"type": "xml", "compressed": True, "data": _deflate_b64(xml)})
    return (
        "https://app.diagrams.net/?grid=0&pv=0&border=10&edit=_blank#create="
        + urllib.parse.quote(payload, safe="")
    )


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--edit"]
    if len(args) != 1:
        print("usage: encode_drawio_url.py [--edit] <path>", file=sys.stderr)
        sys.exit(2)
    with open(args[0], "r", encoding="utf-8") as f:
        xml = f.read()
    print(edit_url(xml) if "--edit" in sys.argv[1:] else encode(xml))
