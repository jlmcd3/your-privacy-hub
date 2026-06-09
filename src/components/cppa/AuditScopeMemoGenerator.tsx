// Sprint 2 #2 — Audit Scope Memo Generator (CPPA Cybersecurity Audit, 11 CCR § 7123)
// Drafts a § 7123 audit-scope statement from the intake the customer already gave us,
// pre-fills sensible defaults the customer can edit, and renders a memo block they can
// attach to the engagement letter. Pure client-side, no backend changes.
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CPPA_CYBER_FRAMEWORK_MAPPING } from "@/data/cppa-cyber-framework-mapping";

type Intake = {
  profile?: {
    industry?: string;
    incidents_12mo?: string;
    framework?: string;
    last_audit?: string;
  };
  controls?: Array<{ key: string; label: string; maturity: string; notes?: string }>;
};

type Props = {
  intake?: Intake | null;
  report?: any;
};

// Default audit window: 12 months ending on the last day of the month preceding today.
function defaultAuditPeriod(): { start: string; end: string } {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const start = new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth() + 1, 1));
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return { start: fmt(start), end: fmt(end) };
}

export default function AuditScopeMemoGenerator({ intake, report }: Props) {
  const profile = intake?.profile || {};
  const controls = Array.isArray(intake?.controls) ? intake!.controls! : [];

  const period = defaultAuditPeriod();

  // Pre-fill defaults from intake + report.
  const defaultSystems = useMemo(() => {
    const lines = [
      "Production systems that process California consumer personal information",
      "Identity and access management (IAM) systems supporting those production systems",
      "Logging, monitoring, and alerting infrastructure covering those production systems",
      "Backup and disaster recovery infrastructure for those production systems",
      "Third-party service providers and contractors that process personal information on the business's behalf",
    ];
    return lines.join("\n");
  }, []);

  const defaultDataCategories = useMemo(() => {
    const base = [
      "Identifiers (name, email, account ID, IP address)",
      "Commercial information (transaction history, product interactions)",
      "Internet or other network activity (browsing, device, telemetry)",
    ];
    const industry = (profile.industry || "").toLowerCase();
    if (industry.includes("health")) base.push("Health information / medical identifiers");
    if (industry.includes("financ") || industry.includes("bank") || industry.includes("fintech"))
      base.push("Financial account information");
    if (industry.includes("biometric") || industry.includes("identity"))
      base.push("Biometric information");
    if (industry.includes("ad") || industry.includes("mar") || industry.includes("retail"))
      base.push("Inferences drawn to create a consumer profile");
    return base.join("\n");
  }, [profile.industry]);

  const defaultActivities = useMemo(
    () =>
      [
        "Collection and intake of consumer personal information",
        "Storage and retention of consumer personal information",
        "Use and processing for the business purposes disclosed in the privacy notice",
        "Disclosure to service providers and contractors under § 7051 contracts",
        "Deletion, correction, and access-request fulfilment under §§ 1798.105 / 1798.106 / 1798.110",
      ].join("\n"),
    []
  );

  // Components flagged Implemented in the report do NOT auto-exclude — they still
  // need to be audited per § 7122(a). Exclusions are deliberate and require rationale.
  const defaultExclusions = useMemo(() => {
    const lines = [
      "Corporate IT systems that do not store, process, or transmit California consumer personal information (rationale: outside § 7122(a) scope).",
      "Internal R&D environments using only synthetic or fully anonymised data (rationale: not 'personal information' as defined at § 1798.140(v); auditor must confirm de-identification controls).",
    ];
    return lines.join("\n");
  }, []);

  const defaultFrameworkRef = profile.framework && profile.framework !== "None / informal"
    ? `The business operates a ${profile.framework} programme. Auditor should use the CPPA-to-${profile.framework} cross-walk (see Framework Mapping section of this report) to identify which existing ${profile.framework} controls and evidence the auditor may rely upon, and which § 7122(a) components require CPPA-specific evidence that the ${profile.framework} programme does not produce.`
    : "The business does not operate a recognised baseline framework (NIST CSF, ISO 27001, SOC 2). Auditor should not assume any existing certifications or attestations satisfy § 7122(a); all 18 components require primary evidence.";

  const [scopeStart, setScopeStart] = useState(period.start);
  const [scopeEnd, setScopeEnd] = useState(period.end);
  const [systems, setSystems] = useState(defaultSystems);
  const [dataCats, setDataCats] = useState(defaultDataCategories);
  const [activities, setActivities] = useState(defaultActivities);
  const [exclusions, setExclusions] = useState(defaultExclusions);
  const [frameworkRef, setFrameworkRef] = useState(defaultFrameworkRef);
  const preRef = useRef<HTMLPreElement>(null);

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Components list for the memo body (all 18 § 7122(a) components — none may be silently dropped).
  const componentLines = CPPA_CYBER_FRAMEWORK_MAPPING.map(
    (r) => `  ${String(r.index).padStart(2, "0")}. ${r.cppa_component}`
  ).join("\n");

  return (
    <section className="bg-card border rounded-lg p-6">
      <h2 className="mb-1">Audit Scope Memo Generator</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Drafts a § 7123 audit-scope statement from your intake. Every § 7122(a) component is in scope by default —
        the regulation does not permit silently dropping any of the 18. Use the Exclusions field to record any
        out-of-scope <em>systems</em> with rationale (e.g., corporate IT with no consumer PI). Edit any field;
        the memo updates live. Attach the memo to your engagement letter.
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div>
          <Label className="text-xs">Audit period — start</Label>
          <Input value={scopeStart} onChange={(e) => setScopeStart(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Audit period — end</Label>
          <Input value={scopeEnd} onChange={(e) => setScopeEnd(e.target.value)} className="mt-1" />
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <Label className="text-xs">In-scope systems and infrastructure</Label>
          <Textarea rows={5} value={systems} onChange={(e) => setSystems(e.target.value)} className="mt-1 text-xs font-mono" />
        </div>
        <div>
          <Label className="text-xs">Personal information categories processed</Label>
          <Textarea rows={4} value={dataCats} onChange={(e) => setDataCats(e.target.value)} className="mt-1 text-xs font-mono" />
        </div>
        <div>
          <Label className="text-xs">Processing activities</Label>
          <Textarea rows={5} value={activities} onChange={(e) => setActivities(e.target.value)} className="mt-1 text-xs font-mono" />
        </div>
        <div>
          <Label className="text-xs">Framework-reliance statement</Label>
          <Textarea rows={3} value={frameworkRef} onChange={(e) => setFrameworkRef(e.target.value)} className="mt-1 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Exclusions and rationale</Label>
          <Textarea rows={4} value={exclusions} onChange={(e) => setExclusions(e.target.value)} className="mt-1 text-xs font-mono" />
          <p className="text-[11px] text-muted-foreground mt-1">
            Document each excluded <strong>system</strong> with the rationale the auditor will rely on. Do not exclude
            any of the 18 § 7122(a) components themselves.
          </p>
        </div>
      </div>

      <details open className="mt-4 bg-muted/30 border rounded p-4">
        <summary className="text-xs font-semibold cursor-pointer">Generated memo (copy into engagement letter)</summary>
        <pre ref={preRef} className="mt-3 text-xs leading-relaxed font-mono whitespace-pre-wrap">{`AUDIT SCOPE MEMO
CPPA Cybersecurity Audit — 11 CCR § 7123
Date prepared: ${today}

1. AUDIT PERIOD
   ${scopeStart} through ${scopeEnd}.
   The auditor's testing must cover the operation of controls during this
   period. Point-in-time observation alone does not satisfy § 7123.

2. BUSINESS PROFILE
   Industry / sector:           ${profile.industry || "[not specified]"}
   Reportable incidents (12m):  ${profile.incidents_12mo || "[not specified]"}
   Baseline framework in use:   ${profile.framework || "[not specified]"}
   Most recent prior audit:     ${profile.last_audit || "[not specified]"}

3. IN-SCOPE SYSTEMS AND INFRASTRUCTURE
${systems.split("\n").map((l) => `   - ${l}`).join("\n")}

4. PERSONAL INFORMATION CATEGORIES PROCESSED
${dataCats.split("\n").map((l) => `   - ${l}`).join("\n")}

5. PROCESSING ACTIVITIES IN SCOPE
${activities.split("\n").map((l) => `   - ${l}`).join("\n")}

6. CYBERSECURITY PROGRAMME COMPONENTS IN SCOPE — § 7122(a)
   All 18 components below are in scope. None may be omitted.
${componentLines}

7. RELIANCE ON EXISTING FRAMEWORKS
   ${frameworkRef}

8. EXCLUSIONS (SYSTEMS ONLY) AND RATIONALE
${exclusions.split("\n").map((l) => `   - ${l}`).join("\n")}

9. AUDITOR DELIVERABLES
   - Written audit report addressing each § 7122(a) component, the evidence
     reviewed, and the auditor's conclusion (Implemented / Partial / Gap /
     Critical Gap) for each.
   - Identification of any material gaps requiring remediation before the
     April 1, 2028 compliance deadline.
   - Certification statement signed by the lead auditor confirming the audit
     was performed in accordance with §§ 7121–7124.
   - Working papers retained for the period required by § 7124.

10. CHANGE CONTROL
    Any change to this scope — added or removed systems, additional data
    categories, or adjusted audit period — must be agreed in writing and
    appended to this memo before the change takes effect.

Approved for the business: ______________________________  Date: __________
                           (Highest-level governing body or designee)

Acknowledged by auditor:   ______________________________  Date: __________
`}</pre>
      </details>

      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const text = preRef.current?.innerText || "";
            if (text) navigator.clipboard?.writeText(text);
          }}
        >
          Copy memo to clipboard
        </Button>
      </div>
    </section>
  );
}

