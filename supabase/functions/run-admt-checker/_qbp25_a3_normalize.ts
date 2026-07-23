// QB-P25 A3 normalizer — extracted from run-admt-checker/index.ts so B0-a can
// exercise it directly. Behavior is preserved bit-for-bit; the inline block in
// index.ts now delegates here.
//
// Responsibilities (in order):
//   1. determination_basis: default missing/invalid → "established" (legacy runs
//      remain FULL-mode by fiat).
//   2. enforcement_exposure (FULL mode): coerce every gap entry to the
//      three-enum vocabulary { per_violation | per_consumer_scalable | na },
//      disambiguated by ca_consumer_count presence.
//   3. COMPACT mode (determination_basis === "conservative_assumption"): strip
//      each gap entry to { element_id, element, duty_if_in_scope, citation }
//      and synthesize duty_if_in_scope from remediation/finding/element when
//      the model omitted it (legacy-shape fallback).

export const COMPACT_KEYS = new Set([
  "element_id",
  "element",
  "duty_if_in_scope",
  "citation",
]);

export const EXPOSURE_ENUM = new Set([
  "per_violation",
  "per_consumer_scalable",
  "na",
]);

export interface Qbp25A3NormalizeResult {
  detBasis: "established" | "conservative_assumption";
  detBasisDefaulted: boolean;
  compactStripped: number;
  exposureCoerced: number;
  dutySynthesized: number;
}

/** Return true when ca_consumer_count is a non-empty, non-"not provided" value. */
export function hasCaConsumerCount(caConsumerCount: unknown): boolean {
  const s = String(caConsumerCount ?? "").trim();
  return s.length > 0 && !/not\s+provided/i.test(s);
}

/** Coerce a single enforcement_exposure value to the three-enum vocabulary. */
export function coerceExposure(
  v: unknown,
  status: string,
  hasCaCount: boolean,
): "per_violation" | "per_consumer_scalable" | "na" {
  if (typeof v === "string" && EXPOSURE_ENUM.has(v)) {
    return v as "per_violation" | "per_consumer_scalable" | "na";
  }
  if (status === "compliant") return "na";
  return hasCaCount ? "per_consumer_scalable" : "per_violation";
}

/**
 * Apply the QB-P25 A3 normalization pass in place on `report`.
 * `intake` is inspected only for `ca_consumer_count` (exposure disambiguation).
 */
export function normalizeQbp25A3(
  report: any,
  intake: Record<string, unknown> | undefined | null,
): Qbp25A3NormalizeResult {
  const result: Qbp25A3NormalizeResult = {
    detBasis: "established",
    detBasisDefaulted: false,
    compactStripped: 0,
    exposureCoerced: 0,
    dutySynthesized: 0,
  };

  const sa = report?.scope_analysis;
  if (sa && typeof sa === "object") {
    const dbRaw = String(sa.determination_basis ?? "").trim();
    if (dbRaw !== "established" && dbRaw !== "conservative_assumption") {
      sa.determination_basis = "established";
      result.detBasisDefaulted = true;
    }
  }
  result.detBasis =
    (report?.scope_analysis?.determination_basis as
      | "established"
      | "conservative_assumption") ?? "established";

  const hasCaCount = hasCaConsumerCount(
    (intake as any)?.ca_consumer_count,
  );

  for (const key of ["notice_gaps", "opt_out_gaps", "access_gaps"]) {
    const arr = report?.[key];
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      if (!it || typeof it !== "object") continue;
      if (result.detBasis === "conservative_assumption") {
        if (
          typeof it.duty_if_in_scope !== "string" ||
          !it.duty_if_in_scope.trim()
        ) {
          const src = String(
            it.remediation ?? it.finding ?? it.element ?? "",
          ).trim();
          it.duty_if_in_scope = src
            ? src.split(/(?<=[.!?])\s/)[0]
            : String(it.element ?? "");
          result.dutySynthesized++;
        }
        for (const k of Object.keys(it)) {
          if (!COMPACT_KEYS.has(k)) {
            delete it[k];
            result.compactStripped++;
          }
        }
        if (!("citation" in it)) it.citation = "";
      } else {
        const coerced = coerceExposure(
          it.enforcement_exposure,
          String(it.status ?? ""),
          hasCaCount,
        );
        if (it.enforcement_exposure !== coerced) {
          it.enforcement_exposure = coerced;
          result.exposureCoerced++;
        }
      }
    }
  }

  return result;
}
