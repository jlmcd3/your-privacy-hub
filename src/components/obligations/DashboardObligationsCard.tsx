import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface Obligation {
  id: string;
  title: string;
  due_date: string;
  days_until: number;
  severity: "overdue" | "due_soon" | "upcoming" | "scheduled";
  source_route: string;
  basis_type: "statutory" | "recommended";
}

const SEVERITY_LABEL: Record<Obligation["severity"], string> = {
  overdue: "Overdue", due_soon: "Due soon", upcoming: "Upcoming", scheduled: "Scheduled",
};

function variant(s: Obligation["severity"]): "default" | "destructive" | "secondary" {
  if (s === "overdue") return "destructive";
  if (s === "due_soon") return "default";
  return "secondary";
}

export default function DashboardObligationsCard() {
  const [items, setItems] = useState<Obligation[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("get-obligations", { body: {} });
        const arr = ((data as any)?.obligations as Obligation[]) || [];
        setItems(arr.slice(0, 5));
      } catch {
        setItems([]);
      }
    })();
  }, []);

  return (
    <section className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-eup-sm hover:shadow-eup-md motion-safe:transition-shadow motion-reduce:transition-none">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-lg text-brand-navy">Obligations</h2>
        <Link to="/obligations" className="text-sm text-brand-teal-text hover:underline">View all →</Link>
      </div>
      {items === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming obligations from your generated documents.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((o) => (
            <li key={o.id} className="flex items-center gap-3 border-b last:border-b-0 pb-2 last:pb-0 px-2 -mx-2 rounded-md hover:bg-muted/40 motion-safe:transition-colors motion-reduce:transition-none">
              <Badge variant={variant(o.severity)}>{SEVERITY_LABEL[o.severity]}</Badge>
              <Link to={o.source_route} className="text-sm text-foreground hover:underline flex-1 min-w-0 truncate">
                {o.title}
              </Link>
              <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                <Clock className="w-3 h-3" />
                {o.days_until < 0 ? `${Math.abs(o.days_until)}d overdue` : `in ${o.days_until}d`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
