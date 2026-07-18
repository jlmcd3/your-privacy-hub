import {
  isFtcEnforcementUrl,
  extractFtcSubject,
  isHhsOcrEnforcementUrl,
  extractHhsSubject,
  normalizeRegulatorLabel,
} from "./us-ingest.ts";

// ── FTC URL gate ────────────────────────────────────────────────────────────
const FTC_PASS = [
  "https://www.ftc.gov/enforcement/cases-proceedings/2010031-us-anesthesia-partners-inc-ftc-v",
  "https://www.ftc.gov/legal-library/browse/cases-proceedings/2223030-financial-education-services",
  "https://www.ftc.gov/legal-library/browse/cases-proceedings/242-3055-publishingcom-matter",
];
for (const u of FTC_PASS) {
  Deno.test(`FTC url PASS: ${u.slice(-50)}`, () => {
    if (!isFtcEnforcementUrl(u)) throw new Error("should pass");
  });
}

const FTC_BLOCK = [
  "https://www.ftc.gov/about-ftc",
  "https://www.ftc.gov/policy-notices",
  "https://www.ftc.gov/enforcement/competition-matters",
  "https://www.ftc.gov/legal-library/browse/advisory-opinions/section-623a1-duty-furnishers-provide-accurate-information",
  "https://www.ftc.gov/news-events/news/press-releases/2026/05/ftc-ban-kochava-subsidiary-selling-sensitive-location-data-settle-charges-they-sold-location-data",
  "https://www.ftc.gov/news-events/news/speeches/chairman-fergusons-keynote-speech-attention-economy-workshop",
  "https://www.ftc.gov/reports/consumer-sentinel-network-data-book-2020",
  "https://www.ftc.gov/business-guidance/small-businesses",
  "https://www.ftc.gov/legal-library/browse/cases-proceedings/closing-letters",
  "https://www.ftc.gov/legal-library/browse/cases-proceedings/commissioner-statements",
];
for (const u of FTC_BLOCK) {
  Deno.test(`FTC url BLOCK: ${u.slice(-50)}`, () => {
    if (isFtcEnforcementUrl(u)) throw new Error("should block");
  });
}

// ── FTC subject extraction ─────────────────────────────────────────────────
Deno.test("FTC subject: 'X, In the Matter of'", () => {
  const s = extractFtcSubject("General Motors LLC., et al., In the Matter of");
  if (s !== "General Motors LLC") throw new Error("got: " + s);
});
Deno.test("FTC subject: 'X, FTC v.'", () => {
  if (extractFtcSubject("Mercury Marketing LLC, FTC v.") !== "Mercury Marketing LLC")
    throw new Error("mercury");
});
Deno.test("FTC subject: 'FTC v. X'", () => {
  if (extractFtcSubject("FTC v Kochava, Inc.") !== "Kochava, Inc.".split(",")[0])
    // Kochava, Inc. contains a comma — our pattern stops at first comma; that's OK.
    if (extractFtcSubject("FTC v Kochava, Inc.") !== "Kochava")
      throw new Error("got: " + extractFtcSubject("FTC v Kochava, Inc."));
});
Deno.test("FTC subject: 'United States and State of Wisconsin v. X'", () => {
  const s = extractFtcSubject("Square One Development Group Inc et al, United States and State of Wisconsin v.");
  if (s !== "Square One Development Group Inc") throw new Error("got: " + s);
});
Deno.test("FTC subject: junk title → null", () => {
  if (extractFtcSubject("About the FTC") !== null) throw new Error("should be null");
});

// ── HHS OCR URL gate ────────────────────────────────────────────────────────
const HHS_PASS = [
  "https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/agreements/anthem/index.html",
  "https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/agreements/lincare/index.html",
  "https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/examples/some-case/",
];
for (const u of HHS_PASS) {
  Deno.test(`HHS url PASS: ${u.slice(-50)}`, () => {
    if (!isHhsOcrEnforcementUrl(u)) throw new Error("should pass");
  });
}

const HHS_BLOCK = [
  "https://www.hhs.gov/about/news/2024/01/some-press-release",
  "https://www.hhs.gov/grants-contracts/grants/index.html",
  "https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/agreements/index.html", // landing
  "https://www.hhs.gov/hipaa/for-professionals/faq/index.html",
];
for (const u of HHS_BLOCK) {
  Deno.test(`HHS url BLOCK: ${u.slice(-50)}`, () => {
    if (isHhsOcrEnforcementUrl(u)) throw new Error("should block");
  });
}

// ── HHS subject extraction ─────────────────────────────────────────────────
Deno.test("HHS subject: 'Anthem pays OCR $N'", () => {
  const s = extractHhsSubject("Anthem pays OCR $16 Million in record HIPAA settlement");
  if (s !== "Anthem") throw new Error("got: " + s);
});
Deno.test("HHS subject: 'Imposes a $N CMP Against X'", () => {
  const s = extractHhsSubject("HHS Office for Civil Rights Imposes a $70,000 Civil Monetary Penalty Against Gums Dental Care");
  if (s !== "Gums Dental Care") throw new Error("got: " + s);
});
Deno.test("HHS subject: 'Settles ... with X'", () => {
  const s = extractHhsSubject("HHS Office for Civil Rights Settles HIPAA Investigation with Arkansas Business Associate MedEvolve");
  if (s !== "Arkansas Business Associate MedEvolve") throw new Error("got: " + s);
});
Deno.test("HHS subject: 'requiring X to pay'", () => {
  const s = extractHhsSubject("Administrative Law Judge rules in favor of OCR enforcement, requiring Lincare, Inc. to pay $239,800");
  if (s !== "Lincare") throw new Error("got: " + s);
});
Deno.test("HHS subject: 'X Settles ... for $N'", () => {
  const s = extractHhsSubject("Cottage Health Settles Potential Violations of HIPAA Rules for $3 Million");
  if (s !== "Cottage Health") throw new Error("got: " + s);
});

// ── Label normalization ─────────────────────────────────────────────────────
Deno.test("label normalize: FTC long form", () => {
  if (normalizeRegulatorLabel("Federal Trade Commission (FTC)") !== "FTC") throw new Error("ftc");
});
Deno.test("label normalize: passthrough", () => {
  if (normalizeRegulatorLabel("ICO") !== "ICO") throw new Error("passthrough");
});
