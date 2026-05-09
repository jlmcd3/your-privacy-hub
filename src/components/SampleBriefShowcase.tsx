import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { INTELLIGENCE_PRICING } from "@/config/pricing";

/**
 * SampleBriefShowcase — reusable proof asset rendering illustrative
 * Intelligence Brief story cards. Used on the homepage (condensed)
 * and on /sample-brief (full).
 *
 * Cards are static, illustrative content — not fetched from the DB —
 * so the proof renders identically for every visitor.
 */

type Story = {
  source: string;
  date: string;
  category: string;
  title: string;
  whyItMattersShort: string;
  whyItMatters: string;
  takeaways: string[];
  urgency?: string;
  legalWeight?: string;
  affectedJurisdictions?: string[];
};

const STORIES: Story[] = [
  {
    source: "California Privacy Protection Agency",
    date: "Mon · May 5, 2026",
    category: "U.S. STATES",
    title:
      "CPPA finalizes ADMT, risk-assessment, and cybersecurity-audit regulations",
    whyItMattersShort:
      "California's automated decision-making rules now have a fixed compliance clock — and they reach further than most teams expect.",
    whyItMatters:
      "California's automated decision-making, risk-assessment, and cybersecurity-audit regulations now have a fixed compliance clock — and they reach further than most teams expect. If you use AI or automated systems to make significant decisions about Californians (hiring, housing, credit, pricing, content moderation), you have a defined timeline to inventory those systems, run risk assessments, and stand up the cybersecurity audit programme. Counsel should expect questions from the board within the quarter.",
    takeaways: [
      "ADMT pre-use notice and opt-out rights apply to a broader set of business practices than the original draft suggested.",
      "Risk assessments must be retained and produced to the Agency on request — not filed proactively, but functionally discoverable.",
      "Cybersecurity audits must be performed by a qualified, independent professional and signed at the executive level.",
      "Phased compliance dates run through 2027; the earliest obligations bite in Q4 2026.",
    ],
    urgency: "High — board-level briefing recommended this quarter",
    legalWeight: "Final regulation, enforceable",
    affectedJurisdictions: ["California", "Multi-state operators"],
  },
  {
    source: "European Data Protection Board",
    date: "Tue · May 6, 2026",
    category: "EU & UK",
    title:
      "EDPB issues guidelines on legitimate interest for AI model training",
    whyItMattersShort:
      "The EDPB just narrowed the conditions under which legitimate interest can support AI training on personal data.",
    whyItMatters:
      "The EDPB has narrowed the conditions under which legitimate interest can lawfully support training AI models on personal data. The guidance pushes controllers toward a structured three-part test, requires meaningful transparency about scraping and reuse, and signals that DPAs will look closely at whether opt-out mechanisms are real and effective. Teams relying on Article 6(1)(f) for model training should plan to rerun their balancing tests against the new framing before any next-version model release.",
    takeaways: [
      "Three-part LI test is now codified for AI training contexts: purpose, necessity, balancing.",
      "Transparency obligations attach earlier in the pipeline — at scraping or acquisition, not only at deployment.",
      "Opt-out mechanisms must be technically effective, not merely offered, to weigh in the controller's favour.",
      "Existing LIAs covering model training should be refreshed and re-signed.",
    ],
    urgency: "Medium — refresh LIAs before next model release",
    legalWeight: "EDPB guideline (binding interpretive weight)",
    affectedJurisdictions: ["EU", "UK (via ICO alignment)"],
  },
  {
    source: "Federal Trade Commission",
    date: "Wed · May 7, 2026",
    category: "U.S. FEDERAL",
    title:
      "FTC settles with data broker over geolocation sales tied to sensitive locations",
    whyItMatters:
      "The FTC's settlement signals that selling precise geolocation data linked to sensitive locations — clinics, places of worship, shelters — will be treated as an unfair practice regardless of whether the data is technically de-identified. The order extends to upstream collection partners, which means SDK vendors and ad-tech intermediaries inherit obligations even where they did not directly sell the data.",
    whyItMattersShort:
      "Selling precise geolocation tied to sensitive locations is now an unfair practice — and obligations flow upstream to SDK vendors.",
    takeaways: [
      "Sensitive-location geolocation is treated as inherently sensitive, regardless of de-identification claims.",
      "Order obligations extend upstream to SDK vendors and ad-tech intermediaries.",
      "Affirmative express consent is required, not buried in a privacy policy.",
    ],
    urgency: "Medium — review ad-tech and SDK vendor contracts",
    legalWeight: "FTC consent order (precedential)",
    affectedJurisdictions: ["U.S. Federal"],
  },
  {
    source: "Information Commissioner's Office",
    date: "Thu · May 8, 2026",
    category: "EU & UK",
    title:
      "ICO publishes enforcement priorities for 2026 — children's data and AI top the list",
    whyItMatters:
      "The ICO has named children's data, AI fairness, and adtech as its three enforcement priorities for 2026. For organisations operating in the UK, this is a clear signal: any service that touches under-18 users, any AI system making consequential decisions, and any adtech integration should be reviewed against the ICO's published expectations before the priority enforcement window opens.",
    whyItMattersShort:
      "The ICO has named children's data, AI, and adtech as its three enforcement priorities for 2026.",
    takeaways: [
      "Children's-data services should re-confirm Age-Appropriate Design Code conformance.",
      "AI fairness reviews should be documented and retained.",
      "Adtech integrations remain under active scrutiny — expect targeted audits.",
    ],
    urgency: "Medium",
    legalWeight: "Regulatory priority statement",
    affectedJurisdictions: ["UK"],
  },
];

function StoryCard({
  story,
  showFullWhy,
  showExtras,
  takeawayLimit,
}: {
  story: Story;
  showFullWhy: boolean;
  showExtras: boolean;
  takeawayLimit?: number;
}) {
  const takeaways = takeawayLimit
    ? story.takeaways.slice(0, takeawayLimit)
    : story.takeaways;

  return (
    <article className="border border-fog rounded-xl p-5 mb-4 bg-white">
      <div className="text-[11px] text-slate flex items-center gap-2 mb-2 justify-between">
        <span>
          {story.source} · {story.date}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-sky/10 text-navy px-2 py-0.5 rounded">
          {story.category}
        </span>
      </div>
      <h3 className="font-display text-[17px] font-bold text-navy leading-snug mb-3">
        {story.title}
      </h3>

      <div
        className="border-l-4 px-3 py-2 rounded-r-lg mb-3"
        style={{ borderColor: "#4A6FA5", background: "#E8EEFF" }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-wider mb-1"
          style={{ color: "#4A6FA5" }}
        >
          Why it matters
        </p>
        <p className="text-[13px] text-navy leading-relaxed">
          {showFullWhy ? story.whyItMatters : story.whyItMattersShort}
        </p>
      </div>

      {showFullWhy && takeaways.length > 0 && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-1">
            Key takeaways
          </p>
          <ul className="list-disc pl-5 space-y-1 mb-1">
            {takeaways.map((t, i) => (
              <li key={i} className="text-[13px] text-slate leading-relaxed">
                {t}
              </li>
            ))}
          </ul>
        </>
      )}

      {showExtras && (
        <div className="mt-4 pt-3 border-t border-fog grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
          {story.urgency && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-0.5">
                Urgency
              </p>
              <p className="text-navy">{story.urgency}</p>
            </div>
          )}
          {story.legalWeight && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-0.5">
                Legal weight
              </p>
              <p className="text-navy">{story.legalWeight}</p>
            </div>
          )}
          {story.affectedJurisdictions && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate mb-0.5">
                Affected jurisdictions
              </p>
              <p className="text-navy">
                {story.affectedJurisdictions.join(", ")}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function ShowcaseHeader() {
  return (
    <div className="mb-6">
      <h2 className="font-display text-[24px] md:text-[28px] font-bold text-navy mb-2">
        Sample Intelligence Brief
      </h2>
      <p className="text-[14px] text-slate mb-3 max-w-[680px]">
        Here is what lands in your inbox every Monday — personalized to your
        jurisdiction, role, and tracked topics.
      </p>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {["California", "EU/GDPR", "UK"].map((j) => (
          <span
            key={j}
            className="px-2 py-0.5 rounded-full border border-fog bg-sky/5 text-navy font-semibold"
          >
            {j}
          </span>
        ))}
        <span className="px-2 py-0.5 rounded-full border border-fog bg-white text-slate font-mono">
          Role · Privacy Counsel
        </span>
      </div>
    </div>
  );
}

export default function SampleBriefShowcase({
  variant,
}: {
  variant: "condensed" | "full";
}) {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const isAnonymous = !user;
  const isFreeRegistered = !!user && !isPremium;

  if (variant === "condensed") {
    const stories = STORIES.slice(0, 2);
    return (
      <section className="bg-paper py-10 px-4">
        <div className="max-w-[820px] mx-auto">
          <ShowcaseHeader />
          {stories.map((s, i) => (
            <StoryCard
              key={i}
              story={s}
              showFullWhy
              showExtras={false}
              takeawayLimit={2}
            />
          ))}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              to="/sample-brief"
              className="flex-1 text-center px-5 py-3 rounded-lg border border-navy text-navy font-semibold text-[14px] bg-white hover:bg-sky/5 no-underline"
            >
              See the full sample brief →
            </Link>
            <Link
              to="/subscribe"
              className="flex-1 text-center px-5 py-3 rounded-lg bg-teal-600 text-white font-bold text-[14px] hover:bg-teal-700 no-underline"
            >
              {`Start for ${INTELLIGENCE_PRICING.monthly()} →`}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Full variant
  return (
    <section className="bg-white py-10 px-4">
      <div className="max-w-[820px] mx-auto">
        <ShowcaseHeader />
        {STORIES.map((s, i) => (
          <div key={i}>
            <StoryCard
              story={s}
              showFullWhy={!isAnonymous}
              showExtras={isPremium}
            />
            {isAnonymous && i === 0 && (
              <div className="border border-fog bg-sky/5 rounded-xl p-5 mb-4 text-center">
                <p className="text-[13px] text-navy mb-3">
                  Create a free account to read the full <em>Why it matters</em>{" "}
                  analysis and key takeaways on every story.
                </p>
                <Link
                  to="/signup"
                  className="inline-block px-5 py-2.5 rounded-lg bg-navy text-white font-semibold text-[13px] no-underline hover:opacity-90"
                >
                  Create a free account →
                </Link>
              </div>
            )}
            {isFreeRegistered && i === 0 && (
              <div className="border border-fog bg-amber-50 rounded-xl p-5 mb-4 text-center">
                <p className="text-[13px] text-navy mb-3">
                  Subscribers also see urgency, legal weight, and affected
                  jurisdictions on every story — customized and analyzed for
                  your priorities and responsibilities.
                </p>
                <Link
                  to="/subscribe"
                  className="inline-block px-5 py-2.5 rounded-lg bg-teal-600 text-white font-bold text-[13px] no-underline hover:bg-teal-700"
                >
                  {`Start for ${INTELLIGENCE_PRICING.monthly()} →`}
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
