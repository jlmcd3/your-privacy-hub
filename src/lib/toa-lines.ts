// ITEM 4 — FIRST ToA FIX (CEO-directed, 2026-08-15; presentation only).
//
// Web-side twin of `supabase/functions/_shared/prose/skeleton-render.ts`'s
// `toaLines`. One shared helper for ALL products whose skeleton carries a
// `table_of_authorities` section (cppa-risk, cppa-cyber, cppa-admt, governance,
// dpia, lia, ir-playbook, biometric, registration, RoPA) — never a per-product
// copy. It lays the Table of Authorities out vertically: one authority per
// line, single column, in the ledger's own order. Entry bytes, order, citation
// form and count are untouched.

export interface ToaLine {
  text: string;
  is_heading: boolean;
}

export function toaLines(text: string): ToaLine[] {
  const raw = String(text ?? "");
  let lines = raw.split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim());
  if (lines.length === 1) {
    // Legacy flattened ledger: break before each group heading and each
    // citation start, without touching the citation text itself.
    const marked = lines[0]
      .replace(
        /\s*(Regulations|Statutes|Guidance and Persuasive Authority(?: \(persuasive\))?)\s+/g,
        "\n$1\n    ",
      )
      .replace(/\s+(?=(?:UK )?GDPR Art\.|(?:UK )?GDPR Recital|EDPB |Art\. \d)/g, "\n    ");
    lines = marked.split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim());
  }
  return lines.map((l) => ({ text: l.trim(), is_heading: !/^\s/.test(l) }));
}
