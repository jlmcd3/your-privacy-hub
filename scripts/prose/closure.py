#!/usr/bin/env python3
"""Resolved-specifier closure walk over supabase/functions.

Walks from every function entry (supabase/functions/<name>/index.ts),
following static imports, `export ... from`, and dynamic import("literal").
Prints per-file consumer sets, and upload sizes.
"""
import os, re, sys, json
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FN = os.path.join(ROOT, "supabase", "functions")
SHARED = os.path.join(FN, "_shared")

SPEC_RE = re.compile(
    r"""(?:import\s+(?:[^"'`;]+?\s+from\s+)?|export\s+[^"'`;]*?\s*from\s+|import\s*\(\s*)["']([^"']+)["']""")

CODE_EXT = (".ts", ".tsx", ".mjs", ".js")


def resolve(frm, spec):
    if re.match(r"^[a-z][a-z0-9+.-]*:", spec, re.I):
        return None
    if not spec.startswith(".") and not spec.startswith("/"):
        return None
    p = os.path.normpath(os.path.join(os.path.dirname(frm), spec))
    if os.path.isfile(p):
        return p
    for ext in CODE_EXT:
        if os.path.isfile(p + ext):
            return p + ext
    for ext in CODE_EXT:
        cand = os.path.join(p, "index" + ext)
        if os.path.isfile(cand):
            return cand
    return None


def is_test(p):
    b = os.path.basename(p)
    return b.endswith(".test.ts") or b.endswith("_test.ts") or "/_tests/" in p


def closure(entry):
    seen = set()
    stack = [entry]
    missing = []
    while stack:
        f = stack.pop()
        if f in seen:
            continue
        seen.add(f)
        try:
            src = open(f, encoding="utf8").read()
        except Exception:
            continue
        for m in SPEC_RE.finditer(src):
            spec = m.group(1)
            r = resolve(f, spec)
            if r is None:
                if spec.startswith(".") or spec.startswith("/"):
                    missing.append((f, spec))
                continue
            if r not in seen:
                stack.append(r)
    return seen, missing


def main():
    fns = sorted(d for d in os.listdir(FN)
                 if os.path.isdir(os.path.join(FN, d)) and not d.startswith("_")
                 and os.path.isfile(os.path.join(FN, d, "index.ts")))
    consumers = defaultdict(set)
    closures = {}
    allmissing = []
    for f in fns:
        c, miss = closure(os.path.join(FN, f, "index.ts"))
        closures[f] = c
        allmissing += miss
        for p in c:
            consumers[p].add(f)
    return fns, consumers, closures, allmissing


if __name__ == "__main__":
    fns, consumers, closures, missing = main()
    single = defaultdict(list)
    for p, cs in consumers.items():
        if len(cs) == 1 and p.startswith(SHARED + os.sep) and not is_test(p):
            single[list(cs)[0]].append(p)
    tot = 0
    for f in sorted(single, key=lambda k: -sum(os.path.getsize(p) for p in single[k])):
        b = sum(os.path.getsize(p) for p in single[f])
        tot += b
        print(f"{f:45s} {b:9d}  {len(single[f])} files")
    print("TOTAL single-consumer _shared bytes:", tot)
    if missing:
        print("\nUNRESOLVED (first 20):")
        for f, s in missing[:20]:
            print(" ", os.path.relpath(f, ROOT), s)
    json.dump({k: sorted(os.path.relpath(p, ROOT) for p in v) for k, v in single.items()},
              open("/tmp/single.json", "w"), indent=1)
