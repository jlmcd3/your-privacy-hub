// Offline QC-R1 re-eval for cppa-risk runs, r1b1.3 detector.
// Usage: node scripts/reeval-qc-r1.mjs <docs.jsonl>
import fs from "node:fs";

const isResolved = (s) => s === "resolved_met" || s === "resolved_not_met" || s === "resolved_not_applicable";

// Minimal port of classifyRevenueBand — enough for QC-R1-4.
function classifyRevenueBand(q1) {
  const v = String(q1 ?? "").trim();
  switch (v) {
    case "Under $25M":  return { key: "under_25m",      label: v, audit_cohort: "2030-04-01" };
    case "$25M–$50M":   return { key: "25_50m",         label: v, audit_cohort: "2030-04-01" };
    case "$50M–$100M":  return { key: "50_100m",        label: v, audit_cohort: "2029-04-01" };
    case "$25M–$100M":  return { key: "legacy_25_100m", label: v, audit_cohort: "indeterminate" };
    case "$100M–$500M": return { key: "100_500m",       label: v, audit_cohort: "2028-04-01" };
    case "Over $500M":  return { key: "over_500m",      label: v, audit_cohort: "2028-04-01" };
    default:            return { key: "unspecified",    label: v || "not specified", audit_cohort: "indeterminate" };
  }
}

// r1b1.3 QC-R1-4 detector — accepts ISO or "April 1, YYYY".
function qcR1_4(intake, report) {
  const q1 = intake?.q1_revenue ?? intake?.org_context?.annual_revenue_threshold;
  const band = classifyRevenueBand(q1);
  const s = JSON.stringify(report ?? "").toLowerCase();
  const cohortRe = (y) => new RegExp(`(?:${y}-04-01|april\\s+1,?\\s+${y})`, "i");
  const has2028 = cohortRe("2028").test(s);
  const has2029 = cohortRe("2029").test(s);
  const has2030 = cohortRe("2030").test(s);
  if (band.audit_cohort === "indeterminate") {
    if (!(has2029 && has2030)) return { passed: false, evidence: `indeterminate needs 2029+2030; got 2029=${has2029} 2030=${has2030}`, band: band.label };
    const conditional = /(if\s+\d{4}\s+(?:annual\s+)?(?:gross\s+)?revenue|depend(?:s|ing)\s+on|conditional|straddles|cannot\s+resolve|indeterminate|two[- ]cohort|either\s+2029|2029\s+or\s+2030|cohort\s+table)/i;
    if (!conditional.test(s)) return { passed: false, evidence: `both dates present but no conditional framing`, band: band.label };
    return { passed: true, band: band.label };
  }
  const year = band.audit_cohort.slice(0, 4);
  const present = year === "2028" ? has2028 : year === "2029" ? has2029 : has2030;
  if (!present) return { passed: false, evidence: `resolved ${band.label} missing April 1, ${year}`, band: band.label };
  return { passed: true, band: band.label, cohort: `April 1, ${year}` };
}

// r1b1.3 QC-R1-3 — per-state phrasings incl. insufficient-basis.
// Uses coarse M5 inference: skip when q5c blank and q5!="No"; otherwise
// treat q5c=="Yes" as met, "No" as not_met. For docs where triggers.sells_or_shares_pi
// is true but q5c blank, we treat as resolved_not_met (insufficient info variant).
function qcR1_3(intake, report) {
  const q5 = String(intake?.q5_sell_share ?? "").trim();
  const q5c = String(intake?.q5c_share_revenue_50pct ?? intake?.content_detail?.q5c_share_revenue_50pct ?? "").trim();
  const sellsFlag = intake?.triggers?.sells_or_shares_pi === true;
  if (!q5c && q5 !== "No" && !sellsFlag) return { passed: true, note: "absent" };
  let state = "resolved_not_applicable";
  if (q5c) state = /yes/i.test(q5c) ? "resolved_met" : "resolved_not_met";
  else if (sellsFlag) state = "resolved_not_met"; // insufficient basis path
  else if (q5 === "No") state = "resolved_not_applicable";
  const s = JSON.stringify(report ?? "").toLowerCase();
  if (!/7120\s*\(b\)\s*\(1\)/.test(s)) return { passed: false, evidence: `§7120(b)(1) missing (state=${state})` };
  const insuf = /(does not confirm|not\s+confirmed|insufficient\s+(?:basis|information|evidence)|cannot\s+(?:be\s+)?(?:confirmed|determined|resolved|verified)|no\s+basis\s+to\s+(?:confirm|assess|determine)|pending\s+confirmation|to\s+be\s+confirmed|record\s+does\s+not\s+(?:establish|indicate|state|provide|confirm))/i;
  const met = /(threshold\s+met|is\s+met|meets\s+the\s+threshold|derives\s+50%|50%\s+or\s+more|fifty\s+percent\s+or\s+more|exceeds\s+50%)/i;
  const notMet = /(not\s+met|does\s+not\s+meet|below\s+(?:the\s+)?(?:50%|threshold)|no\s+sale|does\s+not\s+sell|inapplicable|less\s+than\s+50%|under\s+50%)/i;
  const na = /(not\s+applicable|inapplicable|n\/?a\b|does\s+not\s+apply)/i;
  const ok =
    state === "resolved_met" ? (met.test(s) || insuf.test(s))
    : state === "resolved_not_met" ? (notMet.test(s) || insuf.test(s))
    : (na.test(s) || insuf.test(s));
  if (!ok) return { passed: false, evidence: `no met/not-met/insufficient phrasing (state=${state})` };
  return { passed: true, note: state };
}

const path = process.argv[2];
const docs = fs.readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const buckets = { qc_r1_3: [], qc_r1_4: [] };
for (const d of docs) {
  const r3 = qcR1_3(d.intake_data, d.report_data);
  const r4 = qcR1_4(d.intake_data, d.report_data);
  buckets.qc_r1_3.push({ doc: d.doc_number, run: d.run_id, ...r3 });
  buckets.qc_r1_4.push({ doc: d.doc_number, run: d.run_id, ...r4 });
}
for (const [id, rows] of Object.entries(buckets)) {
  const pass = rows.filter((r) => r.passed).length;
  console.log(`${id}: ${pass}/${rows.length}`);
  for (const r of rows) if (!r.passed) console.log(`  run=${r.run} doc=${r.doc}: ${r.evidence}`);
  for (const r of rows) if (r.passed && r.note) console.log(`  run=${r.run} doc=${r.doc} ok (${r.note ?? r.cohort ?? r.band})`);
}
