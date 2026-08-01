#!/usr/bin/env python3
"""ITEM 348 — MOVE-ONLY relocation helper.

Moves files out of (or within) the edge-function tree and rewrites every
relative import in the repo so the module graph is unchanged. No file contents
change except import specifiers.

Usage: python3 scripts/prose/relocate.py <plan.tsv>
       each line: <src path>\t<dst path>
"""
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
IMPORT_RE = re.compile(r'(from\s+|import\s+|import\()\s*(["\'])(\.[^"\']+)\2')

CODE_EXT = (".ts", ".tsx", ".mjs", ".js")


def all_code_files():
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in {"node_modules", ".git", "dist", ".lovable"}]
        for f in files:
            if f.endswith(CODE_EXT):
                yield os.path.join(base, f)


def main(plan_path):
    moves = {}
    for line in open(plan_path):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        src, dst = line.split("\t")
        moves[os.path.join(ROOT, src)] = os.path.join(ROOT, dst)

    # New location of any file (moved or not).
    def newloc(p):
        return moves.get(p, p)

    # Move files on disk first so path math is done on the plan, not the disk.
    for src, dst in moves.items():
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        os.replace(src, dst)

    changed = 0
    for f in all_code_files():
        # `f` is already at its new location; find its pre-move identity.
        pre = next((s for s, d in moves.items() if d == f), f)
        src_text = open(f, encoding="utf8").read()

        def fix(m):
            spec = m.group(3)
            target_old = os.path.normpath(os.path.join(os.path.dirname(pre), spec))
            target_new = newloc(target_old)
            rel = os.path.relpath(target_new, os.path.dirname(f))
            if not rel.startswith("."):
                rel = "./" + rel
            if rel == spec:
                return m.group(0)
            return f"{m.group(1)}{m.group(2)}{rel}{m.group(2)}"

        out = IMPORT_RE.sub(fix, src_text)
        if out != src_text:
            open(f, "w", encoding="utf8").write(out)
            changed += 1

    # Prune directories the moves emptied.
    for base, dirs, files in os.walk(ROOT, topdown=False):
        if "node_modules" in base or "/.git" in base:
            continue
        if not dirs and not files:
            try:
                os.rmdir(base)
            except OSError:
                pass

    print(f"moved {len(moves)} files, rewrote imports in {changed} files")


if __name__ == "__main__":
    main(sys.argv[1])
