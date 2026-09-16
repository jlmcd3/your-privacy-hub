// Cyber master review (2026-09-15/16) — source-level pins on the intake page.
//
// F01: every statute-rail hook resolves to an entry (seven profile keys had
// none). Addition 2: the five gating fields carry a field-error anchor whose
// key matches the gate's fail() key. F05/F08/F12/P18: the copy that made false
// claims is gone. Addition 1: the payload's profile keys are all reviewable.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CPPA_CYBER_RAIL } from "@/components/cppa/CPPACyberRailEntries";
import { CYBER_REVIEW_PROFILE_KEYS } from "@/lib/cyberReview";

const PAGE = readFileSync("src/pages/CPPACybersecurity.tsx", "utf8");
const uniq = (re: RegExp) => [...new Set([...PAGE.matchAll(re)].map((m) => m[1]))];

describe("CPPA Cyber intake — 2026-09-15 review pins", () => {
  it("every static data-rail-key on the page resolves to a rail entry (F01)", () => {
    const missing = uniq(/data-rail-key="([a-z0-9_]+)"/g).filter((k) => !(k in CPPA_CYBER_RAIL));
    expect(missing, `undefined rail keys: ${missing.join(", ")}`).toEqual([]);
    for (const k of ["q1_revenue", "q2_consumers", "q5_sell_share", "q5c_share_revenue_50pct", "q15_sensitive_pi", "q15c_spi_volume", "remediation_owner", "q1_revenue_threshold_check", "consumer_notice_status", "agency_notice_status"]) {
      expect(k in CPPA_CYBER_RAIL, `${k} has a rail entry`).toBe(true);
    }
    // The 18 control keys are hooked dynamically (data-rail-key={c.key}); each has an entry.
    for (let i = 1; i <= 18; i++) {
      const key = Object.keys(CPPA_CYBER_RAIL).find((k) => k.startsWith(`c${i}_`));
      expect(key, `control c${i} has a rail entry`).toBeTruthy();
    }
  });

  it("the five gating fields are anchored and the gate names the same keys (Addition 2)", () => {
    const failKeys = uniq(/fail\("([a-z0-9_]+)"/g);
    expect(failKeys.sort()).toEqual(["entity_name", "framework", "incidents_12mo", "industry", "last_audit"]);
    const anchors = uniq(/errAnchor\("([a-z0-9_]+)"\)/g);
    for (const k of failKeys) expect(anchors, `anchor for ${k}`).toContain(k);
    expect(PAGE.includes("fieldErrors.show(issue.fields, issue.message)")).toBe(true);
    expect(PAGE.includes("<ValidationErrorSummary")).toBe(true);
  });

  it("the false or internal copy the review flagged is gone (S01, S04, P18, F04)", () => {
    expect(PAGE.includes("These five facts set the audit perimeter")).toBe(false);
    expect(PAGE.includes("records nothing on file for it")).toBe(false);
    expect(PAGE.includes("most common reason remediation stalls")).toBe(false);
    expect(PAGE.includes("you can supply them later")).toBe(false);
    // Maturity is optional at the gate and is labelled so; the stars stay on the five gating fields.
    expect(/Maturity <span className="font-normal text-muted-foreground">\(optional\)<\/span>/.test(PAGE)).toBe(true);
    expect((PAGE.match(/<Req \/>/g) ?? []).length).toBe(5);
  });

  it("evidence 'None on file' and the framework absence answer are exclusive on the page (F05, F08)", () => {
    expect(PAGE.includes('if (opt === EVIDENCE_NONE) return { ...s, [k]: [EVIDENCE_NONE] };')).toBe(true);
    expect(PAGE.includes("if (opt === CYBER_NO_PRIOR_FRAMEWORK_WORK) return { ...p, in_scope_frameworks: [CYBER_NO_PRIOR_FRAMEWORK_WORK] };")).toBe(true);
    // A carried-over primary framework is a suggestion until confirmed and does not travel unconfirmed.
    expect(PAGE.includes("in_scope_frameworks: inScopePrefilled && !inScopeTouched ? [] : profile.in_scope_frameworks")).toBe(true);
    expect(PAGE.includes("Confirm this selection")).toBe(true);
  });

  it("the dated threshold question and the split notification questions are wired (F06, F07)", () => {
    expect(PAGE.includes("CYBER_REVENUE_THRESHOLD_CHECK_OPTIONS.map")).toBe(true);
    expect(PAGE.includes("ccpaRevenueThresholdForYearMirror")).toBe(true);
    expect(PAGE.includes("CYBER_CONSUMER_NOTICE_STATUS_OPTIONS.map")).toBe(true);
    expect(PAGE.includes("CYBER_AGENCY_NOTICE_STATUS_OPTIONS.map")).toBe(true);
    expect(PAGE.includes("CYBER_INCIDENTS_12MO_OPTIONS.map")).toBe(true);
  });

  it("every profile key the page sends is reviewable (Addition 1)", () => {
    const start = PAGE.indexOf("const [profile, setProfile] = useState({");
    const end = PAGE.indexOf("});", start);
    const keys = [...PAGE.slice(start, end).matchAll(/\b([a-z0-9_]+):\s*(?:""|\[\] as string\[\])/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(15);
    const missing = keys.filter((k) => !CYBER_REVIEW_PROFILE_KEYS.has(k));
    expect(missing, `profile keys missing from the review: ${missing.join(", ")}`).toEqual([]);
    expect(PAGE.includes("buildCyberReview(intake)")).toBe(true);
  });
});
