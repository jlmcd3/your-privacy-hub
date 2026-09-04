// DOC 177 (2026-09-04) — web-twin guard for Syllabus & Record, IR Playbook.
// The renderer path itself is fully generic and already covered by the
// doc170 suite; this test confirms "ir-playbook" is gated in, that a
// persisted IR syllabus renders page one without error, and that the
// standing_playbook section's own `kind: "lead"` block (IR's own section id
// for the determination lead, unlike every other product's
// "executive_summary") doesn't repeat in the body.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonDocumentView, type SkeletonDocument } from "@/components/reports/SkeletonDocumentView";
import { SR_PRODUCTS } from "@/lib/syllabus-record";

const DOC: SkeletonDocument = {
  title: "Incident Response Playbook",
  syllabus: {
    _typed: "syllabus@sr-2026-09-04",
    instrument_line: "INCIDENT RESPONSE PLAYBOOK",
    prepared_for: "Acme, Inc.",
    activity: "Standing Incident-Response Preparedness",
    subtitle: "Part One — the standing playbook; Part Two — the incident worksheet, blank by design absent a recorded incident",
    disposition_label: "READINESS",
    disposition: "Ready",
    disposition_tone: "ok",
    paragraph: "Readiness. On the company's answers, Acme, Inc.'s standing preparedness would carry it through a notifiable incident, subject to the arrangements being operated as recorded.",
    rows: [["Standing sections recorded", "2 of 2"], ["Preparedness gaps", "None — every standing section is recorded and complete on the company's answers"]],
    conditions_heading: "",
    conditions: [],
    key_dates: [],
    record_map: [],
    running_head: "INCIDENT RESPONSE PLAYBOOK · ACME, INC.",
  },
  sections: [
    {
      id: "standing_playbook",
      title: "Part One — The Standing Playbook",
      paragraphs: [
        { kind: "lead", text: "Readiness. On the company's answers, Acme, Inc.'s standing preparedness would carry it through a notifiable incident, subject to the arrangements being operated as recorded." },
        { kind: "skeleton", text: "This playbook is Acme, Inc.'s own." },
      ],
    },
  ],
};

describe("DOC 177 — Syllabus & Record web twin, IR Playbook", () => {
  it("gates ir-playbook on the shared product set", () => {
    expect(SR_PRODUCTS.has("ir-playbook")).toBe(true);
  });

  it("renders page one from the IR Playbook projection without error, and drops the standing_playbook lead it now consumes", () => {
    const { container } = render(<SkeletonDocumentView doc={DOC} product="ir-playbook" />);
    const text = container.textContent ?? "";
    expect(container.querySelector('[data-sr="1"]')).not.toBeNull();
    expect(text).toContain("Prepared for Acme, Inc.");
    expect(text).toContain("READINESS");
    expect(text).toContain("Ready");
    // The determination sentence appears once (page one), not again in
    // Part One's own body.
    expect(text.split("would carry it through a notifiable incident").length - 1).toBe(1);
    expect(text).toContain("This playbook is Acme, Inc.'s own.");
  });

  it("leaves a non-gated product on the existing renderer", () => {
    const { container } = render(<SkeletonDocumentView doc={DOC} product="biometric" />);
    expect(container.querySelector('[data-sr="1"]')).toBeNull();
  });
});
