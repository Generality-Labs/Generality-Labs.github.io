#!/bin/bash
# Scaffold a new blog post on the shared site shell (_includes/ partials +
# assets/site.css), with gl-components imports and a data/ directory — the
# same structure as every existing post, so preview, render, and the edit
# tooling all work from day one.
#
# Usage: scripts/new-post.sh <slug> ["Post title"] ["Author Name"]
set -euo pipefail
SLUG=${1:?usage: scripts/new-post.sh <slug> [\"Post title\"] [\"Author Name\"]}
TITLE=${2:-$(echo "$SLUG" | tr '-' ' ')}
AUTHOR=${3:-}
[[ "$SLUG" =~ ^[a-z0-9-]+$ ]] || { echo "slug must be kebab-case: [a-z0-9-]"; exit 1; }
cd "$(dirname "$0")/.."
POST="blog/posts/$SLUG"
[ -e "$POST" ] && { echo "$POST already exists"; exit 1; }

mkdir -p "$POST/data"
MONTH=$(date "+%B %Y")

# Post-local header: eyebrow, title, abstract. Everything else (nav, fonts,
# styles, footer) comes from the shared _includes/ partials. NB the trailing
# <div class="prose"> is intentionally unclosed — _includes/post-after.html
# closes it around the rendered post body (see .prettierignore).
cat > "$POST/_header.html" <<HEADER
      <header class="mb-12">
        <p class="eyebrow mb-4">Draft · $MONTH${AUTHOR:+ · By $AUTHOR}</p>
        <h1 class="display-2 mb-6">$TITLE</h1>
        <p class="text-xl text-[var(--muted)] leading-relaxed">One-paragraph abstract for the post.</p>
      </header>

      <div class="prose">
HEADER

cat > "$POST/index.qmd" <<QMD
---
pagetitle: "$TITLE - Generality Labs"
format:
  html:
    page-layout: custom
    theme: none
    include-in-header: ../../../_includes/head.html
    include-before-body:
      - ../../../_includes/post-before.html
      - _header.html
    include-after-body: ../../../_includes/post-after.html
    link-external-newwindow: true
    embed-resources: false
---

\`\`\`{ojs}
//| echo: false
glVersion = "dev"
gl = import(\`/assets/gl-components/gl.js?v=\${glVersion}\`)
mc = import(\`/assets/gl-components/model-colors.js?v=\${glVersion}\`)
\`\`\`

Opening paragraph.

## First section

Body text. Put figure data contracts in \`data/\` and check the export script
that generates them into the analysis repo.
QMD

echo "created $POST"
echo "  render:         make build"
echo "  edit locally:   python3 scripts/edit-server.py   →  http://localhost:8787/$POST/"
echo "  stage + review: scripts/deploy-post.sh $POST <branch>"
