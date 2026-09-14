// /all-ptest arbitration — reviewer-coverage guards.
//
// A document whose reviews ALL failed must not arbitrate (it used to record a
// "nothing to arbitrate" verdict scored 100 — a failed product reading as
// perfect). A document arbitrated on ONE reviewer must be labelled, so no
// export reads as if two reviewers agreed.
//
// Stubbed admin client only; no network, no database.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { runArbitration } from "../../../supabase/functions/_shared/review/run-arbitration.ts";

// The model must never be reached in these tests.
Deno.env.delete("ANTHROPIC_API_KEY");

type Row = Record<string, unknown>;

function makeAdmin(opts: { reviews?: Row[]; verdicts?: Row[] }) {
  const inserted: Row[] = [];
  const query = (data: Row[]) => {
    const result = Promise.resolve({ data, error: null });
    // deno-lint-ignore no-explicit-any
    const q: any = {
      select: () => q,
      eq: () => q,
      is: () => q,
      order: () => result,
      then: (f: unknown, r: unknown) =>
        // deno-lint-ignore no-explicit-any
        result.then(f as any, r as any),
    };
    return q;
  };
  const admin = {
    from(table: string) {
      const base = query(table === "ptest_reviews" ? (opts.reviews ?? []) : (opts.verdicts ?? []));
      base.insert = (record: Row) => {
        inserted.push(record);
        return { select: () => ({ single: () => Promise.resolve({ data: { id: `row-${inserted.length}` }, error: null }) }) };
      };
      return base;
    },
  };
  return { admin, inserted };
}

const review = (reviewer: string, findings: Row[] | null, error: string | null): Row => ({
  assessment_id: "doc-1",
  company_name: "Verilink Digital Services, Inc.",
  tool_slug: "cppa-cyber",
  reviewer,
  findings,
  error,
});

const docOpts = {
  batchId: "batch-1",
  tool: "cppa-cyber",
  scope: "document" as const,
  assessmentId: "doc-1",
  effort: "high" as const,
};

Deno.test("(a) every review failed — no arbitration, no row", async () => {
  const { admin, inserted } = makeAdmin({
    reviews: [review("claude", null, "unparseable_json (0 chars)"), review("gpt", null, "timeout after 330000ms")],
  });
  const out = await runArbitration(admin, docOpts);
  assertEquals(out.ok, false);
  assertEquals(out.status, 502);
  assertEquals(out.body.error, "reviews_failed");
  assertEquals(inserted.length, 0);
});

Deno.test("(a2) no review rows at all — no arbitration, no row", async () => {
  const { admin, inserted } = makeAdmin({ reviews: [] });
  const out = await runArbitration(admin, docOpts);
  assertEquals(out.body.error, "reviews_failed");
  assertEquals(inserted.length, 0);
});

Deno.test("(b) one review failed — persisted record is labelled single_reviewer", async () => {
  const { admin, inserted } = makeAdmin({
    reviews: [review("claude", null, "unparseable_json (0 chars)"), review("gpt", [], null)],
  });
  const out = await runArbitration(admin, docOpts);
  assertEquals(out.ok, true);
  assertEquals(inserted.length, 1);
  assertEquals(inserted[0].single_reviewer, true);
  assertStringIncludes(
    String(inserted[0].summary),
    "SINGLE-REVIEWER ARBITRATION (claude review failed: unparseable_json (0 chars)).",
  );
});

Deno.test("(c) both reviews succeeded with zero findings — nothing to arbitrate, not single reviewer", async () => {
  const { admin, inserted } = makeAdmin({
    reviews: [review("claude", [], null), review("gpt", [], null)],
  });
  const out = await runArbitration(admin, docOpts);
  assertEquals(out.ok, true);
  assertEquals(inserted.length, 1);
  assertEquals(inserted[0].single_reviewer, false);
  assertEquals(inserted[0].summary, "No findings were raised; nothing to arbitrate.");
  assertEquals(inserted[0].findings_in, 0);
});

Deno.test("(d) merge — one single-reviewer verdict makes the merged record single_reviewer", async () => {
  const prefix = "SINGLE-REVIEWER ARBITRATION (gpt review failed: timeout). ";
  const { admin, inserted } = makeAdmin({
    verdicts: [
      { assessment_id: "doc-1", fix_list: [{ id: "f1" }], ceo_sheet: [], single_reviewer: true, summary: `${prefix}One issue.` },
      { assessment_id: "doc-2", fix_list: [{ id: "f2" }], ceo_sheet: [], single_reviewer: false, summary: "Two reviewers." },
    ],
  });
  // Two verdicts take the merge model path; with no API key the call throws and
  // the failure record is persisted — it must still carry the label.
  const out = await runArbitration(admin, { ...docOpts, scope: "merge", assessmentId: null });
  assertEquals(out.ok, false);
  assertEquals(inserted.length, 1);
  assertEquals(inserted[0].single_reviewer, true);
});

Deno.test("(d2) merge over a single verdict carries the label and the summary prefix", async () => {
  const prefix = "SINGLE-REVIEWER ARBITRATION (gpt review failed: timeout). ";
  const { admin, inserted } = makeAdmin({
    verdicts: [{ assessment_id: "doc-1", fix_list: [], ceo_sheet: [], single_reviewer: true, summary: `${prefix}One issue.` }],
  });
  const out = await runArbitration(admin, { ...docOpts, scope: "merge", assessmentId: null });
  assertEquals(out.ok, true);
  assertEquals(inserted.length, 1);
  assertEquals(inserted[0].single_reviewer, true);
  assertStringIncludes(String(inserted[0].summary), prefix.trim());
});

Deno.test("(e) merge with no successful document verdict fails as no_document_arbitrations", async () => {
  const { admin, inserted } = makeAdmin({ verdicts: [] });
  const out = await runArbitration(admin, { ...docOpts, scope: "merge", assessmentId: null });
  assertEquals(out.status, 502);
  assertEquals(out.body.error, "no_document_arbitrations");
  assertEquals(inserted.length, 0);
  assert(!out.rowId);
});
