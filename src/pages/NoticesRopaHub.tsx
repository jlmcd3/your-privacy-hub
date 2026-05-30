// Combined "Notices & RoPA" hub. Lists every notice/RoPA file generated for
// the currently active client/workspace as a single sortable list, with
// quick links to view documents or start a new one.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Loader2,
  ArrowRight,
  FileText,
  ScrollText,
  Globe2,
  User,
  Briefcase,
  Plus,
} from "lucide-react";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import PageContainer from "@/components/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/hooks/useActiveClient";

type FileRow = {
  id: string;
  kind: "us" | "eu" | "ropa";
  created_at: string;
  updated_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
  version_number?: number | null;
  scope?: any;
};

const KIND_META: Record<
  FileRow["kind"],
  { label: string; icon: typeof FileText; viewPath: (id: string) => string; startPath: string }
> = {
  us: {
    label: "US Privacy Notice",
    icon: ScrollText,
    viewPath: (id) => `/us-notices/${id}/documents`,
    startPath: "/us-notices",
  },
  eu: {
    label: "EU Privacy Notice",
    icon: Globe2,
    viewPath: () => "/eu-notices/documents",
    startPath: "/eu-notices",
  },
  ropa: {
    label: "RoPA (Article 30)",
    icon: FileText,
    viewPath: () => "/ropa/documents",
    startPath: "/ropa",
  },
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function statusBadge(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "generated" || s === "completed" || s === "complete") {
    return <Badge className="bg-brand-teal/15 text-brand-teal border-brand-teal/30 text-[10px]">Generated</Badge>;
  }
  if (s === "in_progress" || s === "draft" || s === "pending") {
    return <Badge variant="secondary" className="text-[10px]">In progress</Badge>;
  }
  return <Badge variant="outline" className="text-[10px]">{status || "—"}</Badge>;
}

export default function NoticesRopaHub() {
  const { user, loading: authLoading } = useAuth();
  const { client, clientName, isPersonalActive } = useActiveClient();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FileRow[]>([]);

  useEffect(() => {
    if (!user || !client) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [us, eu, ropa] = await Promise.all([
        supabase
          .from("us_notice_sessions" as any)
          .select("id, created_at, updated_at, completed_at, status, version_number, scope")
          .eq("client_id", client.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("eu_notice_sessions" as any)
          .select("id, created_at, updated_at, completed_at, status, version_number")
          .eq("client_id", client.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("ropa_sessions" as any)
          .select("id, created_at, updated_at, completed_at, status, version_number, scope")
          .eq("client_id", client.id)
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      const usRows: FileRow[] = ((us as any)?.data || []).map((r: any) => ({
        ...r,
        kind: "us" as const,
      }));
      const euRows: FileRow[] = ((eu as any)?.data || []).map((r: any) => ({
        ...r,
        kind: "eu" as const,
      }));
      const ropaRows: FileRow[] = ((ropa as any)?.data || []).map((r: any) => ({
        ...r,
        kind: "ropa" as const,
      }));
      const merged = [...usRows, ...euRows, ...ropaRows].sort((a, b) => {
        const ad = new Date(a.completed_at || a.updated_at || a.created_at).getTime();
        const bd = new Date(b.completed_at || b.updated_at || b.created_at).getTime();
        return bd - ad;
      });
      setRows(merged);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, client?.id]);

  const WorkspaceIcon = isPersonalActive ? User : Briefcase;
  const workspaceLabel = isPersonalActive ? "your personal workspace" : clientName;

  const subtitleByKind = useMemo(() => {
    return (row: FileRow) => {
      const parts: string[] = [];
      if (row.version_number) parts.push(`v${row.version_number}`);
      const scope = (row as any).scope;
      if (scope && typeof scope === "object") {
        const states = Array.isArray(scope.states) ? scope.states : null;
        const frameworks = Array.isArray(scope.frameworks) ? scope.frameworks : null;
        if (states && states.length) parts.push(states.join(", "));
        if (frameworks && frameworks.length) parts.push(frameworks.join(", "));
      }
      return parts.join(" · ");
    };
  }, []);

  return (
    <WorkspaceLayout>
      <Helmet>
        <title>Notices & RoPA | End User Privacy</title>
      </Helmet>
      <PageContainer>
        <div className="py-8">
          <div className="mb-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-slate hover:text-brand-navy no-underline font-medium transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-180" aria-hidden="true" />
              Back to dashboard
            </Link>
          </div>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-brand-navy">Notices & RoPA</h1>
              <p className="text-sm text-slate mt-1 inline-flex items-center gap-1.5">
                <WorkspaceIcon className="w-3.5 h-3.5" />
                <span>
                  for <span className="font-semibold text-brand-navy">{workspaceLabel}</span>
                </span>
              </p>
              <p className="text-xs text-brand-mist mt-2">
                All privacy notices and Records of Processing Activities generated for this workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="gap-1">
                <Link to="/us-notices"><Plus className="w-3.5 h-3.5" /> US Notice</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-1">
                <Link to="/eu-notices"><Plus className="w-3.5 h-3.5" /> EU Notice</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-1">
                <Link to="/ropa"><Plus className="w-3.5 h-3.5" /> RoPA</Link>
              </Button>
            </div>
          </div>

          {authLoading || loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-brand-navy" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-brand-cloud bg-white p-10 text-center">
              <p className="text-sm text-slate">
                No notices or RoPA records yet for this workspace.
              </p>
              <p className="text-xs text-brand-mist mt-1">
                Use the buttons above to generate your first file.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-brand-cloud bg-white overflow-hidden">
              <div className="hidden md:grid grid-cols-[1fr_140px_120px_140px_120px] gap-3 px-4 py-2.5 bg-brand-cloud/40 text-[11px] font-semibold uppercase tracking-wide text-slate">
                <span>Document</span>
                <span>Type</span>
                <span>Status</span>
                <span>Updated</span>
                <span className="text-right">Actions</span>
              </div>
              <ul className="divide-y divide-brand-cloud">
                {rows.map((row) => {
                  const meta = KIND_META[row.kind];
                  const Icon = meta.icon;
                  const subtitle = subtitleByKind(row);
                  const updated = row.completed_at || row.updated_at || row.created_at;
                  return (
                    <li
                      key={`${row.kind}-${row.id}`}
                      className="grid grid-cols-1 md:grid-cols-[1fr_140px_120px_140px_120px] gap-3 items-center px-4 py-3 hover:bg-brand-cloud/20 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-1.5 rounded-md bg-brand-navy/5 text-brand-navy shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={meta.viewPath(row.id)}
                            className="text-sm font-semibold text-brand-navy hover:text-brand-teal truncate block"
                          >
                            {meta.label}
                          </Link>
                          <p className="text-[11px] text-brand-mist truncate">
                            {subtitle || `Created ${formatDate(row.created_at)}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-slate md:block">
                        <Badge variant="outline" className="text-[10px]">
                          {row.kind === "us" ? "US Notice" : row.kind === "eu" ? "EU Notice" : "RoPA"}
                        </Badge>
                      </div>
                      <div>{statusBadge(row.status)}</div>
                      <div className="text-xs text-slate">{formatDate(updated)}</div>
                      <div className="md:text-right">
                        <Button asChild size="sm" variant="ghost" className="gap-1">
                          <Link to={meta.viewPath(row.id)}>
                            View
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </PageContainer>
    </WorkspaceLayout>
  );
}
