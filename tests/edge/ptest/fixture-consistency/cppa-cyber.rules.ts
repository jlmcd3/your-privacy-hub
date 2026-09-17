// FIXTURE CONSISTENCY rules for the cppa-cyber /all-ptest panel
// (src/lib/ptestPanels/cppa-cyber.ts). Each rule is a pure function of the
// intake (plus ctx.reportDate/ctx.fixture) — no network, no Date.now().
//
// Literal option strings/constants below are copied verbatim from:
//   - supabase/functions/_shared/intake-contracts/cppa-cybersecurity.ts
//     (CYBER_CONTROL_SLUGS, CYBER_MATURITY_OPTIONS's not-applicable value)
//   - supabase/functions/run-cppa-cybersecurity/_local/ltp/
//     cppa-cyber-deliverables/record-facts.ts (NOT_APPLICABLE_MATURITY)
//   - supabase/functions/run-cppa-cybersecurity/_local/ltp/
//     cppa-cyber-deliverables/build.ts (NO_EVIDENCE_SENTINEL, a local,
//     unexported const there: `"None on file"`)
//
// SKIPPED — cyber.applicability-facts: the brief asks to cross-check an
// "explicit audit-required answer" against the § 7120 A1/A2 facts computed
// by cyber-applicability.ts. No such field exists on this contract or on
// any panel fixture (grepped both) — the contract only carries the six A1/
// A2 PREDICATE inputs (q1_revenue, q2_consumers, q5_sell_share,
// q5c_share_revenue_50pct, q15_sensitive_pi, q15c_spi_volume) that feed
// resolveCyberApplicability(); there is no separately-stored "is an audit
// required" answer to compare them against. Rule omitted rather than
// written as a dead no-op.

import type { Bag, FixtureRule } from "./framework.ts";
import { arr, bag, flatText, get, mentions, parseIsoDate, str, bandRange } from "./framework.ts";

// ── Literal copies (see header for provenance) ─────────────────────────────

const CYBER_CONTROL_SLUGS = [
  "c1_auth", "c2_encryption", "c3_account_access", "c4_inventory", "c5_secure_config",
  "c6_vuln_mgmt", "c7_audit_logs", "c8_network_mon", "c9_anti_malware", "c10_segmentation",
  "c11_port_protocol", "c12_awareness", "c13_training", "c14_secure_dev", "c15_third_party",
  "c16_retention", "c17_incident", "c18_continuity",
] as const;

const NOT_APPLICABLE_MATURITY = "Not applicable to our information system";
const NOT_IMPLEMENTED_MATURITY = "Not implemented";
const NO_EVIDENCE_SENTINEL = "None on file";
// The two maturity rungs read as "implemented/operating" for the
// notes-vs-maturity cross-check (CYBER_MATURITY_OPTIONS's top two tiers).
const IMPLEMENTED_MATURITIES = ["Implemented across organization", "Implemented with continuous monitoring"];

function controlsOf(intake: Bag): Bag[] {
  const rows = get(intake, "controls");
  return Array.isArray(rows) ? (rows as Bag[]) : [];
}

// ── cyber.target-dates helpers ─────────────────────────────────────────────

const MONTH_NUM: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

/** Every "by <ISO date>" or "by <Month YYYY>" commitment date found in a note. */
function extractTargetDates(text: string): Date[] {
  const found: Date[] = [];
  const isoRe = /\bby\s+(\d{4}-\d{2}-\d{2})\b/gi;
  for (const m of text.matchAll(isoRe)) {
    const d = parseIsoDate(m[1]);
    if (d) found.push(d);
  }
  const monthRe = /\bby\s+([A-Za-z]+)\s+(\d{4})\b/gi;
  for (const m of text.matchAll(monthRe)) {
    const mm = MONTH_NUM[m[1].toLowerCase()];
    if (mm) {
      const d = parseIsoDate(`${m[2]}-${mm}-01`);
      if (d) found.push(d);
    }
  }
  return found;
}

// ── cyber.revenue-band helper ───────────────────────────────────────────────

/** "$30M" / "$30 million" / "$1.2 billion" -> a plain dollar number, else null. */
function dollarsToNumber(token: string): number | null {
  const m = token.match(/\$\s?([\d,]+(?:\.\d+)?)\s?(million|billion|m|b)?/i);
  if (!m) return null;
  const num = Number.parseFloat(m[1].replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  const unit = (m[2] ?? "").toLowerCase();
  if (unit === "million" || unit === "m") return num * 1_000_000;
  if (unit === "billion" || unit === "b") return num * 1_000_000_000;
  return num;
}

export const CPPA_CYBER_RULES: readonly FixtureRule[] = [
  {
    id: "cyber.controls-complete",
    title: "Exactly one controls[] row per § 7123(c) component slug; no unknown or duplicate slugs",
    // Catches: a missing component, a duplicated component row, or a
    // controls[].key that isn't one of the 18 canonical § 7123(c) slugs.
    check(intake) {
      const violations: string[] = [];
      const seen = new Map<string, number>();
      for (const row of controlsOf(intake)) {
        const key = str(get(row, "key"));
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      for (const slug of CYBER_CONTROL_SLUGS) {
        const count = seen.get(slug) ?? 0;
        if (count === 0) violations.push(`missing controls[] row for component "${slug}"`);
        if (count > 1) violations.push(`duplicate controls[] rows (${count}) for component "${slug}"`);
      }
      for (const key of seen.keys()) {
        if (key && !(CYBER_CONTROL_SLUGS as readonly string[]).includes(key)) {
          violations.push(`unknown controls[] slug "${key}"`);
        }
      }
      return violations;
    },
  },
  {
    id: "cyber.na-reason",
    title: "maturity is the not-applicable value iff na_reason is non-empty",
    // Catches: a not-applicable component with no stated basis, or an
    // na_reason attached to a component that isn't marked not-applicable.
    check(intake) {
      const violations: string[] = [];
      for (const row of controlsOf(intake)) {
        const key = str(get(row, "key"));
        const maturity = str(get(row, "maturity"));
        const naReason = str(get(row, "na_reason"));
        if (maturity === NOT_APPLICABLE_MATURITY && !naReason) {
          violations.push(`${key}: maturity is not-applicable but na_reason is empty`);
        }
        if (maturity !== NOT_APPLICABLE_MATURITY && naReason) {
          violations.push(`${key}: na_reason is set but maturity is not the not-applicable value`);
        }
      }
      return violations;
    },
  },
  {
    id: "cyber.notes-vs-maturity",
    title: "Notes describing 'not yet implemented' or 'fully implemented' don't contradict the recorded maturity",
    // Catches: notes that say a control isn't built yet next to an
    // implemented/operating maturity, and notes that say a control is fully
    // operating next to the "Not implemented" maturity.
    check(intake) {
      const violations: string[] = [];
      const notYetRe = /not (yet )?implemented|no (policy|control|process) (exists|in place)|planned for|to be (adopted|implemented)/i;
      const fullyRe = /fully implemented|in place and tested|operating effectively/i;
      for (const row of controlsOf(intake)) {
        const key = str(get(row, "key"));
        const maturity = str(get(row, "maturity"));
        const notes = str(get(row, "notes"));
        if (!notes) continue;
        if (notYetRe.test(notes) && IMPLEMENTED_MATURITIES.includes(maturity)) {
          violations.push(`${key}: notes describe an unimplemented control but maturity is "${maturity}"`);
        }
        if (fullyRe.test(notes) && maturity === NOT_IMPLEMENTED_MATURITY) {
          violations.push(`${key}: notes describe a fully implemented control but maturity is "Not implemented"`);
        }
      }
      return violations;
    },
  },
  {
    id: "cyber.evidence-vs-notes",
    title: "Notes naming evidence artifacts agree with the evidence[] list",
    // Catches: notes that name a log/report/screenshot/etc. while evidence[]
    // is empty or only the "None on file" sentinel, and evidence[] that mixes
    // the sentinel with a real evidence category.
    check(intake) {
      const violations: string[] = [];
      const namesEvidenceRe = /\b(log|logs|export|report|test result|screenshot|attestation|letter|certificate|record)s?\b/i;
      for (const row of controlsOf(intake)) {
        const key = str(get(row, "key"));
        const notes = str(get(row, "notes"));
        const evidence = arr(get(row, "evidence"));
        const onlySentinel = evidence.length === 0 || evidence.every((e) => e === NO_EVIDENCE_SENTINEL);
        if (notes && namesEvidenceRe.test(notes) && onlySentinel) {
          violations.push(`${key}: notes name an evidence artifact but evidence[] is empty or "${NO_EVIDENCE_SENTINEL}"`);
        }
        if (evidence.includes(NO_EVIDENCE_SENTINEL) && evidence.some((e) => e !== NO_EVIDENCE_SENTINEL)) {
          violations.push(`${key}: evidence[] mixes "${NO_EVIDENCE_SENTINEL}" with another evidence category`);
        }
      }
      return violations;
    },
  },
  {
    id: "cyber.target-dates",
    title: "A past 'by <date>' commitment beside a Not-implemented maturity says the target slipped",
    // Catches: a remediation target date that has already passed (relative
    // to ctx.reportDate) on a component still recorded "Not implemented",
    // with no notes language acknowledging the slip.
    check(intake, ctx) {
      const violations: string[] = [];
      const reportDate = parseIsoDate(ctx.reportDate);
      if (!reportDate) return violations;
      for (const row of controlsOf(intake)) {
        const key = str(get(row, "key"));
        const maturity = str(get(row, "maturity"));
        const notes = str(get(row, "notes"));
        if (maturity !== NOT_IMPLEMENTED_MATURITY || !notes) continue;
        if (mentions(notes, /missed|slipped|delayed|overdue/i)) continue;
        const past = extractTargetDates(notes).some((d) => d.getTime() < reportDate.getTime());
        if (past) violations.push(`${key}: past target date with no status`);
      }
      return violations;
    },
  },
  {
    id: "cyber.prior-audit",
    title: "profile.last_audit (Never vs a dated audit) agrees with profile.prior_audit_scope",
    // Catches: "Never" audited with a prior-scope narrative still attached,
    // and a dated last audit with no described prior scope.
    check(intake) {
      const violations: string[] = [];
      const lastAudit = str(get(intake, "profile.last_audit"));
      const scope = str(get(intake, "profile.prior_audit_scope"));
      // A "Never" record may state that fact in the scope field itself.
      if (lastAudit === "Never" && scope && !/^(no prior|none|not applicable|n\/a)\b/i.test(scope)) {
        violations.push('profile.last_audit is "Never" but prior_audit_scope is non-empty');
      }
      if (lastAudit && lastAudit !== "Never" && !scope) {
        violations.push(`profile.last_audit is "${lastAudit}" but prior_audit_scope is empty`);
      }
      return violations;
    },
  },
  {
    id: "cyber.notifications",
    title: "profile.incidents_12mo (zero vs positive) agrees with the notification answers",
    // Catches: a zero incident count paired with a notice-provided answer,
    // and a positive incident count with no notification answer at all
    // (resolveNotificationFacts' hasIncidents gate, read the same way here).
    check(intake) {
      const violations: string[] = [];
      const count = str(get(intake, "profile.incidents_12mo"));
      const consumerStatus = str(get(intake, "profile.consumer_notice_status"));
      const agencyStatus = str(get(intake, "profile.agency_notice_status"));
      const legacy = str(get(intake, "profile.incident_notifications"));
      const isZero = /^none$/i.test(count);
      const isPositive = count === "1" || count === "2–5" || count === "More than 5";
      if (isZero) {
        if (/^Notice provided/.test(consumerStatus) || /^Notice provided/.test(agencyStatus)) {
          violations.push('incidents_12mo is "None" but a notice-provided answer is recorded');
        }
        if (legacy && legacy !== "Unsure" && legacy !== "No notification was required") {
          violations.push('incidents_12mo is "None" but incident_notifications claims a notification occurred');
        }
      }
      if (isPositive && !consumerStatus && !agencyStatus && !legacy) {
        violations.push(`incidents_12mo is "${count}" but no notification answer is recorded`);
      }
      return violations;
    },
  },
  {
    id: "cyber.auditor-status",
    title: "profile.auditor_engagement_status doesn't contradict a narrative claim about who performs the audit",
    // Catches: an internal-auditor status beside a narrative saying an
    // external firm is engaged, and an external-auditor status beside a
    // narrative saying the internal audit team performs the audit.
    check(intake) {
      const violations: string[] = [];
      const status = str(get(intake, "profile.auditor_engagement_status"));
      const text = flatText(intake);
      if (/internal/i.test(status) && mentions(text, /external (firm|auditor)\b[^.]{0,40}\bengag/i)) {
        violations.push("auditor_engagement_status names an internal auditor but a narrative field says an external firm is engaged");
      }
      if (/^External/i.test(status) && mentions(text, /internal audit team performs the audit/i)) {
        violations.push("auditor_engagement_status names an external auditor but a narrative field says the internal audit team performs the audit");
      }
      return violations;
    },
  },
  {
    id: "cyber.entity",
    title: "profile.entity_name equals the fixture's company name",
    // Catches: a fixture whose intake names a different legal entity than
    // its own PanelFixture.company field.
    check(intake, ctx) {
      const entity = str(get(intake, "profile.entity_name"));
      return entity === ctx.fixture.company
        ? []
        : [`profile.entity_name ("${entity}") does not match fixture.company ("${ctx.fixture.company}")`];
    },
  },
  {
    id: "cyber.revenue-band",
    title: "Dollar figures stated in profile text fall inside the profile.q1_revenue band",
    // Catches: a profile narrative field naming a revenue figure that falls
    // outside the range of the profile's own stated q1_revenue band.
    check(intake) {
      const violations: string[] = [];
      const bandKey = str(get(intake, "profile.q1_revenue"));
      if (!bandKey) return violations;
      const range = bandRange(bandKey);
      if (!range) return violations;
      const profile = bag(get(intake, "profile"));
      for (const [field, value] of Object.entries(profile)) {
        if (field === "q1_revenue" || typeof value !== "string") continue;
        for (const m of value.matchAll(/\$\s?[\d,]+(?:\.\d+)?\s?(?:million|billion|[MB])?\b/gi)) {
          const n = dollarsToNumber(m[0]);
          if (n === null) continue;
          if ((range.min != null && n < range.min) || (range.max != null && n > range.max)) {
            violations.push(`profile.${field} states a dollar figure ("${m[0].trim()}") outside the stated revenue band "${bandKey}"`);
          }
        }
      }
      return violations;
    },
  },
];
