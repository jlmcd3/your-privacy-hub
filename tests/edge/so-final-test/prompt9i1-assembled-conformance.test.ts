// PROMPT 9I.1 (CEO-ratified 2026-08-16) — RATIFIED-BYTES CONFORMANCE.
//
// These sentinels test the ASSEMBLED DOCUMENT, not the constants: the 9I
// constant-level sentinels passed while the document deviated, because the
// composed blocks were pinned to stale spine block indices.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildDpiaDeliverables, DPIA_NECESSITY_TEST_SENTENCE } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import {
  assembleDpiaSkeletonDocument,
  boundedClause,
  DPIA_S3_DETERMINATION_ESTABLISHED,
  DPIA_S3_LEAD,
} from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { DPIA_PERFECT_PINNED } from "../../../supabase/functions/_shared/golden/dpia-perfect-pinned.ts";
import { checkPerfectDpiaIntake } from "../../../supabase/functions/_shared/quality/perfect-closed-loop.ts";

/** The clause bound every Section 3 customer quote must respect. */
const S3_QUOTE_BOUND = 400;

// deno-lint-ignore no-explicit-any
type Any = any;

function pinned(marker: string): Any {
  const c = DPIA_PERFECT_PINNED.find((x) => JSON.stringify(x).includes(marker)) as Any;
  assert(c, `pinned fixture not found: ${marker}`);
  return c.intake ?? c.intake_data ?? c;
}

function assemble(intake: Any) {
  const report = buildDpiaDeliverables(intake) as Any;
  const { document } = assembleDpiaSkeletonDocument(report, intake);
  const section = (id: string) => document.sections.find((s: Any) => s.id === id)!;
  const paras = (id: string) => section(id).paragraphs.map((p: Any) => String(p.text ?? ""));
  return { document, section, paras, text: document.sections
    .flatMap((s: Any) => s.paragraphs.map((p: Any) => String(p.text ?? ""))).join("\n") };
}

const HARROWGATE = pinned("Quarterly portfolio pricing calibration");

Deno.test("9I.1 (i) — the assembled Harrowgate document carries every ratified sentence verbatim", () => {
  const { paras, text } = assemble(HARROWGATE);
  const s3 = paras("section_3_necessity_proportionality");
  assertEquals(s3[1], DPIA_S3_LEAD);
  assert(text.includes(DPIA_NECESSITY_TEST_SENTENCE), "necessity-test sentence missing");
  assert(text.includes("On the benefit side of the balance, the company states:"), "benefit sentence missing");
  assert(
    text.includes("On the impact side, stated separately from the benefit, the company states:"),
    "impact sentence missing",
  );
  assert(text.includes(DPIA_S3_DETERMINATION_ESTABLISHED), "determination sentence missing");
});

Deno.test("9I.1 (ii) — the retired bytes appear nowhere in the assembled document", () => {
  const { text, paras } = assemble(HARROWGATE);
  assert(!/On the record as it stands/i.test(text), "retired 'on the record' register survives");
  assert(!text.includes("On the benefit of the processing, the company states that"), "retired benefit sentence survives");
  const lead = paras("section_3_necessity_proportionality")[1];
  assert(
    !lead.includes("Necessity and proportionality are established based on the information the company provided"),
    "established-verdict lead still occupies the lead position",
  );
});

Deno.test("9I.1 (iii) — Section 3 renders lead → necessity → proportionality → determination last", () => {
  const { paras } = assemble(HARROWGATE);
  const s3 = paras("section_3_necessity_proportionality");
  const iLead = s3.indexOf(DPIA_S3_LEAD);
  const iNecessity = s3.findIndex((p) => p === DPIA_NECESSITY_TEST_SENTENCE);
  const iProp = s3.findIndex((p) => p.startsWith("On the benefit side of the balance"));
  const iDet = s3.findIndex((p) => p === DPIA_S3_DETERMINATION_ESTABLISHED);
  assert(iLead === 1, `lead position: ${iLead}`);
  assert(iLead < iNecessity && iNecessity < iProp && iProp < iDet, `${iLead}/${iNecessity}/${iProp}/${iDet}`);
  // determination is the LAST composed paragraph — only the §3.1 design-risk
  // skeleton block and its table follow it.
  const after = s3.slice(iDet + 1);
  assert(after.every((p) => !p.startsWith("On the benefit") && p !== DPIA_NECESSITY_TEST_SENTENCE), "analysis after determination");
});

Deno.test("9I.1 (iv) — every Section 3 customer quote is clause-bounded", () => {
  const { paras } = assemble(HARROWGATE);
  const s3 = paras("section_3_necessity_proportionality").join("\n");
  const long: string[] = [];
  for (const m of s3.matchAll(/"([^"]+)"/g)) {
    if (m[1].length > S3_QUOTE_BOUND) long.push(`${m[1].length}: ${m[1].slice(0, 80)}`);
    else if (boundedClause(m[1]) !== m[1]) long.push(`unbounded: ${m[1].slice(0, 80)}`);
  }
  assertEquals(long, []);
});

Deno.test("9I.1 (v) — Section 4 renders the most-significant-remaining-risk summary as its closing paragraph", () => {
  const { paras } = assemble(HARROWGATE);
  const s4 = paras("section_4_risk_management").filter((p) => p.trim().length > 0);
  const last = s4[s4.length - 1];
  assert(
    last.startsWith("After the mitigating measures the company has identified, the most significant remaining risk is:"),
    last.slice(0, 160),
  );
  assert(/preliminary remaining risk level of /.test(last), last.slice(0, 160));
});

Deno.test("9I.1 — pin guard: every pinned perfect fixture still passes the closed-loop check", () => {
  assert(DPIA_PERFECT_PINNED.length >= 2);
  for (const f of DPIA_PERFECT_PINNED as Any[]) {
    const res = checkPerfectDpiaIntake(f.intake ?? f.intake_data ?? f);
    assert(res.ok, JSON.stringify(res));
  }
});
