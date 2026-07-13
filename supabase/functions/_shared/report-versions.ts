// RC-A A2 — Prior-report snapshotting. Called from regenerate-assessment
// immediately before it overwrites report_data. First-run writes have no
// prior report and therefore no snapshot to take.
//
// TWO-RAILS NOTE (RC-C2.2) — This is the CONTENT-HISTORY rail:
// `report_versions` holds the prior report_data snapshotted BEFORE each
// revision overwrite (keyed by version_n, one row per revision attempt that
// finds a non-empty prior report). The METER rail is `tool_run_versions`,
// written by supabase/functions/_shared/run-meter.ts, and stores
// intake_snapshot + build_info per successful generator run. They are
// independent; don't conflate. Debugging apply history → this table.
// Debugging meter/entitlement → tool_run_versions.
//
// TABLE_MAP mirrors regenerate-assessment's; kept local to avoid a circular
// import.
const TABLE_MAP: Record<string, string> = {
  li_assessment: "li_assessments",
  governance_assessment: "governance_assessments",
  dpia_framework: "dpia_frameworks",
  dpa_generator: "dpa_documents",
  ir_playbook: "ir_playbooks",
  biometric_checker: "biometric_assessments",
  cppa_admt: "cppa_assessments",
  cppa_risk_assessment: "cppa_assessments",
  cppa_cybersecurity: "cppa_assessments",
};

export async function snapshotPriorReport(
  supabase: any,
  args: { toolType: string; assessmentId: string; ownerUserId: string | null },
): Promise<{ snapshotted: boolean; version_n?: number; error?: string }> {
  try {
    const table = TABLE_MAP[args.toolType];
    if (!table) return { snapshotted: false, error: "unknown_tool" };
    const { data: row } = await supabase
      .from(table)
      .select("report_data")
      .eq("id", args.assessmentId)
      .maybeSingle();
    const prior = row?.report_data;
    if (!prior || (typeof prior === "object" && Object.keys(prior).length === 0)) {
      return { snapshotted: false };
    }
    const { data: maxRow } = await supabase
      .from("report_versions")
      .select("version_n")
      .eq("tool_type", args.toolType)
      .eq("assessment_id", args.assessmentId)
      .order("version_n", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = ((maxRow?.version_n as number) ?? 0) + 1;
    const openItems = {
      information_needed: (prior as any)?.information_needed ?? null,
      inconsistency_flags: (prior as any)?.inconsistency_flags ?? null,
    };
    const { error } = await supabase.from("report_versions").insert({
      tool_type: args.toolType,
      assessment_id: args.assessmentId,
      owner_user_id: args.ownerUserId,
      version_n: nextVersion,
      report_data: prior,
      open_items_snapshot: openItems,
    });
    if (error) {
      console.error(JSON.stringify({ evt: "report_version_insert_failed", detail: error.message }));
      return { snapshotted: false, error: error.message };
    }
    console.log(JSON.stringify({ evt: "report_version_snapshotted", tool: args.toolType, assessment: args.assessmentId, version_n: nextVersion }));
    return { snapshotted: true, version_n: nextVersion };
  } catch (e: any) {
    console.error("[report-versions] snapshot failed:", e?.message ?? e);
    return { snapshotted: false, error: e?.message ?? "unknown" };
  }
}
