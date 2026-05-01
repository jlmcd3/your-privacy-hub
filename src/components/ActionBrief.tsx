import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ActionItem {
  role?: string;
  action?: string;
  timeframe?: string;
}

interface ActionBriefProps {
  urgency: string | null;
  who_should_care: string | null;
  compliance_impact: string | null;
  action_items?: ActionItem[] | null;
  risk_level?: string | null;
  isPremium: boolean;
  userSalutation: string;
  articleId: string;
  articleCategory?: string | null;
}

const URGENCY_LABELS: Record<string, string> = {
  Immediate: "immediate",
  "This Quarter": "action this quarter on",
  Monitor: "monitoring",
};

function urgencyLabel(urgency: string | null): string {
  if (!urgency) return "attention";
  return URGENCY_LABELS[urgency] ?? "attention";
}

function firstWords(text: string, n: number): string {
  return text.trim().split(/\s+/).slice(0, n).join(" ");
}

export default function ActionBrief({
  urgency,
  who_should_care,
  compliance_impact,
  action_items,
  risk_level,
  isPremium,
  userSalutation,
  articleId,
  articleCategory,
}: ActionBriefProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const seenRef = useRef(false);

  // Track impression once per mount
  useEffect(() => {
    if (!user || seenRef.current) return;
    seenRef.current = true;
    supabase.from("user_enrichment_events").insert({
      user_id: user.id,
      event_type: "action_brief_seen",
      article_id: articleId,
      article_category: articleCategory ?? null,
    });
    // Note: user_role column kept null here; profile join handled server-side.
  }, [user, articleId, articleCategory]);

  const label = urgencyLabel(urgency);

  // ── BLURRED STATE (free registered) ──
  if (!isPremium) {
    const teaser = compliance_impact ? firstWords(compliance_impact, 12) : "";

    const handleUpgradeClick = async () => {
      if (user) {
        await supabase.from("user_enrichment_events").insert({
          user_id: user.id,
          event_type: "action_brief_click",
          article_id: articleId,
          article_category: articleCategory ?? null,
        });
      }
      navigate("/subscribe");
    };

    return (
      <div
        className="rounded-lg p-4 my-3"
        style={{
          backgroundColor: "#FFFBEB",
          borderLeft: "3px solid #EF9F27",
        }}
      >
        <p className="font-sans text-[13px] text-navy leading-relaxed mb-2">
          This requires <span className="font-semibold">{label}</span> action by{" "}
          <span className="font-semibold">{userSalutation}</span> because{" "}
          {teaser && (
            <span
              className="text-slate"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, black 60%, transparent 100%)",
                maskImage:
                  "linear-gradient(to right, black 60%, transparent 100%)",
                pointerEvents: "none",
                userSelect: "none",
                display: "inline",
              }}
              aria-hidden="true"
            >
              {teaser}…
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={handleUpgradeClick}
          className="bg-amber-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors border-none cursor-pointer"
        >
          Unlock Action Brief — Pro →
        </button>
      </div>
    );
  }

  // ── FULL STATE (Pro) ──
  return (
    <div
      className="rounded-lg p-4 my-3"
      style={{
        backgroundColor: "#F0F4FF",
        borderLeft: "3px solid #EF9F27",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-display text-[14px] font-semibold text-navy uppercase tracking-wide m-0">
          Action Brief
        </h4>
        {risk_level && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-navy text-white px-2 py-0.5 rounded">
            {risk_level} risk
          </span>
        )}
      </div>

      <p className="font-sans text-[13px] text-navy leading-relaxed mb-2">
        <span className="font-semibold capitalize">{label}</span> action required by{" "}
        <span className="font-semibold">
          {who_should_care || userSalutation}
        </span>
      </p>

      {compliance_impact && (
        <p className="font-sans text-[13px] text-slate leading-relaxed mb-3">
          {compliance_impact}
        </p>
      )}

      {action_items && action_items.length > 0 && (
        <ul className="list-none p-0 m-0 space-y-1">
          {action_items.map((item, i) => (
            <li
              key={i}
              className="font-sans text-[12px] text-navy leading-snug flex gap-2"
            >
              <span className="text-amber-600 font-bold">•</span>
              <span>
                {item.role && (
                  <span className="font-semibold">{item.role}: </span>
                )}
                {item.action}
                {item.timeframe && (
                  <span className="text-slate"> · {item.timeframe}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
