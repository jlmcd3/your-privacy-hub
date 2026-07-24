// C2-1 — FSOR-anchored interpretive-rule injection.
//
// Fetches cppa_fsor_commentary rows keyed to specific regulation citations
// and returns a formatted "AGENCY POSITIONS — FSOR ANCHORS" block that the
// generator injects beneath the corresponding hand rules at assembly time.
//
// Design principles:
//   - Warn-and-ship-unanchored when no row matches — the hand rule stays in
//     place; we simply do not append an agency-position annotation.
//   - Deterministic ordering (regulation_citation asc, then page_ref) so the
//     same intake yields the same block across runs.
//   - Never truncate mid-sentence (agency_position_summary is a full clause).
//
// Format:
//   AGENCY POSITIONS — FSOR ANCHORS (append the matching line beneath the
//   corresponding hand rule; if a rule has no matching row, ship the rule as
//   unanchored):
//   • Rule: <label>  (§ <citation>)
//     [Agency position — FSOR: <regulation_citation>, <fsor_package>, <page_ref>]:
//     <agency_position_summary>

const S = String.fromCharCode(167); // §

export interface FsorAnchorSpec {
  /** Human-readable rule label the injection sits beneath. */
  ruleLabel: string;
  /** Citations to fetch from cppa_fsor_commentary.regulation_citation. */
  citations: string[];
  /** Optional ilike filter on agency_position_summary (e.g. "%zero-trust%"). */
  summaryContains?: string;
  /** Max rows to include per rule (default 2). */
  maxRows?: number;
}

interface FsorRow {
  regulation_citation: string | null;
  page_ref: string | null;
  fsor_package: string | null;
  agency_position_summary: string | null;
}

async function fetchRows(
  supabase: any,
  spec: FsorAnchorSpec,
): Promise<FsorRow[]> {
  try {
    let q = supabase
      .from("cppa_fsor_commentary")
      .select("regulation_citation, page_ref, fsor_package, agency_position_summary")
      .in("regulation_citation", spec.citations)
      .not("agency_position_summary", "is", null);
    if (spec.summaryContains) {
      q = q.ilike("agency_position_summary", spec.summaryContains);
    }
    const { data, error } = await q.limit((spec.maxRows ?? 2) * 4);
    if (error) {
      console.warn(`[fsor-anchor] fetch failed for ${spec.ruleLabel}: ${error.message}`);
      return [];
    }
    return (data ?? []) as FsorRow[];
  } catch (e) {
    console.warn(`[fsor-anchor] unexpected error for ${spec.ruleLabel}: ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
}

function renderRow(r: FsorRow): string {
  const pkg = r.fsor_package ?? "package unknown";
  const page = r.page_ref ? `, ${r.page_ref}` : "";
  return `  [Agency position — FSOR: ${r.regulation_citation}, ${pkg}${page}]: ${r.agency_position_summary}`;
}

/**
 * Build an assembly-time injection block from a list of specs. Empty specs
 * (no matching rows) are logged with a warn-and-ship notice but omitted from
 * the block so the hand rule stays authoritative on its own.
 */
export async function buildFsorAnchorBlock(
  supabase: any,
  specs: FsorAnchorSpec[],
  header = "AGENCY POSITIONS — FSOR ANCHORS",
): Promise<string> {
  const parts: string[] = [];
  for (const spec of specs) {
    const rows = await fetchRows(supabase, spec);
    const max = spec.maxRows ?? 2;
    const picked = rows.slice(0, max);
    if (picked.length === 0) {
      console.warn(
        `[fsor-anchor] no FSOR row for rule "${spec.ruleLabel}" (citations: ${spec.citations.join(", ")}) — shipping unanchored`,
      );
      continue;
    }
    parts.push(`• Rule: ${spec.ruleLabel}\n${picked.map(renderRow).join("\n")}`);
  }
  if (parts.length === 0) return "";
  return `${header} (DRAFTING CONTEXT ONLY — NEVER echo the bracketed "[Agency position — FSOR: …]" format into report prose; weave the agency position into the analysis in plain language, citing the FSOR anchor in professional prose form, e.g. "The Agency's Final Statement of Reasons for § 7001(ddd) explains that …". Append the relevant agency position beneath the corresponding hand rule; if a rule has no matching row, ship the rule as unanchored):\n${parts.join("\n\n")}`;
}

/** ADMT spec set — advertising, gaming, human-involvement hand rules. */
export const ADMT_FSOR_ANCHOR_SPECS: FsorAnchorSpec[] = [
  {
    ruleLabel: `Rule 9 advertising exclusion (${S} 7001(ddd))`,
    citations: [`11 CCR ${S} 7001(ddd)`, `11 CCR ${S} 7001(ddd)(1)`],
    maxRows: 2,
  },
  {
    ruleLabel: `Rule 9 gaming / service-eligibility exclusion (${S} 7001(ddd))`,
    citations: [`11 CCR ${S} 7001(ddd)`, `11 CCR ${S} 7001(ddd)(6)`],
    maxRows: 2,
  },
  {
    ruleLabel: `Rule 13 human-involvement three-part test (${S} 7001(e)(1))`,
    citations: [`11 CCR ${S} 7001(e)(1)`, `11 CCR ${S} 7001(e)`],
    maxRows: 2,
  },
];

/** Cyber spec — zero-trust deletion note (FSOR Appendix p. 25). */
export const CYBER_ZERO_TRUST_FSOR_ANCHOR_SPECS: FsorAnchorSpec[] = [
  {
    ruleLabel: `Zero-trust deletion note (${S} 7123; FSOR Appendix p. 25)`,
    citations: [`11 CCR ${S} 7123`, `11 CCR ${S} 7123(c)`, `11 CCR ${S} 7123(c)(10)`],
    summaryContains: "%zero%trust%",
    maxRows: 2,
  },
];
