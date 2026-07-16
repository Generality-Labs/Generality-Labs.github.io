#!/bin/bash
# Render + deploy a post branch to Cloudflare Pages preview (staging),
# cache-busting the gl-components module imports.
#
# Staging deploys get the gl-comments review layer: the bundle is assembled in
# a temp dir where the comments <script> tag is injected into rendered posts
# and review/functions/ becomes the Pages Functions API. The repo's own files
# are never touched, so prod (GitHub Pages, straight from the repo) can never
# ship review code.
#
# Usage: scripts/deploy-post.sh [post-dir] [branch]
set -euo pipefail
POST=${1:?usage: scripts/deploy-post.sh <post-dir> [branch]}
BRANCH=${2:-$(basename "$POST")}
cd "$(dirname "$0")/.."

V=$(date +%Y%m%d-%H%M%S)
sed -i '' "s/glVersion = \"[^\"]*\"/glVersion = \"$V\"/" "$POST/index.qmd"
# render with the repo-pinned quarto (make setup fetches it into .tools/)
make -s setup
QV=$(sed -n 's/^QUARTO_VERSION := //p' Makefile)
export PATH="$PWD/.tools/quarto-$QV/bin:$PATH"
(cd "$POST" && quarto render index.qmd)

# Assemble the staging bundle: site + review layer.
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
rsync -a --exclude .git --exclude .wrangler --exclude review --exclude scripts \
  --exclude .tools --exclude .quarto . "$STAGE/"
cp -R review/functions "$STAGE/functions"
find "$STAGE/blog/posts" -name index.html -exec \
  sed -i '' 's|</body>|<script type="module" src="/assets/gl-comments/gl-comments.js"></script></body>|' {} +

export CLOUDFLARE_API_TOKEN=$(grep CLOUDFLARE_API_TOKEN ../.env | cut -d= -f2)
export CLOUDFLARE_ACCOUNT_ID=4dd4a6b03a79f452ebc112658643f02a
NODE22=$(ls -d ~/.nvm/versions/node/v22* | tail -1)/bin
# cd into the bundle: wrangler resolves functions/ from the CWD
(cd "$STAGE" && PATH="$NODE22:$PATH" npx --yes wrangler@latest pages deploy . \
  --project-name generality-site --branch "$BRANCH" --commit-dirty=true | tail -1)
