// check-biometric-compliance: per-jurisdiction biometric obligations + BIPA risk.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  biometricTypes: string[];
  orgType: string;
  orgName?: string;
  purpose: string;
  jurisdictions: string[];
  enrolledCount: string;
  assessment_id?: string;
  user_id?: string;
  client_id?: string | null;
  is_free_tier?: boolean;
  stress_run?: boolean;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// BIPA statutory damages: $1,000/negligent, $5,000/intentional. Mathematical illustration only.
function estimateBIPARisk(enrolledCount: string): { lowEnd: number; highEnd: number; note: string } {
  const countMap: Record<string, number> = {
    "Fewer than 500": 250,
    "500-5,000": 2500,
    "5,000-50,000": 25000,
    "50,000-500,000": 250000,
    "More than 500,000": 500000,
  };
  const count = countMap[enrolledCount] ?? 2500;
  return {
    lowEnd: count * 1000,
    highEnd: count * 5000,
    note: `Based on ${count.toLocaleString()} enrolled individuals (midpoint of the stated ${enrolledCount} range) × $1,000 (negligent) to $5,000 (intentional) per person. This is a mathematical illustration only — not a legal opinion.`,
  };
}

function formatEnforcementContext(rows: any[]): string {
  if (!rows || rows.length === 0) return "No specific biometric enforcement precedents retrieved.";
  return rows
    .map((e, i) => {
      const fineVerified = e.fine_verified !== false;
      const fine = !fineVerified
        ? "fine amount under verification — omitted"
        : (e.fine_eur_equivalent ? `€${Number(e.fine_eur_equivalent).toLocaleString()}` : "fine: n/a");
      return `[E${i + 1}] id:${e.id ?? "—"} ${e.regulator ?? "Regulator"} (${e.jurisdiction ?? "—"}), ${
        e.decision_date ? new Date(e.decision_date).getFullYear() : "—"
      }\n   Fine: ${fine}\n   Failure: ${e.key_compliance_failure ?? e.violation ?? "—"}`;
    })
    .join("\n\n");
}

async function runStressBiometric(body: Body, resolvedUserId: string | null) {
  const bipaApplies = body.jurisdictions.some(
    (j) => j.toLowerCase().includes("illinois") || j.toLowerCase().includes("bipa")
  );
  const bipaRisk = bipaApplies ? estimateBIPARisk(body.enrolledCount) : null;

  function stressSection(jurisdiction: string): string {
    const j = jurisdiction.toLowerCase();
    const isEU = j.includes("eu") || j.includes("eea") || (j.includes("gdpr") && !j.includes("uk"));
    const isUK = j.includes("united kingdom") || j.includes("uk gdpr") || j === "gb";
    const isIL = j.includes("illinois") || j.includes("bipa");
    const isTX = j.includes("texas") || j.includes("cubi");
    const isCA = j.includes("california") || j.includes("ca,") || j === "ca";
    const isVA = j.includes("virginia") || j === "va";
    const isWA = j.includes("washington");
    const isFR = j === "fr" || j.includes("france") || j.includes("cnil");
    const isIE = j === "ie" || j.includes("ireland") || j.includes("dpc");
    const isDE = j === "de" || j.includes("germany") || j.includes("deutschland") || j.includes("bfdi");
    const isES = j === "es" || j.includes("spain") || j.includes("españa") || j.includes("aepd");
    const isUS = !isEU && !isUK && !isIL && !isTX && !isCA && !isVA && !isWA &&
      (j === "us" || j === "usa" || j.includes("united states") || j.includes("federal (ftc)") || j.includes("federal"));

    if (isEU) {
      return `${jurisdiction} — General Data Protection Regulation (GDPR)

Applies to this organisation: Conditional — ${body.orgType} uses ${body.biometricTypes.join(", ")} for ${body.purpose}. Biometric data processed for the purpose of uniquely identifying a natural person is special-category data under GDPR Article 9(1), subject to strict prohibition unless an Article 9(2) condition applies.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Lawful basis under Article 6 AND a separate Article 9(2) condition — these must both be identified and documented. Do not conflate them into a single "lawful basis" entry.
2. Most likely Article 9(2) condition: Article 9(2)(a) explicit consent, or Article 9(2)(b) if required by employment law, or Article 9(2)(h) for health/care providers.
3. Conduct a Data Protection Impact Assessment (GDPR Article 35) before deployment — biometric processing for identification is on supervisory authority high-risk lists.
4. Provide pre-collection notice under Articles 13/14 covering biometric modalities, Article 9(2) condition relied upon, retention periods, and data subject rights.
5. Any processor receiving biometric data must have a written DPA under Article 28. Any transfer outside the EEA requires an Article 46 safeguard (adequacy decision, SCCs, or BCRs).

Consent and notice:
Explicit consent (Article 9(2)(a)) must be freely given, specific, informed, and unambiguous — and genuinely free. In employment contexts, employee consent is unlikely to be "freely given" due to power imbalance (EDPB Guidelines 05/2020); use Article 9(2)(b) employment law basis instead where national law permits.

Retention and destruction:
Apply storage limitation (Article 5(1)(e)): retain biometric templates only as long as necessary for the stated purpose. Define retention periods per purpose and per data category. Delete promptly when the purpose expires.

Sale and sharing restrictions:
Purpose limitation (Article 5(1)(b)) prohibits using biometric data for purposes incompatible with original collection. Processor agreements (Article 28) must restrict vendor use. Chapter V transfer safeguards required for any third-country transfers.

Current enforcement posture:
EU supervisory authorities actively enforce Article 9 biometric obligations. The ICO (UK), CNIL (France), and Garante (Italy) have all issued enforcement actions for unlawful biometric processing. Refer to each national DPA's enforcement register for current figures.

Priority actions:
1. Document both the Article 6 lawful basis and the Article 9(2) condition separately in a processing record before any biometric data is collected.
2. Complete a DPIA under Article 35 — engage the DPO where designated; consult the lead supervisory authority if residual risk remains high after mitigation.
3. Audit all processor agreements to confirm Article 28 DPAs are executed for biometric data processors and any sub-processors are approved in writing.

Compliance risk rating: HIGH
Active supervisory authority enforcement of Article 9 biometric obligations across multiple EU member states creates material regulatory exposure for any organisation without documented lawful basis, DPIA, and processor controls.
---`;
    }

    if (isUK) {
      return `${jurisdiction} — UK GDPR and Data Protection Act 2018

Applies to this organisation: Conditional — ${body.orgType} uses ${body.biometricTypes.join(", ")} for ${body.purpose}. Biometric data processed for unique identification is special-category data under UK GDPR Article 9(1). The operative law is UK GDPR (retained EU GDPR as amended) together with DPA 2018 — not EU GDPR.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. UK GDPR Article 9(2) condition must be identified in addition to an Article 6 lawful basis. Common conditions: Article 9(2)(a) explicit consent; Article 9(2)(b) employment law; Article 9(2)(h) health/care.
2. DPA 2018 Schedule 1 condition must also be satisfied — the applicable Schedule 1 paragraph must be documented.
3. Conduct a DPIA under UK GDPR Article 35 — biometric processing for identification is on the ICO's mandatory DPIA list.
4. Article 13/14 transparency notices must cover the Article 9(2) condition and DPA 2018 Schedule 1 condition relied upon.
5. UK-to-third-country transfers require a UK IDTA or UK-approved SCCs (not EU SCCs).

Consent and notice:
Explicit consent in employment context is unlikely to satisfy "freely given" under UK GDPR — use DPA 2018 Schedule 1 para 1 (employment, social security, social protection law) where national employment law authorises biometric use.

Retention and destruction:
Apply UK GDPR storage limitation principle: define retention period per purpose; delete biometric templates promptly when purpose expires; document the retention schedule.

Sale and sharing restrictions:
UK GDPR purpose limitation (Article 5(1)(b)) and processor contract requirements (Article 28) govern sharing. Use UK IDTA for any transfers to third countries outside the UK adequacy framework.

Current enforcement posture:
The ICO actively enforces UK GDPR biometric obligations. The ICO has issued enforcement notices and monetary penalties for unlawful biometric data processing — refer to ico.org.uk/action-weve-taken/ for current enforcement figures.

Priority actions:
1. Identify and document the Article 9(2) condition AND the applicable DPA 2018 Schedule 1 condition before any biometric processing begins.
2. Complete a DPIA and, where residual risk remains high, consult the ICO under Article 36.
3. Review all processor agreements: confirm Article 28 DPAs cover biometric data; replace any EU SCCs in UK-to-third-country arrangements with UK IDTA or UK-approved transfer mechanism.

Compliance risk rating: HIGH
ICO enforcement posture on biometric data is active; failure to satisfy both the Article 9(2) condition and the DPA 2018 Schedule 1 condition simultaneously creates material regulatory exposure.
---`;
    }

    if (isIL) {
      const risk = estimateBIPARisk(body.enrolledCount);
      return `${jurisdiction} — Biometric Information Privacy Act (BIPA), 740 ILCS 14

Applies to this organisation: Conditional — ${body.orgType} uses ${body.biometricTypes.join(", ")} for ${body.purpose}. BIPA applies to private entities in Illinois that collect, capture, purchase, receive through trade, or otherwise obtain biometric identifiers or biometric information.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Section 15(a): written, publicly available retention and destruction policy before or at the time of collection.
2. Section 15(b): inform the subject in writing of the specific purpose and duration of collection; obtain a written release before collection.
3. Section 15(c): prohibition on sale, lease, trade, or profit from biometric data.
4. Section 15(d): prohibition on disclosure except with consent, to complete financial transaction, or as required by law.
5. Section 15(e): reasonable standard of care for storage; protection at least as protective as other confidential/sensitive data.
6. P.A. 103-0769 (effective Aug 2, 2024): one violation per person per biometric identifier for a single course of conduct (not per scan). Pre-August 2024 conduct may face per-scan exposure in Illinois state court (federal courts apply the Seventh Circuit's retroactivity ruling in Clay v. Union Pacific, No. 25-2185 (7th Cir. Apr. 1, 2026)).

Consent and notice:
Written release (signed by individual or legally authorised representative) required before collection. Standalone biometric-specific release is the defensible practice — embedding in onboarding paperwork is routinely challenged by plaintiffs.

Retention and destruction:
Written retention policy must be publicly available before collection. Destroy biometric data when purpose expires or within 3 years of collection, whichever is first.

Sale and sharing restrictions:
Absolute prohibition on sale, lease, trade, or profit. Disclosure limited to consent, financial transaction completion, or legal compulsion.

Current enforcement posture:
Active private litigation. Illustrative exposure for ${body.enrolledCount} enrolled (using midpoint): $${risk.lowEnd.toLocaleString()} – $${risk.highEnd.toLocaleString()} (negligent to intentional per-person damages). Post-Aug 2024 conduct limited to one violation per person in federal court.

Priority actions:
1. Execute written releases before any biometric collection — use standalone documents not embedded in general onboarding.
2. Publish a written retention and destruction policy on the organisation's website or internal policy portal before collection begins.
3. Audit vendor contracts to confirm no biometric data is shared with entities that would profit from or retain it beyond stated purposes.

Compliance risk rating: CRITICAL
BIPA private right of action with per-person statutory damages creates the highest litigation exposure of any US biometric law; the Illinois plaintiff's bar is highly active.
---`;
    }

    if (isTX) {
      return `${jurisdiction} — Capture or Use of Biometric Identifier Act (CUBI), Tex. Bus. & Com. Code § 503.001

Applies to this organisation: Conditional — ${body.orgType} uses ${body.biometricTypes.join(", ")} for ${body.purpose}. CUBI applies to persons capturing biometric identifiers (retina/iris scan, fingerprint, voiceprint, or record of hand or face geometry) for a commercial purpose in Texas.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. § 503.001(b): inform each individual before or at the time of capture that a biometric identifier is being collected; obtain consent. Notice and consent are required — CUBI does not prescribe a signed written release (unlike Illinois BIPA); documented written or electronic consent is recommended as best practice.
2. § 503.001(c)(1): prohibition on sale, lease, or disclosure to third parties except with consent, to complete a requested financial transaction, or as required by law.
3. § 503.001(c)(2): store, transmit, and protect biometric identifiers using security measures that meet or exceed those applied to other sensitive and confidential information.
4. § 503.001(c)(3): destroy biometric identifiers within a reasonable time, no later than one year after the PURPOSE FOR COLLECTION EXPIRES — not one year from last interaction. Define the specific event that triggers purpose expiry for each use case.
5. § 503.001(d): civil penalty up to $25,000 per violation; Texas AG has exclusive enforcement authority — no private right of action.
6. § 503.001(e) [effective Jan 1, 2026, added by HB 149/TRAIGA]: exemption for AI development — CUBI does not apply to biometric data used solely to develop, train, evaluate, or offer AI models, unless the AI is used to uniquely identify a specific individual.

Consent and notice:
Notice and consent before capture. Documented consent (written or electronic) is defensible best practice. Do not rely on general terms of service or bundled onboarding consent.

Retention and destruction:
Destruction trigger: purpose expiry — not a fixed anniversary. Define the event that ends each biometric collection purpose (employment termination, account closure, contract end). The one-year ceiling runs from purpose expiry, not from the initial collection date.

Sale and sharing restrictions:
No sale, lease, or disclosure except with consent, financial transaction completion, or legal requirement. Vendor processing agreements must restrict vendor use to stated purposes.

Current enforcement posture:
Texas AG is the sole enforcer. Texas has secured over $2.7 billion in CUBI settlements (Meta $1.4B, 2024; Google $1.375B, 2025). The AG interprets each person's biometric capture as a separate violation. No private right of action, but the per-violation penalty at scale creates material exposure.

Priority actions:
1. Implement notice-and-consent workflow before any biometric capture — use documented written or electronic consent records per individual.
2. Define the specific event that triggers purpose expiry for each enrolled population (e.g. employment termination, account closure) and document this in a retention and destruction policy.
3. Audit all vendor agreements for biometric data processors — ensure destruction obligations and security requirements are contractually binding.

Compliance risk rating: HIGH
Texas AG enforcement of CUBI is active and has produced multi-billion dollar settlements; the per-violation calculation at scale creates material exposure even without a private right of action.
---`;
    }

    if (isCA) {
      return `${jurisdiction} — California Consumer Privacy Act / California Privacy Rights Act (CCPA/CPRA)

Applies to this organisation: Conditional — ${body.orgType} uses ${body.biometricTypes.join(", ")} for ${body.purpose}. California has no standalone biometric privacy statute equivalent to Illinois BIPA. The primary framework is CPRA (amending CCPA), which classifies biometric information as Sensitive Personal Information (SPI). A financial institution GLBA analysis should be conducted before applying CCPA where applicable.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Cal. Civ. Code § 1798.140(ae)(1)(B): biometric information used to identify a consumer is Sensitive Personal Information (SPI).
2. § 1798.121: consumers have the right to direct the business to limit use of SPI to what is necessary to perform services or provide goods reasonably expected. Implement a "Limit the Use of My Sensitive Personal Information" opt-out link.
3. § 1798.100 et seq.: provide notice at or before collection (Privacy Policy and at-collection notice must identify biometric information and SPI status).
4. § 1798.145(e): GLBA exemption — if the organisation is a financial institution under GLBA and the biometric data relates to GLBA-covered activities, CCPA may not apply to that data; complete GLBA boundary analysis first.
5. CPPA enforcement: the California Privacy Protection Agency (CPPA) enforces CCPA/CPRA; private right of action only for data breaches (§ 1798.150).

Consent and notice:
No opt-in consent required for biometric collection under CCPA/CPRA (unlike BIPA). Provide clear at-collection notice and update Privacy Policy to reflect SPI categories and processing purposes. Honor Limit SPI Use requests.

Retention and destruction:
Retain biometric data only as long as necessary for the disclosed purpose (§ 1798.100(a)(3)). Honor deletion requests under § 1798.105 subject to exceptions.

Sale and sharing restrictions:
Prohibition on "sale" and "sharing" of SPI for cross-context behavioral advertising (§ 1798.121). Provide opt-out if SPI is sold or shared. Service providers receiving biometric data must be under written contract restricting further use.

Current enforcement posture:
CPPA enforcement is active; limited private litigation (breach-only). Enforcement focus includes missing SPI notices, inadequate at-collection disclosures, and failure to honor consumer rights.

Priority actions:
1. Update Privacy Policy and at-collection notices to identify biometric information as SPI under § 1798.140(ae)(1)(B).
2. Implement "Limit the Use of My Sensitive Personal Information" mechanism under § 1798.121.
3. Execute CCPA-compliant service provider contracts for all vendors receiving biometric data, restricting further use.

Compliance risk rating: MEDIUM
California has no BIPA-equivalent private litigation; CPPA enforcement is active but concentrated on notice and consumer rights — creating moderate exposure absent a data breach.
---`;
    }

    if (isVA) {
      return `${jurisdiction} — Virginia Consumer Data Protection Act (VCDPA), Va. Code § 59.1-571 et seq.

Applies to this organisation: Conditional — ${body.orgType} uses ${body.biometricTypes.join(", ")} for ${body.purpose}. Virginia has no standalone biometric statute. The VCDPA classifies biometric data as sensitive data requiring opt-in consent. HIPAA exemptions may apply where the data relates to protected health information.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. § 59.1-572: biometric data (data generated by automatic measurements of a consumer's biological characteristics used to identify a specific individual) is sensitive data.
2. § 59.1-577(B): processing sensitive data requires obtaining consumer opt-in consent before processing. This is an affirmative consent requirement — not merely an opt-out.
3. § 59.1-575: data minimization — collect only what is adequate, relevant, and reasonably necessary for the disclosed purpose.
4. § 59.1-579: conduct a data protection assessment for processing presenting heightened risk, including processing sensitive data.
5. Virginia AG has exclusive enforcement authority — there is NO private right of action under the VCDPA.

Consent and notice:
Opt-in consent required before processing biometric data. Consent must be a clear affirmative act; pre-checked boxes and inactivity do not constitute consent. Maintain records of consent.

Retention and destruction:
Retain biometric data only as long as necessary and proportionate to the stated purpose. Honor consumer deletion requests under § 59.1-576.

Sale and sharing restrictions:
Selling biometric data or processing it for targeted advertising requires separate consent or disclosure as required by §§ 59.1-577 and 59.1-578. Processors must be under written contract under § 59.1-574.

Current enforcement posture:
Virginia AG enforcement is nascent. No private right of action. Exposure is primarily regulatory — meaningful where the AG targets large-scale sensitive-data processors.

Priority actions:
1. Implement opt-in consent mechanism for biometric data collection — affirmative, specific, and documented.
2. Conduct a VCDPA data protection assessment for biometric processing under § 59.1-579 before deployment.
3. Execute controller-processor contracts under § 59.1-574 with all vendors processing biometric data on the organisation's behalf.

Compliance risk rating: MEDIUM
Virginia AG-only enforcement and nascent enforcement history reduce immediate exposure, but the opt-in consent requirement creates a clear compliance gap for any organisation without a documented consent mechanism.
---`;
    }

    // Generic fallback for other jurisdictions
    return `${jurisdiction} — biometric privacy assessment

Applies to this organisation: Conditional — ${body.orgType} uses ${body.biometricTypes.join(", ")} for ${body.purpose}. Applicable biometric and sensitive-data obligations depend on the specific laws in force in this jurisdiction.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Identify the applicable biometric or sensitive-data law in this jurisdiction and confirm whether biometric identifiers fall within its scope.
2. Obtain required consent or satisfy the applicable lawful basis before any biometric collection.
3. Provide pre-collection notice describing biometric types, purpose, retention, and data subject rights.
4. Store and transmit biometric templates with security measures commensurate with their sensitivity.
5. Bind all processors of biometric data under written agreements restricting use and requiring deletion.

Consent and notice:
Obtain consent or satisfy the applicable lawful basis before collection. Use a standalone notice that is specific to biometric collection — do not bury it in general terms.

Retention and destruction:
Destroy biometric templates when the collection purpose expires. Define the specific event that triggers purpose expiry and document it in a retention policy.

Sale and sharing restrictions:
Limit disclosure to processors with a legitimate need. Apply the sharing restrictions mandated by the applicable law for this jurisdiction.

Current enforcement posture:
Consult the applicable supervisory authority or attorney general's enforcement register for this jurisdiction — enforcement posture varies and is not captured in this assessment.

Priority actions:
1. Confirm which biometric privacy or data protection law applies in this jurisdiction and review its specific requirements.
2. Implement jurisdiction-appropriate consent and notice procedures before any biometric collection.
3. Execute processor agreements covering biometric security, sub-processors, and deletion.

Compliance risk rating: HIGH
Biometric data carries elevated regulatory risk in most jurisdictions; this assessment should be supplemented with jurisdiction-specific legal advice.
---`;
  }

  const assessment_text = body.jurisdictions.map(stressSection).join("\n\n");

  const report_data = {
    bipa_risk: bipaRisk,
    jurisdictions_analysed: body.jurisdictions,
    enforcement_precedents: [],
    enforcement_meta: { attempted: false, stress_run: true },
    annotations: [],
    lint_warnings: [],
    generated_at: new Date().toISOString(),
  };

  let savedId: string | null = null;
  if (body.assessment_id) {
    const { data, error } = await supabase.from("biometric_assessments").update({
      client_id: body.client_id ?? null,
      status: "complete",
      intake_data: body,
      jurisdictions: body.jurisdictions,
      analysis_text: assessment_text,
      report_data,
      updated_at: new Date().toISOString(),
    }).eq("id", body.assessment_id).select("id").maybeSingle();
    if (error) throw error;
    savedId = data?.id ?? body.assessment_id;
  } else {
    const { data, error } = await supabase.from("biometric_assessments").insert({
      user_id: resolvedUserId,
      client_id: body.client_id ?? null,
      status: "complete",
      intake_data: body,
      jurisdictions: body.jurisdictions,
      analysis_text: assessment_text,
      report_data,
      is_free_tier: !!body.is_free_tier,
    }).select("id").single();
    if (error) throw error;
    savedId = data.id;
  }

  return new Response(JSON.stringify({
    id: savedId,
    assessment_text,
    bipa_risk: bipaRisk,
    jurisdictions_analysed: body.jurisdictions,
    enforcement_precedents: [],
    generated_at: report_data.generated_at,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const caller = await verifyCaller(req);
    if (!caller.internal && !caller.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = (await req.json()) as Body;
    const resolvedUserId = caller.internal ? (body.user_id ?? null) : caller.userId;


    if (!Array.isArray(body.jurisdictions) || body.jurisdictions.length === 0) {
      return new Response(JSON.stringify({ error: "At least one jurisdiction required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(body.biometricTypes) || body.biometricTypes.length === 0) {
      return new Response(JSON.stringify({ error: "At least one biometric type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.stress_run === true) {
      return await runStressBiometric(body, resolvedUserId);
    }

    // Wrap heavy work in a streaming response so the edge runtime's 150s
    // request-idle timeout never trips — we write a single whitespace byte
    // every 10s as a keep-alive, then the final JSON. JSON.parse() ignores
    // leading whitespace so the caller's `await r.json()` still works.
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const writer = {
          write: async (chunk: Uint8Array) => { controller.enqueue(chunk); },
          close: async () => { controller.close(); },
        };
        const keepAlive = setInterval(() => {
          writer.write(encoder.encode(" ")).catch(() => {});
        }, 10000);

        try {


    // Step 1 — enforcement context
    let enforcement_context: any[] = [];
    let enforcementMeta: any = { attempted: false };
    try {
      const er = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/get-enforcement-context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          tool: "biometric-checker",
          jurisdictions: body.jurisdictions,
          data_categories: ["biometric"],
          biometric: true,
          limit: 12,
        }),
      });
      if (er.ok) {
        const j = await er.json();
        enforcement_context = j.results || j.enforcement_context || [];
        enforcementMeta = {
          attempted: true,
          total_matched: typeof j?.total_matched === "number" ? j.total_matched : null,
          query_descriptor: `biometric processing in ${(body.jurisdictions || []).join(", ") || "—"}`,
        };
      }
    } catch (e) {
      console.error("enforcement fetch failed:", e);
    }

    // Step 2 — BIPA risk
    const bipaApplies = body.jurisdictions.some(
      (j) => j.toLowerCase().includes("illinois") || j.toLowerCase().includes("bipa")
    );
    const bipaRisk = bipaApplies ? estimateBIPARisk(body.enrolledCount) : null;

    // Washington My Health My Data Act applies broadly to "consumer health data"
    // including biometric data tied to health inferences. Private right of action
    // under WA Consumer Protection Act creates litigation exposure.
    const wamhmdApplies = body.jurisdictions.some(
      (j) => j.toLowerCase().includes("washington") || j.toLowerCase().includes("mhmd")
    );

    // "Other US state" is a generic catch-all selection — flag explicitly so the
    // model produces a section covering Texas CUBI + WA MHMD + general state-law
    // posture rather than silently dropping the jurisdiction from output.
    const otherUsStateApplies = body.jurisdictions.some(
      (j) => j.toLowerCase().includes("other us"));

    // Explicit Texas CUBI selection — triggers CUBI-specific context injection
    // (distinct from "Other US state" which has its own broader catch-all block).
    const texasApplies = body.jurisdictions.some(
      (j) => j.toLowerCase().includes("texas"));

    // EU/EEA GDPR — triggers Article 9 and DPIA context injection.
    const euGdprApplies = body.jurisdictions.some(
      (j) => j.toLowerCase().includes("eu") || j.toLowerCase().includes("eea") ||
             (j.toLowerCase().includes("gdpr") && !j.toLowerCase().includes("uk")));

    // UK GDPR — triggers UK DPA 2018 and ICO context injection.
    const ukGdprApplies = body.jurisdictions.some(
      (j) => j.toLowerCase().includes("united kingdom") || j.toLowerCase().includes("uk gdpr"));

    // Step 3 — Haiku
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      await writer.write(encoder.encode(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" })));
      return;
    }


    const isStressRun = body.stress_run === true;
    const model = isStressRun ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6";
    const maxTokens = isStressRun ? 6500 : 12000;

    const prompt = `You are a biometric privacy compliance analyst. Analyse the biometric data processing described below and produce a structured compliance assessment for each jurisdiction.

PROCESSING DETAILS
Organisation name: ${(body as any).orgName || (body as any).organizationName || "Not specified"}
Biometric data types: ${body.biometricTypes.join(", ")}
Organisation type: ${body.orgType}
Primary purpose: ${body.purpose}
Individuals enrolled: ${body.enrolledCount}
Jurisdictions: ${body.jurisdictions.join(", ")}
${wamhmdApplies ? `
WASHINGTON MY HEALTH MY DATA ACT (MHMD) — APPLICABILITY FLAG
Washington is in scope. If the biometric data is used to identify health status,
diagnosis, treatment, or to infer any consumer health condition, MHMD applies in
addition to general WA consumer protection law. MHMD requires:
  - separate, opt-in consent (distinct from any biometric consent),
  - a published "consumer health data privacy policy" with specific contents,
  - heightened restrictions on sale and on geofencing around health facilities.
MHMD has a private right of action via the WA Consumer Protection Act.
Address MHMD obligations explicitly in the Washington section.
` : ""}${texasApplies && !otherUsStateApplies ? `
TEXAS CUBI — EXPLICIT SELECTION
Texas, USA (CUBI) is in scope. The Texas section MUST cite subsections using the correct map:
§ 503.001(b) = consent and notice; § 503.001(c)(1) = disclosure prohibition; § 503.001(c)(2) = security; § 503.001(c)(3) = destruction (purpose expiry, NOT "last interaction"); § 503.001(d) = penalty ($25,000/violation, AG-only, no private right of action); § 503.001(e) [from Jan 1, 2026] = AI development exemption.
CUBI does NOT require a signed written release — do not import BIPA's written release requirement. State consent as: notice and consent before capture; recommend documented written/electronic consent as best practice.
` : ""}${euGdprApplies ? `
EU/EEA GDPR — BIOMETRIC REQUIREMENTS
For each EU/EEA section: (1) cite GDPR Article 9(1) as the source of the special-category prohibition; (2) identify the applicable Article 9(2) condition separately from the Article 6 basis; (3) include a DPIA screening recommendation under Article 35; (4) replace "do not sell" with purpose limitation (Article 5(1)(b)) and processor contract (Article 28) language; (5) identify the lead supervisory authority under Article 56 for cross-border processing.
` : ""}${ukGdprApplies ? `
UK GDPR AND DPA 2018 — BIOMETRIC REQUIREMENTS
For the UK section: (1) label as "UK GDPR and Data Protection Act 2018" — not "EU GDPR"; (2) identify the Article 9(2) condition AND the DPA 2018 Schedule 1 condition separately; (3) include Article 35 DPIA recommendation with ICO as supervisory authority; (4) use "United Kingdom" in the heading — not "GB"; (5) for UK-to-third-country transfers, reference UK IDTA or UK-approved SCCs, not EU SCCs; (6) replace "do not sell" with UK GDPR purpose limitation and Article 28 processor controls.
` : ""}${otherUsStateApplies ? `
OTHER US STATE — APPLICABILITY FLAG
"Other US state" is in scope. Produce a dedicated "Other US State — General US Biometric Privacy Posture" section that:
  - notes Texas Capture or Use of Biometric Identifier Act (CUBI) requirements: § 503.001(b) notice and consent before capture (no signed written release required — that is Illinois BIPA); § 503.001(c)(2) reasonable security; § 503.001(c)(3) destruction within reasonable time no later than one year after PURPOSE expiry (not "last interaction"); § 503.001(d) civil penalty up to $25,000/violation, Texas AG enforcement only — no private right of action; § 503.001(e) [effective Jan 2026] AI development exemption,
  - notes Washington My Health My Data Act exposure where biometrics infer health status,
  - covers the broader pattern across CA/CO/CT/VA/UT/OR comprehensive privacy laws treating biometrics as sensitive data requiring opt-in consent and DPIAs,
  - identifies the most likely applicable state regime based on the organisation type and purpose described.
Do NOT skip this section even though no specific state was named.
` : ""}ENFORCEMENT PRECEDENTS
${formatEnforcementContext(enforcement_context)}
${bipaRisk ? `
BIPA LITIGATION RISK ESTIMATE (Illinois) — USE ONLY IF BIPA APPLIES
Use these figures only inside the Illinois section, and only after you have determined that BIPA applies (Applies = Yes or Conditional). Do not surface these numbers before the applicability determination.
Based on ${body.enrolledCount} enrolled individuals:
Low end (negligent violations): $${bipaRisk.lowEnd.toLocaleString()}
High end (intentional violations): $${bipaRisk.highEnd.toLocaleString()}
${bipaRisk.note}
` : ""}
For each jurisdiction, structure your output EXACTLY as follows:

[JURISDICTION] — [LAW NAME]

Applies to this organisation: [Yes / Conditional / No] — [one sentence reason]

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
[Numbered list of specific obligations relevant to this org type and purpose]

Consent and notice:
[Specific format, timing, and language requirements]

Retention and destruction:
[Specific rules including any mandatory destruction timelines or schedules]

Sale and sharing restrictions:
[Specific prohibitions]

Current enforcement posture:
[Based on enforcement context: what regulators are actively targeting]

Priority actions:
[3–5 numbered actions specific to this organisation type and purpose]

Compliance risk rating: [LOW / MEDIUM / HIGH / CRITICAL]
[One sentence explaining the rating based on enforcement activity and likely gap]
---

After all jurisdiction sections, add:
===ANNOTATIONS===
followed by a JSON array citing enforcement actions that directly supported a priority action, risk rating, or enforcement posture assessment above. Use the exact id values from the enforcement context above (the value after 'id:'). Only cite cases from the ENFORCEMENT PRECEDENTS above — never from training knowledge. Each annotation object has this shape:
{
  "enforcement_action_id": "exact id string",
  "regulator": "regulator name",
  "jurisdiction": "jurisdiction",
  "decision_date": "YYYY-MM-DD or null",
  "summary": "one sentence what the case involved, max 25 words, plain English",
  "outcome": "rejected | accepted | penalised | required",
  "relevance": "one sentence why this case is relevant to this assessment"
}
If no cases informed the assessment, output an empty array [].

Output ONLY the compliance assessment (then the ===ANNOTATIONS=== block). No preamble.`;
    const stressBudget = isStressRun ? `

STATIC-STRESS MODE: Produce the same required sections, but keep each section concise. Target 3-5 obligations, 3 priority actions, and no extended background discussion. Do not omit any selected jurisdiction.` : "";

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: true,
        system: `You are a biometric privacy compliance analyst with expertise in BIPA (Illinois), Texas CUBI, Washington My Health My Data, CCPA biometric provisions, GDPR Article 9(1) biometric data, and EDPB biometric guidance.

Your task: produce a structured compliance assessment for a described biometric data processing activity, calibrated to the jurisdictions in scope and recent enforcement precedents.

BIPA — STATUTORY UPDATE (Illinois P.A. 103-0769 (SB 2979), signed and effective 2 August 2024):
  - The 2024 amendment to 740 ILCS 14/20 caps liquidated damages so that a single course of conduct involving the same biometric identifier or information from the same person constitutes a SINGLE violation per person (not one-per-scan as held in Cothron v. White Castle, 2023 IL 128004). Reflect this in the BIPA risk discussion: the per-person figures supplied above remain the ceiling for new conduct on or after 2 Aug 2024; pre-amendment conduct may still face per-scan exposure.
  - Retroactivity of P.A. 103-0769: on April 1, 2026, a unanimous panel of the U.S. Court of Appeals for the Seventh Circuit resolved the district-court split on retroactivity in Clay v. Union Pacific Railroad Co., No. 25-2185, 2026 WL 891902 (7th Cir. Apr. 1, 2026) (consolidated with Gregg v. Central Transport LLC and Willis v. Universal Intermodal Services, Inc.). The court held that the P.A. 103-0769 amendment is a remedial/procedural change under Illinois law and therefore applies retroactively to cases pending at enactment — limiting pre-amendment conduct to one recovery per person in federal court. Note that Illinois state courts are not bound by the Seventh Circuit on this question of Illinois law, and the Illinois Supreme Court has not addressed retroactivity; residual per-scan exposure in state court therefore cannot be fully excluded. Describe pre-amendment exposure as: substantially reduced in federal court by the Seventh Circuit's Clay ruling, with an unresolved residual risk in Illinois state court — NOT as an open federal split, and do not cite Gregg or Schwartz as the current state of federal law.
  - CITATION RULE: When referencing the Seventh Circuit's BIPA retroactivity ruling, always cite it as Clay v. Union Pacific Railroad Co., No. 25-2185, 2026 WL 891902 (7th Cir. Apr. 1, 2026). Do not use "Gregg v. Central Transport LLC" as the primary citation for the appellate decision — Gregg is one of the three consolidated appeals; Clay is the published lead case docket.
  - HEDGING RULE: Do not state that Illinois courts have "consistently held" boilerplate-embedded consent insufficient. Say plaintiffs routinely challenge consent embedded in onboarding paperwork and a standalone release is the defensible practice — frame as risk guidance, not settled holding, unless citing a specific case from the enforcement context.
  - PROOFREADING: proofread headings and prose for duplicated adjacent words (e.g. "vendor-disclosure disclosure") before output.
  - CURRENCY FOOTER: Append to the END of the assessment output: "Precedent and enforcement positions current to the database's last update (June 2026). Verify before reliance."
  - Section 15(b) written-consent and Section 15(a) public retention-and-destruction policy obligations are unchanged. A private right of action remains.
  - HEADCOUNT CONSISTENCY: Whenever you present an illustrative damages calculation using a single enrollment figure drawn from a range in the intake, state the assumption explicitly (e.g. "assumes the midpoint (2,500) of the stated 500–5,000 range") and present the full-range figure alongside it.

CITATION GUARDRAILS:
  - Cite enforcement actions ONLY from the ENFORCEMENT PRECEDENTS block in the user prompt (each tagged [E#] with an id). Never reference ICO, CNIL, AEPD, Garante, or other regulator fines from training knowledge if they are not in that block.
  - Do not invent statute years, fine amounts, or case names. If the enforcement block is empty for a jurisdiction, say so plainly rather than backfilling from memory.
  - ICO v Clearview AI (2022): the actual penalty was £7,552,800. Do NOT write '£9 million' or any other amount. CRITICAL: If Clearview AI does not appear in the ENFORCEMENT PRECEDENTS block provided in this prompt, do NOT reference it at all — not even with the correct figure. Instead write: "The ICO has imposed significant penalties for unlawful biometric data processing — refer to the ICO enforcement register at ico.org.uk for current enforcement figures."
  - Do NOT cite any 2025 or 2026 ICO fine figure from training knowledge. If the ENFORCEMENT PRECEDENTS block contains no ICO biometric cases, write: 'The ICO has imposed significant penalties for unlawful biometric data processing — refer to the ICO enforcement register at ico.org.uk for current figures.' Do not substitute a specific amount.

ENFORCEMENT FIGURES — ACCURACY RULE: When referencing specific monetary penalties, fine amounts, or settlement figures from enforcement actions, use ONLY figures provided in the ENFORCEMENT PRECEDENTS block. Do NOT recall penalty amounts from training knowledge — these change on appeal, may be misremembered, or may refer to the wrong case. Specific risks: (1) The ICO's Clearview AI enforcement (2022) resulted in a £7.5 million penalty — do NOT cite "£9 million" or any other amount. (2) Do NOT cite any specific 2025 fine figure unless it appears in the ENFORCEMENT PRECEDENTS provided. If no enforcement context was retrieved for a specific figure, write: "The ICO has imposed significant penalties for biometric data processing violations — refer to the ICO enforcement register at ico.org.uk for current figures" rather than stating a specific amount.

ENFORCEMENT CASE CITATION FORMAT IN PROSE: When referencing any enforcement case in the body of the compliance assessment, use the human-readable citation shown in the ENFORCEMENT PRECEDENTS block (e.g. "ICO (2022) — Clearview AI" or "DPC (2023) — Centric Health Ltd.") — NEVER the bracketed [E#] code. The [E#] tag exists only for your internal lookup. The [E#] labels are NOT visible to the user and must NOT appear in the output text. Reserve the exact id values exclusively for the ===ANNOTATIONS=== JSON block at the end.

QUALITY STANDARDS:
1. Risk ratings (LOW/MEDIUM/HIGH/CRITICAL) must reflect actual enforcement posture in the named jurisdictions, not theoretical exposure.
2. For BIPA: the litigation risk calculation must account for per-person per-violation statutory damages ($1,000 negligent / $5,000 intentional), the scale of enrolled individuals provided, AND the P.A. 103-0769 single-violation rule for post-August 2024 conduct.
3. Priority actions must be specific — name the law, the requirement, and the concrete control or document the organisation must put in place. No generic "review your practices".
4. Where enforcement precedents show specific omissions that have been sanctioned (e.g. missing written consent, no retention schedule), call those out as priority gaps.

CITATION INTEGRITY RULE: Every specific statutory citation you produce (act name, section number, subsection letter) must be verifiable against the actual statute. Known hallucination risks to guard against: (1) PIPEDA does not use decimal sub-principle numbering — cite as "Schedule 1, Principle N (Name)" only. (2) The Breach of Security Safeguards Regulations under PIPEDA are SOR/2018-64 — no other SOR number is correct. (3) US state privacy laws do not have a universal 72-hour breach notification deadline — that is a GDPR Article 33 concept only. Apply it only where GDPR explicitly applies. (4) Quebec Law 25 uses "without delay" not "72 hours" — present 72 hours as a planning benchmark only. (5) The California breach notification standard is "most expedient time possible" under Cal. Civ. Code §1798.82 — not 30 days or 72 hours. (6) MONETARY PENALTY RULE: Never state a specific monetary fine, penalty, or settlement amount unless that exact figure appears in the ENFORCEMENT PRECEDENTS block provided in this prompt. Training knowledge of regulatory fines is unreliable. If a relevant case exists but its amount is not in the provided block, write "[Regulator] imposed a significant penalty for this type of violation — verify the current figure at the regulator's enforcement register" instead of recalling an amount. Known correct figures (use only if the case is in your enforcement block): ICO Clearview AI (2022) £7,552,800; ICO Interserve (2022) £4,400,000; ICO Capita Pension Solutions (2024) £6,090,000; ICO British Airways (2020) £20,000,000. If you are uncertain of a specific section number, write the section in descriptive terms and flag it: "[statutory reference to be confirmed with counsel]" rather than inventing a section number.

CCPA GLBA SEQUENCING RULE (financial institutions in California): When the Organisation type in the user prompt contains "financial institution", "bank", "credit union", "broker-dealer", "insurer", "lender", "wealth management", or similar financial-services language AND the jurisdictions include California, the GLBA exemption analysis MUST be completed before the CCPA applicability determination. Specifically:
  - The first sub-section of the California section must be a GLBA boundary analysis identifying which data elements and which consumers fall within the GLBA carve-out from CCPA under Cal. Civ. Code § 1798.145(e), and which fall outside it.
  - Only after that boundary analysis may you state CCPA applicability — and only for the data and consumers not covered by the exemption.
  - The "Applies to this organisation" line for California must reflect this scoping. If GLBA covers some but not all of the data, the applicability must read "Conditional — see GLBA boundary analysis below" rather than a flat "Yes".
  - The GLBA analysis must appear as the first sub-section of the California jurisdiction section, before the CCPA Key requirements list.

TEXAS CUBI RETENTION TRIGGER RULE (when Texas CUBI is in scope, via explicit Texas jurisdiction selection OR the OTHER US STATE flag): The Retention and destruction section must reflect the following:
  - The CUBI destruction obligation is triggered when the collection purpose has been satisfied — not on a calendar date from initial collection. The user's stated retention period is the outer ceiling only; destruction may be required earlier when the purpose expires (e.g. account closure, consent withdrawal, service termination, employment ending).
  - Instruct the organisation to define the specific event that triggers purpose expiry for their use case, and to apply the stated retention period as a maximum running from that event, not from the date of collection.
  - If the intake does not specify what event triggers purpose expiry, flag this explicitly as a gap the organisation must address in their retention policy before relying on any stated retention period as a safe harbour.

TEXAS CUBI CONSENT FORMAT RULE: Texas CUBI (Tex. Bus. & Com. Code § 503.001(b)) requires the controller to inform the individual before or at the time of capture that a biometric identifier is being collected, and to obtain the individual's consent. CUBI does NOT require consent to be in the form of a signed written release — that specific requirement comes from Illinois BIPA (740 ILCS 14/15(b)) and must not be imported into CUBI analysis. When writing the Texas consent section: state that CUBI requires notice and consent before capture; recommend documented written or electronic consent as defensible best practice; do NOT state that a signed written release is a statutory requirement under CUBI.

TEXAS CUBI SUBSECTION ACCURACY RULE: The correct CUBI subsection map is: (b) = consent and notice; (c)(1) = sale/lease/disclosure prohibition; (c)(2) = reasonable security for storage and transmission; (c)(3) = retention and destruction obligation; (d) = civil penalty up to $25,000; (e) [effective Jan 1, 2026] = AI development exemption. Never cite the penalty as § 503.001(e) — that is the AI exemption. Never cite security as § 503.001(d) — that is the penalty. If you are uncertain of a specific subsection, write the obligation in descriptive terms and add "[subsection reference to be confirmed with counsel]" rather than inventing a letter.

FLORIDA FDBR APPLICABILITY RULE: The Florida Digital Bill of Rights (FDBR), Fla. Stat. § 501.702 et seq., applies only to "controllers" that: (a) conduct business in Florida OR produce products/services targeted to Florida consumers, AND (b) have global annual revenues exceeding $1 billion, AND (c) meet at least one of specific platform criteria (operating an online marketplace with 10M+ monthly active US users, operating a search engine, operating a social media platform, operating an app store, operating a voice-operated OS, or operating a web browser). The 100,000-consumer or 25,000-consumer thresholds come from other state privacy laws (e.g. Virginia, Colorado) and do NOT determine FDBR applicability. If the organisation's revenue is not stated or the platform criteria are not met, say FDBR is likely inapplicable and explain why, using the actual statutory criteria.

GDPR AND UK GDPR — DO NOT SELL RULE: The phrase "do not sell biometric identifiers" is a US state biometric/privacy law concept (from BIPA, CUBI, and CCPA). GDPR and UK GDPR do not use a "sale" framework for restricting data sharing. For all EU/EEA and UK jurisdiction sections, replace any "do not sell" language with the applicable GDPR controls: (1) purpose limitation — Article 5(1)(b) GDPR prohibits using biometric data for purposes incompatible with the original collection purpose; (2) processor controls — Article 28 GDPR requires a written data processing agreement for any processor receiving biometric data; (3) transfer restrictions — any transfer of biometric data outside the EEA/UK requires an appropriate safeguard under Chapter V GDPR (adequacy decision, SCCs, BCRs, IDTA for UK transfers).

PRIVATE CLAIMANTS ACCURACY RULE: Do not use the phrase "regulators and private claimants" as a catch-all enforcement statement across all jurisdictions. The private right of action differs sharply by jurisdiction: Illinois BIPA has a broad private right of action per person per violation; Texas CUBI has NO private right of action — Texas AG only; Virginia VCDPA has NO private right of action — Virginia AG only; California CPRA has a limited private right of action only for data breaches (Cal. Civ. Code § 1798.150), not for general biometric violations; EU/UK GDPR provides individual rights including the right to lodge complaints with supervisory authorities and the right to compensation under Article 82, but not US-style class actions. Always use jurisdiction-specific enforcement language and never imply private litigation exposure where a statute is AG-enforced only.

HR EMPLOYMENT BIOMETRIC CONSENT RULE: When the organisation type is "Employer (employee biometrics)" or the purpose is "Time & attendance / workforce management" or "Physical access control" and the jurisdiction is EU/EEA or UK: the Key requirements section MUST include a warning that employee consent for biometric processing is likely not a valid Article 9(2) condition under GDPR in the employment context. The EDPB and multiple national supervisory authorities (including the German Datenschutzkonferenz, the French CNIL, and the Spanish AEPD) have held that genuine freely given consent is generally not possible where there is a clear imbalance of power between the data subject and the controller, such as in the employment relationship (EDPB Guidelines 05/2020 on consent, para. 21). The employer should instead rely on: Article 9(2)(b) (processing necessary for employment law obligations, if applicable national law permits biometric use in employment) or Article 9(2)(g) (substantial public interest, with proportionate safeguards and national law authorisation). Works council consultation may be required in Germany, France, Spain, and the Netherlands. State this clearly in the employment-context sections.

KYC/AML LEGAL BASIS RULE: When the purpose includes KYC, anti-money laundering, or identity verification for financial regulatory compliance: for EU/EEA and UK sections, analyze the legal basis in two steps before defaulting to consent. Step 1: determine whether the biometric verification is required by a legal obligation (EU AML Directive, national AML law, or equivalent) — if so, Article 6(1)(c) (legal obligation) is the Article 6 basis, not Article 6(1)(a) (consent). Step 2: the Article 9(2) condition for the biometric element still needs separate analysis even where Article 6(1)(c) applies — the most likely condition is Article 9(2)(g) (substantial public interest) or a national law authorisation. Do not present explicit consent as the default legal basis for KYC/AML biometric processing.

RISK RATING CRITERIA: Apply these criteria consistently when assigning LOW / MEDIUM / HIGH / CRITICAL ratings:
  CRITICAL: Active enforcement history in this jurisdiction for this organisation type; private right of action with per-violation statutory damages at scale; no defensible consent practice currently in place.
  HIGH: Established regulatory enforcement posture; known active AG or supervisory authority enforcement; meaningful litigation exposure even if no current confirmed gap.
  MEDIUM: Law clearly applies; no major enforcement history for this specific processing type; organisation appears to have baseline controls but gaps remain.
  LOW: Law applies conditionally or applicability is uncertain; enforcement is nascent or theoretical; organisation's scale reduces immediate exposure.
Always state in one sentence after the rating why that level was selected, referencing enforcement posture and identified gaps.

Output ONLY the compliance assessment. No preamble.`,
        messages: [{ role: "user", content: prompt + stressBudget }],
      }),
    });

    if (!aiRes.ok || !aiRes.body) {
      const errText = aiRes.body ? await aiRes.text() : "no body";
      console.error("Claude error:", errText);
      await writer.write(encoder.encode(JSON.stringify({ error: "AI generation failed" })));
      return;
    }


    // Stream Anthropic SSE so the edge runtime's 150s idle timeout never
    // trips on long Sonnet generations.
    let fullText = "";
    let stopReason: string | null = null;
    {
      const reader = aiRes.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              fullText += evt.delta.text ?? "";
            } else if (evt.type === "message_delta" && evt.delta?.stop_reason) {
              stopReason = evt.delta.stop_reason;
            }
          } catch { /* ignore malformed line */ }
        }
      }
    }
    const aiData: any = { stop_reason: stopReason };
    console.log(`[check-biometric-compliance] gen done stop=${aiData.stop_reason ?? null} chars=${fullText.length}`);
    let assessment_text = fullText
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*\*/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/^>\s?/gm, '')
      .replace(/^\*\s+/gm, '• ');
    let parsedAnnotations: any[] = [];
    try {
      const sepIdx = fullText.indexOf("===ANNOTATIONS===");
      if (sepIdx !== -1) {
        assessment_text = fullText.slice(0, sepIdx).trim()
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/\*\*\*/g, '')
          .replace(/\*\*/g, '')
          .replace(/\*([^*\n]+)\*/g, '$1')
          .replace(/^>\s?/gm, '')
          .replace(/^\*\s+/gm, '• ');
        const annotationsRaw = fullText.slice(sepIdx + "===ANNOTATIONS===".length).trim();
        const cleaned = annotationsRaw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const start = cleaned.indexOf("[");
        const end = cleaned.lastIndexOf("]");
        if (start !== -1 && end !== -1) {
          const arr = JSON.parse(cleaned.slice(start, end + 1));
          if (Array.isArray(arr)) parsedAnnotations = arr;
        }
      }
    } catch (e) {
      console.warn("[Biometric] annotation parse failed (non-fatal):", e);
      parsedAnnotations = [];
    }

    // ── R0 PART 3: Output lint on final narrative. Apply auto-fixes;
    // retry once on hard violations; persist lint summary.
    const referenceDate = new Date().toISOString();
    const lintViolations: any[] = [];
    {
      let lint = lintReportText(assessment_text, {
        checkDates: true, checkUnresolvedTokens: true, referenceDate,
      });
      if (lint.clean !== assessment_text) assessment_text = lint.clean;
      if (!isStressRun && hasHardViolations(lint)) {
        try {
          const details = lint.violations.filter((v) => v.severity === "hard")
            .map((v) => `${v.code}: ${v.detail}`).join("; ");
          const retryRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-6",
              max_tokens: 12000,
              system: "You are a biometric privacy compliance analyst. Reproduce the prior assessment, correcting these automated-lint defects silently and without meta-commentary: " + details,
              messages: [
                { role: "user", content: prompt + stressBudget },
                { role: "assistant", content: fullText },
                { role: "user", content: `Regenerate the assessment correcting: ${details}. Same output format, same ===ANNOTATIONS=== block.` },
              ],
            }),
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            const retryFull = retryData.content?.[0]?.text ?? "";
            console.log(`[check-biometric-compliance] gen done stop=${retryData.stop_reason ?? null} chars=${retryFull.length}`);
            let retryText = retryFull;
            const sep2 = retryFull.indexOf("===ANNOTATIONS===");
            if (sep2 !== -1) retryText = retryFull.slice(0, sep2).trim();
            retryText = retryText
              .replace(/^#{1,6}\s+/gm, '').replace(/\*\*\*/g, '').replace(/\*\*/g, '')
              .replace(/\*([^*\n]+)\*/g, '$1').replace(/^>\s?/gm, '').replace(/^\*\s+/gm, '• ');
            assessment_text = retryText;
            lint = lintReportText(assessment_text, {
              checkDates: true, checkUnresolvedTokens: true, referenceDate,
            });
            assessment_text = lint.clean;
          }
        } catch (e) {
          console.warn("[Biometric] lint retry failed (non-fatal):", e);
        }
      }
      for (const v of lint.violations) lintViolations.push(v);
    }

    const report_data = {
      bipa_risk: bipaRisk,
      jurisdictions_analysed: body.jurisdictions,
      enforcement_precedents: enforcement_context.slice(0, 5),
      enforcement_meta: enforcementMeta,
      annotations: parsedAnnotations,
      lint_warnings: lintViolations,
      generated_at: new Date().toISOString(),
    };


    let savedId: string | null = null;
    try {
      if (body.assessment_id) {
        const { data, error } = await supabase
          .from("biometric_assessments")
          .update({
            client_id: body.client_id ?? null,
            status: "complete",
            intake_data: body,
            jurisdictions: body.jurisdictions,
            analysis_text: assessment_text,
            report_data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.assessment_id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        savedId = data?.id ?? body.assessment_id;
      } else {
        const { data, error } = await supabase
          .from("biometric_assessments")
          .insert({
            user_id: resolvedUserId,
            client_id: body.client_id ?? null,
            status: "complete",
            intake_data: body,
            jurisdictions: body.jurisdictions,
            analysis_text: assessment_text,
            report_data,
            is_free_tier: !!body.is_free_tier,
          })
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
      }
    } catch (persistErr) {
      console.error("biometric_assessments persist failed:", persistErr);
    }

    // C4 RoPA accumulator: biometric processing is always RoPA-relevant & high-risk
    if (savedId && body.client_id) {
      const useCase = (body as any).use_case || (body as any).biometric_use_case || "Biometric processing";
      supabase.functions.invoke("accumulate-ropa-activity", {
        body: {
          client_id: body.client_id,
          source_tool: "biometric_checker",
          source_assessment_id: savedId,
          display_name: `Biometric: ${String(useCase).slice(0, 80)}`,
          source_summary: String(useCase),
          is_high_risk: true,
          category: "technology",
        },
      }).catch((e: Error) => console.error("[biometric] accumulate-ropa failed (non-fatal):", e.message));
    }


        await writer.write(encoder.encode(JSON.stringify({
          id: savedId,
          assessment_text,
          bipa_risk: bipaRisk,
          jurisdictions_analysed: body.jurisdictions,
          enforcement_precedents: report_data.enforcement_precedents,
          generated_at: report_data.generated_at,
        })));
      } catch (e) {
        console.error("check-biometric-compliance error:", e);
        try {
          await writer.write(encoder.encode(JSON.stringify({ error: "An internal error occurred" })));
        } catch { /* ignore */ }
      } finally {
        clearInterval(keepAlive);
        try { await writer.close(); } catch { /* ignore */ }
      }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-biometric-compliance error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

