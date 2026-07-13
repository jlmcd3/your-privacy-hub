// RC-B B3+B4 — Scoped-delta patch application + advisory-notes guard.
// The revision-mode generator returns:
//   { changed_paths: string[], item_verdicts: [...], advisory_notes: [...] }
// We deep-clone the stored report, write ONLY listed paths, and preserve every
// other byte-identical (mergePreservingFail pattern). Byte identity is verified
// via SHA-256 over the JSON-canonicalized untouched subtree.

export interface RevisionPatch {
  changed_paths?: string[];
  item_verdicts?: Array<{ item_id: string; verdict: "resolved" | "not_resolved"; reason: string }>;
  advisory_notes?: Array<{ text: string; fact_ref?: string }>;
  values?: Record<string, unknown>; // parallel to changed_paths: path → value
}

// Parse a.b[0].c into ["a","b",0,"c"].
function parsePath(path: string): (string | number)[] {
  const out: (string | number)[] = [];
  let buf = "";
  for (let i = 0; i < path.length; i++) {
    const ch = path[i];
    if (ch === ".") { if (buf) { out.push(buf); buf = ""; } }
    else if (ch === "[") { if (buf) { out.push(buf); buf = ""; } }
    else if (ch === "]") { if (buf) { out.push(/^\d+$/.test(buf) ? Number(buf) : buf); buf = ""; } }
    else buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

function setDeep(obj: any, path: (string | number)[], value: unknown): void {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    const next = path[i + 1];
    if (cur[k] == null) cur[k] = typeof next === "number" ? [] : {};
    cur = cur[k];
  }
  cur[path[path.length - 1]] = value;
}

function getDeep(obj: any, path: (string | number)[]): unknown {
  let cur = obj;
  for (const k of path) {
    if (cur == null) return undefined;
    cur = cur[k];
  }
  return cur;
}

// Canonical stringify (sorted keys) for stable hashing.
function canon(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  const keys = Object.keys(v as object).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canon((v as any)[k])).join(",") + "}";
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function applyRevisionPatch(
  stored: any,
  patch: RevisionPatch,
): Promise<{ next: any; untouchedHashBefore: string; untouchedHashAfter: string; equal: boolean }> {
  const next = JSON.parse(JSON.stringify(stored ?? {}));
  const paths = Array.isArray(patch.changed_paths) ? patch.changed_paths : [];
  const values = patch.values ?? {};
  for (const p of paths) {
    const parsed = parsePath(p);
    if (parsed.length === 0) continue;
    setDeep(next, parsed, (values as any)[p]);
  }
  // Untouched-subtree hash: strip all changed paths from BOTH sides before hashing.
  const stripped = (root: any) => {
    const clone = JSON.parse(JSON.stringify(root ?? {}));
    for (const p of paths) {
      const parsed = parsePath(p);
      if (parsed.length === 0) continue;
      // Delete leaf by setting to a sentinel then removing.
      const parent = getDeep(clone, parsed.slice(0, -1));
      if (parent && typeof parent === "object") {
        const k = parsed[parsed.length - 1] as any;
        delete (parent as any)[k];
      }
    }
    // Also strip top-level fields we always mutate (statuses/advisory).
    delete clone.open_items;
    delete clone.advisory_notes;
    delete clone.lint_warnings;
    return clone;
  };
  const beforeHash = await sha256(canon(stripped(stored)));
  const afterHash = await sha256(canon(stripped(next)));
  return { next, untouchedHashBefore: beforeHash, untouchedHashAfter: afterHash, equal: beforeHash === afterHash };
}

// ADVISORY caps per RC-B B4.
export const ADVISORY_CAPS: Record<string, number> = {
  cppa_risk_assessment: 5,
  dpia_framework: 5,
  li_assessment: 3,
  governance_assessment: 3,
  cppa_cybersecurity: 3,
  cppa_admt: 3,
  biometric_checker: 0,
  ir_playbook: 0,
  dpa_generator: 0,
  registration_assessment: 0,
};

// GROUNDING RULE: advisory may only arise from a fact affirmatively supplied.
// Guard strips: (a) missing/unknown fact_ref, (b) over-cap tail.
export function guardAdvisoryNotes(
  notes: Array<{ text: string; fact_ref?: string }>,
  opts: { cap: number; allowedFactRefs: Set<string> },
): { keep: Array<{ text: string; fact_ref: string }>; stripped: number; reasons: string[] } {
  const reasons: string[] = [];
  const cleaned: Array<{ text: string; fact_ref: string }> = [];
  for (const n of Array.isArray(notes) ? notes : []) {
    const ref = String(n?.fact_ref ?? "").trim();
    const text = String(n?.text ?? "").trim();
    if (!text) { reasons.push("empty_text"); continue; }
    if (!ref || !opts.allowedFactRefs.has(ref)) {
      reasons.push(`ungrounded:${ref || "(none)"}`);
      continue;
    }
    cleaned.push({ text, fact_ref: ref });
  }
  const kept = cleaned.slice(0, opts.cap);
  const stripped = (notes?.length ?? 0) - kept.length;
  if (cleaned.length > opts.cap) reasons.push(`over_cap:${cleaned.length}>${opts.cap}`);
  return { keep: kept, stripped, reasons };
}

// Deterministic QC — fails a run whose surviving notes lack fact_ref.
export function checkAdvisoryGrounding(reportData: any): { ok: boolean; message?: string } {
  const notes = Array.isArray(reportData?.advisory_notes) ? reportData.advisory_notes : [];
  for (const n of notes) {
    if (!n || typeof n.fact_ref !== "string" || !n.fact_ref.trim()) {
      return { ok: false, message: `advisory_note without fact_ref: "${String(n?.text ?? "").slice(0, 60)}"` };
    }
  }
  return { ok: true };
}
