// DOC 170 (2026-09-04) — web-twin guards for Syllabus & Record: a product in
// the SR gate renders page one from the persisted projection (no glance
// panel, no cover/result tables), the section heads carry the quiet numeral
// and the question line, the Governing-requirement rail, the record
// divider, and states as tinted text; a product outside the gate is
// unchanged.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonDocumentView, type SkeletonDocument } from "@/components/reports/SkeletonDocumentView";
import { SR_PRODUCTS } from "@/lib/syllabus-record";

const DOC: SkeletonDocument = {
  title: "CPPA Privacy Risk Assessment",
  syllabus: {
    _typed: "syllabus@sr-2026-09-04",
    instrument_line: "CPPA PRIVACY RISK ASSESSMENT · 11 CCR §§ 7150–7157",
    prepared_for: "Acme, Inc.",
    activity: "Shipment-tracking advertising profiles",
    subtitle: "Risk assessment under 11 CCR §§ 7150–7157 · the “Activity”",
    disposition_label: "ASSESSMENT DISPOSITION",
    disposition: "Proceed with Conditions",
    disposition_tone: "hold",
    paragraph: "Based on the information provided by the Company, the benefits outweigh the risks that remain.",
    rows: [["Assessment required", "Yes — two § 7150(b) triggers engaged"], ["Residual privacy risk", "Moderate — after credited safeguards"]],
    conditions_heading: "CONDITIONS TO PROCEED — the disposition depends on these",
    conditions: [{ name: "Necessity of “Email”", text: "Cease processing, or establish the necessity of, “Email”." }],
    key_dates: [["Three-year review", "2029-09-04"]],
    record_map: [["A", "Factor, Determination, and Authority Matrix", "The factors analyzed."]],
    running_head: "CPPA PRIVACY RISK ASSESSMENT · ACME, INC.",
  },
  sections: [
    {
      id: "cover",
      title: "Assessment Profile",
      paragraphs: [{
        kind: "table",
        text: "",
        table: { surface: "exec_status_panel", title: "Assessment Result", columns: ["Determination", "Result"], hideHeader: true, rows: [["Assessment disposition", "Proceed with Conditions"]] },
      }],
    },
    {
      id: "executive_summary",
      title: "Executive Summary",
      paragraphs: [{ kind: "lead", text: "Based on the information provided by the Company, the benefits outweigh the risks that remain." }, { kind: "skeleton", text: "A. Activity Assessed. The activity assessed is identified by the Company." }],
    },
    {
      id: "ii_information",
      title: "2. The Information Provided",
      paragraphs: [
        { kind: "skeleton", text: "[Q] What is being processed, about whom, and why — in the Company’s own words.\n\nGoverning requirement. Section 7152(a)(1) requires the assessment to state the Company’s purpose with enough specificity." },
        { kind: "customer_voice", text: "In Acme’s words\nProcessing. “Shipment-tracking advertising profiles”" },
        { kind: "table", text: "", table: { surface: "exec_triggers", columns: ["Trigger", "State"], rows: [["§ 7150(b)(1)", "Engaged — the Company answers Yes"]] } },
      ],
    },
    { id: "table_of_authorities", title: "Appendix A — Factor, Determination, and Authority Matrix", paragraphs: [{ kind: "skeleton", text: "The table below identifies the factors analyzed." }] },
  ],
};

describe("DOC 170 — Syllabus & Record web twin", () => {
  it("gates on the shared product set", () => {
    expect(SR_PRODUCTS.has("cppa-risk")).toBe(true);
  });

  it("renders page one from the projection and drops the surfaces it consumes", () => {
    const { container } = render(<SkeletonDocumentView doc={DOC} product="cppa-risk" />);
    const text = container.textContent ?? "";
    expect(container.querySelector('[data-sr="1"]')).not.toBeNull();
    expect(text).toContain("END USER PRIVACY");
    expect(text).toContain("Prepared for Acme, Inc.");
    expect(text).toContain("ASSESSMENT DISPOSITION");
    expect(text).toContain("Proceed with Conditions");
    expect(text).toContain("CONDITIONS TO PROCEED");
    expect(text).toContain("Necessity of “Email”");
    expect(text).toContain("KEY DATES");
    expect(text).not.toContain("Assessment at a Glance");
    expect(text).not.toContain("Assessment Result");
    // The executive lead is on page one, not repeated in the section.
    expect(text.split("the benefits outweigh the risks that remain").length - 1).toBe(1);
  });

  it("renders the numeral head with the question line, the Governing-requirement rail, the customer-voice rail, state tint and the divider", () => {
    const { container } = render(<SkeletonDocumentView doc={DOC} product="cppa-risk" />);
    const text = container.textContent ?? "";
    expect(text).toContain("What is being processed, about whom, and why");
    expect(text).not.toContain("[Q]");
    expect(text).toContain("Governing requirement · 11 CCR § 7152(a)(1)");
    expect(text).toContain("In Acme’s words");
    expect(text).toContain("Supporting Assessment Record");
    expect(text).toContain("The factors analyzed.");
    // "Engaged — …" tints the state word as text.
    const state = [...container.querySelectorAll("span")].find((el) => el.textContent === "Engaged");
    expect(state).toBeDefined();
    expect(state!.className).toContain("text-[#28503a]");
    // Markers are never underlined; the lead's title words are (marker split).
    const underlined = [...container.querySelectorAll("span, u")]
      .filter((el) => el.className.includes("underline") || el.tagName === "U")
      .map((el) => el.textContent);
    expect(underlined).toContain("Activity Assessed");
    expect(underlined).not.toContain("A.");
    expect(underlined).toContain("Necessity of “Email”");
  });

  it("leaves a product outside the gate on the existing renderer", () => {
    // DOC 175 note: cppa-cyber joined SR_PRODUCTS after this test was
    // written; ir-playbook remains outside the gate.
    const { container } = render(<SkeletonDocumentView doc={DOC} product="ir-playbook" />);
    expect(container.querySelector('[data-sr="1"]')).toBeNull();
    expect(container.textContent).toContain("CPPA Privacy Risk Assessment");
  });
});
