/**
 * ITEM 357 — CPPA-RISK CONFORMANCE CHECKS (pure, reusable).
 *
 * One implementation of every smoke check from Items 342/345/349/351/353/354,
 * plus the Item 357 additions. Pure functions over a PERSISTED payload so the
 * identical suite runs (a) harness-side in Deno tests and (b) against
 * live-persisted `report_data` from the deployed v2 function.
 */
import { INTERNAL_FORBIDDEN_TOKENS } from "../../../../supabase/functions/_shared/ltp/customer-projections.ts";
import {
  CPPA_RISK_SURFACE_CONTRACT,
  CPPA_RISK_REQUIRED_SURFACE_KEYS,
  CPPA_RISK_SURFACE_KEYS,
  INTERNAL_TOP_LEVEL_FORBIDDEN,
} from "./surface-contract.v2.ts";

export interface CheckResult { readonly name: string; readonly ok: boolean; readonly detail?: string }

function jsonType(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function customerSurface(r: Record<string, unknown>): Record<string, unknown> {
  const { _meta: _ignored, ...rest } = r;
  return rest;
}

export function runConformanceChecks(report: Record<string, unknown>): CheckResult[] {
  const out: CheckResult[] = [];
  const ok = (name: string, cond: boolean, detail?: string) =>
    out.push({ name, ok: cond, ...(cond ? {} : { detail }) });

  const keys = Object.keys(report);

  // ── SURFACE CONTRACT ──────────────────────────────────────────────
  const undeclared = keys.filter((k) => !CPPA_RISK_SURFACE_KEYS.includes(k));
  ok("no undeclared top-level key", undeclared.length === 0, `undeclared: ${JSON.stringify(undeclared)}`);

  const missing = CPPA_RISK_REQUIRED_SURFACE_KEYS.filter((k) => !keys.includes(k));
  ok("all required contract keys present", missing.length === 0, `missing: ${JSON.stringify(missing)}`);

  const typeErrors: string[] = [];
  for (const entry of CPPA_RISK_SURFACE_CONTRACT) {
    if (!(entry.key in report)) continue;
    const t = jsonType(report[entry.key]);
    if (!entry.types.includes(t)) typeErrors.push(`${entry.key}: expected ${entry.types.join("|")}, got ${t}`);
  }
  ok("every present key satisfies its declared contract type", typeErrors.length === 0, typeErrors.join("; "));

  // ── ITEM 357(2a) TELEMETRY RELOCATION ─────────────────────────────
  const leakedTelemetry = INTERNAL_TOP_LEVEL_FORBIDDEN.filter((k) => k in report);
  ok("no telemetry key at the top level", leakedTelemetry.length === 0, `top-level telemetry: ${JSON.stringify(leakedTelemetry)}`);

  const internal = ((report._meta as Record<string, unknown> | undefined)?.internal ?? {}) as Record<string, unknown>;
  ok("_meta.internal.engine_path === 'ltp'", internal.engine_path === "ltp", `engine_path=${JSON.stringify(internal.engine_path)}`);
  ok("_meta.internal.ltp telemetry present", !!internal.ltp && typeof internal.ltp === "object");

  // ── ITEM 357(2b) NO SILENT FALLBACK ───────────────────────────────
  const ltp = (internal.ltp ?? {}) as Record<string, unknown>;
  if (ltp.shipped_surface === "deterministic") {
    const reason = ltp.pass2r_skipped_reason;
    const rejections = Array.isArray(ltp.pass2r_attempt_rejections) ? ltp.pass2r_attempt_rejections : [];
    ok(
      "deterministic ship carries a recorded reason",
      (typeof reason === "string" && reason.length > 0) || rejections.length > 0,
      `shipped_surface=deterministic with pass2r_skipped_reason=${JSON.stringify(reason)} and ${rejections.length} rejections`,
    );
  } else {
    ok("shipped_surface is a known value", ltp.shipped_surface === "2R", `shipped_surface=${JSON.stringify(ltp.shipped_surface)}`);
  }

  // ── LEAK CHECKS (Item 351/353) ────────────────────────────────────
  const s = JSON.stringify(customerSurface(report));
  const leaked = INTERNAL_FORBIDDEN_TOKENS.filter((tok) => s.includes(tok));
  ok("no internal identifier on any customer surface", leaked.length === 0, `leaked: ${JSON.stringify(leaked)}`);
  ok("no info_emit_gate_* identifier on the customer surface", !s.includes("info_emit_gate_"));

  // ── RENDERED SCALARS (Item 353 FAILURE 1) ─────────────────────────
  const bands = ["Low", "Moderate", "High", "Critical", "Insufficient basis"];
  ok("risk_level is a human band", bands.includes(report.risk_level as string), `risk_level=${JSON.stringify(report.risk_level)}`);
  ok(
    "overall_score is a scalar or null",
    report.overall_score === null || typeof report.overall_score === "number",
    `overall_score=${JSON.stringify(report.overall_score)}`,
  );

  for (const key of ["risk_register", "top_risks"]) {
    const rows = report[key] as Record<string, unknown>[] | undefined;
    const shaped = Array.isArray(rows) && rows.length > 0 &&
      rows.every((r) => JSON.stringify(Object.keys(r).sort()) === JSON.stringify(["citation", "description", "status", "title"]));
    ok(`${key} entries are customer-shaped`, shaped, `${key}=${JSON.stringify(rows)?.slice(0, 300)}`);
  }

  const annotations = (report.annotations ?? []) as Record<string, unknown>[];
  ok(
    "annotations carry only title + citation",
    annotations.every((a) => JSON.stringify(Object.keys(a).sort()) === JSON.stringify(["citation", "title"])),
  );

  // ── PROSE QUALITY (Items 342/345/337) ─────────────────────────────
  const blocks = report.processing_narrative as unknown[] | undefined;
  const narrative = JSON.stringify(blocks ?? []);
  ok("processing_narrative non-empty", Array.isArray(blocks) && blocks.length > 0);
  ok("processing_narrative free of raw JSON", !/\\"[a-z_]+\\"\s*:/.test(narrative));
  ok("no unresolved registry placeholder", !narrative.includes("[registry:"));
  ok(
    "no placeholder artifact in prose",
    !narrative.includes("undefined") && !narrative.includes("[object Object]"),
  );

  const proseBundle = JSON.stringify([
    report.processing_narrative,
    report.record_sufficiency,
    report.executive_summary,
  ]).replace(/"[a-z_]+":/g, "");
  ok(
    "no snake_case field-name subjects in prose",
    !/\b[a-z]+_[a-z_]+\b(?=[^"]*(?:is|are)\s)/.test(proseBundle),
  );

  return out;
}

export function formatResults(label: string, results: CheckResult[]): string {
  const failed = results.filter((r) => !r.ok);
  const lines = [
    `${failed.length === 0 ? "PASSED" : "FAILED"} | ${results.length - failed.length} passed | ${failed.length} failed  [${label}]`,
    ...results.map((r) => `  ${r.ok ? "ok  " : "FAIL"} ${r.name}${r.ok ? "" : ` => ${r.detail ?? ""}`}`),
  ];
  return lines.join("\n");
}
