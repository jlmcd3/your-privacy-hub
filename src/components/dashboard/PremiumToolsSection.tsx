import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CircleDot, ClipboardList, FileText, FileSignature, Fingerprint, Folder, Scale, Shield, Siren } from 'lucide-react';

interface AssessmentRow {
  id: string;
  type: "li" | "governance" | "dpia";
  created_at: string;
  status: string;
  pdf_url?: string | null;
}

const TOOLS = [
  {
    icon: "",
    title: "Legitimate Interest Assessment Tool",
    description:
      "Search a curated database of enforcement decisions and regulatory guidance to see how regulators have treated processing use cases similar to yours — and what documentation you need for a defensible balancing record.",
    cta: "View Sample & Purchase",
    href: "/li-assessment",
    standalonePrice: 35,
    subscriberPrice: 35,
  },
  {
    icon: "",
    title: "GDPR Governance Assessment",
    description:
      "Ten-domain review of your organisation's privacy practices mapped to applicable regulatory frameworks. Each finding is rated by severity and paired with a recommended action, suggested owner, and timeline.",
    cta: "View Sample & Purchase",
    href: "/governance-assessment",
    standalonePrice: 55,
    subscriberPrice: 55,
  },
  {
    icon: "",
    title: "Impact Assessment Builder",
    description:
      "Structured Data Protection Impact Assessment (DPIA) framework for a specific processing activity, built against GDPR Article 35 requirements. Pre-populated with your inputs. Requires DPO or counsel sign-off to complete.",
    cta: "View Sample & Purchase",
    href: "/dpia-framework",
    standalonePrice: 45,
    subscriberPrice: 45,
  },
  {
    icon: "",
    title: "Your Custom DPA",
    description:
      "Draft your custom GDPR Article 28 Data Protection Agreement calibrated to real enforcement precedents. Tailored to your controller/processor relationship, sub-processor structure, and transfer mechanism.",
    cta: "View Sample & Purchase",
    href: "/dpa-generator",
    standalonePrice: 45,
    subscriberPrice: 45,
  },
  {
    icon: "",
    title: "Your Incident Response Playbook",
    description:
      "Your jurisdiction-specific data breach response playbook with hour-by-hour actions, notification timelines, DPA portal links, and notification templates.",
    cta: "View Sample & Purchase",
    href: "/ir-playbook",
    standalonePrice: 25,
    subscriberPrice: 0,
  },
  {
    icon: "",
    title: "Biometric Privacy Compliance Assessment",
    description:
      "Check biometric processing (face, fingerprint, voice, iris) against BIPA, GDPR Art. 9, and global biometric laws. Included with Annual Platform.",
    cta: "View Sample & Purchase",
    href: "/biometric-checker",
    standalonePrice: 15,
    subscriberPrice: 0,
  },
  {
    icon: "",
    title: "Your Registration Filings",
    description:
      "Free assessment maps where your organisation must register (DPO, RoPA, AI Act, Article 27 rep). Then generate a counsel-ready filing pack you submit yourself. You file; we draft and track.",
    cta: "Start Free Assessment",
    href: "/registration-manager",
    standalonePrice: 45,
    subscriberPrice: 45,
  },
];

const TYPE_LABEL: Record<AssessmentRow["type"], string> = {
  li: "LI Assessment Tool",
  governance: "GDPR Governance Assessment",
  dpia: "Impact Assessment Builder",
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
  const [hasFilings, setHasFilings] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const [li, gov, dpia, orders] = await Promise.all([
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
        supabase
          .from("registration_orders")
          .select("id")
          .eq("user_id", user.id)
          .eq("payment_status", "paid")
          .limit(1),
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
        setHasFilings((orders.data ?? []).length > 0);
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
        <h2 className="font-display text-foreground leading-tight">
          Compliance Framework Tools
        </h2>
        <p className="text-muted-foreground text-[14px] mt-1">
          Per-use compliance tools. IR Playbook and Biometric are included with Annual Platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {TOOLS.map((tool) => {
          const displayPrice = isPremium ? tool.subscriberPrice : tool.standalonePrice;
          return (
            <div
              key={tool.title}
              className="bg-card border border-border rounded-2xl p-5 flex flex-col shadow-eup-sm hover:shadow-eup-md motion-safe:transition-shadow motion-reduce:transition-none"
            >

              <div className="text-[28px] mb-2">{tool.icon}</div>
              <h3 className="text-foreground text-[15px] leading-snug mb-2">
                {tool.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-4">
                {tool.description}
              </p>
              <div className="mb-3">
                {isPremium && tool.subscriberPrice === 0 ? (
                  <span className="font-display font-bold text-green-700 text-[20px]">Included</span>
                ) : (
                  <>
                    <span className="font-display font-bold text-foreground text-[20px]">${displayPrice}</span>
                    <span className="text-muted-foreground text-[12px] ml-1">one-time</span>
                  </>
                )}
              </div>
              <Link
                to={tool.href}
                className="inline-flex items-center justify-center bg-brand-navy text-white font-semibold text-sm py-2.5 px-4 rounded-xl no-underline hover:opacity-90 transition-all"
              >
                {tool.cta} →
              </Link>
            </div>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] uppercase tracking-[0.12em] text-brand-steel">
            Your Recent Reports
          </h3>
          {hasFilings && (
            <Link
              to="/registration-manager/my-filings"
              className="text-[12px] font-semibold text-primary hover:underline no-underline"
            >
              <Folder aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Your Registration Filings →
            </Link>
          )}
        </div>
        {!loaded ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reports yet. Preview a sample and purchase above.
          </p>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border shadow-eup-sm">
            {recent.map((row) => (
              <div
                key={`${row.type}-${row.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap hover:bg-muted/40 motion-safe:transition-colors motion-reduce:transition-none first:rounded-t-xl last:rounded-b-xl"
              >

                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_BADGE[row.type]}`}
                  >
                    {TYPE_LABEL[row.type]}
                  </span>
                  <span className="text-sm text-muted-foreground">
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
                  {/* SEC-1b: persisted pdf_url no longer exists; users mint a
                      short-TTL URL on demand from the result page's PDF button. */}
                  <Link
                    to={`${TYPE_HREF[row.type]}/${row.id}`}
                    className="text-sm font-semibold text-primary hover:underline no-underline"
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
