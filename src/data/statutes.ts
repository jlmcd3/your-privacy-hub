import type { StatuteEntry } from "./statutes.types";

// Key format: "STATE_ABBR:PROVISION_INDEX"
// Provision indices (matches us_state_comparison.json provisions array):
// 0=Consumer access  1=Deletion  2=Portability     3=Correction
// 4=Opt-out sale     5=Opt-out targeted ads         6=Opt-out profiling
// 7=Sensitive data   8=DPIA      9=Data broker      10=Private right of action

export const STATUTES: Record<string, StatuteEntry> = {
  // ── CALIFORNIA (CPRA) ──────────────────────────────────────────────────────
  "CA:0": { cite: "Cal. Civ. Code § 1798.110", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.110" },
  "CA:1": { cite: "Cal. Civ. Code § 1798.105", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.105" },
  "CA:2": { cite: "Cal. Civ. Code § 1798.110(d)", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.110" },
  "CA:3": { cite: "Cal. Civ. Code § 1798.106", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.106" },
  "CA:4": { cite: "Cal. Civ. Code § 1798.120", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.120" },
  "CA:5": { cite: "Cal. Civ. Code § 1798.120", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.120" },
  "CA:6": { cite: "Cal. Civ. Code § 1798.185(a)(15)", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.185" },
  "CA:7": { cite: "Cal. Civ. Code § 1798.121", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.121" },
  "CA:8": { cite: "Cal. Civ. Code § 1798.185(a)(15)", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.185" },
  "CA:9": { cite: "Cal. Civ. Code § 1798.99.80", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.99.80" },
  "CA:10": { cite: "Cal. Civ. Code § 1798.150", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.150" },

  // ── COLORADO (CPA) ────────────────────────────────────────────────────────
  "CO:0": { cite: "C.R.S. § 6-1-1306(1)(b)", url: "https://leg.colorado.gov/sites/default/files/images/olls/crs2023-title-06.pdf" },
  "CO:1": { cite: "C.R.S. § 6-1-1306(1)(d)", url: "https://leg.colorado.gov/sites/default/files/images/olls/crs2023-title-06.pdf" },
  "CO:2": { cite: "C.R.S. § 6-1-1306(1)(e)", url: "https://leg.colorado.gov/sites/default/files/images/olls/crs2023-title-06.pdf" },
  "CO:3": { cite: "C.R.S. § 6-1-1306(1)(c)", url: "https://leg.colorado.gov/sites/default/files/images/olls/crs2023-title-06.pdf" },
  "CO:4": { cite: "C.R.S. § 6-1-1306(1)(a)(I)(B)", url: "https://leg.colorado.gov/sites/default/files/images/olls/crs2023-title-06.pdf" },
  "CO:5": { cite: "C.R.S. § 6-1-1306(1)(a)(I)(A)", url: "https://leg.colorado.gov/sites/default/files/images/olls/crs2023-title-06.pdf" },
  "CO:6": { cite: "C.R.S. § 6-1-1306(1)(a)(I)(C)", url: "https://leg.colorado.gov/sites/default/files/images/olls/crs2023-title-06.pdf" },
  "CO:7": { cite: "C.R.S. § 6-1-1308(7)", url: "https://leg.colorado.gov/sites/default/files/images/olls/crs2023-title-06.pdf" },
  "CO:8": { cite: "C.R.S. § 6-1-1309", url: "https://leg.colorado.gov/sites/default/files/images/olls/crs2023-title-06.pdf" },

  // ── CONNECTICUT (CTDPA) ───────────────────────────────────────────────────
  "CT:0": { cite: "Conn. Gen. Stat. § 42-518(a)(1)", url: "https://www.cga.ct.gov/current/pub/chap_743dd.htm" },
  "CT:1": { cite: "Conn. Gen. Stat. § 42-518(a)(3)", url: "https://www.cga.ct.gov/current/pub/chap_743dd.htm" },
  "CT:2": { cite: "Conn. Gen. Stat. § 42-518(a)(4)", url: "https://www.cga.ct.gov/current/pub/chap_743dd.htm" },
  "CT:3": { cite: "Conn. Gen. Stat. § 42-518(a)(2)", url: "https://www.cga.ct.gov/current/pub/chap_743dd.htm" },
  "CT:4": { cite: "Conn. Gen. Stat. § 42-518(a)(5)(B)", url: "https://www.cga.ct.gov/current/pub/chap_743dd.htm" },
  "CT:5": { cite: "Conn. Gen. Stat. § 42-518(a)(5)(A)", url: "https://www.cga.ct.gov/current/pub/chap_743dd.htm" },
  "CT:6": { cite: "Conn. Gen. Stat. § 42-518(a)(5)(C)", url: "https://www.cga.ct.gov/current/pub/chap_743dd.htm" },
  "CT:7": { cite: "Conn. Gen. Stat. § 42-520(b)(4)", url: "https://www.cga.ct.gov/current/pub/chap_743dd.htm" },
  "CT:8": { cite: "Conn. Gen. Stat. § 42-522", url: "https://www.cga.ct.gov/current/pub/chap_743dd.htm" },

  // ── DELAWARE (DPDPA) ──────────────────────────────────────────────────────
  "DE:0": { cite: "6 Del. C. § 12D-104(a)(1)", url: "https://delcode.delaware.gov/title6/c012d/index.html" },
  "DE:1": { cite: "6 Del. C. § 12D-104(a)(3)", url: "https://delcode.delaware.gov/title6/c012d/index.html" },
  "DE:2": { cite: "6 Del. C. § 12D-104(a)(4)", url: "https://delcode.delaware.gov/title6/c012d/index.html" },
  "DE:3": { cite: "6 Del. C. § 12D-104(a)(2)", url: "https://delcode.delaware.gov/title6/c012d/index.html" },
  "DE:4": { cite: "6 Del. C. § 12D-104(a)(6)(B)", url: "https://delcode.delaware.gov/title6/c012d/index.html" },
  "DE:5": { cite: "6 Del. C. § 12D-104(a)(6)(A)", url: "https://delcode.delaware.gov/title6/c012d/index.html" },
  "DE:6": { cite: "6 Del. C. § 12D-104(a)(6)(C)", url: "https://delcode.delaware.gov/title6/c012d/index.html" },
  "DE:7": { cite: "6 Del. C. § 12D-106(a)(4)", url: "https://delcode.delaware.gov/title6/c012d/index.html" },

  // ── FLORIDA (FDBR) ────────────────────────────────────────────────────────
  "FL:0": { cite: "Fla. Stat. § 501.705(1)(a)", url: "http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0501/0501.html" },
  "FL:1": { cite: "Fla. Stat. § 501.705(1)(b)", url: "http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0501/0501.html" },
  "FL:3": { cite: "Fla. Stat. § 501.705(1)(d)", url: "http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0501/0501.html" },
  "FL:4": { cite: "Fla. Stat. § 501.705(1)(e)", url: "http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0501/0501.html" },
  "FL:5": { cite: "Fla. Stat. § 501.705(1)(e)", url: "http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0501/0501.html" },
  "FL:7": { cite: "Fla. Stat. § 501.71(4)", url: "http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0501/0501.html" },

  // ── IOWA (ICDPA) ──────────────────────────────────────────────────────────
  "IA:0": { cite: "Iowa Code § 715D.3(1)(a)", url: "https://www.legis.iowa.gov/law/iowaCode/sections?codeChapter=715D" },
  "IA:1": { cite: "Iowa Code § 715D.3(1)(b)", url: "https://www.legis.iowa.gov/law/iowaCode/sections?codeChapter=715D" },
  "IA:2": { cite: "Iowa Code § 715D.3(1)(c)", url: "https://www.legis.iowa.gov/law/iowaCode/sections?codeChapter=715D" },
  "IA:4": { cite: "Iowa Code § 715D.3(1)(d)", url: "https://www.legis.iowa.gov/law/iowaCode/sections?codeChapter=715D" },
  "IA:5": { cite: "Iowa Code § 715D.4", url: "https://www.legis.iowa.gov/law/iowaCode/sections?codeChapter=715D" },
  "IA:7": { cite: "Iowa Code § 715D.4", url: "https://www.legis.iowa.gov/law/iowaCode/sections?codeChapter=715D" },

  // ── INDIANA (INCDPA) ──────────────────────────────────────────────────────
  "IN:0": { cite: "IC § 24-15-4-1(a)(1)", url: "https://iga.in.gov/laws/2024/ic/titles/24#24-15" },
  "IN:1": { cite: "IC § 24-15-4-1(a)(2)", url: "https://iga.in.gov/laws/2024/ic/titles/24#24-15" },
  "IN:2": { cite: "IC § 24-15-4-1(a)(3)", url: "https://iga.in.gov/laws/2024/ic/titles/24#24-15" },
  "IN:3": { cite: "IC § 24-15-4-1(a)(4)", url: "https://iga.in.gov/laws/2024/ic/titles/24#24-15" },
  "IN:4": { cite: "IC § 24-15-4-1(a)(5)(B)", url: "https://iga.in.gov/laws/2024/ic/titles/24#24-15" },
  "IN:5": { cite: "IC § 24-15-4-1(a)(5)(A)", url: "https://iga.in.gov/laws/2024/ic/titles/24#24-15" },
  "IN:6": { cite: "IC § 24-15-4-1(a)(5)(C)", url: "https://iga.in.gov/laws/2024/ic/titles/24#24-15" },
  "IN:7": { cite: "IC § 24-15-6-1", url: "https://iga.in.gov/laws/2024/ic/titles/24#24-15" },

  // ── KENTUCKY (KCDPA) ──────────────────────────────────────────────────────
  "KY:0": { cite: "KRS § 367.3614(1)(a)", url: "https://apps.legislature.ky.gov/law/statutes/chapter.aspx?id=39357" },
  "KY:1": { cite: "KRS § 367.3614(1)(c)", url: "https://apps.legislature.ky.gov/law/statutes/chapter.aspx?id=39357" },
  "KY:2": { cite: "KRS § 367.3614(1)(d)", url: "https://apps.legislature.ky.gov/law/statutes/chapter.aspx?id=39357" },
  "KY:3": { cite: "KRS § 367.3614(1)(b)", url: "https://apps.legislature.ky.gov/law/statutes/chapter.aspx?id=39357" },
  "KY:4": { cite: "KRS § 367.3614(1)(e)(2)", url: "https://apps.legislature.ky.gov/law/statutes/chapter.aspx?id=39357" },
  "KY:5": { cite: "KRS § 367.3614(1)(e)(1)", url: "https://apps.legislature.ky.gov/law/statutes/chapter.aspx?id=39357" },
  "KY:6": { cite: "KRS § 367.3614(1)(e)(3)", url: "https://apps.legislature.ky.gov/law/statutes/chapter.aspx?id=39357" },
  "KY:7": { cite: "KRS § 367.3618", url: "https://apps.legislature.ky.gov/law/statutes/chapter.aspx?id=39357" },

  // ── MARYLAND (MODPA) ──────────────────────────────────────────────────────
  "MD:0": { cite: "Md. Code, Com. Law § 14-4705(a)(1)", url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4705" },
  "MD:1": { cite: "Md. Code, Com. Law § 14-4705(a)(3)", url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4705" },
  "MD:2": { cite: "Md. Code, Com. Law § 14-4705(a)(4)", url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4705" },
  "MD:3": { cite: "Md. Code, Com. Law § 14-4705(a)(2)", url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4705" },
  "MD:4": { cite: "Md. Code, Com. Law § 14-4705(a)(5)(ii)", url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4705" },
  "MD:5": { cite: "Md. Code, Com. Law § 14-4705(a)(5)(i)", url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4705" },
  "MD:6": { cite: "Md. Code, Com. Law § 14-4705(a)(5)(iii)", url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4705" },
  "MD:7": { cite: "Md. Code, Com. Law § 14-4707", url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4707" },
  "MD:8": { cite: "Md. Code, Com. Law § 14-4709", url: "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4709" },

  // ── MINNESOTA (MCDPA) ─────────────────────────────────────────────────────
  "MN:0": { cite: "Minn. Stat. § 325O.05(1)(a)", url: "https://www.revisor.mn.gov/statutes/cite/325O.05" },
  "MN:1": { cite: "Minn. Stat. § 325O.05(1)(c)", url: "https://www.revisor.mn.gov/statutes/cite/325O.05" },
  "MN:2": { cite: "Minn. Stat. § 325O.05(1)(d)", url: "https://www.revisor.mn.gov/statutes/cite/325O.05" },
  "MN:3": { cite: "Minn. Stat. § 325O.05(1)(b)", url: "https://www.revisor.mn.gov/statutes/cite/325O.05" },
  "MN:4": { cite: "Minn. Stat. § 325O.05(1)(e)(2)", url: "https://www.revisor.mn.gov/statutes/cite/325O.05" },
  "MN:5": { cite: "Minn. Stat. § 325O.05(1)(e)(1)", url: "https://www.revisor.mn.gov/statutes/cite/325O.05" },
  "MN:6": { cite: "Minn. Stat. § 325O.05(1)(e)(3)", url: "https://www.revisor.mn.gov/statutes/cite/325O.05" },
  "MN:7": { cite: "Minn. Stat. § 325O.07(a)(4)", url: "https://www.revisor.mn.gov/statutes/cite/325O.07" },
  "MN:8": { cite: "Minn. Stat. § 325O.09", url: "https://www.revisor.mn.gov/statutes/cite/325O.09" },
  "MN:10": { cite: "Minn. Stat. § 325O.17", url: "https://www.revisor.mn.gov/statutes/cite/325O.17" },

  // ── MONTANA (MCDPA) ───────────────────────────────────────────────────────
  "MT:0": { cite: "Mont. Code § 30-14-2804(1)(a)", url: "https://leg.mt.gov/bills/mca/title_0300/chapter_0140/part_0280/section_0040/0300-0140-0280-0040.html" },
  "MT:1": { cite: "Mont. Code § 30-14-2804(1)(c)", url: "https://leg.mt.gov/bills/mca/title_0300/chapter_0140/part_0280/section_0040/0300-0140-0280-0040.html" },
  "MT:2": { cite: "Mont. Code § 30-14-2804(1)(d)", url: "https://leg.mt.gov/bills/mca/title_0300/chapter_0140/part_0280/section_0040/0300-0140-0280-0040.html" },
  "MT:3": { cite: "Mont. Code § 30-14-2804(1)(b)", url: "https://leg.mt.gov/bills/mca/title_0300/chapter_0140/part_0280/section_0040/0300-0140-0280-0040.html" },
  "MT:4": { cite: "Mont. Code § 30-14-2804(1)(e)(ii)", url: "https://leg.mt.gov/bills/mca/title_0300/chapter_0140/part_0280/section_0040/0300-0140-0280-0040.html" },
  "MT:5": { cite: "Mont. Code § 30-14-2804(1)(e)(i)", url: "https://leg.mt.gov/bills/mca/title_0300/chapter_0140/part_0280/section_0040/0300-0140-0280-0040.html" },
  "MT:6": { cite: "Mont. Code § 30-14-2804(1)(e)(iii)", url: "https://leg.mt.gov/bills/mca/title_0300/chapter_0140/part_0280/section_0040/0300-0140-0280-0040.html" },
  "MT:7": { cite: "Mont. Code § 30-14-2806(1)(d)", url: "https://leg.mt.gov/bills/mca/title_0300/chapter_0140/part_0280/section_0060/0300-0140-0280-0060.html" },

  // ── NEBRASKA (NEDPA) ──────────────────────────────────────────────────────
  "NE:0": { cite: "Neb. Rev. Stat. § 87-1103(1)(a)", url: "https://nebraskalegislature.gov/laws/statutes.php?statute=87-1103" },
  "NE:1": { cite: "Neb. Rev. Stat. § 87-1103(1)(c)", url: "https://nebraskalegislature.gov/laws/statutes.php?statute=87-1103" },
  "NE:2": { cite: "Neb. Rev. Stat. § 87-1103(1)(d)", url: "https://nebraskalegislature.gov/laws/statutes.php?statute=87-1103" },
  "NE:3": { cite: "Neb. Rev. Stat. § 87-1103(1)(b)", url: "https://nebraskalegislature.gov/laws/statutes.php?statute=87-1103" },
  "NE:4": { cite: "Neb. Rev. Stat. § 87-1103(1)(e)(ii)", url: "https://nebraskalegislature.gov/laws/statutes.php?statute=87-1103" },
  "NE:5": { cite: "Neb. Rev. Stat. § 87-1103(1)(e)(i)", url: "https://nebraskalegislature.gov/laws/statutes.php?statute=87-1103" },
  "NE:6": { cite: "Neb. Rev. Stat. § 87-1103(1)(e)(iii)", url: "https://nebraskalegislature.gov/laws/statutes.php?statute=87-1103" },
  "NE:7": { cite: "Neb. Rev. Stat. § 87-1105(3)", url: "https://nebraskalegislature.gov/laws/statutes.php?statute=87-1105" },

  // ── NEW HAMPSHIRE (NHPA) ──────────────────────────────────────────────────
  "NH:0": { cite: "RSA 507-H:3(I)(a)", url: "https://www.gencourt.state.nh.us/rsa/html/LII/507-H/507-H-mrg.htm" },
  "NH:1": { cite: "RSA 507-H:3(I)(c)", url: "https://www.gencourt.state.nh.us/rsa/html/LII/507-H/507-H-mrg.htm" },
  "NH:2": { cite: "RSA 507-H:3(I)(d)", url: "https://www.gencourt.state.nh.us/rsa/html/LII/507-H/507-H-mrg.htm" },
  "NH:3": { cite: "RSA 507-H:3(I)(b)", url: "https://www.gencourt.state.nh.us/rsa/html/LII/507-H/507-H-mrg.htm" },
  "NH:4": { cite: "RSA 507-H:3(I)(e)(2)", url: "https://www.gencourt.state.nh.us/rsa/html/LII/507-H/507-H-mrg.htm" },
  "NH:5": { cite: "RSA 507-H:3(I)(e)(1)", url: "https://www.gencourt.state.nh.us/rsa/html/LII/507-H/507-H-mrg.htm" },
  "NH:6": { cite: "RSA 507-H:3(I)(e)(3)", url: "https://www.gencourt.state.nh.us/rsa/html/LII/507-H/507-H-mrg.htm" },
  "NH:7": { cite: "RSA 507-H:5(IV)", url: "https://www.gencourt.state.nh.us/rsa/html/LII/507-H/507-H-mrg.htm" },

  // ── NEW JERSEY (NJDPA) ────────────────────────────────────────────────────
  "NJ:0": { cite: "N.J. Stat. § 56:8-166.10(a)(1)", url: "https://law.justia.com/codes/new-jersey/title-56/section-56-8-166-10/" },
  "NJ:1": { cite: "N.J. Stat. § 56:8-166.10(a)(3)", url: "https://law.justia.com/codes/new-jersey/title-56/section-56-8-166-10/" },
  "NJ:2": { cite: "N.J. Stat. § 56:8-166.10(a)(4)", url: "https://law.justia.com/codes/new-jersey/title-56/section-56-8-166-10/" },
  "NJ:3": { cite: "N.J. Stat. § 56:8-166.10(a)(2)", url: "https://law.justia.com/codes/new-jersey/title-56/section-56-8-166-10/" },
  "NJ:4": { cite: "N.J. Stat. § 56:8-166.10(a)(5)(b)", url: "https://law.justia.com/codes/new-jersey/title-56/section-56-8-166-10/" },
  "NJ:5": { cite: "N.J. Stat. § 56:8-166.10(a)(5)(a)", url: "https://law.justia.com/codes/new-jersey/title-56/section-56-8-166-10/" },
  "NJ:6": { cite: "N.J. Stat. § 56:8-166.10(a)(5)(c)", url: "https://law.justia.com/codes/new-jersey/title-56/section-56-8-166-10/" },
  "NJ:7": { cite: "N.J. Stat. § 56:8-166.12(b)(5)", url: "https://law.justia.com/codes/new-jersey/title-56/section-56-8-166-12/" },
  "NJ:8": { cite: "N.J. Stat. § 56:8-166.14", url: "https://law.justia.com/codes/new-jersey/title-56/section-56-8-166-14/" },

  // ── OREGON (OCPA) ─────────────────────────────────────────────────────────
  "OR:0": { cite: "ORS § 646A.574(1)(a)", url: "https://www.oregonlegislature.gov/bills_laws/ors/ors646a.html" },
  "OR:1": { cite: "ORS § 646A.574(1)(b)", url: "https://www.oregonlegislature.gov/bills_laws/ors/ors646a.html" },
  "OR:2": { cite: "ORS § 646A.574(1)(e)", url: "https://www.oregonlegislature.gov/bills_laws/ors/ors646a.html" },
  "OR:3": { cite: "ORS § 646A.574(1)(c)", url: "https://www.oregonlegislature.gov/bills_laws/ors/ors646a.html" },
  "OR:4": { cite: "ORS § 646A.574(1)(d)(B)", url: "https://www.oregonlegislature.gov/bills_laws/ors/ors646a.html" },
  "OR:5": { cite: "ORS § 646A.574(1)(d)(A)", url: "https://www.oregonlegislature.gov/bills_laws/ors/ors646a.html" },
  "OR:6": { cite: "ORS § 646A.574(1)(d)(C)", url: "https://www.oregonlegislature.gov/bills_laws/ors/ors646a.html" },
  "OR:7": { cite: "ORS § 646A.578(1)(e)", url: "https://www.oregonlegislature.gov/bills_laws/ors/ors646a.html" },
  "OR:8": { cite: "ORS § 646A.586", url: "https://www.oregonlegislature.gov/bills_laws/ors/ors646a.html" },

  // ── RHODE ISLAND (RIDPA) ──────────────────────────────────────────────────
  "RI:0": { cite: "R.I. Gen. Laws § 6-48.1-3(a)(1)", url: "http://webserver.rilegislature.gov/Statutes/TITLE6/6-48.1/INDEX.htm" },
  "RI:1": { cite: "R.I. Gen. Laws § 6-48.1-3(a)(3)", url: "http://webserver.rilegislature.gov/Statutes/TITLE6/6-48.1/INDEX.htm" },
  "RI:2": { cite: "R.I. Gen. Laws § 6-48.1-3(a)(4)", url: "http://webserver.rilegislature.gov/Statutes/TITLE6/6-48.1/INDEX.htm" },
  "RI:3": { cite: "R.I. Gen. Laws § 6-48.1-3(a)(2)", url: "http://webserver.rilegislature.gov/Statutes/TITLE6/6-48.1/INDEX.htm" },
  "RI:4": { cite: "R.I. Gen. Laws § 6-48.1-3(a)(5)(B)", url: "http://webserver.rilegislature.gov/Statutes/TITLE6/6-48.1/INDEX.htm" },
  "RI:5": { cite: "R.I. Gen. Laws § 6-48.1-3(a)(5)(A)", url: "http://webserver.rilegislature.gov/Statutes/TITLE6/6-48.1/INDEX.htm" },
  "RI:6": { cite: "R.I. Gen. Laws § 6-48.1-3(a)(5)(C)", url: "http://webserver.rilegislature.gov/Statutes/TITLE6/6-48.1/INDEX.htm" },
  "RI:7": { cite: "R.I. Gen. Laws § 6-48.1-5(d)", url: "http://webserver.rilegislature.gov/Statutes/TITLE6/6-48.1/INDEX.htm" },

  // ── TENNESSEE (TIPA) ──────────────────────────────────────────────────────
  "TN:0": { cite: "Tenn. Code § 47-18-3204(a)(1)", url: "https://law.justia.com/codes/tennessee/title-47/chapter-18/part-32/section-47-18-3204/" },
  "TN:1": { cite: "Tenn. Code § 47-18-3204(a)(3)", url: "https://law.justia.com/codes/tennessee/title-47/chapter-18/part-32/section-47-18-3204/" },
  "TN:2": { cite: "Tenn. Code § 47-18-3204(a)(4)", url: "https://law.justia.com/codes/tennessee/title-47/chapter-18/part-32/section-47-18-3204/" },
  "TN:3": { cite: "Tenn. Code § 47-18-3204(a)(2)", url: "https://law.justia.com/codes/tennessee/title-47/chapter-18/part-32/section-47-18-3204/" },
  "TN:4": { cite: "Tenn. Code § 47-18-3204(a)(5)(B)", url: "https://law.justia.com/codes/tennessee/title-47/chapter-18/part-32/section-47-18-3204/" },
  "TN:5": { cite: "Tenn. Code § 47-18-3204(a)(5)(A)", url: "https://law.justia.com/codes/tennessee/title-47/chapter-18/part-32/section-47-18-3204/" },
  "TN:6": { cite: "Tenn. Code § 47-18-3204(a)(5)(C)", url: "https://law.justia.com/codes/tennessee/title-47/chapter-18/part-32/section-47-18-3204/" },
  "TN:7": { cite: "Tenn. Code § 47-18-3206(b)(4)", url: "https://law.justia.com/codes/tennessee/title-47/chapter-18/part-32/section-47-18-3206/" },
  "TN:8": { cite: "Tenn. Code § 47-18-3207", url: "https://law.justia.com/codes/tennessee/title-47/chapter-18/part-32/section-47-18-3207/" },

  // ── TEXAS (TDPSA) ─────────────────────────────────────────────────────────
  "TX:0": { cite: "Tex. Bus. & Com. Code § 541.051(b)(1)", url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.541.htm" },
  "TX:1": { cite: "Tex. Bus. & Com. Code § 541.051(b)(3)", url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.541.htm" },
  "TX:2": { cite: "Tex. Bus. & Com. Code § 541.051(b)(4)", url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.541.htm" },
  "TX:3": { cite: "Tex. Bus. & Com. Code § 541.051(b)(2)", url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.541.htm" },
  "TX:4": { cite: "Tex. Bus. & Com. Code § 541.051(b)(5)(B)", url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.541.htm" },
  "TX:5": { cite: "Tex. Bus. & Com. Code § 541.051(b)(5)(A)", url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.541.htm" },
  "TX:6": { cite: "Tex. Bus. & Com. Code § 541.051(b)(5)(C)", url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.541.htm" },
  "TX:7": { cite: "Tex. Bus. & Com. Code § 541.101(a)(4)", url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.541.htm" },
  "TX:8": { cite: "Tex. Bus. & Com. Code § 541.105", url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.541.htm" },
  "TX:9": { cite: "Tex. Bus. & Com. Code § 541.203(b)", url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.541.htm" },

  // ── UTAH (UCPA) ───────────────────────────────────────────────────────────
  "UT:0": { cite: "Utah Code § 13-61-201(1)(a)", url: "https://le.utah.gov/xcode/Title13/Chapter61/13-61-S201.html" },
  "UT:1": { cite: "Utah Code § 13-61-201(1)(b)", url: "https://le.utah.gov/xcode/Title13/Chapter61/13-61-S201.html" },
  "UT:2": { cite: "Utah Code § 13-61-201(1)(c)", url: "https://le.utah.gov/xcode/Title13/Chapter61/13-61-S201.html" },
  "UT:4": { cite: "Utah Code § 13-61-201(2)(a)", url: "https://le.utah.gov/xcode/Title13/Chapter61/13-61-S201.html" },
  "UT:5": { cite: "Utah Code § 13-61-201(2)(b)", url: "https://le.utah.gov/xcode/Title13/Chapter61/13-61-S201.html" },
  "UT:7": { cite: "Utah Code § 13-61-301(3)", url: "https://le.utah.gov/xcode/Title13/Chapter61/13-61-S301.html" },

  // ── VIRGINIA (VCDPA) ──────────────────────────────────────────────────────
  "VA:0": { cite: "Va. Code § 59.1-573(A)(1)", url: "https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/" },
  "VA:1": { cite: "Va. Code § 59.1-573(A)(3)", url: "https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/" },
  "VA:2": { cite: "Va. Code § 59.1-573(A)(4)", url: "https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/" },
  "VA:3": { cite: "Va. Code § 59.1-573(A)(2)", url: "https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/" },
  "VA:4": { cite: "Va. Code § 59.1-573(A)(5)(ii)", url: "https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/" },
  "VA:5": { cite: "Va. Code § 59.1-573(A)(5)(i)", url: "https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/" },
  "VA:6": { cite: "Va. Code § 59.1-573(A)(5)(iii)", url: "https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/" },
  "VA:7": { cite: "Va. Code § 59.1-574(A)(5)", url: "https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/" },
  "VA:8": { cite: "Va. Code § 59.1-578", url: "https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/" },
};
