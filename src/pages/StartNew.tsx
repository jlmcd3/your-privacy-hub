// Workspace-aware "Start new..." picker. Shows every tool as a tile with
// per-workspace status (completed / draft / none) so users can either
// resume existing work or kick off a new run without going through the
// public /tools marketing page.

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, ArrowRight, CheckCircle2, Clock, User, Briefcase } from "lucide-react";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import PageContainer from "@/components/PageContainer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/hooks/useActiveClient";

type ToolKey =
  | "li"
  | "dpia"
  | "governance"
  | "dpa"
  | "ir"
  | "biometric"
  | "ropa"
  | "us_notice"
  | "eu_notice"
  | "registration";

type ToolDef = {
  key: ToolKey;
  label: string;
  blurb: string;
  startPath: string;
  /** Path to view/list existing items for this tool. */
  viewPath?: string;
  /** Supabase table to query for status. null = no per-tool table to count. */
  table: string | null;
  /** Column used for "in progress" detection. */
  statusCol?: string;
  /** Status values that count as "completed". */
  completedStatuses?: string[];
};

const TOOLS: ToolDef[] = [
  {
    key: "li",
    label: "Legitimate Interest Assessment",
    blurb: "Document and defend a legitimate-interest basis for processing.",
    startPath: "/li-assessment",
    viewPath: "/dashboard/reports",
    table: "li_assessments",
    statusCol: "status",
    completedStatuses: ["complete"],
  },
  {
    key: "dpia",
    label: "DPIA Framework",
    blurb: "Structured Data Protection Impact Assessment for high-risk processing.",
    startPath: "/dpia-framework",
    viewPath: "/dashboard/reports",
    table: "dpia_frameworks",
    statusCol: "status",
    completedStatuses: ["complete"],
  },
  {
    key: "governance",
    label: "Governance Assessment",
    blurb: "Privacy-program health check across people, process, and policy.",
    startPath: "/governance-assessment",
    viewPath: "/dashboard/reports",
    table: "governance_assessments",
    statusCol: "status",
    completedStatuses: ["complete"],
  },
  {
    key: "ropa",
    label: "RoPA Builder",
    blurb: "Records of Processing Activities for Art. 30 / equivalent obligations.",
    startPath: "/ropa",
    viewPath: "/ropa",
    table: "ropa_sessions",
    statusCol: "status",
    completedStatuses: ["complete", "completed"],
  },
  {
    key: "us_notice",
    label: "US Privacy Notice",
    blurb: "Generate a multi-state US privacy notice tailored to your stack.",
    startPath: "/us-notices",
    viewPath: "/us-notices",
    table: null,
  },
  {
    key: "eu_notice",
    label: "EU Privacy Notice",
    blurb: "GDPR-aligned notice with framework-specific disclosures.",
    startPath: "/eu-notices",
    viewPath: "/eu-notices",
    table: null,
  },
  {
    key: "dpa",
    label: "Custom DPA",
    blurb: "Controller↔processor Data Processing Agreement with SCC annexes.",
    startPath: "/dpa-generator",
    viewPath: "/dashboard/reports",
    table: "dpa_documents",
    statusCol: "status",
    completedStatuses: ["complete"],
  },
  {
    key: "ir",
    label: "Incident Response Playbook",
    blurb: "Jurisdiction-aware incident response runbook.",
    startPath: "/ir-playbook",
    viewPath: "/dashboard/reports",
    table: "ir_playbooks",
    statusCol: "status",
    completedStatuses: ["complete"],
  },
  {
    key: "biometric",
    label: "Biometric Compliance Check",
    blurb: "BIPA / CCPA / GDPR biometric-data exposure scan.",
    startPath: "/biometric-checker",
    viewPath: "/dashboard/reports",
    table: "biometric_assessments",
    statusCol: "status",
    completedStatuses: ["complete"],
  },
  {
    key: "registration",
    label: "Registration Manager",
    blurb: "DPA / DPO registrations across jurisdictions.",
    startPath: "/registration-manager",
    viewPath: "/registration-manager/my-filings",
    table: "registration_orders",
    statusCol: "fulfillment_status",
    completedStatuses: ["complete", "fulfilled", "paid"],
  },
];

type Counts = { completed: number; inProgress: number; latestId?: string };

export default function StartNew() {
  const { user, loading: authLoading } = useAuth();
  const { client, clientName, isPersonalActive } = useActiveClient();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, Counts>>({});

  useEffect(() => {
    if (!user || !client) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const queries = TOOLS.map((t) => {
        if (!t.table) return Promise.resolve({ data: [] as any[] });
        return supabase
          .from(t.table as any)
          .select(`id, ${t.statusCol || "status"}, created_at`)
          .eq("user_id", user.id)
          .eq("client_id", client.id)
          .order("created_at", { ascending: false });
      });
      const results = await Promise.all(queries);
      if (cancelled) return;

      const next: Record<string, Counts> = {};
      results.forEach((res: any, i) => {
        const tool = TOOLS[i];
        const rows: any[] = res?.data || [];
        const statusCol = tool.statusCol || "status";
        const completedSet = new Set(tool.completedStatuses || ["complete"]);
        let completed = 0;
        let inProgress = 0;
        rows.forEach((r) => {
          if (completedSet.has(r[statusCol])) completed += 1;
          else inProgress += 1;
        });
        next[tool.key] = {
          completed,
          inProgress,
          latestId: rows[0]?.id,
        };
      });
      setCounts(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, client?.id]);

  const WorkspaceIcon = isPersonalActive ? User : Briefcase;
  const workspaceLabel = isPersonalActive ? "your personal workspace" : clientName;

  const orderedTools = useMemo(() => {
    // Surface tools with existing work first.
    return [...TOOLS].sort((a, b) => {
      const ac = counts[a.key];
      const bc = counts[b.key];
      const aHas = (ac?.completed || 0) + (ac?.inProgress || 0);
      const bHas = (bc?.completed || 0) + (bc?.inProgress || 0);
      return bHas - aHas;
    });
  }, [counts]);

  return (
    <WorkspaceLayout>
      <Helmet>
        <title>Start new work | End User Privacy</title>
      </Helmet>
      <PageContainer>
        <div className="py-8">
          <div className="mb-6">
            <h1 className="font-display text-brand-navy">Start new work</h1>
            <p className="text-sm text-slate mt-1 inline-flex items-center gap-1.5">
              <WorkspaceIcon className="w-3.5 h-3.5" />
              <span>
                for <span className="font-semibold text-brand-navy">{workspaceLabel}</span>
              </span>
            </p>
            <p className="text-xs text-brand-mist mt-2">
              Pick a tool to begin. New work will be saved under{" "}
              {isPersonalActive ? "your personal workspace" : clientName}.
            </p>
          </div>

          {authLoading || loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-brand-navy" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {orderedTools.map((tool) => {
                const c = counts[tool.key] || { completed: 0, inProgress: 0 };
                const has = c.completed + c.inProgress > 0;
                return (
                  <Card
                    key={tool.key}
                    className="p-5 flex flex-col gap-3 border border-brand-cloud hover:border-brand-navy/40 transition-colors"
                  >
                    <div>
                      <h2 className="text-base font-semibold text-brand-navy leading-snug">
                        {tool.label}
                      </h2>
                      <p className="text-xs text-slate mt-1.5 leading-relaxed">
                        {tool.blurb}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
                      {c.completed > 0 && (
                        <Badge variant="default" className="text-[10px] gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {c.completed} completed
                        </Badge>
                      )}
                      {c.inProgress > 0 && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Clock className="w-3 h-3" />
                          {c.inProgress} in progress
                        </Badge>
                      )}
                      {!has && tool.table && (
                        <span className="text-[10px] text-brand-mist">
                          No work yet for this workspace
                        </span>
                      )}
                    </div>

                    <div className="mt-auto pt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => navigate(tool.startPath)}
                        className="gap-1"
                      >
                        {has ? "Start new" : "Start"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                      {has && tool.viewPath && (
                        <Link
                          to={tool.viewPath}
                          className="text-xs text-brand-teal hover:underline"
                        >
                          View existing
                        </Link>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <p className="text-xs text-brand-mist mt-8">
            Looking for tool descriptions, pricing, or samples?{" "}
            <Link to="/tools" className="text-brand-teal hover:underline">
              See the full tool catalog
            </Link>
            .
          </p>
        </div>
      </PageContainer>
    </WorkspaceLayout>
  );
}
