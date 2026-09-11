// BATCH 7bd29982 (2026-09-10) — Velorix Digital Services Ltd LIA (34bd50c2).
// The form's alternatives_considered is ONE string with one alternative per
// line. The ¶19 necessity sentence read "…it considered Consent-based opt-in
// to security monitoring\nStatic rule-only fraud filters without behavioural
// profiling, and its reasons…" — the raw line break rode into the sentence
// because the whole string was a single list item. Lines are the items now
// (the DOC 161 rule already applied to alternatives_rationale beside it).
// The record strings below are the batch's own row, read back.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildLiaSlotValues } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";

const VELORIX = {
  organization_name: "Velorix Digital Services Ltd",
  alternatives_considered: "Consent-based opt-in to security monitoring\nStatic rule-only fraud filters without behavioural profiling",
  necessity_details: {
    alternatives: "Consent-based monitoring — users would opt out, leaving the platform unprotected\nStatic IP blocklists — too coarse-grained; attackers rotate IPs faster than lists can be updated",
    alternatives_rationale:
      "Consent-based monitoring — would allow malicious actors to evade detection by simply declining\nStatic IP blocklists — cannot catch sophisticated behavioural anomalies or credential-stuffing with residential proxies",
    why_consent_not_used: "Fraudsters would refuse consent, defeating the protective purpose entirely.",
  },
};

Deno.test("7bd29982 — a multi-line alternatives_considered string lists as prose, one item per line, no raw line break", () => {
  const values = buildLiaSlotValues(VELORIX as never) as unknown as Record<string, unknown>;
  // DOC 254 (2026-09-11, LEGITIMA-03): each alternative is quoted so its own reason cannot run into the next item.
  assertEquals(values.alternatives, "“Consent-based opt-in to security monitoring” and “Static rule-only fraud filters without behavioural profiling”");
});

Deno.test("7bd29982 — with no top-level list, necessity_details.alternatives splits the same way", () => {
  const values = buildLiaSlotValues({ ...VELORIX, alternatives_considered: "" } as never) as unknown as Record<string, unknown>;
  const text = String(values.alternatives);
  assertEquals(text.includes("\n"), false);
  assertEquals(text.startsWith("“Consent-based monitoring — users would opt out, leaving the platform unprotected” and “Static IP blocklists"), true, text);
});
