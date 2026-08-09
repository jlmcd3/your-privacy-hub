/**
 * ITEM 427 — the customer PDF's "Risk Assessment by Activity" section,
 * extracted so the legacy byte-identity proof renders THE REAL PATH (index.ts
 * imports this and calls nothing else for that section on the LTP path).
 *
 * LEGACY SHAPES render byte-identically to the pre-ITEM-427 inline expression
 *   listSection("risk_assessment_by_activity", "Risk Assessment by Activity",
 *               coerceNarrativeList(report.risk_assessment_by_activity))
 * for the string[] / bare-string / empty / absent states. Legacy OBJECT rows —
 * which `coerceNarrativeList` silently DROPPED — now render as cards; only the
 * CANONICAL thirteen-leaf record takes the new card layout.
 */

import {
  coerceActivityView,
  type ActivityView,
} from "../../_shared/report-contracts/risk-activities.ts";
import {
  coerceNarrativeList,
  headerForSection,
} from "../../_shared/report-contracts/cppa-risk-shape.ts";

/** Byte-for-byte copy of generate-report-pdf's escHtml. */
function escHtml(s: unknown): string {
  if (s === null || s === undefined) return "";
  const str = typeof s === "string" ? s : (
    typeof s === "number" || typeof s === "boolean" ? String(s) :
    (() => { try { return JSON.stringify(s); } catch { return String(s); } })()
  );
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const para = (v: string) => `<p>${escHtml(v).replace(/\n+/g, "</p><p>")}</p>`;

function cards(title: string, items: readonly string[]): string {
  return items.length
    ? `<section><h2>${title}</h2>${items.map((s) => `<div class="card">${para(s)}</div>`).join("")}</section>`
    : "";
}

function rowCard(r: Record<string, unknown>): string {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = s(r.activity) || s(r.activity_name) || "Assessed activity";
  const lines: string[] = [];
  const labelled = (label: string, v: unknown) => {
    if (s(v)) lines.push(`<p><span class="label">${escHtml(label)}:</span> ${escHtml(s(v))}</p>`);
  };
  labelled("Purpose", r.purpose);
  labelled("Statutory basis", r.statutory_basis);
  labelled("Benefits to the business", r.benefits_to_business);
  labelled("Benefits to the consumer", r.benefits_to_consumers);
  labelled("Benefits to other stakeholders", r.benefits_to_other_stakeholders);
  labelled("Benefits to the public", r.benefits_to_public);
  const effects = Array.isArray(r.adverse_effects) ? r.adverse_effects : [];
  if (effects.length) {
    lines.push(
      `<p class="label">Negative impacts</p>` +
      `<table class="harm"><thead><tr><th>Harm</th><th>Likelihood</th><th>Severity</th><th>How it arises</th></tr></thead><tbody>` +
      effects.map((raw) => {
        const h = (raw ?? {}) as Record<string, unknown>;
        return `<tr><td>${escHtml(s(h.harm_type))}</td><td>${escHtml(s(h.likelihood))}</td><td>${
          escHtml(s(h.severity))
        }</td><td>${escHtml(s(h.description))}</td></tr>`;
      }).join("") +
      `</tbody></table>`,
    );
  }
  labelled("Current safeguards", r.current_safeguards);
  labelled("Safeguard deficiencies", r.safeguard_gaps);
  const mapping = Array.isArray(r.section_7152_mapping) ? r.section_7152_mapping : [];
  if (mapping.length) {
    lines.push(
      `<p class="label">Where this sits in § 7152(a)</p><ul>` +
      mapping.map((raw) => {
        const m = (raw ?? {}) as Record<string, unknown>;
        return `<li>${escHtml(s(m.element))} — ${escHtml(s(m.pinpoint))}</li>`;
      }).join("") +
      `</ul>`,
    );
  } else if (s(r.section_7152_mapping)) {
    labelled("§ 7152 mapping", r.section_7152_mapping);
  }
  labelled("Do the benefits outweigh the risks", r.benefits_outweigh_risks_conclusion);
  if (s(r.benefits_outweigh_risks_rationale)) {
    lines.push(`<p>${escHtml(s(r.benefits_outweigh_risks_rationale))}</p>`);
  }
  return `<div class="card"><h3>${escHtml(name)}</h3>${lines.join("")}</div>`;
}

/** LTP PDF Risk Assessment by Activity section. Returns "" when there is nothing. */
export function renderActivityAnalysisSectionHtml(report: unknown): string {
  const raw = (report as { risk_assessment_by_activity?: unknown })?.risk_assessment_by_activity;
  const title = escHtml(headerForSection("risk_assessment_by_activity", "Risk Assessment by Activity"));
  const view: ActivityView = coerceActivityView(raw);

  if (!view.present) return "";
  // LEGACY-IDENTICAL PATH — every pre-ITEM-427 string/empty/absent state
  // renders exactly as the pre-change listSection() expression did.
  if (view.shape !== "typed") {
    if (view.rows.length === 0) return cards(title, coerceNarrativeList(raw) ?? []);
    const legacyText = (coerceNarrativeList(view.texts) ?? []).map((s) => `<div class="card">${para(s)}</div>`);
    return `<section><h2>${title}</h2>${legacyText.join("")}${view.rows.map(rowCard).join("")}</section>`;
  }
  return `<section><h2>${title}</h2>${view.rows.map(rowCard).join("")}</section>`;
}
