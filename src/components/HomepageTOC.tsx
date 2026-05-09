/**
 * HomepageTOC — three-card wayfinding strip rendered immediately below the hero.
 * Acts as a table-of-contents + micro-CTAs for proof, live updates, and pricing.
 */
const CARDS = [
  {
    eyebrow: "PROOF",
    headline: "See a sample brief ↓",
    description: "Read exactly what lands in your inbox every Monday.",
    href: "#sample",
  },
  {
    eyebrow: "LIVE",
    headline: "Browse today's updates ↓",
    description:
      "Regulatory developments from 119 monitored sources, updated daily.",
    href: "#updates",
  },
  {
    eyebrow: "PRICING",
    headline: "Compare plans ↓",
    description: "Monthly intelligence or the full compliance platform.",
    href: "#pricing",
  },
];

export default function HomepageTOC() {
  return (
    <div className="bg-sky/5 border-b border-fog">
      <div className="max-w-[1280px] mx-auto py-4 px-4 md:px-8">
        {/* Desktop: full cards */}
        <div className="hidden md:flex gap-3">
          {CARDS.map((c) => (
            <a
              key={c.href}
              href={c.href}
              className="flex-1 rounded-xl border border-fog bg-white hover:bg-sky/5 hover:border-sky/40 transition-colors px-4 py-3 no-underline block"
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                {c.eyebrow}
              </p>
              <p className="text-[14px] font-bold text-navy font-display">
                {c.headline}
              </p>
              <p className="text-[12px] text-slate leading-snug mt-1">
                {c.description}
              </p>
            </a>
          ))}
        </div>

        {/* Mobile: horizontal scrolling chip row */}
        <div className="flex md:hidden overflow-x-auto gap-2 pb-1">
          {CARDS.map((c) => (
            <a
              key={c.href}
              href={c.href}
              className="whitespace-nowrap px-3 py-2 rounded-full border border-fog bg-white text-[12px] font-semibold text-navy hover:bg-sky/5 transition-colors no-underline flex-shrink-0"
            >
              {c.headline}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
