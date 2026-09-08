import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  extractSitemapActionUrls,
  isEnforcementActionUrl,
  isEnforcementType,
  parseFine,
  parseIcoActionPage,
  parseIcoDate,
} from "../../ingest-ico-enforcement/_local/parse.ts";

const PAGE = `
<main id="main-content">
<h1 class="py-0.5 font-serif">ACRO Criminal Records Office</h1>
<ul class="text-sm">
<li><span>Date</span> <strong class="ml-2">7 August 2026</strong></li>
<li><span>Type</span> <strong class="ml-2">Reprimands</strong></li>
<li><span>Sector</span> <strong class="ml-2">Central government</strong></li>
</ul>
<div class="rich-text"><div class="prose prose-theme-red"><p>The Information Commissioner issues a reprimand to ACRO Criminal Records Office for infringements of Articles 32(1), 32(1)(b) and 32(1)(d) of the UK GDPR. This enforcement action follows a cyber incident in which the personal data of approximately 10,000 UK data subjects may have been affected.</p></div></div>
<further-Reading x-href="/media2/njrjayzm/acro-reprimand-202608.pdf" x-title="reprimand"></further-Reading>
</main>`;

const URL_OK = "https://ico.org.uk/action-weve-taken/enforcement/2026/08/acro-criminal-records-office/";

Deno.test("url gate: hub page and anchors rejected, case page accepted", () => {
  assertEquals(isEnforcementActionUrl(URL_OK), true);
  assertEquals(isEnforcementActionUrl("https://ico.org.uk/action-weve-taken/enforcement/"), false);
  assertEquals(isEnforcementActionUrl("https://ico.org.uk/action-weve-taken/enforcement/#main-content"), false);
  assertEquals(isEnforcementActionUrl("https://ico.org.uk/media2/cgdpvn4n/linkedin.svg"), false);
});

Deno.test("type gate: enforcement types pass, audits and FOI decisions blocked", () => {
  assertEquals(isEnforcementType("Reprimands"), true);
  assertEquals(isEnforcementType("Monetary penalties"), true);
  assertEquals(isEnforcementType("Enforcement notices"), true);
  assertEquals(isEnforcementType("Prosecutions"), true);
  assertEquals(isEnforcementType("Audits"), false);
  assertEquals(isEnforcementType("Decision notices"), false);
  assertEquals(isEnforcementType(null), false);
});

Deno.test("date parsing", () => {
  assertEquals(parseIcoDate("7 August 2026"), "2026-08-07");
  assertEquals(parseIcoDate("23 March 2026"), "2026-03-23");
  assertEquals(parseIcoDate("no date here"), null);
});

Deno.test("fine parsing", () => {
  assertEquals(parseFine("a fine of £4,400,000 was issued").fineGbp, 4_400_000);
  assertEquals(parseFine("penalty of £1.5 million").fineGbp, 1_500_000);
  assertEquals(parseFine("no monetary penalty").fineGbp, null);
});

Deno.test("full page parse yields every field", () => {
  const a = parseIcoActionPage(URL_OK, PAGE)!;
  assertEquals(a.subject, "ACRO Criminal Records Office");
  assertEquals(a.decisionDate, "2026-08-07");
  assertEquals(a.actionType, "Reprimands");
  assertEquals(a.sector, "Central government");
  assertEquals(a.pdfUrl, "https://ico.org.uk/media2/njrjayzm/acro-reprimand-202608.pdf");
  assertEquals(a.narrative.includes("Articles 32(1)"), true);
});

Deno.test("non-enforcement type page is rejected", () => {
  const audit = PAGE.replace("Reprimands", "Audits");
  assertEquals(parseIcoActionPage(URL_OK, audit), null);
});

Deno.test("navigation-only page (no narrative) is rejected", () => {
  assertEquals(parseIcoActionPage(URL_OK, "<h1>Skip to main content</h1>"), null);
});

Deno.test("sitemap extraction keeps only case pages", () => {
  const xml = `<urlset><url><loc>${URL_OK}</loc></url>
  <url><loc>https://ico.org.uk/action-weve-taken/enforcement/</loc></url>
  <url><loc>https://ico.org.uk/for-organisations/guide/</loc></url></urlset>`;
  assertEquals(extractSitemapActionUrls(xml), [URL_OK]);
});

Deno.test("site notice block is skipped in favour of the case narrative", () => {
  const withNotice = PAGE.replace(
    '<div class="rich-text">',
    '<div class="prose prose-theme-red"><p>When searching by date, incorrect results may be produced due to errors with the dates of some documents added before 31 December 2024.</p></div><div class="rich-text">',
  );
  const a = parseIcoActionPage(URL_OK, withNotice)!;
  assertEquals(a.narrative.startsWith("The Information Commissioner"), true);
});

Deno.test("page with only a site notice is rejected", () => {
  const onlyNotice = PAGE.replace(
    /<div class="prose[\s\S]*?<\/div>/,
    '<div class="prose"><p>When searching by date, incorrect results may be produced due to errors with the dates of some documents added before 31 December 2024.</p></div>',
  );
  assertEquals(parseIcoActionPage(URL_OK, onlyNotice), null);
});
