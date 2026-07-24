// C2-2 — Corpus-driven CPPA deadline registry + drift-lint.
//
// Provides an assembly-time block of canonical CPPA compliance deadlines
// sourced from the cppa_deadlines table, plus a startup drift-lint that
// compares ONE retained hand literal per consumer (admt, risk) against the
// corpus so silent drift is loud.
//
// Design:
//   - HAND_LITERALS keeps the one-literal-per-file anchor (per courier).
//     Each entry names the primary_authority_citation the tool anchors to
//     and the ISO date the tool's prose currently hard-quotes. Drift-lint
//     matches on primary_authority_citation and diffs compliance_deadline
//     against the literal ISO date.
//   - buildCppaDeadlineBlock(supabase, keys) returns a formatted block for
//     injection alongside the tool's system content.
//   - verifyCppaDeadlineDrift(supabase) fires once per warm instance;
//     warn-only, never throws.

const S = String.fromCharCode(167); // §

export type ToolKey = "admt" | "risk" | "cyber";

/**
 * ONE retained hand literal per consumer tool. When corpus and literal
 * diverge, the drift-lint warns loudly. Update BOTH the literal here and
 * the tool's prose in the same turn to clear the warning.
 */
export const CPPA_DEADLINE_HAND_LITERALS: Record<ToolKey, Array<{
  citation: string;
  iso_date: string;
  human_note: string;
}>> = {
  admt: [{
    citation: `11 CCR ${S} 7220`,
    iso_date: "2027-01-01",
    human_note: "ADMT pre-use notice compliance date (existing use)",
  }],
  risk: [{
    citation: `11 CCR ${S} 7155`,
    iso_date: "2027-12-31",
    human_note: "Risk assessment for ongoing processing — § 7155(b)",
  }],
  cyber: [{
    citation: `11 CCR ${S} 7121`,
    iso_date: "2028-04-01",
    human_note: "Cybersecurity audit — Tier 1 (>$100M) certification",
  }],
};

interface DeadlineRow {
  obligation: string;
  compliance_deadline: string | null;
  primary_authority_citation: string | null;
  revenue_tier: string | null;
  status: string | null;
}

async function fetchDeadlines(
  supabase: any,
  citations: string[],
): Promise<DeadlineRow[]> {
  try {
    const { data, error } = await supabase
      .from("cppa_deadlines")
      .select("obligation, compliance_deadline, primary_authority_citation, revenue_tier, status")
      .in("primary_authority_citation", citations);
    if (error) {
      console.warn(`[cppa-deadline-registry] fetch failed: ${error.message}`);
      return [];
    }
    return (data ?? []) as DeadlineRow[];
  } catch (e) {
    console.warn(`[cppa-deadline-registry] unexpected error: ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
}

/**
 * Assembly-time block. Returns "" when the corpus supplies no rows for the
 * requested citations (warn-and-ship: hand literals in the prompt still fire).
 */
export async function buildCppaDeadlineBlock(
  supabase: any,
  tool: ToolKey,
  extraCitations: string[] = [],
): Promise<string> {
  const seed = CPPA_DEADLINE_HAND_LITERALS[tool].map((h) => h.citation);
  const citations = Array.from(new Set([...seed, ...extraCitations]));
  const rows = await fetchDeadlines(supabase, citations);
  if (rows.length === 0) {
    console.warn(`[cppa-deadline-registry] no corpus rows for ${tool} (${citations.join(", ")}) — shipping with hand literals only`);
    return "";
  }
  const lines = rows
    .filter((r) => r.compliance_deadline && r.primary_authority_citation)
    .sort((a, b) => (a.compliance_deadline ?? "").localeCompare(b.compliance_deadline ?? ""))
    .map((r) => {
      const tier = r.revenue_tier ? ` (${r.revenue_tier})` : "";
      return `  - ${r.primary_authority_citation}: ${r.compliance_deadline} — ${r.obligation}${tier}`;
    });
  return `CPPA CANONICAL DEADLINES (corpus-sourced from cppa_deadlines; use these ISO dates when quoting a compliance deadline):\n${lines.join("\n")}`;
}

/**
 * Startup drift-lint. Fires once per warm instance. Never throws.
 * Compares each HAND_LITERAL against the corpus row for its citation +
 * revenue_tier (when specified) and warns on mismatch.
 */
const _linted = new Set<ToolKey>();

export async function verifyCppaDeadlineDrift(
  supabase: any,
  tool: ToolKey,
): Promise<void> {
  if (_linted.has(tool)) return;
  _linted.add(tool);
  try {
    const literals = CPPA_DEADLINE_HAND_LITERALS[tool];
    const rows = await fetchDeadlines(
      supabase,
      literals.map((l) => l.citation),
    );
    for (const lit of literals) {
      const matches = rows.filter((r) => r.primary_authority_citation === lit.citation);
      if (matches.length === 0) {
        console.warn(
          `[deadline-drift] ${tool}: HAND_LITERAL ${lit.citation}=${lit.iso_date} has NO corpus row — corpus may be missing this deadline`,
        );
        continue;
      }
      const anyMatch = matches.some((r) => r.compliance_deadline === lit.iso_date);
      if (!anyMatch) {
        const corpusDates = matches.map((r) => r.compliance_deadline).join(", ");
        console.warn(
          `[deadline-drift] ${tool}: HAND_LITERAL ${lit.citation}=${lit.iso_date} MISMATCH corpus [${corpusDates}] — reconcile before next batch`,
        );
      }
    }
  } catch (e) {
    console.warn(`[deadline-drift] ${tool} lint error: ${e instanceof Error ? e.message : String(e)}`);
  }
}
