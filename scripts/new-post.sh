#!/bin/bash
# Scaffold a new blog post with the site shell, gl-components imports, and a
# data/ directory — the same structure as every existing post, so the local
# edit server, staging review layer, and deploy script all work from day one.
#
# Usage: scripts/new-post.sh <slug> ["Post title"]
set -euo pipefail
SLUG=${1:?usage: scripts/new-post.sh <slug> [\"Post title\"]}
TITLE=${2:-$(echo "$SLUG" | sed 's/-/ /g; s/\b./\u&/g')}
[[ "$SLUG" =~ ^[a-z0-9-]+$ ]] || { echo "slug must be kebab-case: [a-z0-9-]"; exit 1; }
cd "$(dirname "$0")/.."
POST="blog/posts/$SLUG"
[ -e "$POST" ] && { echo "$POST already exists"; exit 1; }

mkdir -p "$POST/data"
REF="blog/posts/simpleqa-audit"
cp "$REF/_head.html" "$POST/_head.html"
cp "$REF/_after.html" "$POST/_after.html"
# _before.html carries the post title/eyebrow — templated per post
MONTH=$(date "+%B %Y")
sed -e "s|<h1 class=\"display-2 mb-6\">.*</h1>|<h1 class=\"display-2 mb-6\">$TITLE</h1>|" \
    -e "s|<p class=\"eyebrow mb-4\">.*</p>|<p class=\"eyebrow mb-4\">Draft · $MONTH · By James Mann</p>|" \
    "$REF/_before.html" > "$POST/_before.html"

cat > "$POST/index.qmd" <<QMD
---
title: "$TITLE"
format:
  html:
    theme: none
    page-layout: custom
    include-in-header: _head.html
    include-before-body: _before.html
    include-after-body: _after.html
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
echo "  edit locally:   python3 scripts/edit-server.py   →  http://localhost:8787/$POST/"
echo "  stage + review: scripts/deploy-post.sh $POST <branch>"
