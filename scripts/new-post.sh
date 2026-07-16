#!/bin/bash
# Scaffold a new blog post on the shared site shell (_includes/ partials +
# assets/site.css), with gl-components imports and a data/ directory — the
# same structure as blog/posts/hello-world, so the local edit server, staging
# review layer, and deploy script all work from day one.
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
# styles, footer) comes from the shared _includes/ partials.
sed -e "s|<p class=\"eyebrow mb-4\">.*</p>|<p class=\"eyebrow mb-4\">Draft · $MONTH${AUTHOR:+ · By $AUTHOR}</p>|" \
    -e "s|<h1 class=\"display-2 mb-6\">.*</h1>|<h1 class=\"display-2 mb-6\">$TITLE</h1>|" \
    -e "s|leading-relaxed\">.*</p>|leading-relaxed\">One-paragraph abstract for the post.</p>|" \
    blog/posts/hello-world/_header.html > "$POST/_header.html"

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
echo "  render:         make render"
echo "  edit locally:   python3 scripts/edit-server.py   →  http://localhost:8787/$POST/"
echo "  stage + review: scripts/deploy-post.sh $POST <branch>"
