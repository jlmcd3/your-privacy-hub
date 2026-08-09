#!/usr/bin/env python3
"""Upload-walk measure: for each function, bytes of supabase/functions/_shared
tree plus its own directory (the Supabase deploy upload set)."""
import os, sys, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FN = os.path.join(ROOT, "supabase", "functions")

def treesize(d):
    t = 0
    for base, dirs, files in os.walk(d):
        for f in files:
            t += os.path.getsize(os.path.join(base, f))
    return t

shared = treesize(os.path.join(FN, "_shared"))
out = {}
for d in sorted(os.listdir(FN)):
    p = os.path.join(FN, d)
    if not os.path.isdir(p) or d.startswith("_"):
        continue
    out[d] = shared + treesize(p)
json.dump(out, open(sys.argv[1], "w"), indent=1)
print("shared tree:", shared)
for k, v in sorted(out.items(), key=lambda kv: -kv[1])[:15]:
    print(f"{k:40s} {v:10d}")
