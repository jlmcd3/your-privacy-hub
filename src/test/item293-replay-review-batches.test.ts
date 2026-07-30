// ITEM 293 — pins for the /admin/replay-review batch selection logic.
// The page previously hardcoded ACCEPTANCE_NOTE_PREFIXES = ["Acceptance-40",
// "Ramp step 1, attempt 9"], so only Item-269-era rows were ever listed.
import { describe, it, expect } from "vitest";
import {
  sortJobsNewestFirst,
  batchLabels,
  defaultBatchLabel,
  jobLabel,
  type HarnessJob,
} from "@/pages/admin/AdminReplayReview";

const j = (id: string, notes: string | null, created_at: string): HarnessJob => ({
  id,
  notes,
  status: "complete",
  created_at,
  doc_ids: ["d1"],
});

const CLEAN4 = "Step 0a — CLEAN RUN batch 4 (post-Item-290, 20 docs, CEO read gate)";
const ACC40 = "Acceptance-40 final";
const RAMP = "Ramp step 1, attempt 9";

const JOBS: HarnessJob[] = [
  j("a", ACC40, "2026-07-30T06:00:00Z"),
  j("b", CLEAN4, "2026-07-30T22:15:00Z"),
  j("c", RAMP, "2026-07-29T10:00:00Z"),
  j("d", CLEAN4, "2026-07-30T22:23:00Z"),
];

describe("ITEM 293 — replay review batch selection", () => {
  it("orders jobs newest-first", () => {
    expect(sortJobsNewestFirst(JOBS).map((x) => x.id)).toEqual(["d", "b", "a", "c"]);
  });

  it("defaults to the most recent batch label", () => {
    expect(defaultBatchLabel(JOBS)).toBe(CLEAN4);
  });

  it("exposes all distinct batch labels newest-first, keeping Item-269-era rows reachable", () => {
    expect(batchLabels(JOBS)).toEqual([CLEAN4, ACC40, RAMP]);
    // regression: the old hardcoded batches remain selectable via the filter
    const acceptanceJobs = JOBS.filter((x) => jobLabel(x) === ACC40);
    expect(acceptanceJobs.map((x) => x.id)).toEqual(["a"]);
    const rampJobs = JOBS.filter((x) => jobLabel(x) === RAMP);
    expect(rampJobs.map((x) => x.id)).toEqual(["c"]);
  });

  it("labels unnamed jobs without dropping them", () => {
    const list = [...JOBS, j("e", null, "2026-07-31T01:00:00Z")];
    expect(defaultBatchLabel(list)).toBe("(no label)");
    expect(batchLabels(list)).toContain(CLEAN4);
  });

  it("returns null when there are no jobs", () => {
    expect(defaultBatchLabel([])).toBeNull();
  });
});
