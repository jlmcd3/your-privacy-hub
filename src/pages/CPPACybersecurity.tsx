// CPPA Cybersecurity Audit Readiness — Module 2 intake. Covers 18 programme components.
import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useToolPrice } from "@/hooks/useToolPrice";
import AuthGateModal from "@/components/AuthGateModal";
import ToolDisclaimer from "@/components/ToolDisclaimer";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useActiveClient } from "@/hooks/useActiveClient";
import SampleReportLink from "@/components/SampleReportLink";
import ToolTierNote from "@/components/tools/ToolTierNote";
import CPPAToolsCrossLinks from "@/components/cppa/CPPAToolsCrossLinks";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import StatuteRail from "@/components/admt/StatuteRail";
import { CPPA_CYBER_RAIL } from "@/components/cppa/CPPACyberRailEntries";
import type { RailEntry } from "@/components/admt/StatuteRail";
import { useEnforcementSignals } from "@/hooks/useEnforcementSignals";
import { EnforcementSignalIcon } from "@/components/EnforcementSignalIcon";
import { useFscrCallouts } from "@/hooks/useFscrCallouts";
import { FscrCallout } from "@/components/FscrCallout";

const MATURITY = [
  "Not implemented",
  "Ad hoc / informal",
  "Documented, partially implemented",
  "Implemented across organisation",
  "Implemented with continuous monitoring",
];

type Control = { key: string; label: string; description: string; citation: string };

const CONTROLS: Control[] = [
  { key: "c1_auth", label: "Authentication and access controls", description: "MFA, password policies, role-based access.", citation: "§ 7122(a)(1)" },
  { key: "c2_encryption", label: "Encryption of personal information", description: "At rest and in transit.", citation: "§ 7122(a)(2)" },
  { key: "c3_zero_trust", label: "Zero-trust architecture", description: "Continuous verification, least privilege.", citation: "§ 7122(a)(3)" },
  { key: "c4_account_mgmt", label: "Account management and access control", description: "Provisioning, deprovisioning, periodic review.", citation: "§ 7122(a)(4)" },
  { key: "c5_inventory", label: "Inventory of personal information and systems", description: "Data mapping and asset inventory.", citation: "§ 7122(a)(5)" },
  { key: "c6_secure_config", label: "Secure configuration of hardware and software", description: "Hardening baselines.", citation: "§ 7122(a)(6)" },
  { key: "c7_vuln_mgmt", label: "Vulnerability management and patching", description: "Scanning cadence and SLAs.", citation: "§ 7122(a)(7)" },
  { key: "c8_audit_logs", label: "Audit-log management", description: "Generation, retention, review.", citation: "§ 7122(a)(8)" },
  { key: "c9_network_mon", label: "Network monitoring and defence", description: "IDS/IPS, SIEM, alerting.", citation: "§ 7122(a)(9)" },
  { key: "c10_anti_malware", label: "Anti-malware protections", description: "EDR/AV across endpoints and servers.", citation: "§ 7122(a)(10)" },
  { key: "c11_segmentation", label: "Network segmentation", description: "Separation of sensitive systems.", citation: "§ 7122(a)(11)" },
  { key: "c12_physical", label: "Limitation of physical access", description: "Facility, datacentre, device controls.", citation: "§ 7122(a)(12)" },
  { key: "c13_secure_dev", label: "Secure development of software", description: "SDLC, code review, dependency scanning.", citation: "§ 7122(a)(13)" },
  { key: "c14_third_party", label: "Oversight of service providers and third parties", description: "Due diligence, contracts, monitoring.", citation: "§ 7122(a)(14)" },
  { key: "c15_retention", label: "Retention schedules and secure disposal", description: "Documented retention and deletion.", citation: "§ 7122(a)(15)" },
  { key: "c16_training", label: "Cybersecurity awareness, education and training", description: "Annual training, phishing simulations.", citation: "§ 7122(a)(16)" },
  { key: "c17_incident", label: "Incident response and post-incident analysis", description: "IR plan, tabletop exercises, post-mortems.", citation: "§ 7122(a)(17)" },
  { key: "c18_continuity", label: "Business continuity and disaster recovery", description: "BCP/DR plans, tested backups.", citation: "§ 7122(a)(18)" },
];

export default function CPPACybersecurity() {
  const { user } = useAuth();
  const { clientId } = useActiveClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricing = useToolPrice("cppa_cybersecurity");
  const [searchParams] = useSearchParams();
  const isSuite = searchParams.get("suite") === "true";
  const suitePricing = useToolPrice("cppa_suite");
  // v7: show the price the current viewer will pay; switch to Suite pricing
  // when launched in suite mode.
  const activePricing = isSuite ? suitePricing : pricing;
  const headerLabel = isSuite ? "CPPA AUDIT READINESS · FULL SUITE (M1 + M2)" : "CPPA AUDIT READINESS · MODULE 2";
  const displayPrice = activePricing.price;

  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [maturity, setMaturity] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState({ industry: "", incidents_12mo: "", framework: "", last_audit: "" });

  const setM = (k: string, v: string) => setMaturity((s) => ({ ...s, [k]: v }));
  const setN = (k: string, v: string) => setNotes((s) => ({ ...s, [k]: v }));

  const [activeCyberRailKey, setActiveCyberRailKey] = useState<string | null>(null);
  const activeCyberRailEntry: RailEntry | null = activeCyberRailKey ? (CPPA_CYBER_RAIL[activeCyberRailKey] ?? null) : null;
  const focusRail = (key: string) => setActiveCyberRailKey(key);

  const cyberEnforcementSignals = useEnforcementSignals(["authentication", "vulnerability", "incident_response"]);

  const cyberFscrCallouts = useFscrCallouts([
    "11 CCR § 7122(a)(1)",
    "11 CCR § 7122(a)(3)",
  ]);

  const allComplete = useMemo(
    () => CONTROLS.every((c) => maturity[c.key]) && profile.industry && profile.incidents_12mo && profile.framework && profile.last_audit,
    [maturity, profile]
  );

  const intake = useMemo(
    () => ({
      profile,
      controls: CONTROLS.map((c) => ({
        key: c.key,
        label: c.label,
        maturity: maturity[c.key] || "",
        notes: notes[c.key] || "",
      })),
    }),
    [profile, maturity, notes]
  );

  const handlePurchase = () => {
    if (!allComplete) {
      toast({ title: "Required", description: "Please rate all 18 controls and complete the profile.", variant: "destructive" });
      return;
    }
    if (!user) { setAuthGateOpen(true); return; }
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <DashboardSubnav />
      <Helmet>
        <title>CPPA Cybersecurity Audit Readiness — Module 2 | End User Privacy</title>
        <meta name="description" content="CPPA cybersecurity audit readiness mapped to the 18 programme components in the agency's regulations. Includes Breach Precedent Map, Auditor Independence Advisor, and Auditor Handoff Package." />
        <link rel="canonical" href="https://enduserprivacy.com/cppa-cybersecurity" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "CPPA Cybersecurity Audit Readiness (Module 2)",
          description: "18-control gap assessment with dynamic Breach Precedent Map, FSOR-cited findings, and auditor handoff package.",
          brand: { "@type": "Brand", name: "End User Privacy" },
          url: "https://enduserprivacy.com/cppa-cybersecurity",
          offers: { "@type": "Offer", price: "99", priceCurrency: "USD", availability: "https://schema.org/InStock" },
        })}</script>
      </Helmet>
      <header className="bg-[#1a4a6e] text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            {headerLabel} · ${displayPrice}
          </span>
          <h1 className="font-serif text-white mb-3">CPPA Cybersecurity Audit Readiness</h1>
          <p className="text-slate-300 text-lg">A structured readiness review mapped to the 18 cybersecurity programme components in the CPPA's cybersecurity audit regulations. Generates a control-by-control gap report.</p>
          <p className="text-slate-400 text-sm mt-3">Required for businesses processing personal information posing significant risk. Audit cadence begins for the largest businesses in 2026.</p>
          <p className="text-slate-400 text-xs italic mt-2">
            Built on the CPPA's final regulations and Final Statement of Reasons, paragraph-cited. This tool never invents precedent — where the agency hasn't spoken, it says so.
          </p>
          <div className="mt-4"><SampleReportLink toolSlug="cppa_cyber" tone="onDark" variant="link" /></div>
        </div>
      </header>
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 -mb-2">
          <ToolTierNote isCppa={true} />
        </div>


      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <IntakeGuidance>For each control, note the specific tools in place, the scope they cover, and any exceptions — separately and concretely. A control marked "in place" with a vague note produces a weaker gap analysis than one described precisely.</IntakeGuidance>
        <ActiveClientLabel />
        <ToolDisclaimer addition="This tool produces a cybersecurity readiness gap analysis against the 18 components enumerated in 11 CCR § 7122(a). It is not a cybersecurity audit, does not satisfy the CPPA's independent-auditor requirement, and is not legal advice. The April 1, 2028 certification requires an independent audit." />
        <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-6">
        <section className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="">Organisation Profile</h2>
          <p className="text-xs font-mono text-muted-foreground -mt-3">11 CCR § 7122(a) — cybersecurity audit programme scope; § 7122(b) — certification requirement</p>
          <RequiredLegend />
          <div onFocus={() => focusRail('profile_industry')}>
            <Label>Industry sector<Req /></Label>
            <input className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.industry} onChange={(e) => setProfile({ ...profile, industry: e.target.value })} placeholder="e.g. SaaS, healthcare, retail" />
          </div>
          <div>
            <Label>Reportable security incidents in last 12 months<Req /></Label>
            <select className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.incidents_12mo} onChange={(e) => setProfile({ ...profile, incidents_12mo: e.target.value })}>
              <option value="">Select…</option>
              <option>None</option><option>1</option><option>2–5</option><option>More than 5</option>
            </select>
          </div>
          <div>
            <Label>Primary security framework in use<Req /></Label>
            <select className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.framework} onChange={(e) => setProfile({ ...profile, framework: e.target.value })}>
              <option value="">Select…</option>
              <option>NIST CSF</option><option>ISO 27001</option><option>SOC 2</option><option>HITRUST</option><option>PCI DSS</option><option>None / informal</option><option>Other</option>
            </select>
          </div>
          <div onFocus={() => focusRail('profile_audit')}>
            <Label>Last independent security audit<Req /></Label>
            <select className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.last_audit} onChange={(e) => setProfile({ ...profile, last_audit: e.target.value })}>
              <option value="">Select…</option>
              <option>Within 12 months</option><option>12–24 months ago</option><option>Over 24 months ago</option><option>Never</option>
            </select>
          </div>
        </section>

        <section className="bg-card border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="">18 Cybersecurity Programme Components</h2>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">11 CCR § 7122(a)(1)–(18) — enumerated programme components</p>
            <p className="text-sm text-muted-foreground mt-1">Rate each control against the CPPA's enumerated programme components.</p>
          </div>

          {CONTROLS.map((c, i) => (
            <div key={c.key} className="border-t pt-5 first:border-t-0 first:pt-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-mono">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="">{c.label}</h3>
                <span className="text-xs text-muted-foreground font-mono">(11 CCR {c.citation})</span>
                {(c.key === "c1_auth" || c.key === "c7_vuln_mgmt" || c.key === "c17_incident") && (
                  <EnforcementSignalIcon
                    signalKey={c.key === "c1_auth" ? "authentication" : c.key === "c7_vuln_mgmt" ? "vulnerability" : "incident_response"}
                    signals={cyberEnforcementSignals}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 mb-3">{c.description}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Maturity<Req /></Label>
                  <select onFocus={() => focusRail(c.key)} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={maturity[c.key] || ""} onChange={(e) => setM(c.key, e.target.value)}>
                    <option value="">Select…</option>
                    {MATURITY.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea rows={2} value={notes[c.key] || ""} onChange={(e) => setN(c.key, e.target.value)} className="mt-1" placeholder="Tools, scope, exceptions…" />
                </div>
              </div>
              {(c.key === "c1_auth" || c.key === "c3_zero_trust") && (
                <FscrCallout
                  citation={c.key === "c1_auth" ? "11 CCR § 7122(a)(1)" : "11 CCR § 7122(a)(3)"}
                  callouts={cyberFscrCallouts}
                />
              )}
            </div>
          ))}
        </section>

        <div className="bg-card border rounded-lg p-6 flex justify-end flex-wrap gap-3">
          {isSuite ? (
            <Button onClick={() => { if (!allComplete) { toast({ title: "Required", description: "Please complete all 18 controls.", variant: "destructive" }); return; } if (!user) { setAuthGateOpen(true); return; } setCheckoutOpen(true); }}>
              Purchase CPPA Suite — ${suitePricing.price}
            </Button>
          ) : (
            <Button onClick={handlePurchase}>
              Run Cybersecurity Readiness — ${displayPrice}
            </Button>
          )}
        </div>
        </div>
        <StatuteRail entry={activeCyberRailEntry} />
        </div>

        <p className="text-xs text-muted-foreground italic">
          This is a compliance framework tool mapped to CPPA cybersecurity audit regulations. It does not constitute legal or security advice. Output should be reviewed with qualified counsel and your security team.
        </p>

        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo={isSuite ? "/cppa-cybersecurity?suite=true" : "/cppa-cybersecurity"} />
        <ToolCheckoutModal
          open={checkoutOpen}
          toolType={isSuite ? "cppa_suite" : "cppa_cybersecurity"}
          userId={user?.id}
          clientId={clientId}
          intakeData={intake}
          onClose={() => setCheckoutOpen(false)}
          onComplete={(id, suiteCyberId) => {
            setCheckoutOpen(false);
            if (!id) return;
            if (isSuite && suiteCyberId) {
              // When entered via /cppa-cybersecurity?suite=true, the risk_id is the
              // first assessment created (stored as id) and cyber_id is suiteCyberId.
              // NOTE: The suite entry point is /cppa-risk-assessment?suite=true, so
              // this branch may not be reached in practice. Navigate safely.
              navigate(`/cppa-suite/result?risk_id=${id}&cyber_id=${suiteCyberId}&purchased=true`);
            } else {
              navigate(`/cppa-cybersecurity/result/${id}?purchased=true`);
            }
          }}
        />
      </main>
      <CPPAToolsCrossLinks current="cyber" />
    <Footer />
    </div>
  );
}
