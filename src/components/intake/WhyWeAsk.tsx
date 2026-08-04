// src/components/intake/WhyWeAsk.tsx
// DISPATCH 7 — the RoPA "Why we ask this" idiom, extracted so other products
// can adopt it later. Presentation only: it renders whatever explanatory text
// it is given and holds no product knowledge.
//
// The idiom is a collapsed disclosure sitting directly under the question
// label, carrying the reason the question is asked and the consequence of the
// answer. It is deliberately NOT always-visible: the register's G3 treatment
// keeps the question line clean for a reader who already knows the answer.
//
// No product other than RoPA is wired to this component in this dispatch.

import type { ReactNode } from "react";

export default function WhyWeAsk({
  children,
  label = "Why we ask this",
  className = "mb-3 text-sm",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  if (!children) return null;
  return (
    <details className={className}>
      <summary className="cursor-pointer text-muted-foreground min-h-[32px] flex items-center">
        ⓘ {label}
      </summary>
      <p className="mt-2 text-muted-foreground">{children}</p>
    </details>
  );
}
