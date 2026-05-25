import { Link } from "react-router-dom";

interface ActionBriefProps {
  urgency:          string | null;
  who_should_care:  string | null;
  compliance_impact: string | null;
  action_items?:    Array<{ role?: string; action?: string; timeframe?: string }> | null;
  risk_level?:      string | null;
  isPremium:        boolean;
  articleId:        string;
}

/** Maps urgency field value to a readable label for the Action Brief sentence. */
function urgencyLabel(u: string | null): string {
  switch ((u ?? "").toLowerCase()) {
    case "immediate":    return "immediate";
    case "this quarter": return "action this quarter on";
    case "monitor":      return "ongoing monitoring of";
    default:             return "attention on";
  }
}

/**
 * ActionBrief
 *
 * Renders the article's action-level intelligence as a brief sentence.
 * Free users (isPremium=false): urgency + who_should_care visible,
 *   compliance_impact blurred with amber 'Unlock' CTA.
 * Paid subscribers (isPremium=true): fully unblurred.
 * Never render this component for anonymous (non-logged-in) users —
 * the parent is responsible for the auth check.
 */
export function ActionBrief({
  urgency,
  who_should_care,
  compliance_impact,
  action_items,
  risk_level,
  isPremium,
  articleId,
}: ActionBriefProps) {
  // Don't render if there's nothing meaningful to show
  if (!urgency && !who_should_care && !compliance_impact) return null;

  const label      = urgencyLabel(urgency);
  const salutation = who_should_care || "Privacy Teams";

  // ── BLURRED STATE — free registered users ─────────────────────────
  if (!isPremium) {
    // First ~12 words of compliance_impact for the blur preview
    const blurPreview = (compliance_impact ?? "")
      .split(" ").slice(0, 12).join(" ");

    return (
      <div
        className="border-l-[3px] border-amber-400 bg-amber-50
                   rounded-r-lg px-4 py-3 mt-3"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest
                      text-amber-700 mb-1.5">
          Action Brief
        </p>
        <p className="text-sm text-slate leading-snug flex flex-wrap
                      items-baseline gap-x-1">
          <span>This requires</span>
          <span className="font-semibold text-brand-navy">{label} action</span>
          <span>by</span>
          <span className="font-semibold text-brand-navy">{salutation}</span>
          <span>because</span>
          {/* Blurred compliance_impact preview */}
          <span
            className="text-slate select-none pointer-events-none"
            style={{
              maskImage:
                "linear-gradient(to right, black 40%, transparent 90%)",
              WebkitMaskImage:
                "linear-gradient(to right, black 40%, transparent 90%)",
              filter: "blur(3.5px)",
              userSelect: "none",
            }}
          >
            {blurPreview}…
          </span>
          {/* Upgrade CTA — sits directly against the blur */}
          <Link
            to="/subscribe"
            className="flex-shrink-0 text-[11px] font-semibold
                       bg-amber-500 text-white px-2.5 py-1
                       rounded-lg hover:opacity-90 no-underline
                       whitespace-nowrap ml-1"
          >
            Unlock →
          </Link>
        </p>
      </div>
    );
  }

  // ── FULL STATE — paid subscribers ─────────────────────────────────
  return (
    <div
      className="border-l-[3px] border-amber-400 bg-brand-navy/[0.04]
                 rounded-r-lg px-4 py-3 mt-3"
    >
      <p className="text-[11px] font-bold uppercase tracking-widest
                    text-amber-700 mb-2">
        Action Brief
      </p>
      {/* Summary sentence */}
      <p className="text-sm leading-snug mb-2">
        <span className="font-semibold text-brand-navy capitalize">{label} action</span>
        <span className="text-slate"> required by </span>
        <span className="font-semibold text-brand-navy">{salutation}</span>
      </p>
      {/* Full compliance impact */}
      {compliance_impact && (
        <p className="text-sm text-slate leading-relaxed mb-2">
          {compliance_impact}
        </p>
      )}
      {/* Action items */}
      {action_items && action_items.length > 0 && (
        <ul className="space-y-1 mb-2">
          {action_items.map((item, i) => (
            <li key={i} className="text-[12px] text-slate flex gap-1.5 flex-wrap">
              {item.role && (
                <span className="font-semibold text-amber-700 flex-shrink-0">
                  {item.role}:
                </span>
              )}
              {item.action && <span>{item.action}</span>}
              {item.timeframe && (
                <span className="text-slate/55">· {item.timeframe}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {/* Risk level badge */}
      {risk_level && (
        <span
          className="inline-block text-[11px] font-bold uppercase tracking-wide
                     bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full"
        >
          {risk_level} risk
        </span>
      )}
    </div>
  );
}
