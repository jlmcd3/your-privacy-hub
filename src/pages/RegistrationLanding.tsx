// Registration Manager — public landing page.
// Implements the 10-section spec: hero, problem, how-it-works, what-you-get,
// confidence model, pricing, jurisdictions, trust signals, FAQ, final CTA.

import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RequirementBadge } from "@/components/RequirementBadge";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { Link } from "react-router-dom";
import ToolTierNote from "@/components/tools/ToolTierNote";
// useSubscriptionTier removed — registration is per-filing for all tiers.
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RegistrationDisclaimer from "@/components/RegistrationDisclaimer";
import {
  CheckCircle2, Clock, Globe2, ShieldCheck, FileText, AlertTriangle,
  Brain, Building2, ArrowRight,
} from "lucide-react";
import { formatPrice, PRICING } from "@/config/pricing";
import { useConversionEvent } from "@/hooks/useConversionEvent";
import { useAuth } from "@/hooks/useAuth";

const FAQS = [
  {
    q: "Is this legal advice?",
    a: "No. The Registration Manager generates draft filings and checklists tailored to your inputs. You should always have qualified counsel review filings before submission, especially for high-risk processing or AI Act registrations.",
  },
  {
    q: "How current is your jurisdiction data?",
    a: "We monitor authority websites and official gazettes monthly (weekly for the EU AI Act). Each filing pack records the verification date for the data used.",
  },
  {
    q: "Do you submit filings to authorities for me?",
    a: "No. We do not submit filings on your behalf. We generate the documents, jurisdiction-specific checklists, and portal links; you (or your counsel) submit them. This keeps you in direct legal control of every filing and avoids any agency or attorney-client ambiguity.",
  },
  {
    q: "How does pricing work?",
    a: `Registration filings are ${PRICING.tools.registration.display} per filing, flat, regardless of jurisdiction. The free assessment scopes which jurisdictions you must file in; you then pay only for the filings you generate. Each filing includes the draft documents, the jurisdiction-specific filing checklist, and portal URLs. You (or your counsel) submit the filings.`,
  },
  {
    q: "Do you create EU AI Act registration documents?",
    a: `Yes. We generate draft AI System Registration filings for high-risk AI systems under the EU AI Act, priced at the same ${PRICING.tools.registration.display} per filing. You review with your counsel and you or they submit the filings — we do not file for you.`,
  },
  {
    q: "Can I get reminders before renewals are due?",
    a: "Yes. Renewal deadline tracking is included with any End User Privacy subscription. Subscribers get reminders at 90, 60, 30, and 7 days before each filing expires plus regenerated filing packs at no extra cost. Non-subscribers receive a single courtesy notice 60 days out.",
  },
];

export default function RegistrationLanding() {
  const fireConversion = useConversionEvent();
  const { user } = useAuth();
  const userType = user ? "authenticated" : "anonymous";
  // hasToolAccess no longer used here (registration is always per-filing).
  return (
    <>
      <Navbar />
      <DashboardSubnav />
      <Helmet>
        <title>Privacy Registration Manager | End User Privacy</title>
        <meta
          name="description"
          content="Generate DPO appointment letters, RoPA templates, EU AI Act registration drafts, and Article 27 representative letters — tailored to your jurisdictions. You file; we draft and track."
        />
        <link rel="canonical" href="https://enduserprivacy.com/registration-manager" />
      </Helmet>
      <main id="main-content" aria-label="Registration Manager"><div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <ToolTierNote />
      </div>

      <header className="bg-[#0d2a45] text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            📂 Registration Manager · {formatPrice("registration_standalone")} per filing
          </span>
          <h1 className="font-serif text-white mb-3">
            Privacy registration filings, drafted and tracked
          </h1>
          <RequirementBadge variant="hero" tier="required" text="Several jurisdictions require controllers to register with — or pay a data-protection fee to — their supervisory authority. In the UK, the ICO data-protection fee is a legal requirement for most organisations." className="mt-2 max-w-3xl" />
          <p className="text-slate-300 text-lg max-w-3xl">
            DPO appointments, RoPA templates, Article 27 representative letters, and EU AI Act
            registration drafts, generated in minutes, tailored to every jurisdiction you operate in,
            and renewed on schedule.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button size="lg" asChild className="bg-white text-slate-900 hover:bg-slate-100">
              <Link to="/registration-manager/start" onClick={() => fireConversion("tool_start_click", { tool_slug: "registration", page_path: "/registration-manager", user_type: userType })}>Start free assessment <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="bg-transparent border-slate-500 text-white hover:bg-slate-800 hover:text-white">
              <Link to="#how-it-works">How it works</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Free assessment · No card required · Pay only when you generate documents
          </p>
        </div>
      </header>
      <PageContainer>

        {/* 2. Problem */}
        <section className="py-10 border-t border-border/40">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: AlertTriangle, title: "Fragmented requirements", body: "DPO thresholds, RoPA formats, and AI Act duties differ across 30+ EU/EEA jurisdictions — and change every quarter." },
              { icon: Clock, title: "Renewal blindspots", body: "Most fines for registration failures stem from missed renewals, not first-time filings. Authorities don't remind you." },
              { icon: Globe2, title: "Article 27 ambiguity", body: "Non-EU controllers struggle to identify which jurisdictions actually require a representative — and which letter format each authority expects." },
            ].map((b, i) => (
              <div key={i} className="space-y-2">
                <b.icon className="w-6 h-6 text-amber-600" />
                <h3 className="text-brand-navy">{b.title}</h3>
                <p className="text-sm text-slate leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. How it works */}
        <section id="how-it-works" className="py-12 border-t border-border/40">
          <h2 className="font-display text-brand-navy text-center mb-8">How it works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              ["1", "Free assessment", "Answer ~12 questions about your organization and processing activities. No account required."],
              ["2", "Personalized scope", "We map your activities to every jurisdiction that applies, with confidence ratings."],
              ["3", "Generate documents", `Pay only when you generate documents: ${PRICING.tools.registration.display} per filing, flat. We draft every required filing in minutes.`],
              ["4", "You file & we track renewals", "You (or your counsel) submit the filings. Optional annual renewal monitoring keeps you ahead of expiry dates."],
            ].map(([n, t, b]) => (
              <Card key={n} className="border-border/60">
                <CardContent className="p-5">
                  <div className="text-3xl font-display font-bold text-accent mb-2">{n}</div>
                  <div className="font-semibold text-brand-navy mb-1">{t}</div>
                  <p className="text-xs text-slate leading-relaxed">{b}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 4. What you get */}
        <section className="py-12 border-t border-border/40">
          <h2 className="font-display text-brand-navy text-center mb-8">What you get</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { icon: ShieldCheck, t: "DPO Appointment Letter", b: "Authority-specific format with mandatory fields." },
              { icon: FileText, t: "Record of Processing Activities (RoPA)", b: "GDPR Art. 30-compliant template, pre-populated from your assessment." },
              { icon: Brain, t: "AI System Registration (EU AI Act)", b: "Draft for each high-risk AI system you operate." },
              { icon: Building2, t: "Article 27 Representative Letter", b: "For non-EU controllers — designation, scope, and contact details." },
              { icon: CheckCircle2, t: "Filing Checklist", b: "Step-by-step submission guide with portal URLs and fees." },
              { icon: Clock, t: "Renewal Schedule", b: "Tracked automatically with email reminders 60/30/7 days out." },
            ].map((b, i) => (
              <div key={i} className="flex gap-3">
                <b.icon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-brand-navy text-sm">{b.t}</div>
                  <p className="text-xs text-slate">{b.b}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Confidence model */}
        <section className="py-12 border-t border-border/40 bg-brand-cloud/40 rounded-xl">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="font-display text-brand-navy mb-4">Three-tier confidence rating</h2>
            <p className="text-slate text-sm mb-6">
              Every recommendation is rated based on how directly the law applies to your inputs.
            </p>
            <div className="space-y-3">
              <div className="bg-card border border-emerald-200 rounded-lg p-4">
                <span className="font-bold text-emerald-700">High</span>
                <span className="text-sm text-slate ml-2">— Threshold clearly met. Filing is mandatory based on stated facts.</span>
              </div>
              <div className="bg-card border border-amber-200 rounded-lg p-4">
                <span className="font-bold text-amber-700">Medium</span>
                <span className="text-sm text-slate ml-2">— Likely required but depends on how authority interprets your activities. Counsel review recommended.</span>
              </div>
              <div className="bg-card border border-slate/30 rounded-lg p-4">
                <span className="font-bold text-slate">Low</span>
                <span className="text-sm text-slate ml-2">— Possible exposure. Optional pre-filing or monitoring may be appropriate.</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Pricing */}
        <section className="py-12 border-t border-border/40">
          <h2 className="font-display text-brand-navy text-center mb-8">Pricing</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-brand-navy">Free scoping assessment</CardTitle>
                <div className="text-3xl font-bold text-brand-navy">$0</div>
                <p className="text-xs text-slate mt-1">Answer ~12 questions. We map your obligations across 30+ jurisdictions.</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate">
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" /> No account required</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" /> Confidence rating per jurisdiction</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" /> No charge unless you generate filings</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-2 border-brand-navy">
              <CardHeader>
                <Badge className="w-fit mb-2 bg-brand-navy text-white">PER FILING</Badge>
                <CardTitle className="text-brand-navy">Generate a filing</CardTitle>
                <div className="text-3xl font-bold text-brand-navy">{PRICING.tools.registration.display}<span className="text-sm font-normal text-slate"> per filing</span></div>
                <p className="text-xs text-slate">Flat rate. Same price for every jurisdiction.</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate">
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" /> Draft documents in the local language where required</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" /> Jurisdiction-specific filing checklist</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" /> Verified portal URLs and submission instructions</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" /> Renewal deadline tracking included with any subscription</li>
                </ul>
                <p className="text-meta text-brand-mist mt-3 italic">
                  You (or your counsel) submit all filings. We do not file on your behalf.
                </p>
              </CardContent>
            </Card>
          </div>
          <p className="text-center text-xs text-brand-mist mt-6">
            Annual subscribers: 1 free Smart Tool run/year on Intelligence annual, 3 on Professional annual, redeemable on Governance, LIA, or DPIA.
          </p>
        </section>


        {/* 7. Jurisdictions */}
        <section className="py-12 border-t border-border/40 text-center">
          <h2 className="font-display text-brand-navy mb-3">30+ jurisdictions covered</h2>
          <p className="text-slate text-sm max-w-2xl mx-auto">
            All 27 EU member states, EEA (Norway, Iceland, Liechtenstein), UK, Switzerland, with rolling
            additions for the U.S., LATAM, APAC, and Africa.
          </p>
        </section>

        {/* 8. Trust signals */}
        <section className="py-10 border-t border-border/40">
          <div className="grid md:grid-cols-3 gap-4 text-center max-w-4xl mx-auto">
            <div>
              <div className="text-2xl font-bold text-brand-navy">Monthly</div>
              <p className="text-xs text-slate">Authority website monitoring</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-navy">Weekly</div>
              <p className="text-xs text-slate">EU AI Act updates</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-navy">Audit trail</div>
              <p className="text-xs text-slate">Verification date on every filing</p>
            </div>
          </div>
        </section>

        {/* 9. FAQ */}
        <section className="py-12 border-t border-border/40 max-w-3xl mx-auto">
          <h2 className="font-display text-brand-navy mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((f, i) => (
              <div key={i} className="border-b border-border/40 pb-4">
                <div className="font-semibold text-brand-navy text-sm mb-1">{f.q}</div>
                <p className="text-sm text-slate leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 10. Final CTA + disclaimer */}
        <section className="py-12 text-center">
          <h2 className="font-display text-brand-navy mb-3">Ready to start?</h2>
          <p className="text-slate text-sm mb-6">The free assessment takes about 5 minutes.</p>
          <Button size="lg" asChild className="bg-brand-navy hover:bg-brand-navy/90 text-white">
            <Link to="/registration-manager/start" onClick={() => fireConversion("tool_start_click", { tool_slug: "registration", page_path: "/registration-manager", user_type: userType })}>Start free assessment <ArrowRight className="ml-2 w-4 h-4" /></Link>
          </Button>
          <div className="mt-10 max-w-3xl mx-auto">
            <RegistrationDisclaimer />
          </div>
        </section>
      </PageContainer>
      </main>
      <Footer />
    </>
  );
}
