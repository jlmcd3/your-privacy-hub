// supabase/functions/generate-eu-notice/_local/key-points.ts
//
// S-N4 (doc 80, 2026-08-27) — the "Key points" first layer for the EU/global
// notice: the ICO/WP260 layered-notice value in the one-document form.
//
// SINGLE-WRITER FIX (same day): the first cut read raw answers and leaked
// option CODES ("service_delivery") into the rendered block, bypassing the
// index's formatAnswer reader-label mapping — caught by the pre-existing
// generate-eu-notice suite. The builder now consumes a bag of ALREADY-
// FORMATTED values that buildNoticeSections (the single writer for reader
// labels) computes and returns; this module formats nothing itself. Blank
// values are absent lines — the block never pads. The transfers label is
// "Transfers:" — deliberately NOT the section title "International
// transfers", which the suite's section-exclusivity bound reserves for the
// conditional section itself.

export interface EuKeyPointsBag {
  readonly controller: string;
  readonly categories: string;
  readonly purposes: string;
  readonly basis: string;
  readonly recipients: string;
  readonly transfers: boolean;
  readonly retention: string;
  readonly contactEmail: string;
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildEuKeyPointsHtml(bag: EuKeyPointsBag): string {
  const items: string[] = [];
  if (bag.controller) items.push(`<li><strong>Who we are:</strong> ${esc(bag.controller)}</li>`);
  if (bag.categories) items.push(`<li><strong>What we collect:</strong> ${esc(bag.categories)}</li>`);
  if (bag.purposes) items.push(`<li><strong>Why:</strong> ${esc(bag.purposes)}</li>`);
  if (bag.basis) items.push(`<li><strong>Legal footing:</strong> ${esc(bag.basis)}</li>`);
  if (bag.recipients) items.push(`<li><strong>Who receives it:</strong> ${esc(bag.recipients)}</li>`);
  items.push(bag.transfers
    ? `<li><strong>Transfers:</strong> data leaves the originating regime — see the transfers section for the safeguards relied on</li>`
    : `<li><strong>Transfers:</strong> none outside the originating regime are reported</li>`);
  if (bag.retention) items.push(`<li><strong>How long:</strong> ${esc(bag.retention)}</li>`);
  if (bag.contactEmail) items.push(`<li><strong>Your rights:</strong> access, rectification, erasure, restriction, portability, and objection where applicable — contact ${esc(bag.contactEmail)}</li>`);

  if (items.length === 0) return "";
  return `<section style="background:#edf2f5;border:1px solid #dde5ea;border-radius:0.5rem;padding:0.9rem 1.25rem;margin:1.25rem 0;">
  <p style="margin:0 0 0.4rem 0;font-weight:600;">Key points</p>
  <ul style="margin:0;padding-left:1.25rem;">${items.join("\n  ")}</ul>
  <p style="margin:0.5rem 0 0 0;font-size:0.8rem;color:#5c6d7a;">This summary is for orientation only; the numbered sections below are the notice.</p>
</section>`;
}
