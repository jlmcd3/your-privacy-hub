// BIO-REG-W1 T2(a) — registry selector + prompt renderer + citation validator.
//
// Pure functions consumed by check-biometric-compliance/index.ts. No I/O.

import {
  BIOMETRIC_STATUTE_REGISTRY,
  BIOMETRIC_REGISTRY_JURISDICTIONS,
  BIOMETRIC_REGISTRY_VERSION,
  type BiometricStatuteRow,
} from "./biometric-statute-registry.ts";

export { BIOMETRIC_REGISTRY_VERSION };

// ── Intake shape (structural, tolerant) ────────────────────────────────
export type BiometricRegistryIntake = {
  jurisdictions?: string[];
  other_state_names?: string;
  biometricTypes?: string[];
  generation_date?: string; // ISO YYYY-MM-DD; defaults to today
};

// Map an intake biometric-type label to a predicate token.
function typeTokens(types: string[] | undefined): Set<string> {
  const out = new Set<string>();
  for (const t of types ?? []) {
    const s = t.toLowerCase();
    if (/facial|face/.test(s)) out.add("facial");
    if (/fingerprint|palm/.test(s)) out.add("fingerprint");
    if (/voice|speaker/.test(s)) out.add("voice");
    if (/iris|retina/.test(s)) out.add("iris");
    if (/hand geometry|hand_geometry/.test(s)) out.add("hand_geometry");
    if (/vein/.test(s)) out.add("vein");
    if (/gait/.test(s)) out.add("gait");
  }
  return out;
}

// Resolve the intake's named jurisdictions (Wave-1 registry only) into the
// set of `jurisdiction_id`s that are IN the registry.
export type ResolvedJurisdictions = {
  registered: Array<{
    jurisdiction_id: BiometricStatuteRow["jurisdiction_id"];
    display: string;
    source: "direct_selection" | "other_state_names";
  }>;
  namedButUnregistered: string[]; // free-text state names not in Wave-1
  otherUsStateSelectedButNoNames: boolean;
};

export function resolveJurisdictions(
  intake: BiometricRegistryIntake,
): ResolvedJurisdictions {
  const registered: ResolvedJurisdictions["registered"] = [];
  const namedButUnregistered: string[] = [];
  const seen = new Set<string>();
  const push = (
    id: BiometricStatuteRow["jurisdiction_id"],
    source: "direct_selection" | "other_state_names",
  ) => {
    if (seen.has(id)) return;
    seen.add(id);
    registered.push({
      jurisdiction_id: id,
      display: BIOMETRIC_REGISTRY_JURISDICTIONS[id].display,
      source,
    });
  };

  const jurs = (intake.jurisdictions ?? []).map((j) => j.toLowerCase());
  if (jurs.some((j) => j.includes("illinois") || j.includes("bipa"))) {
    push("us_il_bipa", "direct_selection");
  }
  if (jurs.some((j) => j.includes("texas") || j.includes("cubi"))) {
    push("us_tx_cubi", "direct_selection");
  }
  if (jurs.some((j) => j.includes("washington"))) {
    push("us_wa_hb1493", "direct_selection");
  }
  // BIO-REG-W1-S2 — direct-selection hooks for Wave-2 jurisdictions. The
  // biometric intake JURS enum does not (yet) list CA / NY / AR discretely,
  // so these fire when the user pastes a matching label; the Other US state
  // free-text path continues to resolve via BIOMETRIC_REGISTRY_JURISDICTIONS
  // state_names below.
  if (jurs.some((j) => j.includes("california") || j.includes("ccpa") || j.includes("cpra"))) {
    push("us_ca_cpra", "direct_selection");
  }
  if (jurs.some((j) => j.includes("new york") || j.includes("shield"))) {
    push("us_ny_shield", "direct_selection");
  }
  if (jurs.some((j) => j.includes("arkansas"))) {
    push("us_ar_pipa", "direct_selection");
  }

  const isOtherUs = jurs.some((j) => j.includes("other us"));
  const namedRaw = (intake.other_state_names ?? "").trim();
  const otherUsStateSelectedButNoNames = isOtherUs && namedRaw.length === 0;

  if (isOtherUs && namedRaw.length > 0) {
    const tokens = namedRaw
      .split(/[,;\n]|(?:\s+and\s+)|(?:\s*\/\s*)/i)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const tok of tokens) {
      const t = tok.toLowerCase();
      let matched = false;
      for (const [id, meta] of Object.entries(BIOMETRIC_REGISTRY_JURISDICTIONS)) {
        if (meta.state_names.some((n) => n.toLowerCase() === t)) {
          push(id as BiometricStatuteRow["jurisdiction_id"], "other_state_names");
          matched = true;
          break;
        }
      }
      if (!matched) namedButUnregistered.push(tok);
    }
  }

  return { registered, namedButUnregistered, otherUsStateSelectedButNoNames };
}

// ── selectApplicableRows ───────────────────────────────────────────────
export function selectApplicableRows(
  intake: BiometricRegistryIntake,
): BiometricStatuteRow[] {
  const resolved = resolveJurisdictions(intake);
  const jurIds = new Set(resolved.registered.map((r) => r.jurisdiction_id));
  const types = typeTokens(intake.biometricTypes);
  const genDate = (intake.generation_date ?? new Date().toISOString().slice(0, 10));

  const out: BiometricStatuteRow[] = [];
  for (const row of BIOMETRIC_STATUTE_REGISTRY) {
    if (!jurIds.has(row.jurisdiction_id)) continue;
    if (row.effective_date && genDate < row.effective_date) continue;
    if (!row.applicability_predicates.every((p) => evalPredicate(p, intake, types, genDate))) continue;
    out.push(row);
  }
  return out;
}

function evalPredicate(
  pred: string,
  intake: BiometricRegistryIntake,
  types: Set<string>,
  genDate: string,
): boolean {
  const [key, value = ""] = pred.split(":", 2);
  switch (key) {
    case "jurisdiction_named": {
      const resolved = resolveJurisdictions(intake);
      return resolved.registered.some(
        (r) => r.display.toLowerCase() === value.trim().toLowerCase(),
      );
    }
    case "biometric_types_intersects": {
      const wanted = value.split("|").map((v) => v.trim().toLowerCase());
      return wanted.some((w) => types.has(w));
    }
    case "generation_date_gte": {
      return genDate >= value.trim();
    }
    default:
      // Unknown predicate = fail-closed; do not surface a row we cannot validate.
      return false;
  }
}

// ── Prompt payload rendering ───────────────────────────────────────────
export function renderRegistryStatutesBlock(
  rows: BiometricStatuteRow[],
): string {
  if (rows.length === 0) {
    return `REGISTRY-BOUND STATUTES (bio-reg-w1 / ${BIOMETRIC_REGISTRY_VERSION}) — EMPTY:
No Wave-1 registered statute rows apply to this intake. Do NOT cite any Wave-1 statute (BIPA, CUBI, Washington HB 1493, Colorado HB24-1130) in the output unless it has been supplied here.`;
  }
  const lines: string[] = [];
  lines.push(
    `REGISTRY-BOUND STATUTES (${BIOMETRIC_REGISTRY_VERSION}) — the ONLY authorised source of statutory citations and verbatim quotes for this run.`,
  );
  lines.push(
    `Every statutory citation you emit for a Wave-1 jurisdiction (Illinois BIPA, Texas CUBI, Washington HB 1493, Colorado HB24-1130) MUST be a (statute_short, pinpoint) pair drawn from a row below. Every verbatim statutory sentence MUST appear inside a supplied verbatim_quote. Rows NOT listed below are OUT OF REGISTRY; do not cite them.`,
  );
  for (const r of rows) {
    lines.push(
      `\n[registry_id=${r.id}] ${r.jurisdiction_display} — ${r.statute_short} ${r.pinpoint} (${r.topic})\n  verbatim_quote: ${r.verbatim_quote}\n  primary_source_url: ${r.primary_source_url} (verified ${r.verification_date})`,
    );
  }
  return lines.join("\n");
}

export function renderRegistryUnresolvedBlock(
  resolved: ResolvedJurisdictions,
): string {
  const notes: string[] = [];
  if (resolved.otherUsStateSelectedButNoNames) {
    notes.push(
      `- The intake selected "Other US state" but did not populate other_state_names. Emit the structured-unresolved section for that jurisdiction (do NOT cite any statute for it).`,
    );
  }
  if (resolved.namedButUnregistered.length > 0) {
    notes.push(
      `- The following named states are OUTSIDE Wave-1 registry coverage and have NO supplied statute rows: ${resolved.namedButUnregistered.join(", ")}. For each, emit the structured-unresolved section naming the state; do NOT cite any statute for it.`,
    );
  }
  if (notes.length === 0) return "";
  return `REGISTRY-UNRESOLVED JURISDICTIONS (Wave-1 gate):\n${notes.join("\n")}\nStructured-unresolved shape: state the state is out of Wave-1 registry coverage, list the intake field the reader should populate to enable a resolved analysis, and record it as an INFORMATION_NEEDED entry.`;
}

// ── Post-generation citation validator ─────────────────────────────────
export type CitationValidationResult = {
  clean: string;
  strippedCitations: string[]; // pinpoints that were removed
  strippedQuotes: string[];    // quoted excerpts that were removed
  registry_version: string;
};

// Pinpoint patterns for Wave-1 statutes. Matches must be inside the prose
// AND must correspond to a supplied row's `pinpoint` literal — otherwise the
// citation is out-of-registry and gets stripped.
const WAVE1_CITATION_PATTERNS: RegExp[] = [
  /740\s*ILCS\s*14\/\d+(?:\([a-z0-9]+\))*/gi,
  /Tex\.?\s*Bus\.?\s*&?\s*Com\.?\s*Code\s*§\s*503\.001(?:\([a-z0-9\-]+\))*/gi,
  /RCW\s*19\.375\.\d+(?:\([a-z0-9]+\))*/gi,
  /C\.?R\.?S\.?\s*§\s*6-1-\d+(?:\([a-z0-9\.]+\))*(?:\([a-z0-9]+\))*/gi,
];

export function validateBiometricCitations(
  text: string,
  suppliedRows: BiometricStatuteRow[],
): CitationValidationResult {
  const suppliedPinpoints = new Set(suppliedRows.map((r) => normalizePinpoint(r.pinpoint)));
  const stripped: string[] = [];
  let clean = text;

  for (const pat of WAVE1_CITATION_PATTERNS) {
    clean = clean.replace(pat, (match) => {
      if (suppliedPinpoints.has(normalizePinpoint(match))) return match;
      stripped.push(match);
      return "[citation stripped — not in Wave-1 registry]";
    });
  }

  // Quote validator: any statutory sentence rendered inside double quotes that
  // claims to be verbatim MUST appear inside a supplied verbatim_quote. We only
  // flag quotes that are ≥12 words AND contain a Wave-1 pinpoint literal, to
  // avoid false-positives on ordinary paraphrase.
  const strippedQuotes: string[] = [];
  const supplyBlob = suppliedRows.map((r) => r.verbatim_quote).join("\n");
  clean = clean.replace(/"([^"\n]{60,600})"/g, (whole, inner: string) => {
    const words = inner.trim().split(/\s+/).length;
    if (words < 12) return whole;
    const hasWave1Pinpoint = WAVE1_CITATION_PATTERNS.some((p) => {
      p.lastIndex = 0;
      return p.test(inner);
    });
    if (!hasWave1Pinpoint) return whole;
    if (supplyBlob.includes(inner.trim())) return whole;
    strippedQuotes.push(inner.trim().slice(0, 120));
    return `"[quote stripped — not in Wave-1 verbatim_quote registry]"`;
  });

  return {
    clean,
    strippedCitations: stripped,
    strippedQuotes,
    registry_version: BIOMETRIC_REGISTRY_VERSION,
  };
}

function normalizePinpoint(s: string): string {
  return s
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/&amp;/g, "&")
    .toLowerCase();
}
