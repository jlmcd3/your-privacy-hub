// DOC 127 PHASE B (2026-09-01) — web-twin guards for the CPPA-Risk
// presentation system: marker/heading split (no underline beneath the
// section marker) and the non-Risk default staying byte-identical to the
// doc 66 Rule 2 treatment.
//
// DOC 170 (2026-09-04) — RE-PINNED. Syllabus & Record (doc 151, the CEO-
// ratified fleet design) supersedes the doc-127 Risk presentation for
// cppa-risk: the cover fact panel, the Assessment Result card, the
// methodology strip and the executive Determination card are replaced by
// the page-1 Determination Syllabus and the one-rail body. The cases that
// pinned those retired components are removed here (their replacements are
// pinned in skeletonDocumentView.doc170.test.tsx); the marker split and the
// non-Risk default — design intent that survives the redesign — stay.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonDocumentView, type SkeletonDocument } from "@/components/reports/SkeletonDocumentView";

const RISK_DOC: SkeletonDocument = {
  title: "CPPA Privacy Risk Assessment",
  subtitle: "Prepared for Acme",
  sections: [
    {
      id: "cover",
      title: "Assessment Profile",
      paragraphs: [
        {
          kind: "table",
          text: "",
          table: {
            surface: "exec_status_panel",
            title: "Assessment Result",
            columns: ["Determination", "Result"],
            hideHeader: true,
            rows: [
              ["Assessment required", "Yes"],
              ["Inherent privacy risk", "High"],
              ["Residual privacy risk", "High"],
              ["Assessment disposition", "Do Not Proceed"],
              ["Path forward", "To continue with the processing, the Company should satisfy the Conditions for Reassessment in § 4.D."],
            ],
          },
        },
      ],
    },
    {
      id: "executive_summary",
      title: "Executive Summary",
      paragraphs: [
        {
          kind: "skeleton",
          text: "A. Activity Assessed. The activity assessed is identified by the Company.",
        },
        {
          kind: "lead",
          text: "Based on the information provided by the Company, the residual privacy risks remaining after credited safeguards are substantial. The reasoning behind each row, and the determination it produces, appear in Section 4.",
        },
      ],
    },
    {
      id: "i_method",
      title: "1. How This Assessment Decides",
      paragraphs: [
        {
          kind: "skeleton",
          text: "Step 1 — Triggers. The Activity is tested against the significant-risk categories of § 7150(b); if none applies, no assessment is required and the analysis ends.",
        },
      ],
    },
  ],
};

describe("doc127 Phase B — Risk presentation system (web twin)", () => {
  it("splits the lettered lead: marker NOT underlined, heading words underlined (survives DOC 170)", () => {
    const { container } = render(<SkeletonDocumentView doc={RISK_DOC} product="cppa-risk" />);
    const markers = Array.from(container.querySelectorAll("strong")).filter((el) => el.textContent === "A.");
    expect(markers.length).toBeGreaterThanOrEqual(1);
    expect(markers[0].className).not.toContain("underline");
    const heading = Array.from(container.querySelectorAll("span")).find(
      (el) => el.textContent === "Activity Assessed" && el.className.includes("underline"),
    );
    expect(heading).toBeTruthy();
  });

  it("DOC 170 — without a persisted syllabus the raw cover table is the page-one fallback, the lead still renders in its section, and the Step paragraph renders as prose", () => {
    const { container } = render(<SkeletonDocumentView doc={RISK_DOC} product="cppa-risk" />);
    // No syllabus was persisted on this fixture (an assembler that always
    // attaches one for cppa-risk never produces this shape in production),
    // so the raw exec_status_panel table is the intended fallback — it is
    // NOT suppressed the way it is once a syllabus takes over the surface.
    expect(container.textContent).toContain("Assessment Result");
    expect(container.textContent).toContain("the residual privacy risks remaining after credited safeguards are substantial");
    expect(container.textContent).toContain("The Activity is tested against the significant-risk categories");
    // The retired doc-127 badge chrome does not render either way.
    expect(Array.from(container.querySelectorAll("span")).some((el) => el.className.includes("rounded-full"))).toBe(false);
  });

  it("leaves the non-Risk default treatment unchanged (whole label bold+underlined, generic tables)", () => {
    const { container } = render(<SkeletonDocumentView doc={RISK_DOC} />);
    const whole = Array.from(container.querySelectorAll("strong")).find(
      (el) => el.textContent === "A. Activity Assessed." && el.className.includes("underline"),
    );
    expect(whole).toBeTruthy();
    // No Risk card chrome without the product string.
    expect(container.textContent).not.toContain("Determination\n");
    const chip = Array.from(container.querySelectorAll("span")).find((el) => el.className.includes("rounded-full"));
    expect(chip).toBeFalsy();
  });
});
