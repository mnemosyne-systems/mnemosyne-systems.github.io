#!/bin/sh
#
# generate.sh — build the orangu documentation site with pandoc.
#
# It pulls the Markdown manual (and its images) straight from the orangu
# repository and renders one HTML page per chapter using template.html and
# doc.css. Re-run it whenever the upstream manual changes.
#
# By default the sources are fetched from GitHub. Point ORANGU_SRC at a local
# checkout of the orangu repository to render from working-tree state instead:
#
#     ORANGU_SRC=~/GitHub/orangu ./generate.sh
#
# ORANGU_REF picks the ref fetched from GitHub — use it to publish the manual as
# it stood at a release rather than whatever main happens to hold:
#
#     ORANGU_REF=1.2.0 ./generate.sh
#
# Requirements: pandoc, python3, and (unless ORANGU_SRC is set) gh + base64.
#
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$HERE"

REPO="mnemosyne-systems/orangu"
BRANCH="${ORANGU_REF:-main}"
DOCROOT="doc"

command -v pandoc  >/dev/null 2>&1 || { echo "error: pandoc is required"  >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "error: python3 is required" >&2; exit 1; }
if [ -z "${ORANGU_SRC:-}" ]; then
  command -v gh >/dev/null 2>&1 || { echo "error: gh is required (or set ORANGU_SRC)" >&2; exit 1; }
fi

SRC=$(mktemp -d)
trap 'rm -rf "$SRC"' EXIT

# Page table: <output-slug>|<source path under doc/>|<Title>
# The order also drives the sidebar grouping in template.html.
PAGES="
introduction|manual/en/01-introduction|Introduction
getting-started|manual/en/03-getting_started|Getting Started
configuration|manual/en/20-configuration|Configuration
terminal|manual/en/40-terminal|Terminal Interface
tools|manual/en/30-tools|Tools
core-tools|manual/en/41-core_tools|Core Tools
git-tools|manual/en/42-git_tools|Git Tools
usage-tools|manual/en/43-usage_tools|Usage Tools
workspaces|manual/en/31-workspaces|Workspaces
skills|manual/en/32-skills|Skills
extra|manual/en/72-extra|External Tools
coordinator|manual/en/44-coordinator|Coordinator
server|manual/en/46-server|Inference Server
http|manual/en/80-http|HTTP Endpoints
local-llm|manual/en/73-openai|Serving Models per Role
compression|manual/en/75-compression|Compression
completions|manual/en/74-completions|Shell Completions
building|manual/en/70-dev|Developer Information
coordinator-internals|manual/en/76-coordinator|Coordinator Internals
server-internals|manual/en/78-server|Server Internals
benchmarking|manual/en/79-bench|Benchmarking
contributing|manual/en/71-git|Contributing
"

fetch() { # <path under doc/> <dest>
  if [ -n "${ORANGU_SRC:-}" ]; then
    cp "$ORANGU_SRC/$DOCROOT/$1" "$2"
  else
    gh api "repos/$REPO/contents/$DOCROOT/$1?ref=$BRANCH" --jq '.content' | base64 -d > "$2"
  fi
}

# Normalise the table into a clean newline-delimited list.
LIST=$(printf '%s\n' "$PAGES" | sed '/^[[:space:]]*$/d')
COUNT=$(printf '%s\n' "$LIST" | wc -l | tr -d ' ')

if [ -n "${ORANGU_SRC:-}" ]; then
  echo "Fetching manual from $ORANGU_SRC ..."
else
  echo "Fetching manual from $REPO@$BRANCH ..."
fi
printf '%s\n' "$LIST" | while IFS='|' read -r slug src title; do
  fetch "$src.md" "$SRC/$slug.md"
done

# Rewrite inter-chapter Markdown links (43-usage_tools.md -> usage-tools.html)
# so they resolve between the generated pages rather than back to GitHub.
printf '%s\n' "$LIST" | while IFS='|' read -r slug src title; do
  base=$(basename "$src")
  for f in "$SRC"/*.md; do
    sed -i "s|\(\.\./\)*$base\.md|$slug.html|g" "$f"
  done
done

# Links that leave the manual entirely still have to point somewhere real.
sed -i "s|(\(\.\./\)*BUILDING\.md|(https://github.com/$REPO/blob/$BRANCH/BUILDING.md|g" "$SRC"/*.md

# Fetch every image referenced by the manual.
mkdir -p images
imgs=$(grep -roh 'images/[A-Za-z0-9._-]\+' "$SRC" | sort -u || true)
for ref in $imgs; do
  name=${ref#images/}
  fetch "images/$name" "images/$name" || echo "  warn: missing image $name" >&2
done

render() { # <slug> <title> [extra pandoc args ...]
  slug=$1; title=$2; shift 2
  pandoc "$SRC/$slug.md" \
    --from=markdown+raw_tex-yaml_metadata_block --to=html5 --standalone \
    --template=template.html --toc --toc-depth=2 \
    --metadata "title=$title" --metadata lang=en -V "nav_$slug=true" \
    "$@" --output="$slug.html"
}

echo "Rendering $COUNT pages with pandoc ..."
printf '%s\n' "$LIST" | while IFS='|' read -r slug src title; do
  render "$slug" "$title"
  # Several chapters are sections of the printed book and so start at `##`.
  # Standalone they would open with no heading at all, so give them the
  # chapter title from the page table instead. (Not `pagetitle`: pandoc
  # reserves that name and always populates it, so the test never fails.)
  if ! grep -q '<h1' "$slug.html"; then
    render "$slug" "$title" -V chaptertitle=true
  fi
  echo "  $slug.html"
done

# Chapter anchors are book-wide upstream but page-local here: repoint every
# fragment link at the page that actually defines it.
python3 fixup.py $(printf '%s\n' "$LIST" | cut -d'|' -f1)

echo "Done. $COUNT pages written to $HERE"
