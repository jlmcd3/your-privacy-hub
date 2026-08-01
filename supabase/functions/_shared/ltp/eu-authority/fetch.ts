/**
 * ITEM 341 — CORPUS FETCH for the EU persuasive-authority section.
 *
 * This is the ONLY I/O in the eu-authority module; ./build.ts stays pure.
 *
 * Three reads, all read-only:
 *   1. `edpb_guidelines` — re-query each pinned row by id so the builder can
 *      confirm the pinned quote is still a byte-exact substring at BUILD
 *      time. A row that has moved loses its quote; nothing is repaired.
 *   2. `edpb_oss_decisions` — counts per GDPR provision / topic tag. Counts
 *      only; no text is read into the document.
 *   3. `enforcement_actions` — VERIFIED rows only, with a named subject and
 *      a source URL. An unverified row is never returned by this fetcher, so
 *      it cannot reach the document even by mistake downstream.
 *
 * Never throws: on any failure the caller receives `null` and the builder
 * degrades honestly.
 */
import { EU_GUIDANCE_PINS } from "./pinned-guidance.ts";
import { EU_TOPIC_RULES } from "./topics.ts";
import type { EuAuthorityCorpus, EuVerifiedPrecedent } from "./types.ts";
// ITEM 354 — enforcement surface gate. This is a cppa-risk precedent surface:
// full memo bar + allow-list (eu_dpa / eea_dpa / uk_dpa), cppa excluded by the
// named, dated CPPA-INCLUSION-GATE (2026-08-01).
import { gateRow, GATE_COLUMNS } from "../../enforcement/surface-gate.ts";

/** Minimal structural client type — avoids a hard SDK import here. */
interface QueryClient {
  from: (table: string) => any;
}

/** Parse "Art. 32 (1) b) GDPR, Article 6 GDPR" → ["Article 32","Article 6"]. */
export function parseProvisions(...sources: (string | null | undefined)[]): string[] {
  const found = new Set<string>();
  for (const s of sources) {
    if (!s) continue;
    const re = /\b(?:art(?:icle)?\.?)\s*(\d{1,2})\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) found.add(`Article ${m[1]}`);
  }
  return Array.from(found).sort();
}

function allProvisions(): string[] {
  return Array.from(new Set(EU_TOPIC_RULES.flatMap((r) => r.gdpr_provisions)));
}

function allTags(): string[] {
  return Array.from(new Set(EU_TOPIC_RULES.flatMap((r) => r.topic_tags)));
}

export async function fetchEuAuthorityCorpus(
  supabase: QueryClient,
): Promise<EuAuthorityCorpus | null> {
  try {
    const guidance_excerpts: Record<string, string> = {};
    const ids = Array.from(new Set(EU_GUIDANCE_PINS.map((p) => p.corpus_row_id)));
    const { data: rows } = await supabase
      .from("edpb_guidelines")
      .select("id, excerpt_text")
      .in("id", ids);
    const textById = new Map<string, string>();
    for (const r of (rows ?? []) as { id: string; excerpt_text: string }[]) {
      textById.set(r.id, String(r.excerpt_text ?? ""));
    }
    for (const pin of EU_GUIDANCE_PINS) {
      const t = textById.get(pin.corpus_row_id);
      if (typeof t === "string") guidance_excerpts[pin.pin_id] = t;
    }

    // 2. Art. 60 register — counts only.
    const oss_counts: Record<string, number> = {};
    for (const p of allProvisions()) {
      const { count } = await supabase
        .from("edpb_oss_decisions")
        .select("id", { count: "exact", head: true })
        .contains("gdpr_provisions", [p]);
      oss_counts[`provision:${p}`] = typeof count === "number" ? count : 0;
    }
    for (const t of allTags()) {
      const { count } = await supabase
        .from("edpb_oss_decisions")
        .select("id", { count: "exact", head: true })
        .contains("topic_tags", [t]);
      oss_counts[`tag:${t}`] = typeof count === "number" ? count : 0;
    }

    // 3. VERIFIED enforcement rows only.
    const { data: enf } = await supabase
      .from("enforcement_actions")
      .select("subject, regulator, jurisdiction, decision_date, law, violation, fine_eur, source_url, " + GATE_COLUMNS)
      .eq("verification_status", "verified")
      .not("subject", "is", null)
      .not("source_url", "is", null)
      .order("decision_date", { ascending: false })
      .limit(500);

    const verified_enforcement: EuVerifiedPrecedent[] = [];
    for (const r of (enf ?? []) as Record<string, any>[]) {
      // ITEM 354 surface gate — fail closed before any other consideration.
      if (!gateRow(r, { product: "cppa-risk" }).allowed) continue;
      const subject = String(r.subject ?? "").trim();
      const source_url = String(r.source_url ?? "").trim();
      // A row without a named subject is a corpus defect, not a precedent.
      if (!subject || subject.length > 160 || !source_url) continue;
      const provisions = parseProvisions(r.law, r.violation);
      if (!provisions.length) continue;
      verified_enforcement.push({
        subject,
        regulator: String(r.regulator ?? "").trim() || "not stated on the record",
        jurisdiction: String(r.jurisdiction ?? "").trim() || "not stated on the record",
        decision_date: String(r.decision_date ?? "").slice(0, 10),
        provisions,
        fine_eur: typeof r.fine_eur === "number" ? r.fine_eur : null,
        source_url,
        verification_status: "verified",
        authority_weight: "persuasive_non_binding",
      });
    }

    return {
      guidance_excerpts,
      oss_counts,
      verified_enforcement,
      fetched_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
