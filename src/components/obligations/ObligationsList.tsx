// Renders a user's compliance obligations grouped by severity, with row actions
// to mark complete, snooze, or dismiss.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, CheckCircle2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

export interface Obligation {
  id: string;
  kind: string;
  title: string;
  due_date: string;
  days_until: number;
  severity: "overdue" | "due_soon" | "upcoming" | "scheduled";
  basis: string;
  basis_type: "statutory" | "recommended";
  source_route: string;
  acknowledged?: { action: string; created_at: string } | null;
}

const SEVERITY_LABEL: Record<Obligation["severity"], string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  upcoming: "Upcoming",
  scheduled: "Scheduled",
};

const SEVERITY_ORDER: Obligation["severity"][] = ["overdue", "due_soon", "upcoming", "scheduled"];

function severityVariant(s: Obligation["severity"]): "default" | "destructive" | "secondary" {
  if (s === "overdue") return "destructive";
  if (s === "due_soon") return "default";
  return "secondary";
}

function dueLine(o: Obligation): string {
  const dueDate = new Date(o.due_date).toLocaleDateString();
  if (o.days_until < 0) return `${dueDate} — ${Math.abs(o.days_until)} days overdue`;
  if (o.days_until === 0) return `${dueDate} — due today`;
  return `${dueDate} — in ${o.days_until} days`;
}

interface Props {
  clientId?: string;
}

export default function ObligationsList({ clientId }: Props) {
  const [loading, setLoading] = useState(true);
  const [obligations, setObligations] = useState<Obligation[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-obligations", {
        body: clientId ? { client_id: clientId } : {},
      });
      if (error) throw error;
      setObligations(((data as any)?.obligations as Obligation[]) || []);
    } catch (e) {
      console.error(e);
      setObligations([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const ack = async (obligation_id: string, action: "completed" | "snoozed" | "dismissed", snoozeDays?: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Sign in first"); return; }
    const row: any = { user_id: user.id, obligation_id, action };
    if (action === "snoozed" && snoozeDays) {
      const d = new Date();
      d.setDate(d.getDate() + snoozeDays);
      row.snooze_until = d.toISOString().slice(0, 10);
    }
    const { error } = await supabase.from("obligation_acknowledgements").insert(row);
    if (error) { toast.error(error.message); return; }
    toast.success(
      action === "completed" ? "Marked complete" : action === "snoozed" ? `Snoozed ${snoozeDays}d` : "Dismissed"
    );
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading obligations…</p>;
  if (obligations.length === 0) {
    return <p className="text-sm text-muted-foreground">No upcoming obligations from your generated documents.</p>;
  }

  const grouped: Record<Obligation["severity"], Obligation[]> = {
    overdue: [], due_soon: [], upcoming: [], scheduled: [],
  };
  for (const o of obligations) grouped[o.severity].push(o);

  return (
    <div className="space-y-6">
      {SEVERITY_ORDER.map((sev) => {
        const items = grouped[sev];
        if (!items.length) return null;
        return (
          <section key={sev}>
            <h3 className="text-sm font-semibold text-foreground mb-2">{SEVERITY_LABEL[sev]}</h3>
            <ul className="space-y-2">
              {items.map((o) => (
                <li key={o.id} className="border rounded-md p-3 bg-card flex items-start gap-3 flex-wrap shadow-eup-sm hover:shadow-eup-md motion-safe:transition-shadow motion-reduce:transition-none">
                  <Badge variant={severityVariant(o.severity)}>{SEVERITY_LABEL[o.severity]}</Badge>
                  <div className="flex-1 min-w-0">
                    <Link to={o.source_route} className="font-medium text-foreground hover:underline">
                      {o.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {dueLine(o)}
                    </p>
                    <p className="text-xs mt-1">
                      {o.basis_type === "recommended" && (
                        <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                          Good practice
                        </span>
                      )}
                      <span className="text-muted-foreground">{o.basis}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="min-h-11 min-w-11 md:min-h-9 md:min-w-9" onClick={() => ack(o.id, "completed")}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark complete
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" aria-label="More actions" className="min-h-11 min-w-11 md:min-h-9 md:min-w-9"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => ack(o.id, "snoozed", 30)}>Snooze 30 days</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => ack(o.id, "snoozed", 60)}>Snooze 60 days</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => ack(o.id, "snoozed", 90)}>Snooze 90 days</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="min-h-11 md:min-h-9">Dismiss</Button>

                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Dismiss this obligation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Dismissed obligations are hidden until the underlying source document is regenerated.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => ack(o.id, "dismissed")}>Dismiss</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
