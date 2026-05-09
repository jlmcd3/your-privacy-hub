import { Link } from "react-router-dom";
import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { INTELLIGENCE_PRICING } from "@/config/pricing";

/**
 * SampleBriefShowcase
 *
 * Reusable showcase of what a Monday Intelligence Brief looks like.
 *
 *   variant="condensed" — homepage placement: 2 cards, 2 takeaways each, no
 *                         urgency/legal weight/intelligence card.
 *   variant="full"      — /sample-brief placement: all cards, with access-tier
 *                         gating (anonymous → why_it_matters_short + register
 *                         gate after card 1; free → full why_it_matters + all
 *                         takeaways; pro → adds urgency/legal weight badges and
 *                         the expandable Intelligence Card).
 *
 * Story content is hardcoded sample data (no Supabase fetch) so this component
 * can be safely embedded on the homepage without DB dependencies.
 */

type SampleStory = {
  title: string;
  source_name: string;
  date: string; // human-formatted
  category: "Enforcement" | "EU & UK" | "U.S. Federal" | "U.S. States" | "Global";
  why_it_matters_short: string;
  why_it_matters: string;
  takeaways: string[];
  urgency: "Immediate" | "Near-term" | "Watching";
  legal_weight: "Binding Decision" | "Binding Guidance" | "Soft Guidance" | "Enforcement Signal";
  affected_jurisdictions: string[];
  intelligence: {
    connectTheDots: string[];
    regulatoryTheory: string;
  };
};

const SAMPLE_STORIES: SampleStory[] = [
  {
    title: "Dutch DPA fines Yango €100M for unlawful data transfers to Russia",
    source_name: "Autoriteit Persoonsgegevens (AP)",
    date: "May 5, 2026",
    category: "Enforcement",
    why_it_matters_short:
      "Largest Chapter V fine to date — TIAs to surveillance jurisdictions are now top-tier financial risk.",
    why_it_matters:
      "This is the largest fine ever imposed for a Chapter V violation and signals that regulators will treat transfers to surveillance-heavy jurisdictions as a top-tier compliance risk, not a paperwork exercise. Any organization relying on SCCs without a substantive Transfer Impact Assessment — particularly for transfers touching Russia, China, or other jurisdictions with broad government access powers — should expect heightened scrutiny and proportionate fines.",
    takeaways: [
      "Re-validate every Transfer Impact Assessment for flows touching high-risk jurisdictions.",
      "Document the specific surveillance laws assessed and the supplementary measures applied.",
      "Expect other EU DPAs to cite this decision as precedent within the next 6–12 months.",
    ],
    urgency: "Immediate",
    legal_weight: "Binding Decision",
    affected_jurisdictions: ["EU", "Netherlands", "Russia"],
    intelligence: {
      connectTheDots: [
        "Builds on CJEU Schrems II reasoning on government access.",
        "Aligns with EDPB Recommendations 01/2020 on supplementary measures.",
        "Mirrors recent CNIL and Garante warnings on third-country transfers.",
      ],
      regulatoryTheory:
        "Chapter V transfers require an effectively equivalent level of protection, not merely contractual assurances.",
    },
  },
  {
    title: "ICO publishes draft statutory guidance on automated decision-making",
    source_name: "UK Information Commissioner's Office",
    date: "May 2, 2026",
    category: "EU & UK",
    why_it_matters_short:
      "First UK statutory ADM guidance — sets enforcement floor for hiring, scoring, and benefits algorithms.",
    why_it_matters:
      "This is the ICO's first statutory ADM guidance and establishes the enforcement baseline for algorithmic decisioning under UK GDPR Article 22. Recruitment, credit, insurance, and benefits use cases get the most attention. Once finalized, organizations will need documented human-review pathways, fairness testing, and transparency disclosures — and the absence of those controls becomes directly cite-able in enforcement.",
    takeaways: [
      "Inventory every system that materially affects individuals without human input.",
      "Build human-review pathways with documented training and override authority.",
      "Prepare plain-language ADM disclosures for affected data subjects before Q4.",
    ],
    urgency: "Near-term",
    legal_weight: "Binding Guidance",
    affected_jurisdictions: ["United Kingdom"],
    intelligence: {
      connectTheDots: [
        "Parallel to CNIL's binding recommendation on creditworthiness scoring.",
        "Anticipates EU AI Act high-risk system obligations.",
        "Aligns with EEOC enforcement priorities on algorithmic hiring in the U.S.",
      ],
      regulatoryTheory:
        "Article 22 protections require demonstrable human agency, not procedural box-ticking.",
    },
  },
  {
    title: "CNIL issues binding recommendation on creditworthiness scoring",
    source_name: "Commission Nationale de l'Informatique et des Libertés",
    date: "Apr 28, 2026",
    category: "EU & UK",
    why_it_matters_short:
      "Credit scoring providers in France gain new transparency and contestability obligations effective immediately.",
    why_it_matters:
      "CNIL's recommendation introduces concrete obligations for credit-scoring providers operating in France: model documentation must be available to data subjects on request, decisions must be contestable through a defined process, and material model changes trigger re-disclosure. The binding nature means non-compliance is directly enforceable without further notice — credit, BNPL, and insurance providers should treat this as immediately actionable.",
    takeaways: [
      "Publish a model card describing inputs, outputs, and known limitations.",
      "Implement a documented contest procedure with response SLAs.",
      "Track material model changes and re-disclose to affected populations.",
    ],
    urgency: "Near-term",
    legal_weight: "Binding Guidance",
    affected_jurisdictions: ["France", "EU"],
    intelligence: {
      connectTheDots: [
        "Reinforces ICO's parallel ADM guidance direction.",
        "Foreshadows EU AI Act high-risk system documentation duties.",
        "Echoes CFPB scrutiny of credit decisioning models in the U.S.",
      ],
      regulatoryTheory:
        "Algorithmic decisions require contestability, not just notice.",
    },
  },
];

const CATEGORY_CLASSES: Record<SampleStory["category"], string> = {
  Enforcement: "bg-red-50 text-red-700 border border-red-200",
  "EU & UK": "bg-blue-50 text-blue-700 border border-blue-200",
  "U.S. Federal": "bg-indigo-50 text-indigo-700 border border-indigo-200",
  "U.S. States": "bg-violet-50 text-violet-700 border border-violet-200",
  Global: "bg-teal-50 text-teal-700 border border-teal-200",
};

const WEIGHT_CLASSES: Record<SampleStory["legal_weight"], string> = {
  "Binding Decision": "bg-navy text-white",
  "Binding Guidance": "bg-blue-700 text-white",
  "Soft Guidance": "bg-blue-200 text-blue-800",
  "Enforcement Signal": "bg-amber-100 text-amber-800",
};

// — Expandable Intelligence Card (Pro only, full variant) —
function IntelligenceCard({ story }: { story: SampleStory }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 rounded-lg border" style={{ borderColor: "#C8D5F0", background: "#F7F9FF" }}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/60 rounded-t-lg transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" style={{ color: "#4A6FA5" }} />
          <span className="text-[12px] font-bold" style={{ color: "#4A6FA5" }}>Intelligence Card</span>
          <span className="text-[11px] text-slate">— connect the dots, regulatory theory</span>
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "#4A6FA5" }} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t" style={{ borderColor: "#E0E8F5" }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#4A6FA5" }}>
              Connect the dots
            </p>
            <ul className="space-y-1">
              {story.intelligence.connectTheDots.map((d, i) => (
                <li key={i} className="text-[12px] text-navy flex gap-1.5">
                  <span className="text-slate-400 flex-shrink-0">•</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-1 border-t text-[11px]" style={{ borderColor: "#E0E8F5" }}>
            <span className="font-bold text-navy">Regulatory theory: </span>
            <span className="text-slate">{story.intelligence.regulatoryTheory}</span>
          </div>
        </div>
      )}
    </div>
  );
}

type Tier = "anonymous" | "free" | "pro";

function StoryCard({
  story,
  tier,
  takeawaysLimit,
}: {
  story: SampleStory;
  tier: Tier;
  takeawaysLimit?: number;
}) {
  const showFullWhy = tier === "free" || tier === "pro";
  const showTakeaways = tier === "free" || tier === "pro";
  const showProExtras = tier === "pro";
  const takeawaysToShow = takeawaysLimit
    ? story.takeaways.slice(0, takeawaysLimit)
    : story.takeaways;

  return (
    <div className="border border-fog rounded-xl p-5 mb-4 bg-white">
      <div className="flex items-center gap-2 text-[11px] text-slate mb-2 flex-wrap">
        <span className="font-semibold">{story.source_name}</span>
        <span>·</span>
        <span>{story.date}</span>
        <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${CATEGORY_CLASSES[story.category]}`}>
          {story.category}
        </span>
        {showProExtras && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${WEIGHT_CLASSES[story.legal_weight]}`}>
            {story.legal_weight}
          </span>
        )}
      </div>
      <p className="font-display text-[17px] font-bold text-navy leading-snug mb-3">
        {story.title}
      </p>

      <div className="border-l-4 px-3 py-2 rounded-r-lg mb-3"
           style={{ borderColor: "#4A6FA5", background: "#E8EEFF" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#4A6FA5" }}>
          Why it matters
        </p>
        <p className="text-[13px] text-navy leading-relaxed">
          {showFullWhy ? story.why_it_matters : story.why_it_matters_short}
        </p>
      </div>

      {showTakeaways && takeawaysToShow.length > 0 && (
        <ul className="list-disc pl-5 space-y-1">
          {takeawaysToShow.map((t, i) => (
            <li key={i} className="text-[13px] text-slate leading-relaxed">{t}</li>
          ))}
        </ul>
      )}

      {showProExtras && (
        <>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-[10px] text-slate">
              Urgency: <span className="font-semibold text-navy">{story.urgency}</span>
            </span>
            {story.affected_jurisdictions.map((j) => (
              <span key={j} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky/10 text-navy border border-sky/20">
                {j}
              </span>
            ))}
          </div>
          <IntelligenceCard story={story} />
        </>
      )}
    </div>
  );
}

function RegistrationGate() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center my-4">
      <p className="text-[15px] font-semibold text-foreground mb-1">
        Create a free account to read the full analysis
      </p>
      <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">
        Key takeaways, compliance impact, and action intelligence on every update.
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <Link to="/signup"
          className="text-[13px] font-semibold bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-500 transition-colors no-underline">
          Register free →
        </Link>
        <Link to="/subscribe"
          className="text-[13px] font-semibold border border-border text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-colors no-underline">
          See Pro plan →
        </Link>
      </div>
    </div>
  );
}

function BriefHeader() {
  return (
    <div className="mb-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Sample Intelligence Brief
      </p>
      <p className="text-[14px] text-slate leading-relaxed mb-3">
        Here is what lands in your inbox every Monday — customized and analyzed
        for your priorities and responsibilities.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {["California", "EU / GDPR", "United Kingdom"].map((j) => (
          <span key={j}
            className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-sky/10 text-navy border border-sky/20">
            {j}
          </span>
        ))}
        <span className="text-[11px] text-slate ml-1">· Privacy Counsel</span>
      </div>
    </div>
  );
}

export default function SampleBriefShowcase({ variant }: { variant: "condensed" | "full" }) {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();

  if (variant === "condensed") {
    const stories = SAMPLE_STORIES.slice(0, 2);
    return (
      <section className="bg-white py-12 px-4">
        <div className="max-w-[800px] mx-auto">
          <BriefHeader />
          {stories.map((s, i) => (
            <StoryCard key={i} story={s} tier="free" takeawaysLimit={2} />
          ))}
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Link
              to="/sample-brief"
              className="flex-1 text-center text-[13px] font-semibold border border-border text-foreground px-4 py-2.5 rounded-xl hover:bg-muted transition-colors no-underline"
            >
              See the full sample brief →
            </Link>
            <Link
              to="/subscribe"
              className="flex-1 text-center text-[13px] font-semibold bg-teal-600 text-white px-4 py-2.5 rounded-xl hover:bg-teal-500 transition-colors no-underline"
            >
              Start for {INTELLIGENCE_PRICING.monthly()} →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // variant === "full"
  const tier: Tier = !user ? "anonymous" : isPremium ? "pro" : "free";

  return (
    <section className="bg-white py-12 px-4">
      <div className="max-w-[800px] mx-auto">
        <BriefHeader />
        {SAMPLE_STORIES.map((story, i) => (
          <div key={i}>
            <StoryCard story={story} tier={tier} />
            {tier === "anonymous" && i === 0 && <RegistrationGate />}
          </div>
        ))}
      </div>
    </section>
  );
}
