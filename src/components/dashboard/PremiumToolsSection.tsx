import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AssessmentRow {
  id: string;
  type: "li" | "governance" | "dpia";
  created_at: string;
  status: string;
}

const TOOLS = [
  {
    icon: "⚖️",
    title: "Legitimate Interest Assessment",
    description:
      "Assess whether proposed processing can rely on legitimate interest under GDPR Article 6(1)(f). Returns a three-part test analysis and precedent landscape.",
    cta: "Run Assessment",
    href: "/li-assessment",
    note: "2 included/month",
  },
  {
    icon: "🏛️",
    title: "Governance Readiness Assessment",
    description:
      "Ten-domain review of data governance practices mapped to applicable regulatory frameworks. Includes a DPIA scope list as output.",
    cta: "Run Assessment",
    href: "/governance-assessment",
    note: "1 included/month",
  },
  {
    icon: "📋",
    title: "DPIA Framework",
    description:
      "Structured Data Protection Impact Assessment framework for a specific processing activity, built against GDPR Article 35 requirements.",
    cta: "Open DPIA Framework",
    href: "/dpia-framework",
    note: "Included for annual subscribers",
  },
];

const TYPE_LABEL: Record<AssessmentRow["type"], string> = {
  li: "LI Assessment",
  governance: "Governance",
  dpia: "DPIA Framework",
};

const TYPE_BADGE: Record<AssessmentRow["type"], string> = {
  li: "bg-blue-50 text-blue-700 border-blue-200",
  governance: "bg-purple-50 text-purple-700 border-purple-200",
  dpia: "bg-amber-50 text-amber-700 border-amber-200",
};

const TYPE_HREF: Record<AssessmentRow["type"], string> = {
  li: "/li-assessment/result",
  governance: "/governance-assessment/result",
  dpia: "/dpia-framework/result",
};

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "complete" || s === "completed") return "bg-green-50 text-green-700 border-green-200";
  if (s === "failed" || s === "error") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

interface Props {
  isPremium: boolean;
}

export default function PremiumToolsSection({ isPremium }: Props) {
  const { user } = useAuth();
  const [recent, setRecent] = useState<AssessmentRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user || !isPremium) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const [li, gov, dpia] = await Promise.all([
        supabase
          .from("li_assessments")
          .select("id, created_at, status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("governance_assessments")
          .select("id, created_at, status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("dpia_frameworks")
          .select("id, created_at, status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const merged: AssessmentRow[] = [
        ...(li.data ?? []).map((r: any) => ({ id: r.id, type: "li" as const, created_at: r.created_at, status: r.status })),
        ...(gov.data ?? []).map((r: any) => ({ id: r.id, type: "governance" as const, created_at: r.created_at, status: r.status })),
        ...(dpia.data ?? []).map((r: any) => ({ id: r.id, type: "dpia" as const, created_at: r.created_at, status: r.status })),
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      if (!cancelled) {
        setRecent(merged);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isPremium]);

  return (
    <section className="mt-10 mb-8">
      <div className="mb-6">
        <h2 className="font-display text-[22px] md:text-[26px] text-foreground font-bold leading-tight">
          Premium Tools
        </h2>
        <p className="text-muted-foreground text-[14px] mt-1">
          Compliance framework tools included with your Premium subscription.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {TOOLS.map((tool) => (
          <div
            key={tool.title}
            className={`bg-card border border-border rounded-2xl p-5 flex flex-col ${
              !isPremium ? "opacity-60" : ""
            }`}
          >
            <div className="text-[28px] mb-2">{tool.icon}</div>
            <h3 className="font-display font-bold text-foreground text-[15px] leading-snug mb-2">
              {tool.title}
            </h3>
            <p className="text-muted-foreground text-[13px] leading-relaxed flex-1 mb-4">
              {tool.description}
            </p>
            {isPremium ? (
              <>
                <Link
                  to={tool.href}
                  className="inline-flex items-center justify-center bg-navy text-white font-semibold text-[13px] py-2.5 px-4 rounded-xl no-underline hover:opacity-90 transition-all"
                >
                  {tool.cta} →
                </Link>
                <p className="text-[11px] text-muted-foreground mt-2 text-center">{tool.note}</p>
              </>
            ) : (
              <>
                <Link
                  to="/subscribe"
                  className="inline-flex items-center justify-center gap-1.5 bg-muted text-foreground font-semibold text-[13px] py-2.5 px-4 rounded-xl no-underline hover:opacity-90 transition-all"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Upgrade to Premium
                </Link>
                <p className="text-[11px] text-muted-foreground mt-2 text-center">{tool.note}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {isPremium && (
        <div>
          <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-3">
            Your Recent Assessments
          </h3>
          {!loaded ? (
            <p className="text-[13px] text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No assessments yet. Run your first assessment above.
            </p>
          ) : (
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {recent.map((row) => (
                <div
                  key={`${row.type}-${row.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_BADGE[row.type]}`}
                    >
                      {TYPE_LABEL[row.type]}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${statusBadgeClass(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <Link
                    to={`${TYPE_HREF[row.type]}/${row.id}`}
                    className="text-[13px] font-semibold text-primary hover:underline no-underline"
                  >
                    View →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
