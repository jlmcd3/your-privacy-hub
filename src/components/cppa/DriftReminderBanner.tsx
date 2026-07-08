// Sprint 3 — Control-Drift Monitor: in-app reminder banner.
// Surfaces any cppa_drift_reminders rows that are due (scheduled_for <= now,
// not sent, not dismissed). Renders on dashboards / pages where it's mounted.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, Bell } from "lucide-react";

type Reminder = {
  id: string;
  assessment_id: string;
  scheduled_for: string;
  module: string;
};

export default function DriftReminderBanner() {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("cppa_drift_reminders")
        .select("id,assessment_id,scheduled_for,module")
        .lte("scheduled_for", new Date().toISOString())
        .is("sent_at", null)
        .is("dismissed_at", null)
        .order("scheduled_for", { ascending: true });
      if (error) { console.warn("drift reminders fetch failed", error); return; }
      if (!cancelled) setReminders((data ?? []) as Reminder[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const dismiss = async (id: string) => {
    await supabase
      .from("cppa_drift_reminders")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", id);
    setReminders((r) => r.filter((x) => x.id !== id));
  };

  if (reminders.length === 0) return null;

  return (
    <div className="space-y-2">
      {reminders.map((r) => (
        <div key={r.id} className="flex items-start gap-3 p-4 bg-brand-teal/5 border border-brand-teal/30 rounded-lg">
          <Bell className="w-4 h-4 mt-0.5 text-brand-teal-text shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Time to re-run your CPPA Cybersecurity assessment</p>
            <p className="text-xs text-muted-foreground mt-1">
              It's been close to a year since your last assessment ({new Date(r.scheduled_for).toLocaleDateString()} reminder).
              Re-running now produces a side-by-side drift comparison so you can show the auditor what changed over the year.
            </p>
            <div className="mt-2 flex gap-2 flex-wrap">
              <Button asChild size="sm">
                <Link to={`/cppa-cybersecurity?from=${r.assessment_id}`}>Re-run for drift comparison</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to={`/cppa-cybersecurity/result/${r.assessment_id}`}>View prior assessment</Link>
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismiss(r.id)}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Dismiss reminder"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
