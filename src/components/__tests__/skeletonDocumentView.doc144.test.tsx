// DOC 144 (2026-09-02) — web-twin guards for the Wave-2 presentation layer:
// the framed Governing-requirement law-cite, the [Q] landing-line token
// strip, the § 2.A customer-voice block, the six-column § 4.A ledger with
// badge columns, the § 3.B necessity-matrix Determination badges, the
// Assessment-at-a-Glance panel, the numbered-section opener (marker never
// underlined), and the non-Risk default staying unchanged.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonDocumentView, type SkeletonDocument } from "@/components/reports/SkeletonDocumentView";

const DOC: SkeletonDocument = {
  title: "CPPA Privacy Risk Assessment",
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
              ["Residual privacy risk", "Moderate"],
              ["Assessment disposition", "Proceed with Conditions"],
              ["Triggers engaged", "2"],
              ["Risks identified", "3"],
              ["Benefits credited", "1"],
              ["Number of conditions", "2"],
              ["What this means", "the Activity may proceed once each condition in § 4.D is satisfied."],
            ],
          },
        },
      ],
    },
    {
      id: "executive_summary",
      title: "Executive Summary",
      paragraphs: [{ kind: "skeleton", text: "The summary body." }],
    },
    {
      id: "ii_information",
      title: "2. The Information Provided",
      paragraphs: [
        { kind: "skeleton", text: "[Q] What is being processed, about whom, and why — in the Company’s own words." },
        {
          kind: "customer_voice",
          text: "In Acme’s words\nProcessing. “Shipment-tracking advertising profiles”\nPurpose. “Serve targeted offers”",
        },
        {
          kind: "skeleton",
          text: "Governing requirement. Section 7152(a)(1) requires the assessment to state the Company’s purpose with enough specificity to evaluate the processing.",
        },
      ],
    },
    {
      id: "iii_analysis",
      title: "3. Analysis",
      paragraphs: [
        {
          kind: "table",
          text: "",
          table: {
            surface: "necessity_matrix",
            columns: ["Element", "Determination", "Basis"],
            rows: [
              ["Email address", "Necessary to the stated purpose", "“Needed to reach the customer.”"],
              ["Location trail", "Collected but not necessary to the stated purpose", "Recorded without further explanation."],
            ],
          },
        },
      ],
    },
    {
      id: "iv_determination",
      title: "4. The Balance and the Determination",
      paragraphs: [
        {
          kind: "table",
          text: "",
          table: {
            surface: "risk_ledger",
            columns: [
              "Privacy risk",
              "Likelihood",
              "Severity",
              "Before safeguards",
              "Safeguard credited (status)",
              "Remaining risk",
            ],
            rows: [
              ["(A) Unauthorized access", "Possible", "Significant", "High", "Encryption at rest (implemented and tested)", "Moderate (reduced)"],
            ],
          },
        },
      ],
    },
    {
      id: "v_governance",
      title: "5. Governance, Review, and Submission",
      paragraphs: [
        {
          kind: "table",
          text: "",
          table: {
            surface: "key_dates",
            title: "Key dates and deadlines",
            columns: ["Obligation", "Authority", "Date / deadline"],
            rows: [
              ["Three-year review", "11 CCR § 7155(a)(2)", "2029-09-02"],
            ],
          },
        },
      ],
    },
  ],
};

describe("doc144 — Wave-2 Risk presentation (web twin)", () => {
  it("renders the Assessment-at-a-Glance panel from the persisted panel + key-dates surfaces", () => {
    const { getByText, getAllByText } = render(<SkeletonDocumentView doc={DOC} product="cppa-risk" />);
    expect(getByText("Assessment at a Glance")).toBeTruthy();
    expect(getAllByText("Triggers engaged").length).toBeGreaterThanOrEqual(1);
    expect(getByText(/Three-year review: 2029-09-02/)).toBeTruthy();
    expect(getAllByText(/may proceed once each condition/).length).toBeGreaterThanOrEqual(1);
  });

  it("strips the [Q] token and renders the italic landing line", () => {
    const { container } = render(<SkeletonDocumentView doc={DOC} product="cppa-risk" />);
    expect(container.textContent).not.toContain("[Q]");
    const q = Array.from(container.querySelectorAll("p")).find((el) =>
      (el.textContent ?? "").startsWith("What is being processed")
    );
    expect(q).toBeTruthy();
    expect(q!.className).toContain("italic");
  });

  it("renders the customer-voice block with attribution eyebrow and labeled quoted rows", () => {
    const { getByText } = render(<SkeletonDocumentView doc={DOC} product="cppa-risk" />);
    expect(getByText("In Acme’s words")).toBeTruthy();
    expect(getByText("Processing")).toBeTruthy();
    expect(getByText(/“Shipment-tracking advertising profiles”/)).toBeTruthy();
  });

  it("frames a Governing-requirement chunk as the law-cite box with the caps eyebrow", () => {
    const { getByText } = render(<SkeletonDocumentView doc={DOC} product="cppa-risk" />);
    const eyebrow = getByText("Governing requirement");
    expect(eyebrow.className).toContain("uppercase");
    expect(getByText(/Section 7152\(a\)\(1\) requires/)).toBeTruthy();
  });

  it("badges the six-column ledger (likelihood/severity scale words, before/remaining levels)", () => {
    const { getAllByText } = render(<SkeletonDocumentView doc={DOC} product="cppa-risk" />);
    for (const word of ["Possible", "Significant", "High", "Moderate"]) {
      const badged = getAllByText(word).filter((el) => el.className.includes("border"));
      expect(badged.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("badges the necessity Determination column on the engine's exact words", () => {
    const { getByText } = render(<SkeletonDocumentView doc={DOC} product="cppa-risk" />);
    expect(getByText("Necessary to the stated purpose").className).toContain("emerald");
    expect(getByText("Collected but not necessary to the stated purpose").className).toContain("red");
  });

  it("opens numbered main sections with the quiet numeral — marker never underlined", () => {
    const { container } = render(<SkeletonDocumentView doc={DOC} product="cppa-risk" />);
    const numeral = Array.from(container.querySelectorAll("span")).find(
      (el) => el.textContent === "2" && el.className.includes("text-[40px]"),
    );
    expect(numeral).toBeTruthy();
    expect(numeral!.className).not.toContain("underline");
    // Non-numbered sections keep the plain heading.
    expect(container.textContent).toContain("Executive Summary");
  });

  it("leaves the non-Risk default unchanged (no glance panel, no voice chrome, token intact)", () => {
    const { container } = render(<SkeletonDocumentView doc={DOC} />);
    expect(container.textContent).not.toContain("Assessment at a Glance");
    expect(container.textContent).toContain("[Q]");
    expect(container.textContent).not.toContain("Governing requirement\n");
  });
});
