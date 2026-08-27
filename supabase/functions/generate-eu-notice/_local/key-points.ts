// supabase/functions/generate-eu-notice/_local/key-points.ts
//
// S-N4 (doc 80, 2026-08-27) — the "Key points" first layer for the EU/global
// notice: the ICO/WP260 layered-notice value in the one-document form. Every
// line is derived from the SAME answers as the body (single writer, no
// re-stated free text); a line whose answer is blank is simply absent —
// the block never pads.

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toText(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(String).join(", ");
  return String(v).trim();
}

export function buildEuKeyPointsHtml(answers: Record<string, unknown>): string {
  const controller = toText(answers["controller_name"]);
  const categories = toText(answers["data_categories"]);
  const purposes = toText(answers["processing_purposes"]);
  const basis = toText(answers["lawful_basis"]);
  const recipients = toText(answers["third_party_recipients"]);
  const transfers = String(answers["transfer_outside_eea"] ?? "").toLowerCase().includes("yes");
  const retention = toText(answers["retention_period"]);
  const contactEmail = toText(answers["contact_email"]);

  const items: string[] = [];
  if (controller) items.push(`<li><strong>Who we are:</strong> ${esc(controller)}</li>`);
  if (categories) items.push(`<li><strong>What we collect:</strong> ${esc(categories)}</li>`);
  if (purposes) items.push(`<li><strong>Why:</strong> ${esc(purposes)}</li>`);
  if (basis) items.push(`<li><strong>Legal footing:</strong> ${esc(basis)}</li>`);
  if (recipients) items.push(`<li><strong>Who receives it:</strong> ${esc(recipients)}</li>`);
  items.push(transfers
    ? `<li><strong>International transfers:</strong> yes — see the transfers section for the safeguards relied on</li>`
    : `<li><strong>International transfers:</strong> none outside the originating regime are reported</li>`);
  if (retention) items.push(`<li><strong>How long:</strong> ${esc(retention)}</li>`);
  if (contactEmail) items.push(`<li><strong>Your rights:</strong> access, rectification, erasure, restriction, portability, and objection where applicable — contact ${esc(contactEmail)}</li>`);

  if (items.length === 0) return "";
  return `<section style="background:#edf2f5;border:1px solid #dde5ea;border-radius:0.5rem;padding:0.9rem 1.25rem;margin:1.25rem 0;">
  <p style="margin:0 0 0.4rem 0;font-weight:600;">Key points</p>
  <ul style="margin:0;padding-left:1.25rem;">${items.join("\n  ")}</ul>
  <p style="margin:0.5rem 0 0 0;font-size:0.8rem;color:#5c6d7a;">This summary is for orientation only; the numbered sections below are the notice.</p>
</section>`;
}
