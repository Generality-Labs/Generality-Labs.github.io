# Pinned Quarto toolchain. Rendered HTML is committed and served as-is from
# `main`, so every machine must render with the same Quarto version or the
# committed output churns (index_files/ carries version-hashed assets).
QUARTO_VERSION := 1.9.38
QUARTO_DIR     := .tools/quarto-$(QUARTO_VERSION)
QUARTO         := $(QUARTO_DIR)/bin/quarto

UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)
ifeq ($(UNAME_S),Darwin)
  QUARTO_ASSET := quarto-$(QUARTO_VERSION)-macos.tar.gz
else ifeq ($(UNAME_M),aarch64)
  QUARTO_ASSET := quarto-$(QUARTO_VERSION)-linux-arm64.tar.gz
else
  QUARTO_ASSET := quarto-$(QUARTO_VERSION)-linux-amd64.tar.gz
endif
QUARTO_URL := https://github.com/quarto-dev/quarto-cli/releases/download/v$(QUARTO_VERSION)/$(QUARTO_ASSET)

.PHONY: setup build render-quarto preview compare tailwind clean-tools

# Everything derived-and-committed in one go: rendered posts + compiled CSS.
build: render-quarto tailwind

setup: $(QUARTO)

$(QUARTO):
	mkdir -p $(QUARTO_DIR)
	curl -fsSL $(QUARTO_URL) | tar -xz -C $(QUARTO_DIR) --strip-components=1
	$(QUARTO) --version

# Renders every post in the _quarto.yml render list (in place, next to its
# .qmd).
render-quarto: $(QUARTO)
	$(QUARTO) render

# Preview one post with re-render on save (default-type projects can't
# preview project-wide). Usage: make preview POST=blog/posts/my-post
POST ?= blog/posts/triviaqa

preview: $(QUARTO)
	$(QUARTO) preview $(POST)/index.qmd

# Regenerate the static Tailwind stylesheet (committed as assets/tw.css).
# One-off, needs node; run only when markup adds new utility classes.
TW_CONTENT := ./index.html,./blog/index.html,./blog/posts/why-are-evaluations-broken.html,./blog/posts/*/index.html,./blog/posts/*/_header.html,./_includes/*.html
tailwind:
	npx --yes tailwindcss@3.4.17 -i assets/tw.input.css -o assets/tw.css \
	  --content "$(TW_CONTENT)" --minify

# Bundle components/ (JSX) into the committed static module assets/gl-react.js.
# Real react/react-dom, bundled in — the artifact stays self-contained.
react: node_modules
	npx esbuild components/index.jsx --bundle --format=esm --minify \
	  --jsx=automatic --define:process.env.NODE_ENV='"production"' \
	  --outfile=assets/gl-react.js

node_modules: package.json
	npm install --silent
	@touch node_modules

clean-tools:
	rm -rf .tools
