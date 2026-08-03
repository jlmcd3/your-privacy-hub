// UNIVERSAL REPORT DISCLAIMER — frontend/backend constants must be byte-identical.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { REPORT_DISCLAIMER } from "@/lib/reportDisclaimer";

const EXACT =
  "EndUserPrivacy.com (\u201CEUP\u201D) utilizes your information in a secure manner with third party providers, including AI providers, to prepare your documents. EUP prohibits those providers from retaining that information or using it to train their models. Accordingly, your information remains confidential and is never retained by EUP providers for machine learning or for any other purpose. Documents from EUP are intended for educational and strategic planning purposes only, so they do not establish an attorney-client relationship. Instead, they constitute general analysis of complex regulatory matters and are not a substitute for legal counsel.";

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
