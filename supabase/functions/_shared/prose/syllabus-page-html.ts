// DOC 178 (2026-09-04) — the Syllabus & Record page-one HTML/CSS, extracted
// from generate-report-pdf/index.ts (the byte-identical logic that has
// rendered page one for doc170-177's eight products) into a SHARED module
// so RoPA's own standalone HTML generator (generate-ropa-document/index.ts,
// which renders its "PDF" through its own buildHtml()/registerHtml(), never
// through generate-report-pdf) can render the SAME page one without
// duplicating it a second time by hand. generate-report-pdf/index.ts now
// imports from here too, so there is exactly one implementation.
//
// Deliberately narrow: this module carries ONLY the self-contained page-one
// panel (brand line, title, disposition box, determination table,
// conditions, key dates) and the record divider — not the fleet's fuller
// rail/marker/section-heading system (doc151's Governing-Requirement rails,
// quiet numerals, etc.), which no product outside generate-report-pdf's own
// renderer uses and which RoPA's existing body deliberately keeps
// unchanged.

import { toneForState, type SyllabusProjection } from "./syllabus.ts";

export function escHtml(s: unknown): string {
  if (s === null || s === undefined) return "";
  const str = typeof s === "string" ? s : (
    typeof s === "number" || typeof s === "boolean" ? String(s) :
    (() => { try { return JSON.stringify(s); } catch { return String(s); } })()
  );
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** A state word (the fleet lexicon) tinted as text; a value that OPENS with
 * a state word followed by " — " tints the word and sets the rest small and
 * slate; anything else renders verbatim. Never a filled chip. */
export function srTintHtml(value: string): string {
  const v = value.trim();
  const whole = toneForState(v);
  if (whole) return `<span class="st st-${whole}">${escHtml(v)}</span>`;
  const m = /^([^—\n]{2,60}?)\s+—\s+([\s\S]+)$/.exec(v);
  if (m) {
    const tone = toneForState(m[1]);
    if (tone) return `<span class="st st-${tone}">${escHtml(m[1])}</span>&nbsp;&nbsp;<span class="st-rest">${escHtml(m[2])}</span>`;
  }
  return escHtml(v);
}

/** The page-one panel's own CSS, self-contained (scoped under `.sr-syllabus`
 *  and `.sr-divider` so it cannot collide with a host document's own
 *  classes) — a narrow subset of generate-report-pdf's fuller SR_CSS. */
export const SR_SYLLABUS_CSS = `
  .sr-syllabus, .sr-divider { font-family:Georgia,'Times New Roman',serif; color:#1a1916; }
  .sr-syllabus .eyebrow, .sr-divider .eyebrow { font-family:Arial,Helvetica,sans-serif; font-size:7.5pt; font-weight:bold; letter-spacing:0.1em; text-transform:uppercase; color:#5c6d7a; }
  .sr-syllabus .lbl { font-family:Arial,Helvetica,sans-serif; font-size:7.5pt; font-weight:bold; letter-spacing:0.1em; text-transform:uppercase; }
  .sr-syllabus .st { font-family:Arial,Helvetica,sans-serif; font-size:7.5pt; font-weight:bold; letter-spacing:0.08em; text-transform:uppercase; white-space:nowrap; }
  .sr-syllabus .st-ok { color:#28503a; } .sr-syllabus .st-hold { color:#6e5518; } .sr-syllabus .st-hi { color:#6e2323; } .sr-syllabus .st-neutral { color:#41505c; }
  .sr-syllabus .st-rest { font-size:8.4pt; color:#5c6d7a; white-space:normal; }
  .sr-syllabus h1 { font-size:21pt; font-weight:normal; line-height:1.15; color:#0c2a44; margin:0; }
  .sr-syllabus table.brand { width:100%; border-collapse:collapse; border-bottom:2pt solid #0c2a44; }
  .sr-syllabus table.brand td { border:none; padding:0 0 8pt; vertical-align:baseline; }
  .sr-syllabus table.brand td.l { font-family:Arial,Helvetica,sans-serif; font-size:8pt; font-weight:bold; letter-spacing:0.2em; color:#0c2a44; }
  .sr-syllabus table.brand td.r { font-family:Arial,Helvetica,sans-serif; font-size:7pt; color:#5c6d7a; letter-spacing:0.08em; text-align:right; line-height:1.5; }
  .sr-syllabus .dispo { background:#f3f6f8; border:0.5pt solid #c9d2d9; border-left:2pt solid #0c2a44; padding:10pt 14pt 10pt 10pt; margin:14pt 0 12pt; break-inside:avoid; page-break-inside:avoid; }
  .sr-syllabus .dispo .dv { font-size:17pt; color:#0c2a44; margin:2pt 0 4pt; font-family:Georgia,'Times New Roman',serif; }
  .sr-syllabus .dispo p { margin:0; font-size:10pt; line-height:1.5; text-align:justify; }
  .sr-syllabus table.syltab td { font-size:9.2pt; border-bottom:0.5pt solid #dde5ea; padding:4pt 8pt 4pt 4pt; vertical-align:top; }
  .sr-syllabus table.syltab td.k { font-family:Arial,Helvetica,sans-serif; font-size:7.5pt; font-weight:bold; text-transform:uppercase; letter-spacing:0.06em; color:#5c6d7a; width:34%; }
  .sr-syllabus .cond { border-left:2pt solid #c9d2d9; padding:2pt 0 2pt 10pt; margin:6pt 0 8pt; break-inside:avoid; page-break-inside:avoid; }
  .sr-syllabus .cond .cn { font-size:10pt; text-decoration:underline; text-underline-offset:2.5px; text-decoration-thickness:0.5pt; }
  .sr-syllabus .cond .cn u { text-decoration:underline; text-underline-offset:2.5px; text-decoration-thickness:0.5pt; }
  .sr-syllabus .cond p { font-size:9.3pt; margin:1pt 0 0; }
  .sr-syllabus .kd { font-family:Arial,Helvetica,sans-serif; font-size:8pt; color:#41505c; border-top:0.5pt solid #c9d2d9; border-bottom:0.5pt solid #c9d2d9; padding:5pt 0; margin-top:10pt; line-height:1.6; }
  .sr-syllabus .kd b { letter-spacing:0.05em; }
  .sr-divider { border-top:3pt solid #0c2a44; border-bottom:0.5pt solid #c9d2d9; padding:20pt 0 16pt; margin-top:30pt; }
  .sr-divider h2 { font-size:19pt; font-weight:normal; color:#0c2a44; margin:4pt 0 0; }
  .sr-divider table.maprow { width:100%; border-collapse:collapse; margin-top:14pt; }
  .sr-divider table.maprow td { padding:6pt 8pt 6pt 4pt; font-size:9.2pt; border-bottom:0.5pt solid #dde5ea; vertical-align:top; }
  .sr-divider table.maprow td.ml { font-family:Georgia,'Times New Roman',serif; font-size:13pt; color:#aab8c5; width:8%; }
`;

/** Page 1 — the Determination Syllabus, from the persisted projection. */
export function srSyllabusPageHtml(s: SyllabusProjection, record: { id?: unknown; created_at?: unknown }): string {
  const created = record?.created_at ? new Date(record.created_at as string) : new Date();
  const date = created.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }).toUpperCase();
  const reportId = typeof record?.id === "string" && record.id.length >= 8 ? `REPORT ${record.id.slice(0, 8).toUpperCase()} · ` : "";
  const rows = s.rows.map(([k, v]) => `<tr><td class="k">${escHtml(k)}</td><td>${srTintHtml(v)}</td></tr>`).join("");
  const conditions = s.conditions.length
    ? `<div class="eyebrow" style="margin-top:8pt;">${escHtml(s.conditions_heading)}</div>` +
      s.conditions.map((c, i) =>
        `<div class="cond"><div class="cn">${i + 1}.&nbsp;&nbsp;<u>${escHtml(c.name)}</u></div><p>${escHtml(c.text)}</p></div>`
      ).join("")
    : "";
  const kd = s.key_dates.length
    ? `<div class="kd"><b>KEY DATES</b> &nbsp;·&nbsp; ${
      s.key_dates.map(([k, v]) => `${escHtml(k)}: ${srTintHtml(v)}`).join(" &nbsp;·&nbsp; ")
    }</div>`
    : "";
  return `<section class="sr-syllabus">
    <table class="brand"><tr><td class="l">END USER PRIVACY</td><td class="r">${escHtml(s.instrument_line)}<br>${reportId}${escHtml(date)}</td></tr></table>
    <div style="margin-top:16pt;">
      <div class="eyebrow">Prepared for ${escHtml(s.prepared_for)}</div>
      <h1>${escHtml(s.activity)}</h1>
      ${s.subtitle ? `<div style="font-size:9.5pt;color:#5c6d7a;margin-top:3pt;">${escHtml(s.subtitle)}</div>` : ""}
    </div>
    <div class="dispo">
      <div class="lbl" style="color:#5c6d7a;">${escHtml(s.disposition_label)}</div>
      <div class="dv">${escHtml(s.disposition)}</div>
      ${s.paragraph ? `<p>${escHtml(s.paragraph)}</p>` : ""}
    </div>
    ${rows ? `<table class="syltab" style="width:100%;border-collapse:collapse;"><tbody>${rows}</tbody></table>` : ""}
    ${conditions}
    ${kd}
  </section>`;
}

/** The Record Divider page: end of the decision report, the ratified
 * paragraph, and the A–F map from the projection (or the titles alone). */
export function srRecordDividerHtml(s: SyllabusProjection | null, appendices: Array<{ letter: string; title: string }>): string {
  const rows = appendices.map((a) => {
    const desc = s?.record_map.find((r) => r[0] === a.letter)?.[2] ?? "";
    return `<tr><td class="ml">${escHtml(a.letter)}</td><td style="width:34%;"><b>${escHtml(a.title)}</b></td><td>${escHtml(desc)}</td></tr>`;
  }).join("");
  return `<section class="sr-divider page-break">
    <div class="divider">
      <div class="eyebrow">END OF THE DECISION REPORT</div>
      <h2>Supporting Assessment Record</h2>
      <p style="margin-top:6pt;">The record that stands behind every conclusion above: authority traceability, the complete factual inventories, the full risk and safeguard register, the technical record, and the materials considered. A decision-maker may stop at the last numbered section. Counsel, auditors, and regulators continue here — and every entry cites the body section it supports.</p>
    </div>
    ${rows ? `<table class="maprow">${rows}</table>` : ""}
  </section>`;
}
