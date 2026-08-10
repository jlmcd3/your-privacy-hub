import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyAuthority } from "../../../supabase/functions/_shared/report-exhibits/authority-exhibit.ts";

const STATUTES = [
  "9 V.S.A. § 2446",
  "9 V.S.A. § 2446(a)(3)",
  "9 V.S.A. §§ 2430, 2446",
  "ORS 646A.593",
  "ORS 646A.593(1)(c)(A)",
  "ORS § 646A.578(2)(a)",
  "RCW 19.375.020(4)",
  "740 ILCS 14/15(b)",
  "C.R.S. § 6-1-1303(5)",
  "N.J.S.A. 56:8-166.4",
  "Va. Code § 59.1-575",
  "Utah Code § 13-61-302(3)",
  "Neb. Rev. Stat. § 87-1104(4)",
  "Conn. Gen. Stat. § 42-520(a)(6)",
  "Tenn. Code Ann. § 47-18-3201",
  "Md. Code Com. Law § 14-4607(a)(4)",
  "N.H. Rev. Stat. § 507-H:6(I)(d)",
  "N.Y. Gen. Bus. Law § 899-bb(2)(a)",
  "Del. Code Ann. tit. 6, § 12D-101",
  "Iowa Code § 715D.4(2)(d)",
  "Ind. Code § 24-15-1-1",
  "Minn. Stat. § 325O.05(1)(d)",
  "Cal. Civ. Code § 1798.99.80",
  "Tex. Bus. & Com. Code § 510.003(a)",
];

// Classes that must NOT be swallowed by the new state-statute patterns.
const OTHERS: Array<[string, string]> = [
  ["11 CCR § 7123(c)(1)", "regulation"],
  ["Cal. Code Regs. tit. 11, § 7123", "regulation"],
  ["Article 30 GDPR", "regulation"],
  ["Regulation (EU) 2016/679", "regulation"],
  ["U.S. Const. amend. I", "constitutional"],
  ["EDPB Guidelines 8/2020", "administrative"],
  ["CPPA Enforcement Advisory No. 2024-01", "administrative"],
  ["Some Random Whitepaper", "other"],
];

Deno.test("state statutory-code formats classify as statutes", () => {
  for (const c of STATUTES) assertEquals(classifyAuthority(c), "statute", c);
});

Deno.test("non-statute classes are unchanged", () => {
  for (const [c, want] of OTHERS) assertEquals(classifyAuthority(c), want, c);
});
