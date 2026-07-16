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

.PHONY: setup render preview clean-tools

setup: $(QUARTO)

$(QUARTO):
	mkdir -p $(QUARTO_DIR)
	curl -fsSL $(QUARTO_URL) | tar -xz -C $(QUARTO_DIR) --strip-components=1
	$(QUARTO) --version

# Renders every post in the _quarto.yml render list (in place, next to its
# .qmd). The frozen forecasting post is excluded there; render it explicitly
# by path if you ever need to regenerate it.
render: $(QUARTO)
	$(QUARTO) render

# Preview one post with re-render on save (default-type projects can't
# preview project-wide). Usage: make preview POST=blog/posts/my-post
POST ?= blog/posts/hello-world

preview: $(QUARTO)
	$(QUARTO) preview $(POST)/index.qmd

clean-tools:
	rm -rf .tools
