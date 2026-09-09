import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PersonStatus =
  | "registered"
  | "trialing"
  | "subscriber"
  | "cancelling"
  | "cancelled"
  | "past_due"
  | "closed"
  | "terminated";

export interface PersonRow {
  user_id: string;
  email: string | null;
  status: PersonStatus;
  registered_at: string | null;
  first_subscribed_at: string | null;
  cancelled_at: string | null;
  terminated_at: string | null;
  trial_end: string | null;
  subscription_type: string | null;
  subscription_interval: string | null;
  subscription_end_date: string | null;
  cancel_at_period_end: boolean | null;
  payment_failed: boolean | null;
  marketing_opt_out: boolean | null;
  accepted_privacy_policy_id: string | null;
  accepted_privacy_notice_id: string | null;
  accepted_terms_id: string | null;
  last_sign_in_at: string | null;
  closed_at: string | null;
  closure_type: string | null;
  purge_after: string | null;
  termination_reason: string | null;
}

export const STATUS_LABEL: Record<PersonStatus, string> = {
  registered: "Registered",
  trialing: "Trial",
  subscriber: "Subscriber",
  cancelling: "Cancelling",
  cancelled: "Cancelled",
  past_due: "Past due",
  closed: "Closed",
  terminated: "Terminated",
};

export interface BannedUserRow {
  id: string;
  email: string;
  reason: string;
  closed_at: string;
  ban_expires_at: string;
}

/** Loads the single master people list every admin screen is built on. */
export function useAdminPeople() {
  const [rows, setRows] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc("admin_list_people");
      if (cancelled) return;
      if (error) setError(error.message);
      else setRows((data as PersonRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rows, loading, error };
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const lines = [header.join(",")];
  for (const r of rows) lines.push(r.map(csvEscape).join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
