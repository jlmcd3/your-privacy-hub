import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ToolType = "li" | "healthcheck" | "dpia";

interface Props {
  toolType: ToolType;
  toolName: string;
  /** Price the current viewer will pay (subscriber rate if applicable) */
  price: number;
  /** Standalone (non-subscriber) price — shown for comparison when viewer is a subscriber */
  standalonePrice?: number;
  /** Subscriber price — shown as a teaser to non-subscribers */
  subscriberPrice?: number;
  /** True when current viewer is a Premium subscriber */
  isSubscriber?: boolean;
  /** True when Stripe is wired up server-side. When false, the CTA shows a soft-disabled state. */
  stripeConfigured?: boolean;
  onPurchase: () => void;
  purchasing: boolean;
}

const SAMPLE_WATERMARK = (
  <div className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 z-10">
    Sample
  </div>
);

function LISample() {
  return (
    <div className="space-y-5">
      <section>
        <p className="text-[11px] font-bold uppercase tracking-wider text-steel mb-2">Processing Purpose</p>
        <p className="text-sm text-foreground leading-relaxed">
          The proposed processing — using browsing history and purchase data to deliver
          personalized product recommendations to existing customers — falls within the
          scope of activities regulators have repeatedly examined under Article 6(1)(f).
        </p>
      </section>
      <section>
        <p className="text-[11px] font-bold uppercase tracking-wider text-steel mb-2">Necessity Assessment</p>
        <p className="text-sm text-foreground leading-relaxed">
          The CNIL's 2024 guidance on recommendation systems establishes that
          personalization can satisfy the necessity test only where the controller
          can demonstrate that less intrusive alternatives were considered…
        </p>
        <div className="mt-2 space-y-2">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-11/12" />
          <div className="h-3 bg-muted rounded w-10/12" />
          <div className="h-3 bg-muted rounded w-9/12" />
        </div>
      </section>
      <section>
        <p className="text-[11px] font-bold uppercase tracking-wider text-steel mb-2">Balancing Test (excerpt)</p>
        <p className="text-sm text-foreground leading-relaxed">
          The balance tilts on three factors: the reasonable expectations of an existing
          customer, the granularity of profiling involved, and the availability of an
          effective opt-out…
        </p>
        <div className="mt-2 space-y-2">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-10/12" />
          <div className="h-3 bg-muted rounded w-11/12" />
          <div className="h-3 bg-muted rounded w-8/12" />
          <div className="h-3 bg-muted rounded w-9/12" />
        </div>
      </section>
      <section>
        <p className="text-[11px] font-bold uppercase tracking-wider text-steel mb-2">Precedent Landscape</p>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-10/12" />
          <div className="h-3 bg-muted rounded w-9/12" />
        </div>
      </section>
    </div>
  );
}

function HealthcheckSample() {
  const findings = [
    { sev: "High", title: "DPIA not conducted for AI-assisted processing", color: "bg-red-50 text-red-700 border-red-200" },
    { sev: "Medium", title: "Acceptable use policy lacks AI-specific provisions", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { sev: "Medium", title: "Cross-border transfer mechanism not documented", color: "bg-amber-50 text-amber-700 border-amber-200" },
  ];
  return (
    <div className="space-y-5">
      <section className="flex items-center gap-5">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="10"
              strokeDasharray={`${(72 / 100) * 264} 264`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="font-display text-2xl font-bold text-foreground leading-none">72</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">/ 100</div>
            </div>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-steel mb-1">Readiness Score</p>
          <p className="text-sm text-foreground leading-relaxed">
            Your organization scores <strong>72 / 100</strong> on the governance readiness index —
            above the median for similar organizations, with focused gaps in AI governance and
            cross-border transfer documentation.
          </p>
        </div>
      </section>
      <section>
        <p className="text-[11px] font-bold uppercase tracking-wider text-steel mb-3">Top Findings</p>
        <div className="space-y-2">
          {findings.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${f.color} flex-shrink-0 mt-0.5`}>
                {f.sev}
              </span>
              <p className="text-sm text-foreground">{f.title}</p>
            </div>
          ))}
          {[...Array(5)].map((_, i) => (
            <div key={`b-${i}`} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <div className="h-5 w-14 bg-muted rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-9/12" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DPIASample() {
  return (
    <div className="space-y-5">
      <section>
        <p className="text-[11px] font-bold uppercase tracking-wider text-steel mb-2">Section 1 — Processing Description</p>
        <p className="text-sm text-foreground leading-relaxed">
          The processing activity involves continuous location monitoring of approximately
          250 employees via a company-issued mobile application during working hours.
          Location data is collected at 5-minute intervals, stored on EU-based infrastructure,
          and retained for 90 days for operational and security purposes.
        </p>
        <div className="mt-2 space-y-2">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-10/12" />
        </div>
      </section>
      {[
        "Section 2 — Necessity & Proportionality",
        "Section 3 — Risks to Data Subjects",
        "Section 4 — Mitigating Measures",
        "Section 5 — Stakeholder Consultation",
        "Section 6 — DPO Sign-off & Residual Risk",
      ].map((title) => (
        <section key={title}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-steel mb-2">{title}</p>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-11/12" />
            <div className="h-3 bg-muted rounded w-10/12" />
            <div className="h-3 bg-muted rounded w-9/12" />
          </div>
        </section>
      ))}
    </div>
  );
}

export default function ToolSamplePreview({
  toolType,
  toolName,
  price,
  standalonePrice,
  subscriberPrice,
  isSubscriber = false,
  stripeConfigured = true,
  onPurchase,
  purchasing,
}: Props) {
  const Sample = toolType === "li" ? LISample : toolType === "healthcheck" ? HealthcheckSample : DPIASample;
  const showSubscriberTeaser = !isSubscriber && subscriberPrice && subscriberPrice < price;
  const showStandaloneCompare = isSubscriber && standalonePrice && standalonePrice > price;

  return (
    <section className="bg-card border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b bg-muted/30">
        <h2 className="text-lg font-semibold text-foreground">Sample Output Preview</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          A representative preview of what your full {toolName} report contains.
        </p>
      </div>

      {/* Locked sample area */}
      <div className="relative">
        <div className="relative px-6 py-6">
          {SAMPLE_WATERMARK}
          <Sample />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-card via-card/90 to-transparent pointer-events-none" />
        </div>

        {/* CTA panel */}
        <div className="px-6 pb-6 -mt-8 relative z-10">
          <div className="bg-gradient-to-br from-navy to-steel text-white rounded-xl p-6 shadow-lg text-center">
            <Lock className="w-6 h-6 mx-auto mb-3 text-amber-400" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400 mb-2">
              Purchase to unlock your full report
            </p>
            <h3 className="font-display text-xl md:text-2xl font-bold mb-1">{toolName}</h3>
            <p className="text-blue-200 text-sm mb-5">
              Complete the form above and purchase to generate your full analysis.
            </p>
            <Button
              size="lg"
              onClick={onPurchase}
              disabled={purchasing || !stripeConfigured}
              className="bg-white text-navy hover:bg-white/90 font-bold disabled:opacity-70"
            >
              {!stripeConfigured
                ? `Payments Coming Soon — $${price}`
                : purchasing
                  ? "Redirecting…"
                  : `Purchase Full Analysis — $${price}`}
            </Button>
            {showStandaloneCompare && (
              <p className="text-[11px] text-amber-300 mt-3">
                ⭐ Premium subscriber rate · Standalone price ${standalonePrice}
              </p>
            )}
            {showSubscriberTeaser && (
              <p className="text-[11px] text-amber-300 mt-3">
                Premium subscribers pay only ${subscriberPrice} —{" "}
                <a href="/subscribe" className="underline hover:text-amber-200">see plans</a>
              </p>
            )}
            <p className="text-[11px] text-blue-200/80 mt-4">
              This tool produces a compliance framework document, not legal advice.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
