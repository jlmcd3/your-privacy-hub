// Compact card on /dashboard showing the user's 3 most-recent reports across all tools.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, ArrowRight } from "lucide-react";

type Item = { id: string; tool_label: string; created_at: string; view_path: string; summary: string };

const fetchTool = async (
  table: any,
  userId: string,
  cols: string,
  toToken: (r: any) => Item,
): Promise<Item[]> => {
  const { data } = await supabase.from(table).select(cols).eq("user_id", userId).order("created_at", { ascending: false }).limit(3);
  return (data || []).map(toToken);
};

export default function RecentReportsCard() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const lists = await Promise.all([
        fetchTool("li_assessments", user.id, "id, created_at, processing_description", (r: any) => ({
          id: r.id, tool_label: "Legitimate Interest Assessment", created_at: r.created_at,
          view_path: `/li-assessment/result/${r.id}`,
          summary: (r.processing_description || "").slice(0, 80),
        })),
        fetchTool("dpia_frameworks", user.id, "id, created_at, intake_data", (r: any) => ({
          id: r.id, tool_label: "DPIA Framework", created_at: r.created_at,
          view_path: `/dpia-framework/result/${r.id}`,
          summary: r.intake_data?.processing_name || "DPIA",
        })),
        fetchTool("governance_assessments", user.id, "id, created_at, intake_data", (r: any) => ({
          id: r.id, tool_label: "Governance Assessment", created_at: r.created_at,
          view_path: `/governance-assessment/result/${r.id}`,
          summary: r.intake_data?.organisation_name || "Governance",
        })),
        fetchTool("dpa_documents", user.id, "id, created_at, intake_data", (r: any) => ({
          id: r.id, tool_label: "Custom DPA", created_at: r.created_at,
          view_path: `/dpa-generator/result/${r.id}`,
          summary: `${r.intake_data?.controllerName || "Controller"} → ${r.intake_data?.processorName || "Processor"}`,
        })),
        fetchTool("ir_playbooks", user.id, "id, created_at, intake_data", (r: any) => ({
          id: r.id, tool_label: "Breach Response Playbook", created_at: r.created_at,
          view_path: `/ir-playbook/result/${r.id}`,
          summary: `Incident · ${(r.intake_data?.jurisdictions || []).join(", ") || "—"}`,
        })),
        fetchTool("biometric_assessments", user.id, "id, created_at, jurisdictions", (r: any) => ({
          id: r.id, tool_label: "Biometric Compliance", created_at: r.created_at,
          view_path: `/biometric-checker/result/${r.id}`,
          summary: (r.jurisdictions || []).join(", ") || "Biometric",
        })),
      ]);
      const merged = lists.flat()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
      setItems(merged);
    })();
  }, [user]);

  if (items.length === 0) return null;

  return (
    <section className="bg-card border border-border rounded-2xl p-5 my-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-navy text-[16px] flex items-center gap-2">
          <FileText className="w-4 h-4" /> Recent reports
        </h2>
        <Link to="/dashboard/reports" className="text-[12px] font-semibold text-primary hover:underline">
          View all <ArrowRight className="w-3 h-3 inline" />
        </Link>
      </div>
      <ul className="divide-y divide-border/50">
        {items.map((it) => (
          <li key={`${it.tool_label}-${it.id}`}>
            <Link to={it.view_path} className="flex items-center justify-between py-2.5 group no-underline">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-navy group-hover:text-primary truncate">{it.tool_label}</p>
                <p className="text-[12px] text-slate truncate">{it.summary}</p>
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-3">
                {new Date(it.created_at).toLocaleDateString()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
