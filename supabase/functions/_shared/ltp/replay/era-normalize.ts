/**
 * ITEM 269 FIX 1 — ERA NORMALIZER (harness load path).
 *
 * PORT BY REUSE — NO new semantic mappings are invented here.
 *
 * The 26 ramp-3 write-arounds were all pre-realignment (2026-07-11→13)
 * archive rows carrying the FIVE-STAGE intake shape
 * (`triggers` / `org_context` / `annual_consumer_volume` / `impact` /
 * `activity_details` / `exceptions`) and ZERO modern flat contract keys.
 * The LTP contract-derived ledger (`_shared/ltp/derive.ts` LEDGER_KEYS,
 * built from `cppaRiskContract.fields[].key`) reads FLAT keys, so those
 * rows produced an empty ledger → model refs dropped → coherence
 * rewrites → mass-absence abort.
 *
 * VERIFY-FIRST anchors (the production-path normalization we reuse):
 *   • `_shared/cppa-risk-normalise.ts:282` resolveIntakeForTestStates —
 *     the ONLY existing five-stage → flat key-name mapping in the tree.
 *     It synthesises `rawForStates` (lines 301-316) with exactly these
 *     flat keys: q1_revenue, q2_consumers, q5_sell_share,
 *     q5c_share_revenue_50pct, q15_sensitive_pi, q15c_spi_volume,
 *     q15b_under16_knowledge, q5b_profiling_observation, q18_admt_use,
 *     q18b_admt_training, exceptions_intake.
 *   • `_shared/bands/revenue-consumer.ts:110/120` resolveRevenueBand /
 *     resolveConsumerBand — V1→V2 band-label resolution
 *     (BAND-REALIGNMENT-T2A), already wired into
 *     `cppa-risk-normalise.ts:44` computeBandResolution.
 *
 * RESIDUAL GAP (reported, NOT invented): no existing code maps the
 * narrative contract fields (i1_processing_purpose, i2_*, i4_*, i6_*,
 * i7_*, i9_*, q3_sector, q4_pi_categories, entity_name, impact_intake,
 * …) from the five-stage shape back to flat contract keys, and
 * `q1_revenue` is deliberately NOT back-filled from
 * `org_context.annual_revenue_threshold` (RC-A A5 single-truth rule,
 * `cppa-risk-normalise.ts:302`). Those keys therefore stay MISSING —
 * omission over invention. Era docs that remain incompatible are
 * excluded from acceptance scoring with the exclusion documented in
 * docs/courier/ITEM269-ERA-NORMALIZER-AND-FOSSIL-RULE-2026-07-30.md.
 *
 * Fail-open: any internal error returns the raw intake untouched.
 */
import { resolveIntakeForTestStates } from "../../cppa-risk-normalise.ts";
import {
  CONSUMER_BANDS_V2,
  REVENUE_BANDS_V2,
  resolveConsumerBand,
  resolveRevenueBand,
} from "../../bands/revenue-consumer.ts";

export const ERA_NORMALIZER_VERSION = "era-normalize@2026-07-30-item269";

/** Flat keys the reused production mapping is able to synthesise. */
export const ERA_MAPPED_KEYS: readonly string[] = [
  "q1_revenue",
  "q2_consumers",
  "q5_sell_share",
  "q5c_share_revenue_50pct",
  "q15_sensitive_pi",
  "q15c_spi_volume",
  "q15b_under16_knowledge",
  "q5b_profiling_observation",
  "q18_admt_use",
  "q18b_admt_training",
  "exceptions_intake",
];

/** Five-stage container keys that have no flat contract equivalent. */
const FIVE_STAGE_KEYS: readonly string[] = [
  "triggers",
  "exceptions",
  "activity_details",
  "impact",
  "org_context",
  "annual_consumer_volume",
  "content_detail",
];

export interface EraNormalizationTelemetry {
  readonly version: string;
  readonly applied: boolean;
  readonly mapped_keys: number;
  readonly mapped_key_names: readonly string[];
  readonly unmapped_legacy_keys: readonly string[];
  readonly band_labels_resolved: readonly string[];
}

export interface EraNormalizationResult {
  readonly intake: Record<string, unknown>;
  readonly telemetry: EraNormalizationTelemetry;
}

function isDefined(v: unknown): boolean {
  return v !== undefined && v !== null && v !== "";
}

/**
 * Apply the production five-stage → flat normalization to an archived
 * intake. Modern (already-flat) intakes are returned untouched with
 * `applied:false`.
 */
export function normalizeEraIntake(
  raw: Record<string, unknown>,
): EraNormalizationResult {
  const empty: EraNormalizationTelemetry = {
    version: ERA_NORMALIZER_VERSION,
    applied: false,
    mapped_keys: 0,
    mapped_key_names: [],
    unmapped_legacy_keys: [],
    band_labels_resolved: [],
  };
  if (!raw || typeof raw !== "object") return { intake: raw ?? {}, telemetry: empty };
  // Era detection: five-stage shape present. `triggers` is the same
  // discriminator `normaliseIntake` itself uses (cppa-risk-normalise.ts:234).
  if (!("triggers" in raw)) return { intake: raw, telemetry: empty };

  try {
    const { rawForStates } = resolveIntakeForTestStates(raw);
    const out: Record<string, unknown> = { ...raw };
    const mapped: string[] = [];
    for (const k of ERA_MAPPED_KEYS) {
      const v = (rawForStates as Record<string, unknown>)[k];
      if (k in raw) continue; // pass through untouched
      if (!isDefined(v)) continue; // genuinely missing stays missing
      out[k] = v;
      mapped.push(k);
    }

    // V1→V2 band-label resolution (reused resolvers).
    const bandsResolved: string[] = [];
    const rev = out.q1_revenue;
    if (typeof rev === "string" && !(REVENUE_BANDS_V2 as readonly string[]).includes(rev)) {
      const r = resolveRevenueBand(rev);
      if (r) {
        out.q1_revenue = r;
        bandsResolved.push(`q1_revenue: ${rev} -> ${r}`);
      }
    }
    const con = out.q2_consumers;
    if (typeof con === "string" && !(CONSUMER_BANDS_V2 as readonly string[]).includes(con)) {
      const c = resolveConsumerBand(con);
      if (c) {
        out.q2_consumers = c;
        bandsResolved.push(`q2_consumers: ${con} -> ${c}`);
      }
    }

    const unmapped = Object.keys(raw).filter((k) => FIVE_STAGE_KEYS.includes(k));

    return {
      intake: out,
      telemetry: {
        version: ERA_NORMALIZER_VERSION,
        applied: true,
        mapped_keys: mapped.length,
        mapped_key_names: mapped,
        unmapped_legacy_keys: unmapped,
        band_labels_resolved: bandsResolved,
      },
    };
  } catch (_e) {
    return { intake: raw, telemetry: { ...empty, applied: false } };
  }
}
