#!/usr/bin/env python3
"""Quarto post-render hook: hoist per-post lib bundles into a shared dir.

Quarto emits a private copy of its runtime (quarto-ojs, quarto-html, …,
~1MB) into every post's index_files/libs/. At 1-2 posts a week that
penalises regular readers, who re-download an identical runtime per post.

This moves each rendered post's libs into /assets/quarto-libs/quarto-<version>/
and rewrites the HTML to reference them there, so every post rendered by the
same (pinned) Quarto shares one copy and one browser-cache entry. The dir is
version-scoped on purpose: bumping the toolchain creates a sibling dir rather
than swapping files under already-shipped posts, so old posts stay frozen.

Stdlib only. Runs via `post-render` in _quarto.yml; Quarto provides the env.
"""
import os
import re
import shutil
from pathlib import Path

proj = Path(os.environ.get("QUARTO_PROJECT_DIR", "."))

for out in os.environ.get("QUARTO_PROJECT_OUTPUT_FILES", "").split("\n"):
    out = out.strip()
    if not out:
        continue
    html = Path(out) if os.path.isabs(out) else proj / out
    if html.suffix != ".html" or not html.exists():
        continue
    text = html.read_text()
    m = re.search(r'<meta name="generator" content="quarto-([^"]+)"', text)
    if not m:
        continue
    shared = f"assets/quarto-libs/quarto-{m.group(1)}"

    libs = html.parent / f"{html.stem}_files" / "libs"
    if libs.is_dir():
        dest = proj / shared
        for f in [p for p in libs.rglob("*") if p.is_file()]:
            target = dest / f.relative_to(libs)
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists():
                shutil.copy2(f, target)
        shutil.rmtree(libs)
        files_dir = libs.parent
        if files_dir.is_dir() and not any(files_dir.iterdir()):
            files_dir.rmdir()

    rewritten = text.replace(f'"{html.stem}_files/libs/', f'"/{shared}/')
    if rewritten != text:
        html.write_text(rewritten)
        print(f"[share_quarto_libs] {html.relative_to(proj)}: libs -> /{shared}/")
