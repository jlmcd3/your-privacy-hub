// PRODUCT PAGE REDESIGN — WAVE 1 (central tokens), 2026-09-01.
//
// One shared eyebrow token for every product page. The eyebrow is
// `<Regime> · <Product in sentence case>` — sentence case is deliberate and
// change-controlled here rather than typed by hand on fourteen pages.
//
// Pages render it as:
//   <ProductHero eyebrowLabel={<><Icon … /> {productEyebrow("dpia")}</>} … />
//
// Status suffixes ("Free preliminary signal", "Included with any
// subscription", a price) are NOT part of the token — pass them through
// `suffix` so the product half of the label can never drift.

export type ProductEyebrowKey =
  | "cppa_risk"
  | "cppa_cyber"
  | "cppa_admt"
  | "cppa_scope"
  | "dpia"
  | "lia"
  | "governance"
  | "biometric"
  | "dpa"
  | "ir_playbook"
  | "ropa"
  | "registration"
  | "us_notice"
  | "eu_notice"
  | "notice_suite";

export const PRODUCT_EYEBROW: Record<ProductEyebrowKey, string> = {
  cppa_risk: "CCPA · Risk assessment",
  cppa_cyber: "CCPA · Cybersecurity audit",
  cppa_admt: "CCPA · ADMT assessment",
  cppa_scope: "CCPA · Scope checker",
  dpia: "GDPR · Impact assessment",
  lia: "GDPR · Legitimate interests assessment",
  governance: "GDPR · Accountability assessment",
  biometric: "US & EU · Biometric compliance",
  dpa: "GDPR · Processor agreement",
  ir_playbook: "Global · Incident response",
  ropa: "GDPR · Article 30 record",
  registration: "Global · Registration filings",
  us_notice: "US states · Privacy notice",
  eu_notice: "Global · Privacy notice",
  notice_suite: "US & Global · Privacy notices",
};

/**
 * Returns the shared eyebrow token, optionally with a status suffix appended
 * after a middle dot (e.g. "GDPR · Impact assessment · $109").
 */
export function productEyebrow(key: ProductEyebrowKey, suffix?: string | null): string {
  const base = PRODUCT_EYEBROW[key];
  const tail = suffix?.trim();
  return tail ? `${base} · ${tail}` : base;
}

export default PRODUCT_EYEBROW;
