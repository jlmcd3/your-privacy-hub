// PANEL FIX BATCH 10 (2026-08-30) — sample-page rendering overhaul
// (doc 108 SAMP-1/2/3):
//   SAMP-1  the public sample pages were the last surface rendering the
//           LEGACY narrative bodies; the assembled skeleton_document (the
//           SO-3 customer surface every live result page uses) now renders
//           first whenever the row carries one, object or flattened text;
//   SAMP-2  the generic fallback renderer dumped engine telemetry (_meta,
//           warnings, rules_fired) onto published pages;
//   SAMP-3  the file-driven samples (RoPA, US/EU notices) carry a stored
//           PDF and no row content — the page said "No rendered content is
//           available"; the PDF now embeds via a signed URL.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: "https://signed.example/sample.pdf" } }),
      }),
    },
  },
}));

import { SampleToolReport } from "@/components/SampleToolReport";
import { SampleReportBody } from "@/components/SampleReportBody";

const SKELETON = {
  _typed: "skeleton-document@test",
  title: "GDPR Governance Assessment",
  subtitle: "Prepared for Misfit Toys Logistics Ltd",
  sections: [
    {
      id: "executive_summary",
      title: "Executive Summary",
      paragraphs: [{ kind: "lead", text: "The accountability determination is carried below." }],
    },
  ],
};

describe("SAMP-1 — skeleton_document renders first on sample pages", () => {
  it("renders the skeleton document when the row carries the object form", () => {
    render(
      <SampleToolReport
        toolSlug="governance"
        documentText={null}
        reportData={{ skeleton_document: SKELETON, domain_findings: { x: { legacy: "must not render" } } }}
      />,
    );
    expect(screen.getByText("GDPR Governance Assessment")).toBeTruthy();
    expect(screen.getByText("The accountability determination is carried below.")).toBeTruthy();
    expect(screen.queryByText(/must not render/)).toBeNull();
  });
});

describe("SAMP-2 — the generic renderer never dumps engine telemetry", () => {
  it("hides _meta, warnings, rules_fired and underscore keys; renders real content", () => {
    render(
      <SampleReportBody
        documentText={null}
        reportData={{
          _meta: { internal: { secret: "TELEMETRY-LEAK" } },
          warnings: ["WARN-LEAK"],
          rules_fired: ["RULE-LEAK"],
          _anything: "UNDERSCORE-LEAK",
          summary: "The visible customer summary.",
        }}
      />,
    );
    expect(screen.getByText("The visible customer summary.")).toBeTruthy();
    for (const leak of ["TELEMETRY-LEAK", "WARN-LEAK", "RULE-LEAK", "UNDERSCORE-LEAK"]) {
      expect(screen.queryByText(new RegExp(leak))).toBeNull();
    }
  });
});

describe("SAMP-3 — a file-driven sample embeds its PDF", () => {
  it("renders the PDF embed when the row has no content but carries pdf_path", async () => {
    render(
      <SampleToolReport
        toolSlug="ropa"
        documentText={null}
        reportData={null}
        pdfPath="ropa/eu/sample.pdf"
      />,
    );
    const frame = await screen.findByTitle("Sample document (PDF)");
    expect(frame.getAttribute("src")).toBe("https://signed.example/sample.pdf");
  });

  it("keeps the honest empty-state when there is neither content nor a PDF", () => {
    render(<SampleToolReport toolSlug="ropa" documentText={null} reportData={null} />);
    expect(screen.getByText(/No rendered content is available/)).toBeTruthy();
  });
});
