// RC-B B5 — Provision store. CLOSED-SET rule: verbatim excerpt renders ONLY
// when status='approved'. Unknown keys auto-insert a pending row and render
// citation-only + "provision text pending verification".
// Type-only shim. The Deno runtime erases type imports, and the app-side
// tsconfig cannot resolve the esm.sh specifier, so the two call shapes this
// module actually uses are declared structurally instead.
type SupabaseClient = { from: (table: string) => any };

export interface ProvisionRenderResult {
  key: string;
  status: "pending" | "approved" | "unknown_inserted";
  citation: string | null;
  excerpt: string | null;
  plain_requirements: unknown[] | null;
  pending_notice?: string;
}

export const PROVISION_PENDING_NOTICE = "Provision text pending verification.";

export async function resolveProvisionForRender(
  supabase: SupabaseClient,
  key: string,
  fallbackCitation?: string,
): Promise<ProvisionRenderResult> {
  const { data } = await supabase
    .from("provision_texts")
    .select("key, citation, verbatim_excerpt, plain_requirements, status")
    .eq("key", key)
    .maybeSingle();

  if (data) {
    if (data.status === "approved" && data.verbatim_excerpt) {
      return {
        key,
        status: "approved",
        citation: data.citation,
        excerpt: data.verbatim_excerpt,
        plain_requirements: (data.plain_requirements as unknown[]) ?? [],
      };
    }
    return {
      key,
      status: "pending",
      citation: data.citation,
      excerpt: null,
      plain_requirements: null,
      pending_notice: PROVISION_PENDING_NOTICE,
    };
  }

  // Unknown key → auto-insert pending row (idempotent upsert).
  await supabase
    .from("provision_texts")
    .upsert(
      { key, citation: fallbackCitation ?? key, status: "pending" },
      { onConflict: "key", ignoreDuplicates: true },
    );

  return {
    key,
    status: "unknown_inserted",
    citation: fallbackCitation ?? key,
    excerpt: null,
    plain_requirements: null,
    pending_notice: PROVISION_PENDING_NOTICE,
  };
}

// Seed keys from existing canonical registries. Content is Legal's — excerpts stay empty.
export async function seedProvisionRegistry(supabase: SupabaseClient): Promise<{ inserted: number }> {
  const rows: Array<{ key: string; citation: string; jurisdiction?: string }> = [];

  // GDPR core surfaces referenced across generators.
  const gdprCore = [
    ["gdpr-art-5-1-a", "GDPR Art. 5(1)(a)", "EU"],
    ["gdpr-art-5-1-b", "GDPR Art. 5(1)(b)", "EU"],
    ["gdpr-art-5-1-c", "GDPR Art. 5(1)(c)", "EU"],
    ["gdpr-art-6-1-f", "GDPR Art. 6(1)(f)", "EU"],
    ["gdpr-art-9", "GDPR Art. 9", "EU"],
    ["gdpr-art-13", "GDPR Art. 13", "EU"],
    ["gdpr-art-14", "GDPR Art. 14", "EU"],
    ["gdpr-art-22", "GDPR Art. 22", "EU"],
    ["gdpr-art-25", "GDPR Art. 25", "EU"],
    ["gdpr-art-28", "GDPR Art. 28", "EU"],
    ["gdpr-art-30", "GDPR Art. 30", "EU"],
    ["gdpr-art-32", "GDPR Art. 32", "EU"],
    ["gdpr-art-33", "GDPR Art. 33", "EU"],
    ["gdpr-art-34", "GDPR Art. 34", "EU"],
    ["gdpr-art-35", "GDPR Art. 35", "EU"],
    ["gdpr-art-36", "GDPR Art. 36", "EU"],
    ["gdpr-art-44", "GDPR Art. 44", "EU"],
    ["gdpr-art-46", "GDPR Art. 46", "EU"],
  ];
  for (const [k, c, j] of gdprCore) rows.push({ key: k, citation: c, jurisdiction: j });

  // CPPA core § cites (ADMT / Risk / Cyber).
  const cppaCore = [
    ["cppa-7002", "CCPA Regs § 7002", "US-CA"],
    ["cppa-7012", "CCPA Regs § 7012", "US-CA"],
    ["cppa-7050", "CCPA Regs § 7050", "US-CA"],
    ["cppa-7120", "CCPA Regs § 7120 (Cybersecurity Audits — Applicability)", "US-CA"],
    ["cppa-7121", "CCPA Regs § 7121", "US-CA"],
    ["cppa-7122", "CCPA Regs § 7122 (Thoroughness and Independence)", "US-CA"],
    ["cppa-7123", "CCPA Regs § 7123 (Audit Scope and Report)", "US-CA"],
    ["cppa-7124", "CCPA Regs § 7124 (Certification)", "US-CA"],
    ["cppa-7150", "CCPA Regs § 7150 (Risk Assessments)", "US-CA"],
    ["cppa-7151", "CCPA Regs § 7151", "US-CA"],
    ["cppa-7152", "CCPA Regs § 7152", "US-CA"],
    ["cppa-7153", "CCPA Regs § 7153", "US-CA"],
    ["cppa-7154", "CCPA Regs § 7154", "US-CA"],
    ["cppa-7155", "CCPA Regs § 7155", "US-CA"],
    ["cppa-7156", "CCPA Regs § 7156", "US-CA"],
    ["cppa-7157", "CCPA Regs § 7157", "US-CA"],
    ["cppa-7200", "CCPA Regs § 7200 (ADMT)", "US-CA"],
    ["cppa-7220", "CCPA Regs § 7220", "US-CA"],
    ["cppa-7221", "CCPA Regs § 7221", "US-CA"],
    ["cppa-7222", "CCPA Regs § 7222", "US-CA"],
    ["ccpa-1798-100", "Cal. Civ. Code § 1798.100", "US-CA"],
    ["ccpa-1798-105", "Cal. Civ. Code § 1798.105", "US-CA"],
    ["ccpa-1798-110", "Cal. Civ. Code § 1798.110", "US-CA"],
    ["ccpa-1798-120", "Cal. Civ. Code § 1798.120", "US-CA"],
    ["ccpa-1798-121", "Cal. Civ. Code § 1798.121", "US-CA"],
    ["ccpa-1798-140", "Cal. Civ. Code § 1798.140", "US-CA"],
    ["ccpa-1798-150", "Cal. Civ. Code § 1798.150", "US-CA"],
  ];
  for (const [k, c, j] of cppaCore) rows.push({ key: k, citation: c, jurisdiction: j });

  if (rows.length === 0) return { inserted: 0 };

  const { data, error } = await supabase
    .from("provision_texts")
    .upsert(
      rows.map((r) => ({ ...r, status: "pending", verbatim_excerpt: "", plain_requirements: [] })),
      { onConflict: "key", ignoreDuplicates: true },
    )
    .select("key");

  if (error) throw error;
  return { inserted: Array.isArray(data) ? data.length : 0 };
}
