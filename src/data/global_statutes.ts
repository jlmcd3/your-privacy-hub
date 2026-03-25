import type { StatuteEntry } from "./statutes.types";

// Key format: "JURISDICTION_SLUG:DIMENSION_KEY"
// Jurisdiction slugs match keys in COMPARISON_DATA:
//   european-union | united-kingdom | united-states | brazil | canada
//   australia | china | japan | south-korea | india
//
// Dimension keys match the DIMENSIONS[].key values in the component:
//   hasLaw | dpo | breachNotif | rightAccess | rightErasure
//   rightPortability | crossBorder | gdprAdequacy | aiRules | childrenRules

export const GLOBAL_STATUTES: Record<string, StatuteEntry> = {

  // ── EUROPEAN UNION (GDPR + EU AI Act) ─────────────────────────────
  "european-union:hasLaw":           { cite: "Regulation (EU) 2016/679 (GDPR), Art. 1",           url: "https://gdpr-info.eu/art-1-gdpr/" },
  "european-union:dpo":              { cite: "GDPR Art. 37 — Designation of DPO",                 url: "https://gdpr-info.eu/art-37-gdpr/" },
  "european-union:breachNotif":      { cite: "GDPR Art. 33 — Breach notification to SA",          url: "https://gdpr-info.eu/art-33-gdpr/" },
  "european-union:rightAccess":      { cite: "GDPR Art. 15 — Right of access",                    url: "https://gdpr-info.eu/art-15-gdpr/" },
  "european-union:rightErasure":     { cite: "GDPR Art. 17 — Right to erasure",                   url: "https://gdpr-info.eu/art-17-gdpr/" },
  "european-union:rightPortability": { cite: "GDPR Art. 20 — Right to data portability",          url: "https://gdpr-info.eu/art-20-gdpr/" },
  "european-union:crossBorder":      { cite: "GDPR Art. 44 — General principle for transfers",    url: "https://gdpr-info.eu/art-44-gdpr/" },
  "european-union:gdprAdequacy":     { cite: "GDPR Art. 45 — Transfers on basis of adequacy",     url: "https://gdpr-info.eu/art-45-gdpr/" },
  "european-union:aiRules":          { cite: "Regulation (EU) 2024/1689 (EU AI Act)",              url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689" },
  "european-union:childrenRules":    { cite: "GDPR Art. 8 — Children's consent",                  url: "https://gdpr-info.eu/art-8-gdpr/" },

  // ── UNITED KINGDOM (UK GDPR + DPA 2018) ───────────────────────────
  "united-kingdom:hasLaw":           { cite: "Data Protection Act 2018, Part 2",                  url: "https://www.legislation.gov.uk/ukpga/2018/12/part/2" },
  "united-kingdom:dpo":              { cite: "UK GDPR Art. 37 — Designation of DPO",              url: "https://www.legislation.gov.uk/eur/2016/679/article/37" },
  "united-kingdom:breachNotif":      { cite: "UK GDPR Art. 33 — Breach notification",             url: "https://www.legislation.gov.uk/eur/2016/679/article/33" },
  "united-kingdom:rightAccess":      { cite: "UK GDPR Art. 15 — Right of access",                 url: "https://www.legislation.gov.uk/eur/2016/679/article/15" },
  "united-kingdom:rightErasure":     { cite: "UK GDPR Art. 17 — Right to erasure",                url: "https://www.legislation.gov.uk/eur/2016/679/article/17" },
  "united-kingdom:rightPortability": { cite: "UK GDPR Art. 20 — Data portability",                url: "https://www.legislation.gov.uk/eur/2016/679/article/20" },
  "united-kingdom:crossBorder":      { cite: "UK GDPR Art. 44 — Cross-border transfers",          url: "https://www.legislation.gov.uk/eur/2016/679/article/44" },
  "united-kingdom:childrenRules":    { cite: "DPA 2018 s.9 — Child's consent",                    url: "https://www.legislation.gov.uk/ukpga/2018/12/section/9" },

  // ── UNITED STATES (FTC / sector laws — federal + CCPA as reference) ─
  "united-states:breachNotif":       { cite: "FTC Safeguards Rule, 16 C.F.R. Part 314",           url: "https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-314" },
  "united-states:rightAccess":       { cite: "Cal. Civ. Code § 1798.110 (CCPA/CPRA)",             url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.110.&lawCode=CIV" },
  "united-states:rightErasure":      { cite: "Cal. Civ. Code § 1798.105 (CCPA/CPRA)",             url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.105.&lawCode=CIV" },
  "united-states:rightPortability":  { cite: "Cal. Civ. Code § 1798.130(a)(2)(B) (CPRA)",         url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.130.&lawCode=CIV" },
  "united-states:gdprAdequacy":      { cite: "EU-US Data Privacy Framework (2023)",               url: "https://www.dataprivacyframework.gov/" },
  "united-states:childrenRules":     { cite: "COPPA, 15 U.S.C. §§ 6501–6506",                    url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-chapter91&edition=prelim" },

  // ── BRAZIL (LGPD — Lei 13.709/2018) ───────────────────────────────
  "brazil:hasLaw":                   { cite: "Lei n.º 13.709/2018 (LGPD), Art. 1",               url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" },
  "brazil:dpo":                      { cite: "LGPD Art. 41 — Encarregado (DPO)",                  url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm#art41" },
  "brazil:breachNotif":              { cite: "LGPD Art. 48 — Breach notification to ANPD",        url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm#art48" },
  "brazil:rightAccess":              { cite: "LGPD Art. 18, I — Right of access",                 url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm#art18" },
  "brazil:rightErasure":             { cite: "LGPD Art. 18, VI — Right to erasure",               url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm#art18" },
  "brazil:rightPortability":         { cite: "LGPD Art. 18, V — Data portability",                url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm#art18" },
  "brazil:crossBorder":              { cite: "LGPD Art. 33 — International data transfer",        url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm#art33" },
  "brazil:childrenRules":            { cite: "LGPD Art. 14 — Children's data",                    url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm#art14" },

  // ── CANADA (PIPEDA — S.C. 2000, c.5) ─────────────────────────────
  "canada:hasLaw":                   { cite: "PIPEDA, S.C. 2000, c. 5, s. 3",                    url: "https://laws-lois.justice.gc.ca/eng/acts/p-8.6/page-1.html" },
  "canada:breachNotif":              { cite: "PIPEDA ss. 10.1–10.3 — Breach of security",         url: "https://laws-lois.justice.gc.ca/eng/acts/p-8.6/page-5.html#h-416977" },
  "canada:rightAccess":              { cite: "PIPEDA Sched. 1, Principle 9 — Access",             url: "https://laws-lois.justice.gc.ca/eng/acts/p-8.6/page-13.html" },
  "canada:crossBorder":              { cite: "PIPEDA Sched. 1, Principle 1 — Accountability",     url: "https://laws-lois.justice.gc.ca/eng/acts/p-8.6/page-13.html" },
  "canada:gdprAdequacy":             { cite: "EC Adequacy Decision C(2001)4540 (Canada)",         url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32002D0002" },

  // ── AUSTRALIA (Privacy Act 1988 + APPs) ───────────────────────────
  "australia:hasLaw":                { cite: "Privacy Act 1988 (Cth), s. 2A — Objects",           url: "https://www.legislation.gov.au/C2004A03712/latest/text" },
  "australia:breachNotif":           { cite: "Privacy Act 1988, Part IIIC — NDB Scheme",          url: "https://www.legislation.gov.au/C2004A03712/latest/text" },
  "australia:rightAccess":           { cite: "Australian Privacy Principle 12",                    url: "https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principle-12-access-to-personal-information" },
  "australia:crossBorder":           { cite: "Australian Privacy Principle 8",                     url: "https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principle-8-cross-border-disclosure-of-personal-information" },

  // ── CHINA (PIPL 2021) ─────────────────────────────────────────────
  "china:hasLaw":                    { cite: "Personal Information Protection Law, Art. 1",        url: "http://www.npc.gov.cn/npc/c30834/202108/a8c4e3672c74491a80b53a172bb753fe.shtml" },
  "china:dpo":                       { cite: "PIPL Art. 52 — Personal information protection officer", url: "http://www.npc.gov.cn/npc/c30834/202108/a8c4e3672c74491a80b53a172bb753fe.shtml" },
  "china:breachNotif":               { cite: "PIPL Art. 57 — Breach notification",                url: "http://www.npc.gov.cn/npc/c30834/202108/a8c4e3672c74491a80b53a172bb753fe.shtml" },
  "china:rightAccess":               { cite: "PIPL Art. 45 — Right of access and copy",           url: "http://www.npc.gov.cn/npc/c30834/202108/a8c4e3672c74491a80b53a172bb753fe.shtml" },
  "china:rightErasure":              { cite: "PIPL Art. 47 — Right to deletion",                  url: "http://www.npc.gov.cn/npc/c30834/202108/a8c4e3672c74491a80b53a172bb753fe.shtml" },
  "china:rightPortability":          { cite: "PIPL Art. 45(3) — Right to transfer",               url: "http://www.npc.gov.cn/npc/c30834/202108/a8c4e3672c74491a80b53a172bb753fe.shtml" },
  "china:crossBorder":               { cite: "PIPL Arts. 38–43 — Cross-border provision",         url: "http://www.npc.gov.cn/npc/c30834/202108/a8c4e3672c74491a80b53a172bb753fe.shtml" },
  "china:aiRules":                   { cite: "Interim Measures for Generative AI, Art. 1 (CAC 2023)", url: "https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm" },
  "china:childrenRules":             { cite: "PIPL Art. 28 — Minors' personal information",       url: "http://www.npc.gov.cn/npc/c30834/202108/a8c4e3672c74491a80b53a172bb753fe.shtml" },

  // ── JAPAN (APPI) ──────────────────────────────────────────────────
  "japan:hasLaw":                    { cite: "Act on Protection of Personal Information, Art. 1",  url: "https://www.japaneselawtranslation.go.jp/en/laws/view/4241" },
  "japan:breachNotif":               { cite: "APPI Art. 26 — Report and notification of leakage", url: "https://www.japaneselawtranslation.go.jp/en/laws/view/4241" },
  "japan:rightAccess":               { cite: "APPI Art. 33 — Request for disclosure",             url: "https://www.japaneselawtranslation.go.jp/en/laws/view/4241" },
  "japan:rightErasure":              { cite: "APPI Art. 35 — Request for erasure",                url: "https://www.japaneselawtranslation.go.jp/en/laws/view/4241" },
  "japan:crossBorder":               { cite: "APPI Art. 24 — Provision to third parties in foreign countries", url: "https://www.japaneselawtranslation.go.jp/en/laws/view/4241" },
  "japan:gdprAdequacy":              { cite: "EC Adequacy Decision for Japan (2019)",              url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019D0419" },

  // ── SOUTH KOREA (PIPA) ────────────────────────────────────────────
  "south-korea:hasLaw":              { cite: "Personal Information Protection Act, Art. 1",        url: "https://elaw.klri.re.kr/kor_service/lawView.do?hseq=53044&lang=ENG" },
  "south-korea:dpo":                 { cite: "PIPA Art. 31 — Designation of privacy officer",     url: "https://elaw.klri.re.kr/kor_service/lawView.do?hseq=53044&lang=ENG" },
  "south-korea:breachNotif":         { cite: "PIPA Art. 34 — Notification of breach",             url: "https://elaw.klri.re.kr/kor_service/lawView.do?hseq=53044&lang=ENG" },
  "south-korea:rightAccess":         { cite: "PIPA Art. 35 — Right to access",                    url: "https://elaw.klri.re.kr/kor_service/lawView.do?hseq=53044&lang=ENG" },
  "south-korea:rightErasure":        { cite: "PIPA Art. 36 — Right to correction/deletion",       url: "https://elaw.klri.re.kr/kor_service/lawView.do?hseq=53044&lang=ENG" },
  "south-korea:rightPortability":    { cite: "PIPA Art. 35-2 — Right to data portability (2023 amendment)", url: "https://elaw.klri.re.kr/kor_service/lawView.do?hseq=53044&lang=ENG" },
  "south-korea:crossBorder":         { cite: "PIPA Art. 28-8 — Cross-border transfer",            url: "https://elaw.klri.re.kr/kor_service/lawView.do?hseq=53044&lang=ENG" },
  "south-korea:childrenRules":       { cite: "PIPA Art. 39-3 — Children's personal information",  url: "https://elaw.klri.re.kr/kor_service/lawView.do?hseq=53044&lang=ENG" },

  // ── INDIA (DPDP Act 2023) ─────────────────────────────────────────
  "india:breachNotif":               { cite: "DPDP Act 2023, s. 8(6) — Personal data breach",    url: "https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf" },
  "india:rightAccess":               { cite: "DPDP Act 2023, s. 11 — Right to access information", url: "https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf" },
  "india:rightErasure":              { cite: "DPDP Act 2023, s. 12 — Right to erasure",           url: "https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf" },
  "india:childrenRules":             { cite: "DPDP Act 2023, s. 9 — Processing of children's personal data", url: "https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf" },
};
