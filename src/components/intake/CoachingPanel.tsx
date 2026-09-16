import type { RailEntry } from "@/components/intake/RailEntry";

export default function CoachingPanel({
  entry,
  openByDefault = false,
}: {
  entry: RailEntry | null;
  openByDefault?: boolean;
}) {
  if (!entry || (!entry.coachLead && !entry.goodAnswer)) return null;
  return (
    <div>
      {entry.coachLead && (
        <p className="font-serif-text font-semibold text-[15.5px] leading-snug text-brand-navy mb-2.5">
          {entry.coachLead}
        </p>
      )}
      {entry.coachBody && (
        <p className="text-body-marketing text-ink-soft leading-relaxed">
          {entry.coachBody}
        </p>
      )}
      {(entry.goodAnswer || entry.commonMistake) && (
        <details className="mt-3.5 border-t border-rule pt-3" open={openByDefault || undefined}>
          {/* ADMT/Cyber master reviews (2026-09-15, F15 / S14): the expander
              names what it opens. An explanation of the standard is labelled
              as such; only a fictional worked example is called fictional. */}
          <summary className="cursor-pointer list-none text-body-small font-semibold text-teal-action">
            ▸ {entry.goodAnswerKind === "explanation" ? "See how the standard applies" : "See an example of a specific answer"}
          </summary>
          {entry.goodAnswer && (
            <div className="mt-2.5 rounded-r-lg border-l-[3px] border-teal-action bg-teal-wash px-3.5 py-3 text-body-small italic text-teal-ink leading-relaxed">
              <span className="not-italic block text-[10px] uppercase tracking-[0.08em] font-semibold text-teal-action mb-1">
                {entry.goodAnswerKind === "explanation" ? "Explanation of the standard" : "Fictional example — not a template"}
              </span>
              {entry.goodAnswer}
            </div>
          )}
          {entry.commonMistake && (
            <p className="mt-2.5 border-l-[3px] border-severity-critical/35 pl-3.5 text-body-small text-severity-critical leading-relaxed">
              {entry.commonMistake}
            </p>
          )}
        </details>
      )}
    </div>
  );
}
