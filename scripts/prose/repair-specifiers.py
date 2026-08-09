#!/usr/bin/env python3
"""ITEM 402-C-3 repair pass.

The 402-C-3 relocation was run twice (once to move + rewrite, once in
--rewrite-only mode to repair the extension-less miss). The second pass
re-addressed already-correct specifiers inside the MOVED files from their
pre-move directory, over-shooting the depth. This pass repairs any relative
specifier that does not resolve on disk by locating the unique file under
supabase/functions/ whose path ends with the longest resolvable suffix of the
specifier, then re-expressing it relative to the importing file.

Content is otherwise untouched: only specifier strings change.
"""
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FN = os.path.join(ROOT, "supabase", "functions")
SPEC_RE = re.compile(r'(from\s+|import\s+|import\()\s*(["\'])(\.[^"\']+)\2')
CODE_EXT = (".ts", ".tsx", ".mjs", ".js")

ALL = []
for base, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in {"node_modules", ".git", "dist", ".lovable"}]
    for f in files:
        if f.endswith(CODE_EXT):
            ALL.append(os.path.join(base, f))

FILESET = set(ALL)


def resolves(p):
    if p in FILESET:
        return p
    for ext in CODE_EXT:
        if p + ext in FILESET:
            return p
    if os.path.join(p, "index.ts") in FILESET:
        return p
    return None


def find_by_suffix(spec):
    parts = [q for q in spec.split("/") if q not in (".", "..")]
    for i in range(len(parts)):
        suffix = "/".join(parts[i:])
        hits = [p for p in ALL
                if p.replace(os.sep, "/").endswith("/" + suffix)
                or p.replace(os.sep, "/").endswith("/" + suffix + ".ts")]
        # prefer the deployed tree
        hits = [h for h in hits if h.startswith(FN + os.sep)] or hits
        if len(hits) == 1:
            return hits[0], suffix
        if len(hits) > 1:
            return None, suffix
    return None, None


def main(apply=True):
    fixed, unresolved = 0, []
    for f in ALL:
        src = open(f, encoding="utf8").read()

        def fix(m):
            nonlocal fixed
            spec = m.group(3)
            target = os.path.normpath(os.path.join(os.path.dirname(f), spec))
            if resolves(target):
                return m.group(0)
            hit, suffix = find_by_suffix(spec)
            if not hit:
                unresolved.append((os.path.relpath(f, ROOT), spec))
                return m.group(0)
            keep_ext = spec.endswith(CODE_EXT)
            new = hit if keep_ext else os.path.splitext(hit)[0]
            rel = os.path.relpath(new, os.path.dirname(f))
            if not rel.startswith("."):
                rel = "./" + rel
            fixed += 1
            return f"{m.group(1)}{m.group(2)}{rel}{m.group(2)}"

        out = SPEC_RE.sub(fix, src)
        if out != src and apply:
            open(f, "w", encoding="utf8").write(out)
    print(f"repaired {fixed} specifiers")
    for f, s in unresolved:
        print("  UNRESOLVED", f, s)


if __name__ == "__main__":
    main("--dry" not in sys.argv)
