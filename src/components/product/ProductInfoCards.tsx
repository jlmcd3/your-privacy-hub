// PRE-INTAKE REDESIGN (2026-08-26) — the card band immediately below the
// hero. Replaces the loose paragraphs / requirement pill / methodology box
// stack with a fixed set of sales-proof cards: applicability (amber — amber
// is reserved for legal/deadline content), deliverables, product-specific
// proof, and provenance/trust.
import type { ReactNode } from "react";

export interface InfoCard {
  title: string;
  body: ReactNode;
  /** "amber" = legal/deadline card treatment; default = neutral card. */
  tone?: "amber" | "default";
}

export default function ProductInfoCards({
  cards,
  className = "",
}: {
  cards: InfoCard[];
  className?: string;
}) {
  const wideCols =
    cards.length >= 4 ? "xl:grid-cols-4" : cards.length === 3 ? "lg:grid-cols-3" : "";
  return (
    <div
      className={`max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 grid gap-4 sm:grid-cols-2 ${wideCols} ${className}`}
    >
      {cards.map((card) => (
        <section
          key={card.title}
          className={
            card.tone === "amber"
              ? "rounded-xl border border-amber-300 bg-amber-50 px-5 py-4"
              : "rounded-xl border border-brand-cloud bg-card px-5 py-4"
          }
        >
          <h2
            className={`text-base font-semibold leading-tight mb-2 ${
              card.tone === "amber" ? "text-amber-900" : "text-brand-navy"
            }`}
          >
            {card.title}
          </h2>
          <div
            className={`text-sm leading-relaxed ${
              card.tone === "amber" ? "text-amber-900/90" : "text-slate-600"
            }`}
          >
            {card.body}
          </div>
        </section>
      ))}
    </div>
  );
}
