// DOC 188 (2026-09-05) — all-products batch e38460 (pinned data), Registration
// items, on the batch's own record shape (Silverbell Health Networks Ltd,
// eu-ds4: EU-established, not UK-established, UK and DE among the markets,
// 320 staff, special categories answered false).
//
//   P1  The Duty-status table and the UK Art. 27 paragraph listed "whether
//       special-category data is processed on a large scale" as MISSING
//       information while the record answers processes_special_categories:
//       false — an answered limb recited as open. The list is pruned by the
//       limbs the record answers; an unstated answer keeps the limb.
//   P2  Authorities Cited listed GDPR Art. 27(1), 37(1)(a)–(c), UK GDPR Art.
//       27(1) and "BDSG § 38" while the body cites UK GDPR Art. 27(2)(a),
//       27(2)(b) and BDSG § 38(1). The conditional/engaged representative
//       determination now carries `citations` (walkCites picks them up) and
//       the table prints the cited § pinpoint.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildRegistrationDeliverables } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import { assembleRegistrationSkeletonDocument } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts";
import { baseSection, buildAuthorityExhibit } from "../../../supabase/functions/_shared/report-exhibits/authority-exhibit.ts";
import { REGISTRATION_DUTY_AUTHORITIES } from "../../../supabase/functions/run-registration-assessment/_local/registry/registration-verified-authorities.ts";

type Bag = Record<string, unknown>;

const silverbell: Bag = {
  organization_name: "Silverbell Health Networks Ltd",
  organization_country: "IE",
  organization_size: "medium",
  employee_count: 320,
  annual_revenue_usd: 45_000_000,
  industry: "Manufacturing",
  markets_served: ["IE", "DE", "FR", "UK"],
  has_eu_establishment: true,
  has_uk_establishment: false,
  processes_personal_data: true,
  processes_special_categories: false,
  large_scale_monitoring: false,
  is_public_authority: false,
  acts_as_data_broker: false,
  sells_or_licenses_brokered_data: false,
  uses_ai_systems: false,
};

// Mirrors index.ts's walkCites + exhibit build exactly.
function exhibitFor(deliverables: Bag) {
  const cited = new Set<string>();
  const walk = (v: unknown): void => {
    if (typeof v === "string") return;
    if (Array.isArray(v)) { for (const x of v) walk(x); return; }
    if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v as Bag)) {
        if (k === "_meta" || k === "_staging") continue;
        if ((k === "citation" || k === "window_citation" || k === "fee_citation") && typeof x === "string" && x.trim()) cited.add(x.trim());
        else if (k === "citations" && Array.isArray(x)) { for (const c of x) if (typeof c === "string" && c.trim()) cited.add(c.trim()); }
        else walk(x);
      }
    }
  };
  walk(deliverables);
  const seenBase = new Set<string>();
  const provisions = REGISTRATION_DUTY_AUTHORITIES.flatMap((r) => {
    const base = baseSection(r.citation);
    if (seenBase.has(base)) return [];
    seenBase.add(base);
    return [{ key: r.corpus_key, citation: base, verbatim_excerpt: r.verbatim_quote, status: "approved" }];
  });
  return buildAuthorityExhibit([...cited], provisions);
}

function reportFor(intake: Bag): { d: Bag; report: Bag } {
  const d = buildRegistrationDeliverables(intake as never) as unknown as Bag;
  return { d, report: { registration_deliverables: d, ...d, obligations_summary: {}, jurisdictions: [], authority_exhibit: exhibitFor(d) } };
}

function ukRep(d: Bag): Bag {
  const reps = d.representative_determinations as Bag[];
  return reps.find((r) => r.jurisdiction === "UK")!;
}

function toaText(intake: Bag): { text: string; toa: string } {
  const { report } = reportFor(intake);
  const out = assembleRegistrationSkeletonDocument(report, intake) as unknown as { document: { sections: Array<{ id: string; paragraphs: Array<{ text?: string }> }> } };
  const section = out.document.sections.find((s) => s.id === "table_of_authorities");
  assert(section, "no Authorities Cited section");
  return { text: JSON.stringify(out), toa: section!.paragraphs.map((p) => String(p.text ?? "")).join("\n") };
}

// ── P1 ───────────────────────────────────────────────────────────────────────

Deno.test("doc188 P1 — a record that answers special categories 'no' is not asked whether they are processed at scale", () => {
  const { d } = reportFor(silverbell);
  const uk = ukRep(d);
  assertEquals(uk.verdict, "conditional");
  assertEquals(
    uk.information_needed,
    "whether the processing is occasional and whether the processing is unlikely to result in a risk to the rights and freedoms of natural persons",
  );
  const { text } = toaText(silverbell);
  assertStringIncludes(text, "What is missing is whether the processing is occasional and whether the processing is unlikely to result in a risk");
  assert(!text.includes("special-category data is processed on a large scale"), "an answered limb must not be listed as missing");
});

Deno.test("doc188 P1 — an unstated special-category answer keeps the limb open, and an unscaled 'yes' names the scale gap", () => {
  const { d: open } = reportFor({ ...silverbell, processes_special_categories: undefined });
  assertEquals(
    ukRep(open).information_needed,
    "whether the processing is occasional, whether special-category data is processed on a large scale, and whether the processing is unlikely to result in a risk to the rights and freedoms of natural persons",
  );
  const { d: unscaled } = reportFor({ ...silverbell, processes_special_categories: true });
  assertStringIncludes(String(ukRep(unscaled).information_needed), "whether special-category data is processed on a large scale (special categories are recorded without a scale)");
});

// ── P2 ───────────────────────────────────────────────────────────────────────

Deno.test("doc188 P2 — the conditional UK determination carries the exemption pinpoints it cites; the not-applicable EU one carries none", () => {
  const { d } = reportFor(silverbell);
  assertEquals(ukRep(d).citations, ["UK GDPR Art. 27(1)", "UK GDPR Art. 27(2)(a)", "UK GDPR Art. 27(2)(b)"]);
  const eu = (d.representative_determinations as Bag[]).find((r) => r.jurisdiction === "EU")!;
  assertEquals(eu.verdict, "not_applicable");
  assertEquals(eu.citations, undefined);
});

Deno.test("doc188 P2 — Authorities Cited lists UK GDPR Art. 27(2)(a), 27(2)(b) and BDSG § 38(1)", () => {
  const { toa, text } = toaText(silverbell);
  for (const line of ["UK GDPR Art. 27(1)", "UK GDPR Art. 27(2)(a)", "UK GDPR Art. 27(2)(b)", "GDPR Art. 27(1)", "BDSG § 38(1)"]) {
    assertStringIncludes(toa, line);
  }
  assert(!/BDSG § 38\n|BDSG § 38$/.test(toa), "the table must print the cited pinpoint, not the bare section");
  // iff-cited: every listed authority appears in the body.
  for (const line of toa.split("\n").map((l) => l.trim()).filter((l) => l && !/^(Regulations|Statutes|Guidance)/.test(l))) {
    assert(text.includes(line), `Authorities Cited lists ${line}, which the body does not cite`);
  }
});

Deno.test("doc188 P2 — an EU-established, UK-established record cites no Art. 27(2) exemption", () => {
  const { toa } = toaText({ ...silverbell, has_uk_establishment: true });
  assert(!toa.includes("Art. 27(2)"), "no exemption row is cited when the duty never arises");
});
