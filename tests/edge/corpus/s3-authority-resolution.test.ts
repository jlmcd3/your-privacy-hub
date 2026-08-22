// S3 authority-resolution guard (doc 52 §7; doc 48 §II.4 — S3 is the
// MANDATORY anchor surface). For each of the three converted products,
// every `§`/`Art.` citation token in the product's Determination-appendix
// authority column must resolve to a real registry row — OR be an
// explicit, commented KNOWN_GAPS entry. This is a coverage SWEEP, not a
// rewrite: per rule 3, appendix/registry bytes are never edited here. A
// gap found by this test becomes a proposal in the 52a build log for the
// next CEO redline round, never a silent fix.
//
// Extraction method (kept deliberately simple, per doc 52 §1 "keep it
// simple and honest"): split each authority string on ";", keep only
// clauses containing the product's citation keyword (§ for CCR products,
// Art for GDPR), strip parenthetical subsections, then take the
// remaining digit runs — filtered to 4-digit tokens for CCR sections,
// 1-2-digit tokens for GDPR articles. This intentionally does NOT expand
// ranges ("Arts. 12–22" yields only "12" and "22", not every article in
// between) — a known, logged limitation, not a bug; see the DPIA
// KNOWN_GAPS comment below.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

type Keyword = "§" | "Art";
type DigitLen = "ccr" | "gdpr";

function clauseSections(text: string, keyword: Keyword, digitLen: DigitLen): string[] {
  const out: string[] = [];
  for (const clause of text.split(";")) {
    const hasKeyword = keyword === "Art" ? /\bArts?\.?\b/i.test(clause) : /§/.test(clause);
    if (!hasKeyword) continue;
    const stripped = clause.replace(/\([^)]*\)/g, "");
    for (const n of stripped.matchAll(/\d+/g)) {
      const digits = n[0];
      if (digitLen === "gdpr" && digits.length <= 2) out.push(digits);
      if (digitLen === "ccr" && digits.length === 4) out.push(digits);
    }
  }
  return out;
}

function extractAll(strings: string[], keyword: Keyword, digitLen: DigitLen): Set<string> {
  const set = new Set<string>();
  for (const s of strings) for (const section of clauseSections(s, keyword, digitLen)) set.add(section);
  return set;
}

interface ProductCheck {
  readonly product: string;
  readonly authorityFile: string;
  readonly authorityRegex: RegExp;
  readonly registryFile: string;
  readonly keyword: Keyword;
  readonly digitLen: DigitLen;
  /** Non-registry anchors a future citation-column edit might introduce
   * with a digit inside it (e.g. a dated template version). Currently
   * empty for all three products — see the file header: WP248/Recitals/
   * "Audit methodology" style anchors never match the §/Art clause
   * keyword in the first place, so they never need an allowlist entry. */
  readonly allowlist: readonly string[];
  /** Confirmed-real gaps: cited in the appendix, absent from the
   * registry. Each entry is a proposal for the 52a build log, not a fix. */
  readonly knownGaps: readonly string[];
}

const CHECKS: readonly ProductCheck[] = [
  {
    product: "cppa-risk",
    authorityFile: "supabase/functions/_shared/ltp/risk-skeleton-assemble.ts",
    authorityRegex: /authority:\s*"([^"]+)"/g,
    registryFile: "supabase/functions/_shared/registry/risk-verified-authorities.ts",
    keyword: "§",
    digitLen: "ccr",
    allowlist: [],
    // § 7001 (ADMT/significant-decision definitions) is cited by 3
    // Appendix G factors ("Human review of ADMT" et al.) but the risk
    // registry has no § 7001 row — it is defined-and-registered only in
    // the ADMT registry today. Proposal: either add a shared § 7001 row
    // to risk-verified-authorities.ts, or accept the cross-reference and
    // widen this guard to check risk citations against (risk ∪ admt)
    // registries — a design choice for the CEO redline, not phase 1.
    // RESOLVED 2026-08-22 (phase-2 redline): ra_admt_def/ra_human_involvement
    // rows added to risk-verified-authorities.ts, ported from the ADMT
    // registry's own § 7001(e) rows.
    knownGaps: [],
  },
  {
    product: "cppa-admt",
    authorityFile: "supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts",
    // buildFactorMatrixTable's row array literals: ["Factor", val, val, "Authority"]
    authorityRegex: /\[\s*"[^"]+",\s*[^,]+,\s*[^,]+,\s*"([^"]+)"\s*\]/g,
    registryFile: "supabase/functions/run-admt-checker-v2/_local/registry/admt-verified-authorities.ts",
    keyword: "§",
    digitLen: "ccr",
    allowlist: [],
    // The "Vendor dependency" row cites §§ 7050(h)/7051(a)(6)-(7) (the
    // general vendor/service-provider-contract cluster shared with Risk)
    // but the ADMT registry has no 7050/7051 rows. Proposal: add them, or
    // (matching the § 7001 case above) accept the cross-reference against
    // the Risk registry, which likely already carries this cluster.
    // RESOLVED 2026-08-22 (phase-2 redline): vendor_sp_cooperation
    // (§7050(h)), vendor_contract_duties/vendor_audit_rights
    // (§7051(a)(6)/(7)) rows added to admt-verified-authorities.ts.
    knownGaps: [],
  },
  {
    product: "dpia",
    authorityFile: "supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts",
    authorityRegex: /authority:\s*"([^"]+)"/g,
    registryFile: "supabase/functions/_shared/registry/dpia-verified-authorities.ts",
    keyword: "Art",
    digitLen: "gdpr",
    allowlist: [],
    // "12" and "22" are RANGE-ENDPOINT ARTIFACTS of "GDPR Arts. 12–22"
    // (Data-subject rights) — this extraction method does not expand
    // ranges, so it cannot tell whether the registry actually covers
    // Arts. 12-22 individually (it likely covers several, e.g. 15-17, 20)
    // or is missing the range entirely. Logged as a methodology gap, not
    // a confirmed missing-registry-row claim — a proper fix expands the
    // range at extraction time, deferred as out of phase-1 scope.
    // RESOLVED 2026-08-22 (phase-2 redline): "24"/"39"/"44" — Art. 24
    // (controller responsibility), Art. 39(1)(c) (DPO's DPIA-advice task),
    // and Art. 44 (transfers general principle) rows added to
    // dpia-verified-authorities.ts (accountability_measures_art24,
    // dpo_dpia_advice_art39, transfers_general_principle_art44).
    knownGaps: ["12", "22"],
  },
];

for (const check of CHECKS) {
  Deno.test(`S3 guard — ${check.product}: every appendix authority citation resolves or is a logged gap`, async () => {
    const authoritySrc = await Deno.readTextFile(check.authorityFile);
    const registrySrc = await Deno.readTextFile(check.registryFile);

    const authorityStrings = [...authoritySrc.matchAll(check.authorityRegex)].map((m) => m[1]);
    assert(authorityStrings.length > 0, `${check.product}: found zero authority strings — regex likely stale`);

    const needed = extractAll(authorityStrings, check.keyword, check.digitLen);
    const registryCitations = [...registrySrc.matchAll(/citation:\s*"([^"]+)"/g)].map((m) => m[1]);
    const have = extractAll(registryCitations, check.keyword, check.digitLen);

    const allowed = new Set([...have, ...check.allowlist, ...check.knownGaps]);
    const unresolved = [...needed].filter((s) => !allowed.has(s));
    assertEquals(
      unresolved,
      [],
      `${check.product}: unresolved appendix citation(s) not in registry, allowlist, or KNOWN_GAPS: ${unresolved.join(", ")}`,
    );
  });

  Deno.test(`S3 guard — ${check.product}: KNOWN_GAPS entries are still actually unresolved (staleness check)`, async () => {
    const registrySrc = await Deno.readTextFile(check.registryFile);
    const registryCitations = [...registrySrc.matchAll(/citation:\s*"([^"]+)"/g)].map((m) => m[1]);
    const have = extractAll(registryCitations, check.keyword, check.digitLen);
    for (const gap of check.knownGaps) {
      if (have.has(gap)) {
        throw new Error(
          `${check.product}: KNOWN_GAPS entry "${gap}" now resolves against the registry — remove it from knownGaps (the citation gap this test tracked has been closed)`,
        );
      }
    }
  });
}
