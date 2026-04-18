import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AssessmentRow {
  id: string;
  type: "li" | "governance" | "dpia";
  created_at: string;
  status: string;
  pdf_url?: string | null;
}

const TOOLS = [
  {
    icon: "⚖️",
    title: "Legitimate Interest Assessment Tool",
    description:
      "Search a curated database of enforcement decisions and regulatory guidance to see how regulators have treated processing use cases similar to yours — and what documentation you need for a defensible balancing record.",
    cta: "View Sample & Purchase",
    href: "/li-assessment",
    standalonePrice: 39,
    subscriberPrice: 19,
  },
  {
    icon: "🛡️",
    title: "Data Privacy Healthcheck",
    description:
      "Ten-domain review of your organisation's privacy practices mapped to applicable regulatory frameworks. Each finding is rated by severity and paired with a recommended action, suggested owner, and timeline.",
    cta: "View Sample & Purchase",
    href: "/governance-assessment",
    standalonePrice: 29,
    subscriberPrice: 15,
  },
  {
    icon: "📋",
    title: "DPIA Builder",
    description:
      "Structured Data Protection Impact Assessment framework for a specific processing activity, built against GDPR Article 35 requirements. Pre-populated with your inputs. Requires DPO or counsel sign-off to complete.",
    cta: "View Sample & Purchase",
    href: "/dpia-framework",
    standalonePrice: 69,
    subscriberPrice: 39,
  },
  {
    icon: "📄",
    title: "Custom Data Protection Agreement",
    description:
      "Draft a GDPR Article 28 Custom Data Protection Agreement calibrated to real enforcement precedents. Tailored to your controller/processor relationship, sub-processor structure, and transfer mechanism.",
    cta: "View Sample & Purchase",
    href: "/dpa-generator",
    standalonePrice: 69,
    subscriberPrice: 39,
  },
  {
    icon: "🚨",
    title: "IR Playbook Generator",
    description:
      "Jurisdiction-specific data breach response playbook with hour-by-hour actions, notification timelines, DPA portal links, and notification templates.",
    cta: "View Sample & Purchase",
    href: "/ir-playbook",
    standalonePrice: 39,
    subscriberPrice: 0,
  },
  {
    icon: "🫆",
    title: "Biometric Compliance Checker",
    description:
      "Check biometric processing (face, fingerprint, voice, iris) against BIPA, GDPR Art. 9, and global biometric laws. First jurisdiction free for everyone.",
    cta: "View Sample & Purchase",
    href: "/biometric-checker",
    standalonePrice: 29,
    subscriberPrice: 0,
  },
];

const TYPE_LABEL: Record<AssessmentRow["type"], string> = {
  li: "LI Analyzer",
  governance: "Privacy Healthcheck",
  dpia: "DPIA Builder",
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
    if (!user) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const [li, gov, dpia] = await Promise.all([
        supabase
          .from("li_assessments")
          .select("id, created_at, status, pdf_url")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("governance_assessments")
          .select("id, created_at, status, pdf_url")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("dpia_frameworks")
          .select("id, created_at, status, pdf_url")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const merged: AssessmentRow[] = [
        ...(li.data ?? []).map((r: any) => ({ id: r.id, type: "li" as const, created_at: r.created_at, status: r.status, pdf_url: r.pdf_url })),
        ...(gov.data ?? []).map((r: any) => ({ id: r.id, type: "governance" as const, created_at: r.created_at, status: r.status, pdf_url: r.pdf_url })),
        ...(dpia.data ?? []).map((r: any) => ({ id: r.id, type: "dpia" as const, created_at: r.created_at, status: r.status, pdf_url: r.pdf_url })),
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
  }, [user]);

  return (
    <section className="mt-10 mb-8">
      <div className="mb-6">
        <h2 className="font-display text-[22px] md:text-[26px] text-foreground font-bold leading-tight">
          Compliance Framework Tools
        </h2>
        <p className="text-muted-foreground text-[14px] mt-1">
          Standalone compliance framework reports. Purchase only what you need —
          {isPremium ? " Premium subscriber rate applied at checkout." : " Premium subscribers pay less."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {TOOLS.map((tool) => {
          const displayPrice = isPremium ? tool.subscriberPrice : tool.standalonePrice;
          return (
            <div
              key={tool.title}
              className="bg-card border border-border rounded-2xl p-5 flex flex-col"
            >
              <div className="text-[28px] mb-2">{tool.icon}</div>
              <h3 className="font-display font-bold text-foreground text-[15px] leading-snug mb-2">
                {tool.title}
              </h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed flex-1 mb-4">
                {tool.description}
              </p>
              <div className="mb-3">
                <span className="font-display font-bold text-foreground text-[20px]">${displayPrice}</span>
                <span className="text-muted-foreground text-[12px] ml-1">one-time</span>
                {!isPremium && (
                  <span className="block text-[11px] text-amber-700 mt-0.5">
                    ⭐ Premium: ${tool.subscriberPrice}
                  </span>
                )}
                {isPremium && tool.standalonePrice > tool.subscriberPrice && (
                  <span className="block text-[11px] text-muted-foreground line-through mt-0.5">
                    Standalone ${tool.standalonePrice}
                  </span>
                )}
              </div>
              <Link
                to={tool.href}
                className="inline-flex items-center justify-center bg-navy text-white font-semibold text-[13px] py-2.5 px-4 rounded-xl no-underline hover:opacity-90 transition-all"
              >
                {tool.cta} →
              </Link>
            </div>
          );
        })}
      </div>

      <div>
        <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-3">
          Your Recent Reports
        </h3>
        {!loaded ? (
          <p className="text-[13px] text-muted-foreground">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            No reports yet. Preview a sample and purchase above.
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
                <div className="flex items-center gap-3">
                  {row.pdf_url && (
                    <a
                      href={row.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium text-primary hover:underline no-underline"
                    >
                      ↓ PDF
                    </a>
                  )}
                  <Link
                    to={`${TYPE_HREF[row.type]}/${row.id}`}
                    className="text-[13px] font-semibold text-primary hover:underline no-underline"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
