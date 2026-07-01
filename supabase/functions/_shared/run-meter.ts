// Shared metering + version-retention helper (Stage 1).
// Every generator calls this in the success path, ONCE, after the final
// report_data has been written. Errors here are logged and swallowed so
// they never break user-facing generation.
import { lockedSnapshot } from "./locked-fields.ts";

export async function recordRunMeterAndVersion(
  supabase: any,
  args: {
    toolType: string;
    assessmentId: string;
    userId: string | null;
    intake: Record<string, unknown>;
    reportData?: unknown;
    documentText?: string | null;
  },
): Promise<void> {
  const { toolType, assessmentId, userId, intake, reportData, documentText } = args;
  try {
    const { data: meter } = await supabase
      .from("tool_run_meter")
      .select("id, runs_used, locked_fields")
      .eq("tool_type", toolType)
      .eq("assessment_id", assessmentId)
      .maybeSingle();

    let nextVersion: number;
    if (!meter) {
      const { error: meterErr } = await supabase.from("tool_run_meter").insert({
        user_id: userId,
        tool_type: toolType,
        assessment_id: assessmentId,
        runs_allowed: 4,
        runs_used: 1,
        locked_fields: lockedSnapshot(toolType, intake ?? {}),
      });
      if (meterErr) {
        console.error(JSON.stringify({ evt: "run_meter_write_failed", tool: toolType, detail: meterErr.message }));
      }
      nextVersion = 1;
    } else {
      const { error: meterErr } = await supabase
        .from("tool_run_meter")
        .update({
          runs_used: (meter.runs_used ?? 0) + 1,
          ...(meter.locked_fields
            ? {}
            : { locked_fields: lockedSnapshot(toolType, intake ?? {}) }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", meter.id);
      if (meterErr) {
        console.error(JSON.stringify({ evt: "run_meter_write_failed", tool: toolType, detail: meterErr.message }));
      }
      nextVersion = (meter.runs_used ?? 0) + 1;
    }
    console.log(JSON.stringify({ evt: "run_meter_recorded", tool: toolType, assessment: assessmentId, version: nextVersion }));

    const { error: verErr } = await supabase.from("tool_run_versions").insert({
      user_id: userId,
      tool_type: toolType,
      assessment_id: assessmentId,
      version: nextVersion,
      intake_snapshot: intake ?? null,
      report_data: reportData ?? null,
      document_text: documentText ?? null,
    });
    if (verErr) {
      console.error(JSON.stringify({ evt: "run_version_insert_failed", tool: toolType, version: nextVersion, detail: verErr.message }));
    }

  } catch (err) {
    console.error(`[run-meter] failed for ${toolType}/${assessmentId}:`, err);
  }
}
