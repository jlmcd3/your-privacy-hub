// ADMT master review (2026-09-15/16, ChatGPT + Claude) — source-level pins on
// the intake page plus unit pins on the modules it now leans on.
//
// F01: every statute-rail hook resolves to an entry, including the dynamic
// routes (notice elements, readiness elements). F14: every fail() key has an
// anchor. F08: every payload key is reviewable. F02–F06: the derived-value
// and opt-out shortcuts are gone. F17: legacy camelCase drafts migrate and an
// empty restore is reported. S01–S18: the copy that made false claims is gone
// and no implementation note leaks into customer-facing copy.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ADMT_RAIL } from "@/components/admt/admtRailEntries";
import { ADMT_REVIEW_KEYS } from "@/lib/admtReview";
import { ADMT_COPY } from "@/pages/admt/admtCopy";
import {
  ACCESS_READINESS_ELEMENT_KEYS,
  ADMT_DRAFT_KEYS,
  ADMT_LEGACY_DRAFT_KEYS,
  NOTICE_ELEMENT_RAIL,
  draftHasRecognisedAnswers,
  normaliseAdmtDraft,
} from "@/pages/admt/admtDraft";

const PAGE = readFileSync("src/pages/admt/ADMTChecker.tsx", "utf8");
const uniq = (re: RegExp) => [...new Set([...PAGE.matchAll(re)].map((m) => m[1]))];

describe("ADMT intake — 2026-09-15 review pins", () => {
  it("every static and routed rail key on the page resolves to a rail entry (F01)", () => {
    const missing = uniq(/data-rail-key="([a-z0-9_]+)"/g).filter((k) => !(k in ADMT_RAIL));
    expect(missing, `undefined rail keys: ${missing.join(", ")}`).toEqual([]);
    for (const k of Object.values(NOTICE_ELEMENT_RAIL)) expect(k in ADMT_RAIL, `notice element route ${k}`).toBe(true);
    for (const k of ACCESS_READINESS_ELEMENT_KEYS) expect(`access_readiness_${k}` in ADMT_RAIL, `readiness route ${k}`).toBe(true);
    for (const k of ["optout_exception_other", "optout_exception_human_appeal", "sole_use_attestation", "sole_use_attestation_work"]) {
      expect(k in ADMT_RAIL, `dynamic route ${k}`).toBe(true);
    }
    // The seven profile-style questions the review found unhooked.
    for (const k of ["organization_name", "system_type", "third_party_admt", "ca_consumer_count", "admt_system_count", "training_data_use", "profiling_use"]) {
      expect(PAGE.includes(`data-rail-key="${k}"`), `${k} is hooked on the page`).toBe(true);
    }
  });

  it("every fail() key is anchored and the summary links to the flagged question (F14)", () => {
    const failKeys = uniq(/fail\("([a-z0-9_.]+)"/g);
    expect(failKeys.length).toBeGreaterThanOrEqual(20);
    const anchors = uniq(/errAnchor\("([a-z0-9_.]+)"\)/g);
    const unanchored = failKeys.filter((k) => !anchors.includes(k));
    expect(unanchored, `fail keys without an errAnchor: ${unanchored.join(", ")}`).toEqual([]);
    // The contradiction branch picks one of three keys at runtime; all three are anchored.
    for (const k of ["admt_detail.solely_advertising", "admt_detail.hi_reviewer_present", "decision_domains"]) expect(anchors).toContain(k);
    expect(PAGE.includes("fieldErrors.show(issue.fields, issue.message)")).toBe(true);
    expect(PAGE.includes("fieldKey={fieldErrors.fields[0] ?? null}")).toBe(true);
  });

  it("every payload key the page sends is reviewable and the review model is rendered (F08)", () => {
    const start = PAGE.indexOf("const intake = useMemo(");
    const end = PAGE.indexOf("}),", start);
    const keys = [...PAGE.slice(start, end).matchAll(/^\s{6}([a-z0-9_]+):/gm)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(30);
    // admt_detail is a nested object: its sub-keys are reviewed as "admt_detail.<sub>" rows,
    // and any sub-key the table does not name still renders with a humanised label.
    const detailReviewed = [...ADMT_REVIEW_KEYS].some((k) => k.startsWith("admt_detail."));
    expect(detailReviewed).toBe(true);
    const missing = keys.filter((k) => k !== "admt_detail" && !ADMT_REVIEW_KEYS.has(k));
    expect(missing, `payload keys missing from the review: ${missing.join(", ")}`).toEqual([]);
    expect(PAGE.includes("buildAdmtReview(intake, { inactiveKeys: inactiveReviewKeys, provisionalKeys: provisionalReviewKeys })")).toBe(true);
    expect(PAGE.includes("ADMT_COPY.finalReviewInstruction")).toBe(true);
  });

  it("derived values are suggestions, never silent answers (F02, F03, F04, F05)", () => {
    // F02 — no digit-joining band inference and no effect writing the band.
    expect(PAGE.includes('caConsumerCount.replace(/[^0-9]/g, "")')).toBe(false);
    expect(PAGE.includes("setAffectedPopulationBand(suggestedBand)")).toBe(false);
    expect(PAGE.includes("suggestPopulationBand(caConsumerCount)")).toBe(true);
    // F03 — the coverage question is never seeded from the authority answer.
    expect(PAGE.includes('markPrefilled("hi_reviewer_present")')).toBe(false);
    expect(PAGE.includes('setA("hi_reviewer_present", seed)')).toBe(false);
    // F04/F05 — no auto-seeding effects; the payload strips unconfirmed values.
    expect(PAGE.includes("const adoptAssembledNotice = () => {")).toBe(true); // explicit adopt action only
    expect(PAGE.includes('const startDisclosureFromProcess = (field: "accessLogicDisclosure" | "accessOutcomeDisclosure")')).toBe(true);
    expect(/useEffect\(\(\) => \{\s*if \(prefillTouched\.noticeFullText/.test(PAGE)).toBe(false);
    expect(/useEffect\(\(\) => \{\s*if \(prefillTouched\.accessLogicDisclosure/.test(PAGE)).toBe(false);
    expect(PAGE.includes('notice_full_text: unlessProvisional("noticeFullText", noticeFullText)')).toBe(true);
    expect(PAGE.includes('access_logic_disclosure: unlessProvisional("accessLogicDisclosure", accessLogicDisclosure)')).toBe(true);
    expect(PAGE.includes('access_outcome_disclosure: unlessProvisional("accessOutcomeDisclosure", accessOutcomeDisclosure)')).toBe(true);
    expect(PAGE.includes('isProvisional("vendor_product") ? { ...adv, vendor_product: "" } : adv')).toBe(true);
  });

  it("scope and opt-out paths come from the engine mirrors; a truthful shortfall never blocks (F01, F06)", () => {
    expect(PAGE.includes("resolveAdmtScope({ decisionDomains, humanReview, detail: adv })")).toBe(true);
    expect(PAGE.includes("const dutiesOptional = scope.dutiesMayNotAttach")).toBe(true);
    expect(PAGE.includes("outOfScopeByDomain")).toBe(false);
    expect(PAGE.includes("resolveAdmtOptOutPath(optOutException)")).toBe(true);
    expect(PAGE.includes('!optOutException.startsWith("Human appeal") &&')).toBe(false);
    // Zero or one opt-out method is recorded, not refused.
    expect(/fail\([^)]*optOutMethods\.length < 2/.test(PAGE)).toBe(false);
    expect(PAGE.includes("You must provide at least two designated opt-out methods")).toBe(false);
    expect(PAGE.includes("Add another method.")).toBe(false);
    expect(PAGE.includes('data-testid="admt-methods-shortfall"')).toBe(true);
    // The § 7221(b)(3) branch asks its own question.
    expect(PAGE.includes('data-rail-key="sole_use_attestation_work"')).toBe(true);
  });

  it("legacy camelCase drafts migrate and an empty restore is reported, not dismissed (F17, F19)", () => {
    const legacy = { organizationName: "Acme Lending, Inc.", decisionDomains: ["Housing (rental or purchase eligibility)"], adv: { hosting: "Cloud" } };
    const d = normaliseAdmtDraft(legacy);
    expect(d.organization_name).toBe("Acme Lending, Inc.");
    expect(d.decision_domains).toEqual(["Housing (rental or purchase eligibility)"]);
    expect(d.admt_detail).toEqual({ hosting: "Cloud" });
    // A current key already present wins over its legacy twin.
    expect(normaliseAdmtDraft({ organizationName: "Old", organization_name: "New" }).organization_name).toBe("New");
    // Every legacy key maps onto a key the page restores.
    for (const v of Object.values(ADMT_LEGACY_DRAFT_KEYS)) expect(ADMT_DRAFT_KEYS.has(v)).toBe(true);
    expect(draftHasRecognisedAnswers(d)).toBe(true);
    expect(draftHasRecognisedAnswers({})).toBe(false);
    expect(draftHasRecognisedAnswers({ organization_name: "", decision_domains: [], admt_detail: {}, exhibit_stash: { x: "y" } })).toBe(false);
    expect(draftHasRecognisedAnswers({ unrelated: "value" })).toBe(false);
    expect(PAGE.includes("if (!draftHasRecognisedAnswers(d)) {")).toBe(true);
    expect(PAGE.includes('data-testid="admt-restore-warning"')).toBe(true);
    // The exhibit narratives travel with the draft, never with the payload.
    expect(PAGE.includes("({ ...intake, exhibit_stash: exhibitStash })")).toBe(true);
    for (const k of ["third_party_admt", "admt_detail.bias_outcome_summary", "admt_detail.access_denial_basis"]) {
      expect(PAGE.includes(`{...stashFor("${k}")}`), `stash for ${k}`).toBe(true);
    }
  });

  it("the false or inverted copy is gone and no implementation note leaks into customer copy (S01–S18)", () => {
    expect(PAGE.includes("the six things § 7220(c) requires")).toBe(false);
    expect(PAGE.includes("and if it applies, you must offer at least two ways to opt out")).toBe(false);
    expect(PAGE.includes("You must respond within 45 days.")).toBe(false);
    expect(PAGE.includes("risk-assessment duties begin Jan. 1, 2027")).toBe(false);
    expect(PAGE.includes("See a worked example")).toBe(false);
    expect(PAGE.includes("The field examples throughout this form refer back to this scenario.")).toBe(false);
    expect(PAGE.includes("Carried over from your human-review answer above")).toBe(false);
    expect(PAGE.includes("Your generated report contains the authoritative, regulation-cited determination.")).toBe(false);
    for (const [k, v] of Object.entries(ADMT_COPY)) {
      for (const leak of ["Implementation note", "Show a source link", "Use Expand and Collapse", "Retain the permission", "Keep the stored narrative", "Label it"]) {
        expect(v.includes(leak), `${k} leaks "${leak}"`).toBe(false);
      }
    }
    // S17 — the step-aware required mark replaces the imported one on the page.
    expect(PAGE.includes("const Req = () => (starsSuspended ? null : <RequiredStar />)")).toBe(true);
    // S11 — four self-test states, S12 — four scope states.
    expect(PAGE.includes('data-testid="admt-self-test-result" data-state={selfTestState}')).toBe(true);
    for (const level of ['"conflict"', '"incomplete"', '"out"', '"in"']) expect(PAGE.includes(`level: ${level}`)).toBe(true);
  });
});
