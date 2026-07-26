// Admin eval harness for the CPPA RAG system.
// Suite 1: retrieval-accuracy checks. Suite 2: end-to-end intake guardrails.
import { useCallback, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

type Result = { name: string; pass: boolean; detail: string };

// Intake keys the topic mapping depends on (mirror of edge function)
const REQUIRED_INTAKE_KEYS = [
  "q1_revenue", "q2_consumers", "q4_pi_categories", "q5_sell_share",
  "q15_sensitive_pi", "q18_admt_use",
] as const;

// Sample intake mirroring the audited Technology/SaaS + behavioural ad profile
const SAMPLE_INTAKE = {
  q1_revenue: "Over $100M",
  q2_consumers: "1,000,000 or more",
  q3_sector: "Technology / SaaS",
  q4_pi_categories: [
    "Contact identifiers (name, email, phone)",
    "Device identifiers (IP, cookies, device IDs)",
    "Internet or network activity",
    "Geolocation data",
  ],
  q5_sell_share: "Both",
  q6_right_know: "Yes",
  q7_right_delete: "Yes",
  q8_right_correct: "No",
  q9_opt_out: "Yes",
  q10_id_verification: "Documented verification process matching CPPA guidance",
  q11_policy_review: "12–24 months ago",
  q12_notice_at_collection: "Yes, partial coverage",
  q13_notice_content: "Some elements",
  q14_employee_notice: "No — we use our general privacy policy",
  q15_sensitive_pi: "No",
  q16_sensitive_limit: "",
  q17_sensitive_basis: "",
  q18_admt_use: "Yes",
  q19_admt_description:
    "Behavioural advertising audience segmentation using purchased third-party data.",
  q20_admt_opt_out: "No",
};

async function retrieve(body: any) {
  const { data, error } = await supabase.functions.invoke("cppa-retrieve-context", { body });
  if (error) throw error;
  return data;
}

export default function CPPAEvalHarness() {
  const [suite1, setSuite1] = useState<Result[]>([]);
  const [suite2, setSuite2] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);

  const runSuite1 = useCallback(async () => {
    setRunning(true);
    const results: Result[] = [];
    const top = (rows: any[]) => rows.slice(0, 3).map((r) => r.citation);

    try {
      let r = await retrieve({ topics: ["opt-out-preference-signals"] });
      const t = top(r.authorities ?? []);
      results.push({
        name: "opt-out-preference-signals → § 7025 in top 3 (NOT § 7015)",
        pass: t.some((c) => c.includes("7025")) && !t.some((c) => c.includes("7015")),
        detail: `top: ${t.join(", ") || "(none)"}`,
      });

      r = await retrieve({ topics: ["limit-sensitive-pi"] });
      const t2 = top(r.authorities ?? []);
      results.push({
        name: "limit-sensitive-pi → § 7027 OR § 1798.121 in top 3",
        pass: t2.some((c) => c.includes("7027") || c.includes("1798.121")),
        detail: `top: ${t2.join(", ") || "(none)"}`,
      });

      r = await retrieve({ topics: ["service-provider", "contract-requirements"] });
      const t3 = top(r.authorities ?? []);
      results.push({
        name: "service-provider + contract-requirements → § 7051",
        pass: t3.some((c) => c.includes("7051")),
        detail: `top: ${t3.join(", ") || "(none)"}`,
      });

      r = await retrieve({ citation_lookup: "11 CCR § 7001" });
      const found = r.authorities?.[0];
      results.push({
        name: "citation_lookup '11 CCR § 7001' → defines 'significant decision'",
        pass: !!found && (found.defines_terms ?? []).some((t: string) => /significant decision/i.test(t)),
        detail: found ? `defines: ${(found.defines_terms ?? []).join(", ")}` : "(not found)",
      });

      r = await retrieve({ topics: ["cybersecurity-audit"] });
      const t4 = top(r.authorities ?? []);
      results.push({
        name: "cybersecurity-audit → a 7120-series section",
        pass: t4.some((c) => /712\d/.test(c)),
        detail: `top: ${t4.join(", ") || "(none)"}`,
      });

      r = await retrieve({ topics: ["risk-assessment"], include_deadlines: true });
      const t5 = top(r.authorities ?? []);
      results.push({
        name: "risk-assessment → a 7150-series section AND ≥1 current deadline",
        pass: t5.some((c) => /715\d/.test(c)) && (r.deadlines?.length ?? 0) > 0,
        detail: `top: ${t5.join(", ") || "(none)"} | deadlines: ${r.deadlines?.length ?? 0}`,
      });

      r = await retrieve({ topics: ["breach"] });
      const t6 = top(r.authorities ?? []);
      results.push({
        name: "breach → Cal. Civ. Code § 1798.82 in top 3",
        pass: t6.some((c) => c.includes("1798.82")),
        detail: `top: ${t6.join(", ") || "(none)"}`,
      });

      r = await retrieve({ topics: ["consumer-rights", "right-to-opt-out"] });
      const t7 = top(r.authorities ?? []);
      results.push({
        name: "consumer-rights + right-to-opt-out → § 1798.100 or § 1798.120 in top 3",
        pass: t7.some((c) => c.includes("1798.100") || c.includes("1798.120")),
        detail: `top: ${t7.join(", ") || "(none)"}`,
      });
    } catch (e: any) {
      results.push({ name: "retrieval call", pass: false, detail: e.message });
    }
    setSuite1(results);
    setRunning(false);
  }, []);

  const runSuite2 = useCallback(async () => {
    setRunning(true);
    const results: Result[] = [];

    // Schema drift guard
    const missing = REQUIRED_INTAKE_KEYS.filter((k) => !(k in SAMPLE_INTAKE));
    results.push({
      name: "Intake schema has required keys (q1, q2, q4, q5, q15, q18)",
      pass: missing.length === 0,
      detail: missing.length === 0 ? "all present" : `MISSING: ${missing.join(", ")}`,
    });
    if (missing.length > 0) { setSuite2(results); setRunning(false); return; }

    // Insert a draft cppa_assessments row + run pipeline
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("must be signed in");
      const { data: row, error: insErr } = await supabase
        .from("cppa_assessments")
        .insert({ user_id: user.id, module: "risk_assessment", intake_data: SAMPLE_INTAKE, status: "pending" })
        .select().single();
      if (insErr) throw insErr;

      const { error: runErr } = await supabase.functions.invoke("run-cppa-risk-assessment", {
        body: { assessment_id: row.id },
      });
      if (runErr) throw runErr;

      // Poll up to ~8 min (pipeline runs in background; HTTP returned 202 immediately)
      let final: any = null;
      for (let i = 0; i < 96; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const { data } = await supabase.from("cppa_assessments").select("*").eq("id", row.id).maybeSingle();
        if (data?.status === "complete" || data?.status === "error") { final = data; break; }
      }
      if (!final || final.status !== "complete") {
        results.push({ name: "Pipeline completes", pass: false, detail: `status=${final?.status ?? "timeout"}` });
        setSuite2(results); setRunning(false); return;
      }
      results.push({ name: "Pipeline completes", pass: true, detail: "status=complete" });

      const report = final.report_data ?? {};
      const ledger: any[] = report.citation_ledger ?? [];
      const review: string[] = report.requires_attorney_review ?? [];

      // Not-in-corpus check
      const notInCorpus = ledger.filter((e) => e.classification === "Not-in-corpus");
      results.push({
        name: "No Not-in-corpus citations, OR they surface in attorney review",
        pass: notInCorpus.length === 0 || notInCorpus.every((e) => review.some((r) => r.includes(e.citation ?? ""))),
        detail: `Not-in-corpus: ${notInCorpus.length}, attorney review entries: ${review.length}`,
      });

      // Banned phrases — scan ONLY the model's own prose, not enforcement context
      // (enforcement_context / enforcement_results legitimately cite EU GDPR cases as illustrative).
      const modelProse = {
        executive_summary: report.executive_summary,
        scope_confirmation: report.scope_confirmation,
        domains: report.domains,
        top_risks: report.top_risks,
        next_steps: report.next_steps,
        validation_summary: report.validation_summary,
        accuracy_caveat: report.accuracy_caveat,
        requires_attorney_review: report.requires_attorney_review,
      };
      const proseBlob = JSON.stringify(modelProse).toLowerCase();
      const banned = ["lawful basis", "72 hour", "72-hour", "gdpr"];
      const found = banned.filter((b) => proseBlob.includes(b));
      results.push({
        name: "No banned phrases in model prose (lawful basis / 72 hour / GDPR)",
        pass: found.length === 0,
        detail: found.length === 0 ? "clean" : `FOUND: ${found.join(", ")}`,
      });

      // Advertising as ADMT "significant decision" — detect AFFIRMATIVE assertion only.
      // A correct finding says advertising is NOT a significant decision and will mention
      // both phrases; we must not flag that.
      const admt = (report.domains ?? []).find((d: any) =>
        /automated decision/i.test(d.domain ?? ""));
      const admtTxt = `${admt?.finding ?? ""} ${admt?.regulatory_basis ?? ""}`;
      // Affirmative patterns: "advertising is a/constitutes/qualifies as a significant decision"
      const affirmativeRe =
        /(advertis\w*|audience segment\w*)[^.]*?\b(is|are|constitutes?|qualif(?:y|ies)\s+as|counts?\s+as|amounts?\s+to)\s+(a |an )?significant decision/i;
      // Explicit negations override
      const negationRe =
        /(advertis\w*|audience segment\w*)[^.]*?\b(is not|are not|does not (include|constitute|qualify)|do not (include|constitute|qualify)|excluded from|not a significant decision)/i;
      const advAsSig = affirmativeRe.test(admtTxt) && !negationRe.test(admtTxt);
      let admtPass = !advAsSig;
      let admtDetail = "ADMT domain does not affirmatively assert advertising as significant decision";
      if (advAsSig) {
        const contradicted = ledger.some((e) => e.classification === "Contradicted-by-authority");
        const reviewMentions = review.some((r) => /advertis|segment/i.test(r));
        admtPass = contradicted && reviewMentions;
        admtDetail = admtPass
          ? "Validator caught it (Contradicted-by-authority + attorney review)"
          : "ADMT asserts advertising = significant decision and validator did NOT flag it";
      }
      results.push({
        name: "Advertising NOT affirmatively labeled an ADMT 'significant decision' (or validator caught it)",
        pass: admtPass, detail: admtDetail,
      });

      const blob = JSON.stringify(modelProse).toLowerCase();

      // No general right to appeal / no cure-period entitlement
      const appealAsserted = /right to appeal/i.test(blob) && !/admt|significant decision/i.test(blob);
      const cureAsserted = /cure period/i.test(blob) && !/no longer|removed|not entitled/i.test(blob);
      results.push({
        name: "No general right-to-appeal assertion",
        pass: !appealAsserted, detail: appealAsserted ? "assertion present" : "clean",
      });
      results.push({
        name: "No cure-period entitlement asserted",
        pass: !cureAsserted, detail: cureAsserted ? "assertion present" : "clean",
      });
    } catch (e: any) {
      results.push({ name: "Suite 2 setup", pass: false, detail: e.message });
    }

    setSuite2(results);
    setRunning(false);
  }, []);

  const Row = ({ r }: { r: Result }) => (
    <li className="border-l-4 pl-3 py-1.5"
        style={{ borderColor: r.pass ? "rgb(34,197,94)" : "rgb(239,68,68)" }}>
      <span className={r.pass ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
        {r.pass ? "PASS" : "FAIL"}
      </span>{" "}— {r.name}
      <div className="text-xs text-muted-foreground">{r.detail}</div>
    </li>
  );

  return (
    <>
      <Helmet><title>CPPA Eval Harness</title></Helmet>
      <Navbar />
      <main className="container mx-auto max-w-5xl py-8">
        <h1 className="font-display text-3xl mb-2">CPPA Eval Harness</h1>
        <p className="text-muted-foreground mb-6">
          Regression guard for the June 2026 citation audit. Run after corpus load and after any prompt change.
        </p>

        <section className="border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Suite 1 — Retrieval accuracy</h2>
            <Button onClick={runSuite1} disabled={running}>Run Suite 1</Button>
          </div>
          {suite1.length > 0 && <ul className="space-y-1">{suite1.map((r, i) => <Row key={i} r={r} />)}</ul>}
        </section>

        <section className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Suite 2 — End-to-end assessment guardrails</h2>
            <Button onClick={runSuite2} disabled={running}>Run Suite 2</Button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Runs a sample Technology/SaaS + behavioural-advertising intake through the full pipeline (≈60s).
          </p>
          {suite2.length > 0 && <ul className="space-y-1">{suite2.map((r, i) => <Row key={i} r={r} />)}</ul>}
        </section>
      </main>
      <Footer />
    </>
  );
}
