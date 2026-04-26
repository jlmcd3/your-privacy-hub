// Registration Manager — public landing page.
// Implements the 10-section spec: hero, problem, how-it-works, what-you-get,
// confidence model, pricing, jurisdictions, trust signals, FAQ, final CTA.

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RegistrationDisclaimer from "@/components/RegistrationDisclaimer";
import {
  CheckCircle2, Clock, Globe2, ShieldCheck, FileText, AlertTriangle,
  Brain, Building2, ArrowRight,
} from "lucide-react";

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
    a: "No. We do not submit filings on your behalf. We generate the documents, jurisdiction-specific checklists, and portal links — you (or your counsel) submit them. This keeps you in direct legal control of every filing and avoids any agency or attorney-client ambiguity.",
  },
  {
    q: "What's the difference between DIY and the Counsel-Ready Pack?",
    a: "DIY tiers ($59 for 1 jurisdiction, $149 for up to 3, $275 for up to 7, $499 for unlimited) generate the documents and a filing checklist. The Counsel-Ready Pack ($399 flat) adds enhanced jurisdiction notes, a pre-filing walkthrough, and a structured handoff document so your privacy counsel can review and submit faster. You still file the documents yourself.",
  },
  {
    q: "Do you handle EU AI Act registrations?",
    a: "Yes. We generate draft AI System Registration filings for high-risk AI systems under the EU AI Act, and we offer a discounted bundle ($599) when you prepare 3+ systems together. You submit the filings.",
  },
  {
    q: "Can I get reminders before renewals are due?",
    a: "Yes. Annual renewal monitoring is available at $79 per jurisdiction per year — reminders 60/30/7 days before expiry, plus a regenerated filing pack. You can opt in or out at any time from your filing dashboard.",
  },
];

export default function RegistrationLanding() {
  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Privacy Registration Manager — DPO, RoPA, AI Act Filings | Your Privacy Hub</title>
        <meta
          name="description"
          content="Generate DPO appointment letters, RoPA templates, EU AI Act registration drafts, and Article 27 representative letters — tailored to your jurisdictions. You file; we draft and track."
        />
        <link rel="canonical" href="https://yourprivacyhub.com/registration-manager" />
      </Helmet>

      <Navbar />

      <PageContainer>
        {/* 1. Hero */}
        <section className="py-12 md:py-16 text-center max-w-3xl mx-auto">
          <Badge variant="outline" className="mb-4 border-accent/40 text-accent">Registration Manager</Badge>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-navy leading-tight">
            Privacy registration filings, drafted and tracked
          </h1>
          <p className="mt-4 text-lg text-slate leading-relaxed">
            DPO appointments, RoPA templates, Article 27 representative letters, and EU AI Act
            registration drafts — generated in minutes, tailored to every jurisdiction you operate in,
            and renewed on schedule.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="bg-navy hover:bg-navy/90 text-white">
              <Link to="/registration-manager/start">Start free assessment <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="#how-it-works">How it works</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-light">
            Free assessment · No card required · Pay only when you generate documents
          </p>
        </section>

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
                <h3 className="font-display font-semibold text-navy">{b.title}</h3>
                <p className="text-sm text-slate leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. How it works */}
        <section id="how-it-works" className="py-12 border-t border-border/40">
          <h2 className="font-display text-3xl font-bold text-navy text-center mb-8">How it works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              ["1", "Free assessment", "Answer ~12 questions about your organization and processing activities. No account required."],
              ["2", "Personalized scope", "We map your activities to every jurisdiction that applies — with confidence ratings."],
              ["3", "Generate documents", "Pay only when you generate documents — DIY from $59, Counsel-Ready Pack $399 flat. We draft every required filing in minutes."],
              ["4", "You file & we track renewals", "You (or your counsel) submit the filings. Optional annual renewal monitoring keeps you ahead of expiry dates."],
            ].map(([n, t, b]) => (
              <Card key={n} className="border-border/60">
                <CardContent className="p-5">
                  <div className="text-3xl font-display font-bold text-accent mb-2">{n}</div>
                  <div className="font-semibold text-navy mb-1">{t}</div>
                  <p className="text-xs text-slate leading-relaxed">{b}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 4. What you get */}
        <section className="py-12 border-t border-border/40">
          <h2 className="font-display text-3xl font-bold text-navy text-center mb-8">What you get</h2>
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
                  <div className="font-semibold text-navy text-sm">{b.t}</div>
                  <p className="text-xs text-slate">{b.b}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Confidence model */}
        <section className="py-12 border-t border-border/40 bg-fog/40 rounded-xl">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="font-display text-2xl font-bold text-navy mb-4">Three-tier confidence rating</h2>
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
          <h2 className="font-display text-3xl font-bold text-navy text-center mb-8">Pricing</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-navy">DIY Packages</CardTitle>
                <p className="text-xs text-slate mt-1">Pick the package that matches your jurisdictional footprint.</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate">
                  <li className="flex justify-between gap-2"><span>1 jurisdiction</span><span className="font-semibold text-navy">$59</span></li>
                  <li className="flex justify-between gap-2"><span>Up to 3 jurisdictions</span><span className="font-semibold text-navy">$149</span></li>
                  <li className="flex justify-between gap-2"><span>Up to 7 jurisdictions</span><span className="font-semibold text-navy">$275</span></li>
                  <li className="flex justify-between gap-2"><span>Portfolio (unlimited)</span><span className="font-semibold text-navy">$499</span></li>
                </ul>
                <p className="text-[11px] text-slate-light mt-3">Includes all required draft documents, filing checklist, and portal URLs.</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-navy">
              <CardHeader>
                <Badge className="w-fit mb-2 bg-navy text-white">RECOMMENDED</Badge>
                <CardTitle className="text-navy">Counsel-Ready Pack</CardTitle>
                <div className="text-3xl font-bold text-navy">$399<span className="text-sm font-normal text-slate"> flat</span></div>
                <p className="text-xs text-slate">Enhanced documents + counsel handoff</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate">
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" /> Everything in DIY</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" /> Enhanced jurisdiction notes &amp; rationale</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" /> Pre-filing walkthrough video</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" /> Structured handoff doc for your counsel</li>
                </ul>
                <p className="text-[11px] text-slate-light mt-3 italic">
                  You (or your counsel) submit all filings. We do not file on your behalf.
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="font-semibold text-emerald-900 text-sm">EU/EEA DPO Bundle — $499</div>
              <p className="text-xs text-emerald-800 mt-1">When 5+ EU/EEA jurisdictions need DPO appointment.</p>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
              <div className="font-semibold text-violet-900 text-sm">AI Act Bundle — $599</div>
              <p className="text-xs text-violet-800 mt-1">When preparing 3+ high-risk AI system registrations.</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="font-semibold text-blue-900 text-sm">Annual Renewal Monitoring — $79</div>
              <p className="text-xs text-blue-800 mt-1">Per jurisdiction per year. Reminders + regenerated docs.</p>
            </div>
          </div>
          <p className="text-center text-xs text-slate-light mt-4">
            Intelligence subscribers get 20% off all DIY packages and $75 off the Counsel-Ready Pack. You always submit your own filings.
          </p>
        </section>

        {/* 7. Jurisdictions */}
        <section className="py-12 border-t border-border/40 text-center">
          <h2 className="font-display text-2xl font-bold text-navy mb-3">30+ jurisdictions covered</h2>
          <p className="text-slate text-sm max-w-2xl mx-auto">
            All 27 EU member states, EEA (Norway, Iceland, Liechtenstein), UK, Switzerland — with rolling
            additions for the U.S., LATAM, APAC, and Africa.
          </p>
        </section>

        {/* 8. Trust signals */}
        <section className="py-10 border-t border-border/40">
          <div className="grid md:grid-cols-3 gap-4 text-center max-w-4xl mx-auto">
            <div>
              <div className="text-2xl font-bold text-navy">Monthly</div>
              <p className="text-xs text-slate">Authority website monitoring</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-navy">Weekly</div>
              <p className="text-xs text-slate">EU AI Act updates</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-navy">Audit trail</div>
              <p className="text-xs text-slate">Verification date on every filing</p>
            </div>
          </div>
        </section>

        {/* 9. FAQ */}
        <section className="py-12 border-t border-border/40 max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-navy mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((f, i) => (
              <div key={i} className="border-b border-border/40 pb-4">
                <div className="font-semibold text-navy text-sm mb-1">{f.q}</div>
                <p className="text-sm text-slate leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 10. Final CTA + disclaimer */}
        <section className="py-12 text-center">
          <h2 className="font-display text-2xl font-bold text-navy mb-3">Ready to start?</h2>
          <p className="text-slate text-sm mb-6">The free assessment takes about 5 minutes.</p>
          <Button size="lg" asChild className="bg-navy hover:bg-navy/90 text-white">
            <Link to="/registration-manager/start">Start free assessment <ArrowRight className="ml-2 w-4 h-4" /></Link>
          </Button>
          <div className="mt-10 max-w-3xl mx-auto">
            <RegistrationDisclaimer />
          </div>
        </section>
      </PageContainer>

      <Footer />
    </div>
  );
}
