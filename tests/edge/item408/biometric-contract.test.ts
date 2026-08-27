// ITEM 408 — BIOMETRIC INTAKE CONTRACT acceptance tests.
//
// The form is the source of truth. These tests fail if the contract and
// src/pages/BiometricChecker.tsx ever drift apart.

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  biometricContract,
  BIO_TYPES,
  BIO_ORG,
  BIO_PURPOSE,
  BIO_JURS,
  BIO_TRI,
  BIO_NOTICE,
  BIO_CONSENT_ARTIFACT,
  BIO_DISCLOSURE_BASES,
  BIOMETRIC_TRIGGERS,
} from "../../../supabase/functions/_shared/intake-contracts/biometric.ts";
import { biometricCheckerContract } from "../../../supabase/functions/run-quality-batch/_local/intake-contracts/biometric-checker.ts";
import { emptyAskedKeys } from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import {
  FIELD_LABELS,
  KNOWN_INTAKE_KEYS,
} from "../../../supabase/functions/_shared/customer-messages.ts";
import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate.ts";

const FORM_URL = new URL("../../../src/pages/BiometricChecker.tsx", import.meta.url);
const OPTIONS_URL = new URL(
  "../../../src/registry/biometric-intake-options.ts",
  import.meta.url,
);

const formSrc = await Deno.readTextFile(FORM_URL);
const optionsSrc = await Deno.readTextFile(OPTIONS_URL);

/** Top-level keys of the `useState({...})` form object — the submission
 *  payload is `{ ...form, user_id, client_id }` (BiometricChecker.tsx L172). */
function formStateKeys(src: string): string[] {
  const start = src.indexOf("const [form, setForm] = useState({");
  assert(start > -1, "form state object not found");
  let i = src.indexOf("{", start);
  let depth = 0;
  let end = -1;
  for (let p = i; p < src.length; p++) {
    const ch = src[p];
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) { end = p; break; }
    }
  }
  assert(end > -1, "form state object not terminated");
  const body = src.slice(i + 1, end);
  const keys: string[] = [];
  for (const line of body.split("\n")) {
    // Only depth-1 keys: the object is flat (arrays and strings only).
    for (const m of line.matchAll(/(?:^|,)\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g)) {
      keys.push(m[1]);
    }
  }
  return keys;
}

/** Parse a `export const NAME = [ "a", "b" ] as const;` string array. */
function parseArray(src: string, name: string): string[] {
  const re = new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`);
  const m = src.match(re);
  assert(m, `array ${name} not found`);
  return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) =>
    x[1].replace(/\\"/g, '"')
  );
}

// ── (1) contract ⇄ form parity ────────────────────────────────────────────

Deno.test("item408 / biometric PARITY — every contract key is a form submission key", () => {
  const form = new Set(formStateKeys(formSrc));
  const missing = biometricContract.fields
    .map((f) => f.key.replace(/\[\]$/, ""))
    .filter((k) => !form.has(k));
  assertEquals(missing, [], `contract keys absent from the form payload: ${missing.join(", ")}`);
});

Deno.test("item408 / biometric PARITY — every form control has a contract key", () => {
  const contract = new Set(biometricContract.fields.map((f) => f.key));
  const missing = formStateKeys(formSrc).filter((k) => !contract.has(k));
  assertEquals(missing, [], `form keys absent from the contract: ${missing.join(", ")}`);
});

Deno.test("item408 / biometric PARITY — contract declares 41 fields, no duplicates", () => {
  const keys = biometricContract.fields.map((f) => f.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate contract key");
  // INTAKE-4g added the CEO-approved optional `biometric_consent_withdrawal`.
  // TURN 1d (2026-08-26) added `wa_mhmda_geofence_purpose` — the RCW
  // 19.373.080 purpose element, asked only when a geofence exists.
  // S-B1/S-B2 (doc 80, 2026-08-27) added `notice_purpose_and_term`
  // (§ 15(b)(2) purpose-and-term writing) and
  // `retention_policy_predates_possession` (§ 15(a) first-possession
  // timing), both Illinois-conditional. 39 → 41.
  assertEquals(keys.length, 41);

  assertEquals(biometricContract.tool_type, "biometric_checker");
  assertEquals(biometricContract.table, "biometric_assessments");
});

Deno.test("item408 / biometric — the quality-batch local module re-exports the shared contract", () => {
  assert(
    biometricCheckerContract === biometricContract,
    "local biometric-checker.ts must be a re-export shim, not a second shape",
  );
});

// ── (2) options byte-verbatim ─────────────────────────────────────────────

Deno.test("item408 / biometric OPTIONS — inline form lists are byte-verbatim", () => {
  assertEquals([...BIO_TYPES], parseInlineConst("TYPES"));
  assertEquals([...BIO_ORG], parseInlineConst("ORG"));
  assertEquals([...BIO_PURPOSE], parseInlineConst("PURPOSE"));
  assertEquals([...BIO_JURS], parseInlineConst("JURS"));

  function parseInlineConst(name: string): string[] {
    const re = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`);
    const m = formSrc.match(re);
    assert(m, `inline list ${name} not found in BiometricChecker.tsx`);
    return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]);
  }
});

Deno.test("item408 / biometric OPTIONS — registry lists are byte-verbatim", () => {
  assertEquals([...BIO_TRI], parseArray(optionsSrc, "BIO_TRI"));
  assertEquals([...BIO_NOTICE], parseArray(optionsSrc, "BIO_NOTICE"));
  assertEquals([...BIO_CONSENT_ARTIFACT], parseArray(optionsSrc, "BIO_CONSENT_ARTIFACT"));
  assertEquals([...BIO_DISCLOSURE_BASES], parseArray(optionsSrc, "BIO_DISCLOSURE_BASES"));
});

Deno.test("item408 / biometric OPTIONS — every enum field's options are non-empty and unique", () => {
  for (const f of biometricContract.fields) {
    if (f.kind !== "enum" && f.kind !== "multi-enum") {
      assertEquals(f.options, undefined, `${f.key} carries options but is ${f.kind}`);
      continue;
    }
    assert(f.options && f.options.length > 0, `${f.key} has no options`);
    assertEquals(new Set(f.options).size, f.options!.length, `${f.key} has duplicate options`);
  }
});

// ── (3) conditional triggers evaluate deterministically ───────────────────

const BASE = {
  orgName: "Northwind Clinical Diagnostics Corporation",
  biometricTypes: ["Fingerprint / palm print"],
  orgType: "Employer (employee biometrics)",
  purpose: "Time & attendance / workforce management",
  jurisdictions: ["EU / EEA (GDPR)"],
};

Deno.test("item408 / biometric TRIGGERS — every trigger value is a real jurisdiction option", () => {
  for (const [name, t] of Object.entries(BIOMETRIC_TRIGGERS)) {
    assertEquals(t.key, "jurisdictions[]", `${name} reads the wrong key`);
    for (const v of t.equals) {
      assert(
        (BIO_JURS as readonly string[]).includes(v),
        `${name} trigger value ${JSON.stringify(v)} is not a JURS option`,
      );
    }
  }
});

Deno.test("item408 / biometric TRIGGERS — no jurisdiction in scope: only unconditional asks count", () => {
  const asked = emptyAskedKeys(biometricContract, BASE);
  // Stage 4 is emptyIsAnswer; Stage 1/2 are answered; every Stage-3 field is
  // an untriggered conditional and so was never asked.
  assertEquals(asked, []);
});

Deno.test("item408 / biometric TRIGGERS — Illinois opens the practices block only", () => {
  const asked = emptyAskedKeys(biometricContract, {
    ...BASE,
    jurisdictions: ["Illinois, USA (BIPA)"],
  });
  assert(asked.includes("data_source_description"));
  assert(asked.includes("disclosure_bases"));
  assert(!asked.some((k) => k.startsWith("tx_")), "Texas block must stay closed");
  assert(!asked.some((k) => k.startsWith("wa_")), "Washington block must stay closed");
  assert(!asked.includes("other_state_names"), '"Other US state" block must stay closed');
});

Deno.test("item408 / biometric TRIGGERS — Texas opens the practices block and the CUBI block", () => {
  const asked = emptyAskedKeys(biometricContract, {
    ...BASE,
    jurisdictions: ["Texas, USA (CUBI)"],
  });
  for (
    const k of [
      "tx_destruction_within_one_year",
      "tx_longer_retention_required_by_law",
      "tx_employer_security_collection",
      "tx_ai_training_use",
    ]
  ) assert(asked.includes(k), `${k} not asked with Texas in scope`);
  assert(asked.includes("retention_schedule_text"));
  assert(!asked.some((k) => k.startsWith("wa_")));
});

Deno.test("item408 / biometric TRIGGERS — Washington opens RCW 19.375 and RCW 19.373", () => {
  const asked = emptyAskedKeys(biometricContract, {
    ...BASE,
    jurisdictions: ["Washington state, USA"],
  });
  for (
    const k of [
      "wa_enrolls_in_database",
      "wa_commercial_purpose",
      "wa_security_purpose_only",
      "wa_mhmda_health_inference",
      "wa_mhmda_privacy_policy_published",
      "wa_mhmda_collection_consent",
      "wa_mhmda_share_consent_separate",
      "wa_mhmda_geofence_health_facility",
    ]
  ) assert(asked.includes(k), `${k} not asked with Washington in scope`);
  assert(!asked.some((k) => k.startsWith("tx_")));
});

// TURN 1d (2026-08-26, fleet intake audit) — RCW 19.373.080's prohibition is
// conditioned on the geofence's USE, so the purpose element has its own
// question, asked only when a geofence exists.
Deno.test("item408 / biometric TRIGGERS — the geofence PURPOSE question opens only when a geofence exists", () => {
  const withoutGeofence = emptyAskedKeys(biometricContract, {
    ...BASE,
    jurisdictions: ["Washington state, USA"],
  });
  assert(!withoutGeofence.includes("wa_mhmda_geofence_purpose"), "purpose must not be asked before existence is affirmed");
  const withGeofence = emptyAskedKeys(biometricContract, {
    ...BASE,
    jurisdictions: ["Washington state, USA"],
    wa_mhmda_geofence_health_facility: "Yes",
  });
  assert(withGeofence.includes("wa_mhmda_geofence_purpose"), "purpose must be asked once a geofence exists");
  const answered = emptyAskedKeys(biometricContract, {
    ...BASE,
    jurisdictions: ["Washington state, USA"],
    wa_mhmda_geofence_health_facility: "Yes",
    wa_mhmda_geofence_purpose: "No",
  });
  assert(!answered.includes("wa_mhmda_geofence_purpose"));
});

Deno.test('item408 / biometric TRIGGERS — "Other US state" opens the named-states input', () => {
  const closed = emptyAskedKeys(biometricContract, BASE);
  assert(!closed.includes("other_state_names"));
  const open = emptyAskedKeys(biometricContract, {
    ...BASE,
    jurisdictions: ["Other US state"],
  });
  assert(open.includes("other_state_names"));
  const answered = emptyAskedKeys(biometricContract, {
    ...BASE,
    jurisdictions: ["Other US state"],
    other_state_names: "Colorado",
  });
  assert(!answered.includes("other_state_names"));
});

Deno.test("item408 / biometric emptyIsAnswer — Stage-4 approval fields are never unanswered asks", () => {
  const asked = emptyAskedKeys(biometricContract, {
    ...BASE,
    approved_by_name: "",
    approved_by_title: "",
    approval_date: "",
    next_review_due: "",
  });
  for (const k of ["approved_by_name", "approved_by_title", "approval_date", "next_review_due"]) {
    assert(!asked.includes(k), `${k} must be emptyIsAnswer`);
  }
});

Deno.test("item408 / biometric emptyIsAnswer — marker is only on unconditionally-presented fields", () => {
  for (const f of biometricContract.fields) {
    if (f.emptyIsAnswer !== true) continue;
    assertEquals(f.required, "optional", `${f.key} is emptyIsAnswer but not optional`);
    assertEquals(f.trigger, undefined, `${f.key} is emptyIsAnswer but gated`);
  }
});

Deno.test("item408 / biometric — every conditional field carries a machine-evaluable trigger", () => {
  for (const f of biometricContract.fields) {
    if (f.required !== "conditional") continue;
    assert(f.trigger, `${f.key} is conditional with no trigger`);
    assert(f.requiredWhen, `${f.key} is conditional with no requiredWhen prose`);
  }
});

// ── (4) FIELD_LABELS / KNOWN_INTAKE_KEYS coverage ─────────────────────────

Deno.test("item408 / biometric REGISTER — every contract key is in KNOWN_INTAKE_KEYS", () => {
  const known = new Set(KNOWN_INTAKE_KEYS);
  const missing = biometricContract.fields.map((f) => f.key).filter((k) => !known.has(k));
  assertEquals(missing, []);
});

Deno.test("item408 / biometric REGISTER — every contract key has a customer-facing label", () => {
  const missing: string[] = [];
  for (const f of biometricContract.fields) {
    const label = FIELD_LABELS[f.key];
    if (!label) { missing.push(f.key); continue; }
    // Sentence-case register: opens lowercase (proper nouns such as "US" and
    // "GLBA" keep their capitals) and never leaks a field id.
    assertEquals(label[0], label[0].toLowerCase(), `${f.key} label does not open lowercase`);
    assert(!/_/.test(label), `${f.key} label leaks a field id`);
  }
  assertEquals(missing, []);
});

// ── (5) the live submission payload validates ─────────────────────────────

Deno.test("item408 / biometric — a full Washington+Texas payload validates cleanly", () => {
  const payload: Record<string, unknown> = {
    ...BASE,
    jurisdictions: ["Texas, USA (CUBI)", "Washington state, USA", "Other US state"],
    other_state_names: "Colorado",
    data_source_description: "Wall-mounted reader; template stored in the matcher.",
    healthcare_tpo_context: "No",
    entity_is_government: "No",
    glba_financial_institution: "No",
    notice_before_collection: "Written notice given before collection",
    consent_artifact_type: "Standalone written release signed before collection",
    release_artifact_description: "Signed at onboarding; names purpose and period.",
    retention_schedule_text: "Destroyed 12 months after separation.",
    retention_policy_public: "Yes",
    protection_parity: "Yes",
    destruction_trigger: "Separation date, then 30 days.",
    sells_or_profits: "No",
    security_measures_description: "AES-256 at rest, TLS 1.3 in transit.",
    disclosure_recipients: "Matching vendor, hosting only.",
    disclosure_bases: ["Necessary to provide a product or service the subject requested"],
    tx_destruction_within_one_year: "Yes",
    tx_longer_retention_required_by_law: "No",
    tx_employer_security_collection: "No",
    tx_ai_training_use: "No",
    wa_enrolls_in_database: "Yes",
    wa_commercial_purpose: "No",
    wa_security_purpose_only: "No",
    wa_mhmda_health_inference: "No",
    wa_mhmda_privacy_policy_published: "Not known",
    wa_mhmda_collection_consent: "Yes",
    wa_mhmda_share_consent_separate: "No",
    wa_mhmda_geofence_health_facility: "No",
    approved_by_name: "R. Alvarez",
    approved_by_title: "Chief Privacy Officer",
    approval_date: "2026-08-08",
    next_review_due: "2027-08-08",
    user_id: "u-1",
    client_id: null,
  };
  const res = validateIntake(biometricContract, payload);
  assert(res.ok, JSON.stringify(res.violations));
  assertEquals(emptyAskedKeys(biometricContract, payload), []);
});
