// UNIVERSAL REPORT DISCLAIMER — frontend/backend constants must be byte-identical.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { REPORT_DISCLAIMER } from "@/lib/reportDisclaimer";

const EXACT =
  "EndUserPrivacy.com, owned and operated by EUP, LLC (\u201CEUP\u201D), processes the information you supply with third-party service providers in order to generate your documents. Those providers are bound by written data processing agreements and do not retain your information for their own purposes. Documents produced by EUP are educational and strategic planning materials; they do not create an attorney-client relationship, are general analysis of complex regulatory matters, and are not a substitute for advice from legal counsel.";

describe("universal report disclaimer", () => {
  it("frontend constant is byte-exact", () => {
    expect(REPORT_DISCLAIMER).toBe(EXACT);
  });

  it("backend constant is byte-identical to the frontend constant", () => {
    const src = readFileSync("supabase/functions/_shared/report-disclaimer.ts", "utf8");
    const m = src.match(/export const REPORT_DISCLAIMER =\s*\n?\s*"([\s\S]*?)";/);
    expect(m).toBeTruthy();
    // eslint-disable-next-line no-eval
    const backend = JSON.parse(`"${m![1]}"`);
    expect(backend).toBe(REPORT_DISCLAIMER);
  });

  it("carries the curly quotes around EUP", () => {
    expect(REPORT_DISCLAIMER).toContain("\u201CEUP\u201D");
  });
});
