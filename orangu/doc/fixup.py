#!/usr/bin/env python3
"""Repoint cross-chapter fragment links in the generated orangu manual.

Upstream the manual is one book, so `[...](#some-heading)` resolves wherever
that heading happens to live. Split across pages, those links break. This
rewrites each one to `<page>.html#some-heading` and reports any that no page
defines. Run from generate.sh; the page slugs are passed as arguments.
"""

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

ID_RE = re.compile(r'\bid="([^"]+)"')
# Fragment-only hrefs, i.e. href="#anchor" — not href="page.html#anchor".
HREF_RE = re.compile(r'href="#([^"]+)"')


def main(slugs):
    pages = {slug: (HERE / f"{slug}.html").read_text(encoding="utf-8") for slug in slugs}

    # anchor -> defining page. First page in table order wins a duplicate.
    owner = {}
    for slug in slugs:
        for anchor in ID_RE.findall(pages[slug]):
            owner.setdefault(anchor, slug)

    rewritten = 0
    dangling = []

    for slug in slugs:
        text = pages[slug]
        local = set(ID_RE.findall(text))
        changed = 0

        def repoint(match):
            nonlocal changed
            anchor = match.group(1)
            if anchor in local:
                return match.group(0)
            target = owner.get(anchor)
            if target is None:
                dangling.append((slug, anchor))
                return match.group(0)
            changed += 1
            return f'href="{target}.html#{anchor}"'

        # The sidebar TOC only ever points at the current page, so leaving it
        # in scope is harmless: every one of its anchors is local by definition.
        text = HREF_RE.sub(repoint, text)
        if changed:
            (HERE / f"{slug}.html").write_text(text, encoding="utf-8")
            rewritten += changed

    print(f"  repointed {rewritten} cross-page anchor(s)")
    for slug, anchor in dangling:
        print(f"  warn: {slug}.html links to #{anchor}, which no page defines", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: fixup.py <slug> [<slug> ...]")
    main(sys.argv[1:])
