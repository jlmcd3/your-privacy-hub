import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Sprint 7 — Verification badge for CPPA citations.
 * Looks up each citation against `cppa_authorities` where status='current'.
 * Returns a Set of citations that matched (verified=true).
 *
 * Match rule: case-insensitive exact match on the `citation` field.
 * Anything not matched is treated as unverified — the UI surfaces this
 * to the user so they can independently verify against the primary source.
 */
export function useCitationVerification(citations: string[]) {
  const [verified, setVerified] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const key = citations
    .map((c) => (c || "").trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("|");

  useEffect(() => {
    let cancelled = false;
    const list = Array.from(new Set(citations.map((c) => (c || "").trim().toLowerCase()).filter(Boolean)));
    if (list.length === 0) {
      setVerified(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    // Fetch ALL current citations (corpus is small, ~100 rows) and match
    // case-insensitively in JS — PostgREST `.in()` is case-sensitive and would
    // miss rows whose stored casing differs from caller input.
    supabase
      .from("cppa_authorities")
      .select("citation")
      .eq("status", "current")
      .then(({ data }) => {
        if (cancelled) return;
        const ok = new Set<string>();
        const lookup = new Set(list);
        (data ?? []).forEach((r: any) => {
          const norm = String(r?.citation ?? "").trim().toLowerCase();
          if (norm && lookup.has(norm)) ok.add(norm);
        });
        setVerified(ok);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const isVerified = (c: string | null | undefined) =>
    !!c && verified.has(String(c).trim().toLowerCase());

  return { isVerified, loading };
}
