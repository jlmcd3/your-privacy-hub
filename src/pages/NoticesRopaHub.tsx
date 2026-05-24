// Combined "Notices & RoPA" hub. Lists US Notices, EU Notices, and RoPA
// for the currently active client/workspace, with quick links to each
// tool's documents or landing page.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, ArrowRight, FileText, ScrollText, Globe2, User, Briefcase } from "lucide-react";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import PageContainer from "@/components/PageContainer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/hooks/useActiveClient";

type Counts = {
  us: { total: number; latestId?: string };
  eu: { total: number; latestId?: string };
  ropa: { total: number; latestId?: string };
};

export default function NoticesRopaHub() {
  const { user, loading: authLoading } = useAuth();
  const { client, clientName, isPersonalActive } = useActiveClient();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts>({
    us: { total: 0 },
    eu: { total: 0 },
    ropa: { total: 0 },
  });

  useEffect(() => {
    if (!user || !client) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [us, eu, ropa] = await Promise.all([
        supabase
          .from("us_notice_sessions" as any)
          .select("id, created_at")
          .eq("user_id", user.id)
          .eq("client_id", client.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("eu_notice_sessions" as any)
          .select("id, created_at")
          .eq("user_id", user.id)
          .eq("client_id", client.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("ropa_sessions" as any)
          .select("id, created_at")
          .eq("client_id", client.id)
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      const usRows: any[] = (us as any)?.data || [];
      const euRows: any[] = (eu as any)?.data || [];
      const ropaRows: any[] = (ropa as any)?.data || [];
      setCounts({
        us: { total: usRows.length, latestId: usRows[0]?.id },
        eu: { total: euRows.length, latestId: euRows[0]?.id },
        ropa: { total: ropaRows.length, latestId: ropaRows[0]?.id },
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, client?.id]);

  const WorkspaceIcon = isPersonalActive ? User : Briefcase;
  const workspaceLabel = isPersonalActive ? "your personal workspace" : clientName;

  const tiles = [
    {
      key: "us",
      icon: ScrollText,
      label: "US Privacy Notices",
      blurb: "Multi-state US privacy notices tailored to your stack.",
      startPath: "/us-notices",
      viewPath: counts.us.latestId
        ? `/us-notices/${counts.us.latestId}/documents`
        : "/us-notices",
      count: counts.us.total,
    },
    {
      key: "eu",
      icon: Globe2,
      label: "EU Privacy Notices",
      blurb: "GDPR-aligned notices with framework-specific disclosures.",
      startPath: "/eu-notices",
      viewPath: "/eu-notices/documents",
      count: counts.eu.total,
    },
    {
      key: "ropa",
      icon: FileText,
      label: "RoPA (Article 30 Records)",
      blurb: "Records of Processing Activities for Art. 30 / equivalent obligations.",
      startPath: "/ropa",
      viewPath: "/ropa/documents",
      count: counts.ropa.total,
    },
  ];

  return (
    <WorkspaceLayout>
      <Helmet>
        <title>Notices & RoPA | End User Privacy</title>
      </Helmet>
      <PageContainer>
        <div className="py-8">
          <div className="mb-6">
            <h1 className="font-display text-navy">Notices & RoPA</h1>
            <p className="text-sm text-slate mt-1 inline-flex items-center gap-1.5">
              <WorkspaceIcon className="w-3.5 h-3.5" />
              <span>
                for <span className="font-semibold text-navy">{workspaceLabel}</span>
              </span>
            </p>
            <p className="text-xs text-slate-light mt-2">
              Privacy notices and Records of Processing Activities for this workspace.
            </p>
          </div>

          {authLoading || loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-navy" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tiles.map((t) => {
                const Icon = t.icon;
                const has = t.count > 0;
                return (
                  <Card
                    key={t.key}
                    className="p-5 flex flex-col gap-3 border border-fog hover:border-navy/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-navy/5 text-navy">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-base font-semibold text-navy leading-snug">
                          {t.label}
                        </h2>
                        <p className="text-xs text-slate mt-1.5 leading-relaxed">
                          {t.blurb}
                        </p>
                      </div>
                    </div>

                    <div className="min-h-[1.5rem]">
                      {has ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {t.count} {t.count === 1 ? "session" : "sessions"}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-slate-light">
                          No work yet for this workspace
                        </span>
                      )}
                    </div>

                    <div className="mt-auto pt-2 flex items-center gap-2">
                      <Button asChild size="sm" className="gap-1">
                        <Link to={t.startPath}>
                          {has ? "Open" : "Start"}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                      {has && (
                        <Link
                          to={t.viewPath}
                          className="text-xs text-cobalt hover:underline"
                        >
                          View documents
                        </Link>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </PageContainer>
    </WorkspaceLayout>
  );
}
