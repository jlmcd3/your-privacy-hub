// DOC 144 (2026-09-02) — Wave-2 presentation-layer guards for the CEO-
// ratified CPPA Risk report redesign: the framed "Governing requirement."
// law-cite, the "[Q] " landing-line treatment, the § 2.A customer-voice
// block, the six-column § 4.A ledger spec, the § 3.B necessity-matrix spec,
// the page-2 Assessment-at-a-Glance panel, and the numbered-section opener.
//
// Renderer pins are source asserts (the edge entrypoint cannot be imported
// without serving — the established w18/doc127 pattern); the whitelist-
// parity checks compare the two renderers' label arrays byte-for-byte.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const PDF_SRC = await Deno.readTextFile("supabase/functions/generate-report-pdf/index.ts");
const WEB_SRC = await Deno.readTextFile("src/components/reports/SkeletonDocumentView.tsx");

/** Extract a `const NAME = [ ... ];` array literal's STRING ITEMS (comments
 * and whitespace stripped) so the two renderers' whitelists can be compared
 * as the byte-synced lists doc 66 Rule 2 requires. */
function labelArrayItems(src: string, name: string): string[] {
  const m = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`).exec(src);
  assert(m, `${name} array not found`);
  return [...m![1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]);
}

Deno.test("doc144 — RUNIN and HEAD whitelists are byte-synced across both renderers, with the Governing-requirement run-in present", () => {
  for (const name of ["RUNIN_LEAD_LABELS", "HEAD_LEAD_LABELS"]) {
    assertEquals(
      labelArrayItems(PDF_SRC, name),
      labelArrayItems(WEB_SRC, name),
      `${name} diverged between generate-report-pdf/index.ts and SkeletonDocumentView.tsx`,
    );
  }
  assert(
    labelArrayItems(PDF_SRC, "RUNIN_LEAD_LABELS").some((l) => l.startsWith("Governing requirement")),
    "Governing requirement missing from RUNIN_LEAD_LABELS",
  );
});

Deno.test("doc144 — the framed law-cite treatment exists in both renderers, chunk-keyed on the Governing-requirement lead", () => {
  assert(PDF_SRC.includes(`trimmed.startsWith("Governing requirement.")`), "PDF law-cite trigger missing");
  assert(PDF_SRC.includes(`class="risk-law-cite"`), "PDF law-cite frame class missing");
  assert(WEB_SRC.includes(`trimmed.startsWith("Governing requirement.")`), "web law-cite trigger missing");
});

Deno.test("doc144 — the [Q] landing-line treatment strips the token in both renderers", () => {
  assert(PDF_SRC.includes(`trimmed.startsWith("[Q] ")`), "PDF [Q] trigger missing");
  assert(PDF_SRC.includes(`trimmed.slice(4)`), "PDF [Q] token strip missing");
  assert(WEB_SRC.includes(`trimmed.startsWith("[Q] ")`), "web [Q] trigger missing");
  assert(WEB_SRC.includes(`trimmed.slice(4)`), "web [Q] token strip missing");
});

Deno.test("doc144 — the customer-voice block is kind-driven in both renderers", () => {
  assert(PDF_SRC.includes(`p?.kind === "customer_voice"`), "PDF customer-voice kind gate missing");
  assert(PDF_SRC.includes("riskCustomerVoiceHtml"), "PDF customer-voice renderer missing");
  assert(WEB_SRC.includes(`p.kind === "customer_voice"`), "web customer-voice kind gate missing");
  assert(WEB_SRC.includes("RiskCustomerVoice"), "web customer-voice component missing");
});

Deno.test("doc144 — the six-column ledger spec: widths for six columns, badge columns 1/2/3/5, App-register 8.5pt scale", () => {
  const spec = /risk_ledger:\s*\{([\s\S]*?)\},/.exec(PDF_SRC);
  assert(spec, "risk_ledger spec missing");
  const widths = [...spec![1].matchAll(/"(\d+%)"/g)].map((m) => m[1]);
  assertEquals(widths.length, 6, `risk_ledger widths must cover six columns, got ${widths.length}`);
  assertEquals(
    widths.reduce((a, w) => a + parseInt(w, 10), 0),
    100,
    "risk_ledger widths must total 100% (portrait law)",
  );
  assert(spec![1].includes("fontPt: 8.5"), "risk_ledger not at the App-register 8.5pt scale");
  assert(spec![1].includes("riskScaleCellHtml"), "likelihood/severity badge renderer not wired");
  assert(spec![1].includes("riskLevelCellHtml"), "level badge renderer not wired");
  // Web twin: the same column wiring.
  assert(
    /risk_ledger:[\s\S]{0,400}riskScaleCell\(v\)[\s\S]{0,200}riskLevelCell\(v\)/.test(WEB_SRC),
    "web risk_ledger cell wiring missing",
  );
});

Deno.test("doc144 — the necessity-matrix spec exists, Determination column badged on the engine's exact words", () => {
  assert(/necessity_matrix:\s*\{/.test(PDF_SRC), "necessity_matrix spec missing from RISK_TABLE_SPECS");
  for (const src of [PDF_SRC, WEB_SRC]) {
    assert(src.includes(`"Necessary to the stated purpose"`), "necessity ok-word mapping missing");
    assert(src.includes(`"Collected but not necessary to the stated purpose"`), "necessity hi-word mapping missing");
    assert(src.includes(`"Unsure"`), "necessity warn-word mapping missing");
  }
});

Deno.test("doc144 — the Assessment-at-a-Glance panel is surface-keyed (exec_status_panel + key_dates) in both renderers", () => {
  assert(PDF_SRC.includes("riskGlancePanelHtml"), "PDF glance panel missing");
  assert(WEB_SRC.includes("RiskGlancePanel"), "web glance panel missing");
  for (const src of [PDF_SRC, WEB_SRC]) {
    assert(src.includes(`surface === "key_dates"`), "glance panel key-dates surface key missing");
  }
  // Never re-derived: the panel reads persisted rows, no engine import in
  // either renderer.
  assert(!PDF_SRC.includes("risk-factor-engine"), "PDF renderer must not re-derive from the engine");
  assert(!WEB_SRC.includes("risk-factor-engine"), "web renderer must not re-derive from the engine");
});

Deno.test("doc144 — Rule 1: the numbered-section opener numeral is a bare marker, never underlined; sections 1-5 only", () => {
  assert(PDF_SRC.includes(`/^([1-5])\\.\\s+(.+)$/`), "PDF opener regex missing or over-broad");
  assert(WEB_SRC.includes(`/^([1-5])\\.\\s+(.+)$/`), "web opener regex missing or over-broad");
  const opener = /risk-section-opener[\s\S]{0,2500}?<\/div>`/.exec(PDF_SRC);
  assert(opener, "PDF opener block missing");
  assert(!opener![0].includes("underline"), "opener numeral/eyebrow must carry no underline");
  // The marker/underline split machinery is untouched (doc127 §5/§6 pin
  // holds): marker <strong> carries no text-decoration.
  assert(
    /min-width:1\.65em;">\$\{m\[1\]\}<\/strong>/.test(PDF_SRC),
    "riskSplitLeadHtml marker span changed — verify the marker is not underlined",
  );
});
