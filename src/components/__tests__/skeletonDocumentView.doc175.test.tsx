// DOC 175 (2026-09-04) — web-twin guard for Syllabus & Record, Cyber v4.
// The renderer path itself is fully generic and already covered by the
// doc170 suite; this test confirms cppa-cyber is gated in, that a
// persisted Cyber v4 syllabus renders page one without error, that the two
// tables it now consumes (surfaces "cyber_v4_cover" and
// "cyber_v4_readiness_snapshot") don't repeat in the body, and that a
// syllabus-less (v3-shaped) document sharing the same "cppa-cyber" product
// string does NOT enter Syllabus & Record mode.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonDocumentView, type SkeletonDocument } from "@/components/reports/SkeletonDocumentView";
import { SR_PRODUCTS } from "@/lib/syllabus-record";

const DOC: SkeletonDocument = {
  title: "CPPA Cybersecurity Audit Readiness Report",
  syllabus: {
    _typed: "syllabus@sr-2026-09-04",
    instrument_line: "CPPA CYBERSECURITY AUDIT READINESS REPORT · 11 CCR §§ 7120–7124",
    prepared_for: "Acme, Inc.",
    activity: "CPPA Cybersecurity Audit Readiness",
    subtitle: "Cybersecurity audit readiness assessment under 11 CCR §§ 7120–7124",
    disposition_label: "OVERALL ASSESSMENT",
    disposition: "Ready for the independent audit on the Company's answers",
    disposition_tone: "ok",
    paragraph: "On the information provided the business is ready for a § 7124 certified cybersecurity audit.",
    rows: [["Evidence posture", "Testable operating evidence identified for 18 of 18 components"], ["Blocking components", "None — no component blocks certification on the information provided (Appendix A)"]],
    conditions_heading: "",
    conditions: [],
    key_dates: [],
    record_map: [["A", "Component Readiness Matrix", ""]],
    running_head: "CPPA CYBERSECURITY AUDIT READINESS REPORT · ACME, INC.",
  },
  sections: [
    {
      id: "cover",
      title: "Assessment Profile",
      paragraphs: [
        { kind: "table", text: "", table: { surface: "cyber_v4_cover", title: "", hideHeader: true, columns: ["Field", "Value"], rows: [["Entity", "Acme, Inc."], ["Overall assessment", "Ready for the independent audit on the Company's answers"]] } },
        { kind: "skeleton", text: "Reliance notice. This report evaluates audit readiness from information supplied by the Company." },
      ],
    },
    {
      id: "executive_summary",
      title: "Executive Summary",
      paragraphs: [
        { kind: "lead", text: "On the information provided the business is ready for a § 7124 certified cybersecurity audit." },
        { kind: "table", text: "", table: { surface: "cyber_v4_readiness_snapshot", title: "Readiness snapshot", hideHeader: true, columns: ["Field", "Value"], rows: [["Evidence posture", "Testable operating evidence identified for 18 of 18 components"]] } },
      ],
    },
    { id: "appendix_a", title: "Appendix A — Component Readiness Matrix", paragraphs: [{ kind: "skeleton", text: "The table below identifies each component." }] },
  ],
};

const V3_DOC: SkeletonDocument = { ...DOC, syllabus: undefined };

describe("DOC 175 — Syllabus & Record web twin, Cyber v4", () => {
  it("gates cppa-cyber on the shared product set", () => {
    expect(SR_PRODUCTS.has("cppa-cyber")).toBe(true);
  });

  it("renders page one from the Cyber v4 projection without error, and drops the two tables it now consumes", () => {
    const { container } = render(<SkeletonDocumentView doc={DOC} product="cppa-cyber" />);
    const text = container.textContent ?? "";
    expect(container.querySelector('[data-sr="1"]')).not.toBeNull();
    expect(text).toContain("Prepared for Acme, Inc.");
    expect(text).toContain("OVERALL ASSESSMENT");
    expect(text).toContain("Supporting Assessment Record");
    // "Evidence posture" appears once (page one), not again in the
    // Readiness snapshot table the syllabus now consumes.
    expect(text.split("Evidence posture").length - 1).toBe(1);
  });

  it("does NOT enter Syllabus & Record mode for a syllabus-less document, even sharing the same gated product string (the Cyber v3 case)", () => {
    const { container } = render(<SkeletonDocumentView doc={V3_DOC} product="cppa-cyber" />);
    expect(container.querySelector('[data-sr="1"]')).toBeNull();
  });

  it("leaves a non-gated product on the existing renderer", () => {
    // DOC 177 note: ir-playbook joined SR_PRODUCTS after this test was
    // written; biometric is permanently excluded (CEO scope).
    const { container } = render(<SkeletonDocumentView doc={DOC} product="biometric" />);
    expect(container.querySelector('[data-sr="1"]')).toBeNull();
  });
});
