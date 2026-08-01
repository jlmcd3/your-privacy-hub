/**
 * ITEM 337 (PROSE PROGRAM 1, Part D + E) — regression tests for the
 * product-specific defect fixes. Each case is a recorded PDF defect.
 */
import { describe, expect, it } from "vitest";
import {
  appendInformationNeeded,
  degradeHedgeOnlyValues,
} from "../../../supabase/functions/_shared/prose/hedge-degrade.ts";
import {
  dedupeControls,
  pinpointHipaa,
} from "../../../supabase/functions/_shared/prose/cyber-controls.ts";
import {
  ADM_DEFAULT_LABEL,
  ADM_REGIME_LABEL,
} from "../../../supabase/functions/_shared/ltp/lia-deliverables/build.ts";

const HEDGE =
  "The organisation should confirm whether the described position applies here.";

describe("D1 — hedge-as-value ban (governance / dpia)", () => {
  it("degrades a rationale that holds ONLY the hedge to a named information-needed item", () => {
    const report: any = {
      duties: [{ element: "Art. 30 records of processing", engaged_because: HEDGE }],
    };
    const res = degradeHedgeOnlyValues(report, [HEDGE]);
    expect(res.degraded).toBe(1);
    expect(report.duties[0].engaged_because).toBe("");
    expect(report.duties[0].information_needed).toBe(true);
    expect(res.items[0].question).toContain("Art. 30 records of processing");

    appendInformationNeeded(report, res.items);
    expect(report.information_needed).toHaveLength(1);
    // idempotent
    appendInformationNeeded(report, res.items);
    expect(report.information_needed).toHaveLength(1);
  });

  it("leaves a rationale that carries a finding alongside the hedge untouched", () => {
    const report: any = {
      duties: [{
        element: "Chapter V transfers",
        engaged_because: `The record states data is exported to the US. ${HEDGE}`,
      }],
    };
    expect(degradeHedgeOnlyValues(report, [HEDGE]).degraded).toBe(0);
    expect(report.duties[0].engaged_because).toContain("exported to the US");
  });
});

describe("D3 — LIA Annex-1 scope note never carries raw enum tokens", () => {
  it("maps every regime and default-position token to prose", () => {
    for (const v of Object.values(ADM_REGIME_LABEL)) expect(v).not.toMatch(/_/);
    for (const v of Object.values(ADM_DEFAULT_LABEL)) expect(v).not.toMatch(/_/);
    expect(ADM_REGIME_LABEL.uk).toBe("the UK GDPR regime");
    expect(ADM_DEFAULT_LABEL.permitted_with_safeguards).toContain("Article 22C safeguards");
    // The recorded defect string must be unreachable from the labels.
    const glued = `${ADM_REGIME_LABEL.uk} ${ADM_DEFAULT_LABEL.permitted_with_safeguards}`;
    expect(glued).not.toContain("uk permitted_with_safeguards");
  });
});

describe("D4 — cyber controls dedup", () => {
  it("collapses duplicates onto the canonical component and keeps the SEVERER status", () => {
    const { controls, merged } = dedupeControls([
      { control: "Authentication", citation: "11 CCR § 7123(c)(1)", status: "Implemented", finding: "MFA in place." },
      { control: "Account management", citation: "11 CCR § 7123(c)(1)", status: "Gap", finding: "No joiner-leaver process." },
    ]);
    expect(merged).toBe(1);
    expect(controls).toHaveLength(1);
    expect(controls[0].status).toBe("Gap");
    expect(String(controls[0].finding)).toContain("joiner-leaver");
    expect(String(controls[0].finding)).toContain("MFA in place");
  });
});

describe("D4 — HIPAA pinpointing + comparative framing", () => {
  it("pinpoints a bare HIPAA mention and strips the operative verb", () => {
    const out = pinpointHipaa("The HIPAA Security Rule requires multi-factor authentication.");
    expect(out.changed).toBe(1);
    expect(out.text).toContain("45 C.F.R. § 164.312(a)(2)");
    expect(out.text).not.toMatch(/HIPAA[^.]*\brequires\b/);
    expect(out.text.toLowerCase()).toContain("comparative context");
  });

  it("leaves an already-pinpointed mention alone", () => {
    const src = "For comparative context, 45 C.F.R. § 164.312(b) addresses HIPAA audit logging.";
    expect(pinpointHipaa(src).text).toBe(src);
  });

  it("is a no-op on text with no HIPAA mention", () => {
    const src = "11 CCR § 7123(c)(1) is the operative requirement.";
    expect(pinpointHipaa(src)).toEqual({ text: src, changed: 0 });
  });
});
