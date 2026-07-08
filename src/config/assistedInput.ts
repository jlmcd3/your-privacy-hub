/**
 * Assisted-input pill snippet registry.
 *
 * Doc U v2 sec 2.3 + v3 sec A4 (all-product scope) + v3.1 amendments.
 *
 * Purpose: per-field curated pill snippet sets that a downstream
 * consumer (product intake page) attaches to an <AssistedInput>
 * instance. This module intentionally ships EMPTY: individual
 * product wiring prompts (U3-2, U3-3a/b/c) add their signed-off pill
 * sets verbatim from the product-specific sign-off packs.
 *
 * CONTENT RULES for any future pill added here (Doc U v2 sec 2.3):
 *   - Descriptive and neutral. No "best practice" / advisory framing.
 *   - No legal conclusions.
 *   - "Not documented / not known" options are preferred where truthful.
 *   - The word "gap" may never appear in any pill label or snippet.
 *   - Max 6 pills per field.
 *
 * PLACEHOLDER-LEAK CLASS (v3.1 AM-2): structure-template snippets
 * containing "[N]" (or any "[...]" token) are handled by the
 * <AssistedInput> component -- on append, the first slot is
 * auto-selected; unresolved slots produce a frontend-only warning.
 */

export interface AssistedInputPill {
  /** Stable id, unique within a field's pill set. */
  id: string;
  /** Short user-facing label rendered inside the pill button. */
  label: string;
  /**
   * Verbatim text appended to the field value when the pill is
   * tapped. When multiple pills are active, snippets are joined
   * with the field's `separator` (default "; ").
   */
  snippet: string;
  /**
   * Optional keyword tags (e.g. Risk C2 categories) preserved as
   * code comments in product sign-off packs; verified by tests but
   * not user-visible.
   */
  keywords?: readonly string[];
}

export interface AssistedInputFieldConfig {
  /** Intake key id this pill set is attached to. */
  fieldId: string;
  /** Curated pill snippets (max 6). */
  pills: readonly AssistedInputPill[];
  /**
   * Snippet separator for list-style fields. Default "; ".
   * Non-list narrative fields may pass "\n\n".
   */
  separator?: string;
}

/**
 * Per-product wiring prompts extend this registry via per-product
 * config files (e.g. src/config/assistedInput/risk.ts) as their
 * signed-off packs land.
 */
import { RISK_PILOT_ASSISTED_INPUT } from "./assistedInput/risk";
import { ADMT_PILOT_ASSISTED_INPUT } from "./assistedInput/admt";
import { DPIA_PILOT_ASSISTED_INPUT } from "./assistedInput/dpia";
import { LIA_PILOT_ASSISTED_INPUT } from "./assistedInput/lia";

export const ASSISTED_INPUT_REGISTRY: Readonly<
  Record<string, AssistedInputFieldConfig>
> = Object.freeze({
  ...RISK_PILOT_ASSISTED_INPUT,
  ...ADMT_PILOT_ASSISTED_INPUT,
  ...DPIA_PILOT_ASSISTED_INPUT,
  ...LIA_PILOT_ASSISTED_INPUT,
});

/**
 * Regex matching any unresolved "[...]" slot token from a pill
 * snippet (e.g. "[N]", "[YEAR]", "[VENDOR NAME]"). Component uses
 * this for cursor placement on append and for the inline warning
 * when a step advances with unresolved slots.
 */
export const SLOT_TOKEN_RE = /\[[^\]\n]{1,40}\]/;
export const SLOT_TOKEN_RE_G = /\[[^\]\n]{1,40}\]/g;

/** v3.1 AM-2 warning text. Frontend-only; no submit blocking. */
export const SLOT_WARNING_TEXT =
  "Replace the [N] placeholder with your actual value.";
