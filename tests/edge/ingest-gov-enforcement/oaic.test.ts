import {
  canonicalizeSourceUrl,
  isOaicEnforcementTitle,
  extractOaicSubject,
} from "./oaic.ts";

// ── canonicalizeSourceUrl ───────────────────────────────────────────────────
Deno.test("canonicalize: OAIC funnelback redirect → inner url decoded", () => {
  const raw = "https://www.oaic.gov.au/s/redirect?collection=oaic&url=https%3A%2F%2Fwww.oaic.gov.au%2Fnews%2Fmedia-centre%2Fprivacy-commissioner-finds-against-optus-in-white-pages-breach&auth=abc&rank=3";
  const { canonical, wrapper } = canonicalizeSourceUrl(raw);
  if (canonical !== "https://www.oaic.gov.au/news/media-centre/privacy-commissioner-finds-against-optus-in-white-pages-breach") throw new Error("decode failed: " + canonical);
  if (wrapper !== raw) throw new Error("wrapper not preserved");
});

Deno.test("canonicalize: same inner url with rotating auth/rank → same canonical", () => {
  const a = "https://www.oaic.gov.au/s/redirect?url=https%3A%2F%2Fwww.oaic.gov.au%2Ffoo&auth=aaa&rank=1";
  const b = "https://www.oaic.gov.au/s/redirect?url=https%3A%2F%2Fwww.oaic.gov.au%2Ffoo&auth=zzz&rank=9";
  if (canonicalizeSourceUrl(a).canonical !== canonicalizeSourceUrl(b).canonical) throw new Error("dedup broken");
});

Deno.test("canonicalize: non-redirect passthrough with fragment stripped", () => {
  const raw = "https://ico.org.uk/action-weve-taken/enforcement/case-xyz#top";
  const { canonical, wrapper } = canonicalizeSourceUrl(raw);
  if (canonical !== "https://ico.org.uk/action-weve-taken/enforcement/case-xyz") throw new Error("passthrough failed: " + canonical);
  if (wrapper !== null) throw new Error("wrapper should be null");
});

Deno.test("canonicalize: malformed url returns input unchanged", () => {
  const raw = "not a url";
  if (canonicalizeSourceUrl(raw).canonical !== "not a url") throw new Error("malformed handling failed");
});

// ── isOaicEnforcementTitle ──────────────────────────────────────────────────
const ENFORCE_PASS = [
  "Privacy Commissioner finds against Optus in White Pages breach",
  "Australian Privacy Commissioner orders American Express Australia Limited to compensate complainant following interference in privacy",
  "OAIC finalises investigation into Property Lovers and fastproperty.ai",
  "Privacy Commissioner finds privacy breaches in third-party tracking pixel investigation",
];
for (const t of ENFORCE_PASS) {
  Deno.test(`gate PASS: ${t.slice(0, 60)}`, () => {
    if (!isOaicEnforcementTitle(t)) throw new Error("should pass");
  });
}

const NEWS_BLOCK = [
  "Statement on Instructure (Canvas) cyber incident",
  "Statement on Australian National Audit Office report",
  "Association of Information Access Commissioners Communiqué",
  "Privacy Commissioner launches Privacy Awareness Week 2026: Trust is built here",
  "OAIC releases Exposure Draft of the Children's Online Privacy Code",
  "Australians more concerned about privacy as trust in AI languishes, survey finds",
  "Regulators strengthen joint oversight of digital platforms",
  "eSafety and OAIC working together to protect privacy and safety for all Australians",
  "Data breach notifications increase to all-time high in 2025, new NDB stats show",
  "2025 global privacy sweep puts websites and apps used by children under the microscope",
  "Privacy Commissioner publishes new guidance to ensure proportionate age assurance",
];
for (const t of NEWS_BLOCK) {
  Deno.test(`gate BLOCK: ${t.slice(0, 60)}`, () => {
    if (isOaicEnforcementTitle(t)) throw new Error("should block");
  });
}

// ── extractOaicSubject ──────────────────────────────────────────────────────
Deno.test("subject: finds against Optus", () => {
  const s = extractOaicSubject("Privacy Commissioner finds against Optus in White Pages breach");
  if (s !== "Optus") throw new Error("got: " + s);
});
Deno.test("subject: orders American Express to compensate", () => {
  const s = extractOaicSubject("Australian Privacy Commissioner orders American Express Australia Limited to compensate complainant following interference in privacy");
  if (s !== "American Express Australia Limited") throw new Error("got: " + s);
});
Deno.test("subject: finalises investigation into Property Lovers and fastproperty.ai", () => {
  const s = extractOaicSubject("OAIC finalises investigation into Property Lovers and fastproperty.ai");
  if (s !== "Property Lovers and fastproperty.ai") throw new Error("got: " + s);
});
Deno.test("subject: anonymized determination → null", () => {
  const s = extractOaicSubject("Privacy Commissioner finds privacy breaches in third-party tracking pixel investigation");
  if (s !== null) throw new Error("got: " + s);
});
