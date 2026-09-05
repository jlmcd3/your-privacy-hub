// SO-9 — reader surface for the deterministic CCPA / CPRA Scope Assessment.
// Presentation only: every string comes from the deterministic renderer.

import type { ScopeDocument } from "@/lib/scope/scope-skeleton-render";

export default function ScopeDocumentView({ doc }: { doc: ScopeDocument }) {
  const groups = doc.authorities.reduce<Record<string, typeof doc.authorities>>((acc, a) => {
    (acc[a.group] ||= []).push(a);
    return acc;
  }, {});

  return (
    <article className="bg-card border rounded-lg p-6 sm:p-8 space-y-4">
      {doc.paragraphs.map((p) => {
        if (p.kind === "title") {
          return (
            <h2 key={p.index} className="font-serif text-2xl tracking-tight">
              {p.text}
            </h2>
          );
        }
        if (p.kind === "subtitle") {
          return (
            <p key={p.index} className="text-sm text-muted-foreground italic border-b pb-4">
              {p.text}
            </p>
          );
        }
        if (p.kind === "heading" || p.kind === "toa_heading") {
          return (
            <h3 key={p.index} className="font-serif text-lg pt-4">
              {p.text}
            </h3>
          );
        }
        if (p.kind === "lead") {
          return (
            <p key={p.index} className="text-[15px] leading-relaxed font-medium border-l-2 border-primary pl-4">
              {p.text}
            </p>
          );
        }
        return (
          <p key={p.index} className="text-[15px] leading-relaxed text-foreground/90">
            {p.text}
          </p>
        );
      })}

      <div className="space-y-3 pt-1">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </p>
            <ul className="mt-1 space-y-1">
              {items.map((a) => (
                <li key={a.pinpoint} className="text-sm">
                  <span className="font-mono">{a.pinpoint}</span>
                  <span className="text-muted-foreground">
                    {" \u2014 "}
                    {a.backrefs.join("; ")}
                    {a.persuasive ? " (persuasive)" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* QA batch 2026-09-05 (SC 02) — the pipeline stamp and spine hash are
          implementation identifiers, not customer information. They stay on
          the element for support (data attributes) and leave the visible page. */}
      <p
        className="text-[11px] text-muted-foreground pt-4 border-t"
        data-scope-stamp={doc.stamp}
        data-scope-spine={doc.spine_hash}
      >
        Deterministic assessment — every statement above is derived from your answers and the cited authorities.
      </p>
    </article>
  );
}
