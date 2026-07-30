// ITEM 294 — pins for the /admin/replay-review layout + robustness fixes:
//  (1) label hygiene: a trailing "[bg:…]" harness marker never splits a batch;
//  (2) render order: the DOCUMENTS table precedes the jobs table, and the jobs
//      table is collapsed behind a "Show jobs (N)" toggle by default;
//  (3) fail-visible: a results-query error renders an inline banner.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/components/report-bodies/CPPARiskReportBody", () => ({
  default: () => null,
}));

const state: { resultsError: { message: string } | null } = { resultsError: null };

const JOB = {
  id: "job-1",
  notes: "Step 0a — CLEAN RUN batch 4 [bg:waitUntil]",
  status: "complete",
  created_at: "2026-07-30T22:15:00Z",
  doc_ids: ["d1"],
};

const RESULT = {
  id: "res-1",
  job_id: "job-1",
  doc_id: "0123456789abcdef",
  created_at: "2026-07-30T22:20:00Z",
  per_doc_result: { gtm: { verdict: "release_with_logged_defects", logged_defects: [] } },
  assembled_report: {},
};

function builder(table: string) {
  const payload =
    table === "replay_harness_jobs"
      ? { data: [JOB], error: null }
      : { data: state.resultsError ? null : [RESULT], error: state.resultsError };
  const api: any = {
    select: () => api,
    in: () => api,
    order: () => api,
    then: (res: any) => Promise.resolve(payload).then(res),
  };
  return api;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (t: string) => builder(t),
    rpc: async () => ({ data: [], error: null }),
    functions: { invoke: async () => ({ data: null, error: new Error("boom") }) },
  },
}));

import AdminReplayReview, { jobLabel, stripBgMarker, batchLabels, type HarnessJob } from "@/pages/admin/AdminReplayReview";

const j = (id: string, notes: string | null, created_at: string): HarnessJob => ({
  id,
  notes,
  status: "complete",
  created_at,
  doc_ids: ["d1"],
});

describe("ITEM 294 — label hygiene", () => {
  it("strips a trailing [bg:…] marker for display", () => {
    expect(stripBgMarker("CLEAN RUN batch 4 [bg:waitUntil]")).toBe("CLEAN RUN batch 4");
    expect(stripBgMarker("CLEAN RUN batch 4")).toBe("CLEAN RUN batch 4");
  });

  it("groups marked and unmarked jobs into one batch", () => {
    const jobs = [
      j("a", "CLEAN RUN batch 4 [bg:waitUntil]", "2026-07-30T22:23:00Z"),
      j("b", "CLEAN RUN batch 4", "2026-07-30T22:15:00Z"),
    ];
    expect(jobLabel(jobs[0])).toBe(jobLabel(jobs[1]));
    expect(batchLabels(jobs)).toEqual(["CLEAN RUN batch 4"]);
  });
});

describe("ITEM 294 — layout + fail-visible", () => {
  beforeEach(() => {
    state.resultsError = null;
  });

  it("renders the documents table above the jobs table, with jobs collapsed by default", async () => {
    const { container } = render(<AdminReplayReview />);
    const docs = await screen.findByTestId("documents-table");
    expect(screen.queryByTestId("jobs-table")).toBeNull();
    const toggle = screen.getByRole("button", { name: /Show jobs \(1\)/ });
    expect(
      docs.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container).toBeTruthy();
  });

  it("renders an inline error banner when the results query fails", async () => {
    state.resultsError = { message: "edge failure" };
    render(<AdminReplayReview />);
    await waitFor(() => {
      expect(screen.getByTestId("results-error")).toBeTruthy();
    });
    expect(screen.getByTestId("results-error").textContent).toContain("edge failure");
  });
});
