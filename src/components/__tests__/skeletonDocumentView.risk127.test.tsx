// DOC 127 PHASE B (2026-09-01) — web-twin guards for the CPPA-Risk
// presentation system: marker/heading split (no underline beneath the
// section marker), the Assessment Result card with the Path-forward line,
// the Assessment Profile fact panel, the methodology strip, and the
// non-Risk default staying byte-identical to the doc 66 Rule 2 treatment.

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
            surface: "cover_summary",
            columns: ["Field", "Value"],
            hideHeader: true,
            rows: [
              ["Prepared for", "Acme Logistics Ltd (the “Company”)"],
              ["Processing activity", "Shipment-tracking advertising profiles (the “Activity”)"],
              ["Assessment date", "September 1, 2026"],
            ],
          },
        },
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
  it("renders the Assessment Result card with disposition badge and Path forward line", () => {
    const { getByText, getAllByText } = render(<SkeletonDocumentView doc={RISK_DOC} product="cppa-risk" />);
    expect(getAllByText("Do Not Proceed").length).toBeGreaterThanOrEqual(1);
    expect(getByText(/satisfy the Conditions for Reassessment in § 4\.D\./)).toBeTruthy();
    expect(getByText("Assessment disposition")).toBeTruthy();
  });

  it("renders the Assessment Profile as a fact panel (no Field/Value header)", () => {
    const { container, getByText } = render(<SkeletonDocumentView doc={RISK_DOC} product="cppa-risk" />);
    expect(getByText("Prepared for")).toBeTruthy();
    expect(container.textContent).not.toContain("Field");
  });

  it("splits the lettered lead: marker bold and NOT underlined, heading words bold+underlined", () => {
    const { container } = render(<SkeletonDocumentView doc={RISK_DOC} product="cppa-risk" />);
    const markers = Array.from(container.querySelectorAll("strong")).filter((el) => el.textContent === "A.");
    expect(markers.length).toBeGreaterThanOrEqual(1);
    expect(markers[0].className).not.toContain("underline");
    const heading = Array.from(container.querySelectorAll("span")).find(
      (el) => el.textContent === "Activity Assessed" && el.className.includes("underline"),
    );
    expect(heading).toBeTruthy();
  });

  it("renders the methodology strip row for a Step paragraph", () => {
    const { container } = render(<SkeletonDocumentView doc={RISK_DOC} product="cppa-risk" />);
    const chip = Array.from(container.querySelectorAll("span")).find((el) => el.textContent === "1" && el.className.includes("rounded-full"));
    expect(chip).toBeTruthy();
    const bold = Array.from(container.querySelectorAll("strong")).find((el) => el.textContent === "Triggers");
    expect(bold).toBeTruthy();
  });

  it("marks the executive determination lead as the Determination card", () => {
    const { getByText } = render(<SkeletonDocumentView doc={RISK_DOC} product="cppa-risk" />);
    expect(getByText("Determination")).toBeTruthy();
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
