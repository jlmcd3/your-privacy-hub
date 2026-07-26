/**
 * FUTURE-BUILDING F0 — scenario-signature module
 * ----------------------------------------------
 * Deterministic hash over the DERIVATION-shaped facts of a run:
 *
 *   product + jurisdiction tags + canonical enum/band answers
 *   + free-text PRESENCE map (never content) + gate outcomes
 *
 * PRIVACY POSTURE (law of the program):
 *   - NO free-text content is ever hashed. `freeText` inputs are reduced
 *     to `{ [field]: boolean }` presence maps before hashing.
 *   - NO PI (names, emails, addresses, org names, ids) may be passed in.
 *     Callers must pre-strip to enum/band answers + gate outcomes.
 *   - Output signature is a SHA-256 hex string — non-invertible.
 *
 * DETERMINISM: object keys are sorted at every level; the canonical
 * string is stable across runs and never depends on JS insertion order.
 *
 * Deno-native (Web Crypto SubtleCrypto). No external deps.
 */

export interface ScenarioSignatureInput {
  readonly product: string;
  readonly jurisdictionTags: readonly string[];
  /** Canonical enum/band answers only — booleans, small enums, band strings, numbers. */
  readonly enums: Record<string, string | number | boolean | null>;
  /** Which free-text fields were provided. Values are IGNORED; only presence is hashed. */
  readonly freeText: Record<string, unknown>;
  /** Gate outcomes as {gate_id: "pass"|"block"|"not_applicable"}. */
  readonly gateOutcomes: Record<string, "pass" | "block" | "not_applicable">;
}

export interface ScenarioSignature {
  readonly hash: string;         // SHA-256 hex, 64 chars
  readonly canonical: string;    // canonical JSON that was hashed (kept for tests only; never persisted)
  readonly version: "sig-v1";
}

const BANNED_KEY_HINTS = [
  "name", "email", "phone", "address", "dob", "birth",
  "ssn", "tax_id", "user_id", "customer_id", "org_id",
];

function assertNoPIKeys(obj: Record<string, unknown>, source: string) {
  for (const k of Object.keys(obj)) {
    const lk = k.toLowerCase();
    for (const hint of BANNED_KEY_HINTS) {
      if (lk.includes(hint)) {
        throw new Error(
          `FUTURE-BUILDING signature: PI-shaped key "${k}" in ${source} — strip before hashing`,
        );
      }
    }
  }
}

function toPresenceMap(freeText: Record<string, unknown>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(freeText)) {
    if (v === undefined || v === null) { out[k] = false; continue; }
    if (typeof v === "string") { out[k] = v.trim().length > 0; continue; }
    if (Array.isArray(v)) { out[k] = v.length > 0; continue; }
    if (typeof v === "object") { out[k] = Object.keys(v as object).length > 0; continue; }
    out[k] = Boolean(v);
  }
  return out;
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(src).sort()) out[k] = sortDeep(src[k]);
    return out;
  }
  return value;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

export async function computeScenarioSignature(
  input: ScenarioSignatureInput,
): Promise<ScenarioSignature> {
  assertNoPIKeys(input.enums, "enums");
  assertNoPIKeys(input.freeText, "freeText");

  const canonicalObj = sortDeep({
    product: String(input.product),
    jurisdictionTags: [...input.jurisdictionTags].map(String).sort(),
    enums: input.enums,
    freeTextPresence: toPresenceMap(input.freeText),
    gateOutcomes: input.gateOutcomes,
    version: "sig-v1",
  });

  const canonical = JSON.stringify(canonicalObj);
  const hash = await sha256Hex(canonical);
  return { hash, canonical, version: "sig-v1" };
}
