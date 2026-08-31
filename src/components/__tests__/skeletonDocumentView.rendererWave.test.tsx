// BATCH 16 (A-Team doc-111 renderer wave) — render proof for the web twin.
// The PDF renderer (generate-report-pdf/index.ts) carries the byte-synced
// logic; its module has env-bound imports, so the shared behavior is proven
// here on the web twin plus a lists/regex sync check in the batch itself.
//
// R2  a chunk that IS a structural lead renders as a sub-heading;
// R3  the ratified RUN-IN additions style as run-ins (not HEAD);
// R4  quoted_authority paragraphs and ≥25-word enquoted chunks render as
//     statute-quote blocks;
// R5  "Rulemaking context — persuasive only." chunks take the guidance
//     panel; R6 "Deadline." takes the amber callout ONCE per document and
//     short not-yet-assessable chunks take the muted panel;
// R7  underscore signature cells render as bottom-border fill-ins;
// and a REAL product document (ADMT out-of-scope golden) still renders
// without regression where composers have not opted in.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkeletonDocumentView } from "@/components/reports/SkeletonDocumentView";
import { CPPA_ADMT_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-admt";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble";

const QUOTE_43_WORDS =
  "“A private entity in possession of biometric identifiers must develop a written policy, made available to the public, establishing a retention schedule and guidelines for permanently destroying biometric identifiers and biometric information when the initial purpose for collecting them has been satisfied.”";

const SYNTH = {
  title: "Renderer Wave Proof",
  subtitle: "Batch 16",
  sections: [
    {
      id: "s1",
      title: "1. Shapes",
      paragraphs: [
        { kind: "generated", text: "A. Inherent Risk Conclusion.\n\nBody follows the sub-heading.\n\nStatus. The record is open." },
        { kind: "quoted_authority", text: "Verbatim regulator excerpt carried as a typed quoted authority paragraph." },
        { kind: "generated", text: QUOTE_43_WORDS },
        { kind: "generated", text: "Rulemaking context — persuasive only. The Agency retained the threshold." },
        { kind: "generated", text: "Their operative text is not yet assessable here." },
        { kind: "generated", text: "Deadline. The 72-hour outer limit runs to September 1, 2026." },
        { kind: "generated", text: "Deadline. A second deadline chunk must not open a second amber box." },
      ],
    },
    {
      id: "signature",
      title: "Review and Approval",
      paragraphs: [
        {
          kind: "table",
          text: "",
          table: { key: "t", surface: "sig", title: "", columns: ["Field", "Value"], hideHeader: true, rows: [["Signature", "________________________"]] },
        },
      ],
    },
  ],
} as never;

describe("Batch 16 — renderer wave shapes (web twin)", () => {
  it("renders every wave shape as ruled", () => {
    const { container } = render(<SkeletonDocumentView doc={SYNTH} />);
    // R2: the structural-lead chunk is a sub-heading, not a styled paragraph.
    const h4 = container.querySelector("h4");
    expect(h4?.textContent).toBe("A. Inherent Risk Conclusion.");
    // R3: "Status." styles as a run-in (underline span), not bold HEAD.
    expect(screen.getByText("Status.").tagName).toBe("SPAN");
    // R4: both quote forms take the statute-quote border treatment.
    const quoteDivs = container.querySelectorAll("div.border-l-\\[3px\\]");
    expect(quoteDivs.length).toBeGreaterThanOrEqual(2);
    // R5/R6: one guidance panel, one muted panel, exactly one amber box.
    expect(container.querySelectorAll("[class*='border-l-4']").length).toBe(1);
    expect(container.querySelectorAll("[class*='italic text-muted-foreground']").length).toBe(1);
    expect(container.querySelectorAll("[class*='border-amber-600']").length).toBe(1);
    // R7: the underscore run became a bottom-border fill-in.
    expect(container.textContent).not.toContain("________");
  });

  it("a real product document still renders end-to-end (ADMT out-of-scope golden)", () => {
    const g = CPPA_ADMT_GOLDEN.find((x) => x.id === "admt-hr-perfect-record")!;
    const computed = computeAdmtV2(g.intake as Record<string, unknown>);
    const doc = assembleAdmtV2Document({
      intake: g.intake as Record<string, unknown>,
      computed,
      organizationName: "Test Org",
      systemName: "the System",
      exhibit: null,
    });
    const { container } = render(<SkeletonDocumentView doc={doc as never} />);
    expect(container.textContent).toContain("CPPA ADMT Compliance Assessment");
    expect(container.textContent).toContain("Scope qualification — conditions on this determination");
    // The typed quoted-authority S4 excerpts render as statute-quote blocks.
    expect(container.querySelectorAll("div.border-l-\\[3px\\]").length).toBeGreaterThanOrEqual(1);
  });
});
