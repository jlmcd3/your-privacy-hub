// DOC 180 (2026-09-04) — the EU/UK GDPR notice spine and the formal-
// instrument presentation. Pins the CEO rulings of 2026-09-04: no new intake
// fields (every uncollected fact is an italic bracketed prompt), Georgia /
// formal-instrument format (no Syllabus & Record components), the per-
// purpose scaffold, the corpus-backed legal positions (Art. 9 from the
// customer's own answer, Art. 21(4) separate, no placeholder, no fabricated
// TIA, UK Articles 22A–22C), and the de-draft rule for the completion
// banner.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildCombinedHtml,
  buildNoticeHtml,
  buildNoticeSections,
  type FwSel,
} from "../../../supabase/functions/generate-eu-notice/index.ts";
import {
  completionBannerHtml,
  countFills,
  fill,
} from "../../../supabase/functions/_shared/prose/formal-instrument.ts";

const EU: FwSel = { framework_code: "EU_GDPR", framework_name: "EU GDPR", region: "EU" };
const UK: FwSel = { framework_code: "UK_GDPR", framework_name: "UK GDPR", region: "UK" };
const BR: FwSel = { framework_code: "BR_LGPD", framework_name: "Brazil LGPD", region: "BR" };
const AT = "September 4, 2026";

// A well-answered record: every collected field present, incl. the GDPR block
// the legacy template never read.
const FULL: Record<string, unknown> = {
  controller_name: "Misfit Toys Logistics Ltd",
  controller_address: "Unit 4, North Docks Business Park, Dublin, Ireland",
  contact_email: "privacy@misfit.example",
  dpo_details: "yes",
  dpo_name: "Donna Dasher",
  dpo_email: "dpo@misfit.example",
  processing_purposes: ["service_delivery", "analytics", "marketing"],
  data_categories: ["identifiers", "internet_activity", "commercial"],
  lawful_basis: ["contract", "legitimate_interests", "consent"],
  third_party_recipients: ["service_providers", "analytics"],
  transfer_outside_eea: "yes",
  transfer_safeguards: ["sccs", "uk_addendum"],
  transfer_destinations: "United States",
  retention_period: "Customer accounts: duration of relationship plus 24 months.",
  automated_decisions: "no",
  collection_source: "mixed",
  data_source_categories: ["partners", "public_sources"],
  establishment_jurisdiction: "eea",
  gdpr_right_to_withdraw: "by clicking unsubscribe in any email",
  gdpr_right_to_object: "by emailing privacy@misfit.example",
  gdpr_dpa_contact: "Data Protection Commission (Ireland)",
  gdpr_profiling: "yes",
  gdpr_profiling_info: "We segment customers by purchase history to tailor offers.",
};

// A thin record: special-category data, children, ADM, outside the EEA.
const GAPPY: Record<string, unknown> = {
  controller_name: "Nordlicht Health GmbH",
  contact_email: "privacy@nordlicht.example",
  processing_purposes: ["service_delivery"],
  data_categories: ["identifiers", "health_medical", "children"],
  lawful_basis: ["consent"],
  special_category_basis: ["explicit_consent"],
  third_party_recipients: ["service_providers"],
  transfer_outside_eea: "yes",
  automated_decisions: "yes",
  establishment_jurisdiction: "outside",
};

const render = (fw: FwSel, answers: Record<string, unknown>) => buildNoticeHtml({ fw, answers, generatedAtHuman: AT });

// ── formal-instrument primitives ────────────────────────────────────────────

Deno.test("doc180 — fill() is an italic bracketed prompt, escaped; countFills counts it; the banner never says draft", () => {
  const f = fill("insert the controller's registered address & contact");
  assertEquals(f, `<em class="fi-fill">[insert the controller&#39;s registered address &amp; contact]</em>`);
  assertEquals(countFills(`${f} and ${f}`), 2);
  assertEquals(countFills("nothing here"), 0);
  assertEquals(completionBannerHtml(0), "");
  const banner = completionBannerHtml(3);
  assertStringIncludes(banner, "CUSTOMER COMPLETION REQUIRED");
  assertStringIncludes(banner, "3 bracketed items");
  assert(!/draft|preliminary/i.test(banner), "de-draft directive: the banner never calls the document a draft");
  assertStringIncludes(completionBannerHtml(1), "one bracketed item");
});

// ── presentation ────────────────────────────────────────────────────────────

Deno.test("doc180 — the EU notice renders as a formal instrument: Georgia, no navy bar, no tone chips, completion banner over the prompts", () => {
  const html = render(EU, FULL);
  assertStringIncludes(html, 'font-family: Georgia, "Times New Roman", serif');
  assert(!html.includes("eup-bar"), "the Syllabus & Record-era navy bar must not render");
  assert(!html.includes("sr-syllabus"), "no Syllabus & Record components");
  assertStringIncludes(html, "<title>Misfit Toys Logistics Ltd — EU Privacy Notice</title>");
  assertStringIncludes(html, "Privacy at a glance.");
  assert(countFills(html) > 0, "a spine notice always carries at least the scope/effective-date prompts");
  assertStringIncludes(html, "CUSTOMER COMPLETION REQUIRED");
  assert(!/DRAFT/.test(html), "de-draft: no DRAFT self-label anywhere");
});

Deno.test("doc180 — a legacy (non-GDPR) framework keeps its section arc, gets the formal wrapper, and carries no prompts", () => {
  const html = render(BR, FULL);
  assertStringIncludes(html, "<h2>1. Who we are</h2>");
  assertStringIncludes(html, "<h2>9. Your rights</h2>");
  assertStringIncludes(html, 'font-family: Georgia, "Times New Roman", serif');
  assertStringIncludes(html, "Key points");
  assertEquals(countFills(html), 0);
  assert(!html.includes("CUSTOMER COMPLETION REQUIRED"));
});

// ── the P0 legal-accuracy fixes ─────────────────────────────────────────────

Deno.test("doc180 — no destination placeholder and no fabricated Transfer Impact Assessment, on the spine AND the legacy path", () => {
  for (const fw of [EU, UK, BR]) {
    const html = render(fw, { ...FULL, transfer_destinations: "" });
    assert(!html.includes("[destination countries to be specified]"), `${fw.framework_code}: placeholder leaked`);
    assert(!html.includes("Transfer Impact Assessment"), `${fw.framework_code}: TIA asserted with no such intake field`);
    assertStringIncludes(html, "insert the countries or regions");
  }
});

Deno.test("doc180 — Article 9 renders the customer's OWN special_category_basis, never the old alternatives map", () => {
  const html = render(EU, GAPPY);
  assertStringIncludes(html, "Special-Category Personal Data and Criminal-Offence Information");
  assertStringIncludes(html, "Explicit consent — Art.9(2)(a)");
  assert(!html.includes("9(2)(h)"), "the hardcoded health→9(2)(a) or 9(2)(h) alternative must not render");
  // Blank basis → a prompt, not an invented condition.
  const blank = render(EU, { ...GAPPY, special_category_basis: [] });
  assertStringIncludes(blank, "insert the Article 9(2) condition relied on");
});

Deno.test("doc180 — the eight GDPR intake answers the legacy template ignored now render", () => {
  const html = render(EU, FULL);
  assertStringIncludes(html, "Data Protection Commission (Ireland)");
  assertStringIncludes(html, "by clicking unsubscribe in any email");
  assertStringIncludes(html, "by emailing privacy@misfit.example");
  assertStringIncludes(html, "We segment customers by purchase history");
  assertStringIncludes(html, "Business partners / affiliates");
  assertStringIncludes(html, "obtained from publicly accessible sources");
});

Deno.test("doc180 — direct marketing gets its own Article 21(4) section, clearly and separately; absent when no marketing purpose", () => {
  const withMarketing = render(EU, FULL);
  assertStringIncludes(withMarketing, "Your Right to Object to Direct Marketing");
  assertStringIncludes(withMarketing, 'class="fi-callout"');
  const noMarketing = render(EU, { ...FULL, processing_purposes: ["service_delivery"] });
  assert(!noMarketing.includes("Your Right to Object to Direct Marketing"));
});

// ── the per-purpose scaffold (CEO ruling 2, 2026-09-04) ─────────────────────

Deno.test("doc180 — one processing block per selected purpose; a single lawful basis applies without a prompt, several prompt the customer", () => {
  const multi = buildNoticeSections({ fw: EU, answers: FULL, generatedAtHuman: AT });
  const how = multi.sections.find((s) => s.title === "How and Why Do We Use Personal Data?")!;
  assertEquals((how.html.match(/<div class="fi-block">/g) ?? []).length, 3);
  assertStringIncludes(how.html, "state which of the lawful bases listed above applies to this purpose");
  assertStringIncludes(how.html, "specific legitimate interest");
  assertStringIncludes(how.html, "statutory or contractual requirement");
  // Retention has one home: with a global answer the block points there.
  assertStringIncludes(how.html, "as stated in the section on how long we keep personal data below");

  const single = buildNoticeSections({ fw: EU, answers: { ...FULL, lawful_basis: ["contract"] }, generatedAtHuman: AT });
  const how1 = single.sections.find((s) => s.title === "How and Why Do We Use Personal Data?")!;
  assertStringIncludes(how1.html, "Lawful basis:</span> Contractual necessity (Art.6(1)(b))");
  assert(!how1.html.includes("state which of the lawful bases"));
});

// ── conditional sections and the representative ─────────────────────────────

Deno.test("doc180 — EEA-established controllers get no representative block; non-EEA ones get the name or a prompt", () => {
  const eea = render(EU, FULL);
  assert(!eea.includes("<h3>EU representative</h3>"));
  const outsideNamed = render(EU, { ...GAPPY, eu_rep_name: "EU Rep Services BV", eu_rep_contact: "rep@example.eu" });
  assertStringIncludes(outsideNamed, "<h3>EU representative</h3>");
  assertStringIncludes(outsideNamed, "<strong>EU Rep Services BV</strong>");
  const outsideBlank = render(EU, GAPPY);
  assertStringIncludes(outsideBlank, "representative in the Union designated under Article 27");
});

Deno.test("doc180 — children, ADM and profiling sections fire from the record; an 'unsure' ADM answer prompts rather than asserts", () => {
  const html = render(EU, GAPPY);
  assertStringIncludes(html, "<h2>11. Children");
  assertStringIncludes(html, "Profiling and Automated Decision-Making");
  assertStringIncludes(html, "obtain human intervention");
  // Blank ADM detail: the prompt alone, never the "Meaningful information" lead.
  assert(!html.includes("Meaningful information about the logic involved"));
  assertStringIncludes(html, "describe the logic involved");
  const unsure = render(EU, { ...GAPPY, automated_decisions: "unsure" });
  assertStringIncludes(unsure, "confirm whether we make decisions based solely on automated processing");
  assert(!unsure.includes("We make decisions based solely on automated processing"));
});

// ── the UK variant: Data (Use and Access) Act 2025 regime ───────────────────

Deno.test("doc180 — the UK notice cites Articles 22A–22C, the Article 12A time period, Article 45A adequacy regulations and the Commissioner — never Article 22 UK GDPR", () => {
  const html = render(UK, { ...GAPPY, establishment_jurisdiction: "uk" });
  assertStringIncludes(html, "Articles 22A to 22D of the UK GDPR");
  assertStringIncludes(html, "Article 22C of the UK GDPR");
  assert(!html.includes("Article 22 of the UK GDPR"), "Article 22 UK GDPR is not in force");
  assertStringIncludes(html, "Article 12A of the UK GDPR");
  assert(!html.includes("within one month"), "the UK response period is Article 12A's, not the EU one-month text");
  assertStringIncludes(html, "Article 45A of the UK GDPR");
  assertStringIncludes(html, "<h2>13. Complaints to the Information Commissioner");
  assertStringIncludes(html, "Information Commissioner's Office (ICO)");
  // UK-established: no representative block.
  assert(!html.includes("<h3>UK representative</h3>"));
  // The UK Addendum belongs in the UK safeguards line.
  const uk = render(UK, { ...FULL, establishment_jurisdiction: "uk" });
  assertStringIncludes(uk, "UK International Data Transfer Addendum");
});

Deno.test("doc180 — the EU notice keeps the EU citations: Article 22, one month under Article 12(3), Article 77 supervisory authority", () => {
  const html = render(EU, GAPPY);
  assertStringIncludes(html, "Article 22 of the GDPR");
  assertStringIncludes(html, "within one month of receipt of your request (Article 12(3) of the GDPR)");
  assertStringIncludes(html, "Article 77 of the GDPR");
  assert(!html.includes("22A"));
});

// ── the combined international notice ───────────────────────────────────────

Deno.test("doc180 — the combined notice renders each GDPR-family framework's spine under its own heading with one completion banner", () => {
  const html = buildCombinedHtml("Misfit Toys Logistics Ltd", "privacy@misfit.example", [EU, UK], FULL, AT);
  assertStringIncludes(html, "<title>Misfit Toys Logistics Ltd — International Privacy Notice</title>");
  assertEquals((html.match(/Privacy at a glance\./g) ?? []).length, 2);
  assertEquals((html.match(/CUSTOMER COMPLETION REQUIRED/g) ?? []).length, 1);
  assertStringIncludes(html, 'id="UK_GDPR"');
  assert(!html.includes("eup-bar"));
});
