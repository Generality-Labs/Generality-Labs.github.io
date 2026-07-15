#!/usr/bin/env python3
"""Live-update the RLI scatter data from the Scale leaderboard.

Scrapes https://labs.scale.com/leaderboard/rli (a static HTML table), and
appends any models NOT already present to the post's rli.json, dating them at
the scrape date (their leaderboard appearance ~ availability). Existing entries
are left untouched, so the published forecast — frozen on pre-2026-06-01 data —
stays fixed and new models arrive as out-of-sample points (rendered as stars).

Stdlib only, so the GitHub Action needs no dependencies. Prints what changed;
exits 0 whether or not anything was added.
"""
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

URL = "https://labs.scale.com/leaderboard/rli"
TARGETS = [
    Path(__file__).resolve().parents[1] / "blog/posts/forecasting-the-remote-labor-index/data/rli.json",
    Path(__file__).resolve().parents[1] / "blog/posts/task-difficulty/data/rli.json",
]
EFFORT = ['reasoning', 'thinking', 'high', 'medium', 'low', 'minimal', 'xhigh',
          'max', 'effort', 'adaptive', 'fallback', 'default', 'cowork']

def canon(name):
    def is_eff(p):
        segs = [s.strip().lower() for s in p.split(',')]
        return bool(segs) and all(any(w in s for w in EFFORT) for s in segs)
    out = re.sub(r'\(([^)]*)\)', lambda m: '' if is_eff(m.group(1)) else m.group(0), name)
    return re.sub(r'[^a-z0-9]', '', out.lower())

def provider(name):
    n = name.lower()
    if any(w in n for w in ['claude', 'opus', 'sonnet', 'haiku', 'fable']): return 'Anthropic'
    if any(w in n for w in ['gpt', 'o1', 'o3', 'o4', 'codex', 'chatgpt']): return 'OpenAI'
    if 'gemini' in n: return 'Google'
    return 'Other'

def scrape():
    req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'replace')
    names = re.findall(r'data-model-name="true"[^>]*>([^<]+)</p>', html)
    rates = re.findall(r'ml-auto text-xs font-mono text-nowrap[^"]*"><span class="text-ink">([\d.]+)</span>', html)
    if len(names) != len(rates) or not names:
        raise SystemExit(f"parse mismatch: {len(names)} names, {len(rates)} rates — leaderboard markup changed")
    # collapse effort variants to each model's best score
    best = {}
    for n, r in zip(names, rates):
        c = canon(n)
        if c not in best or float(r) > best[c][1]:
            best[c] = (n, float(r))
    return best  # canon -> (display_name, rate%)

def main():
    board = scrape()
    today = date.today().isoformat()
    changed = False
    for path in TARGETS:
        if not path.exists():
            continue
        rli = json.load(open(path))
        have = {canon(r['model']) for r in rli}
        added = []
        for c, (name, rate) in board.items():
            if c in have:
                continue
            rli.append(dict(date=today, score=round(rate / 100, 4), model=name,
                            entry_date=today, pretty=name, provider=provider(name)))
            added.append(f"{name} ({rate:.2f}%)")
        if added:
            changed = True
            json.dump(rli, open(path, 'w'), indent=0)
            print(f"{path.name}: added {len(added)} — {', '.join(added)}")
        else:
            print(f"{path.name}: no new models ({len(board)} on board, all present)")
    print("CHANGED" if changed else "UNCHANGED")

if __name__ == "__main__":
    main()
