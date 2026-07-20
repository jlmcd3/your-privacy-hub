// Pre-fetches targeted enforcement signal summaries on page load.
// Uses the enforcement_actions table (119-regulator corpus).
// Returns pre-computed signal text per question key — no AI, deterministic queries.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EnforcementSignal {
  summary: string;
  caseCount: number;
}

export type EnforcementSignalMap = Record<string, EnforcementSignal>;

const SIGNAL_QUERIES: Record<string, {
  descriptionForUser: string;
  filter: (q: any) => any;
}> = {
  sell_share: {
    descriptionForUser: "Undisclosed data selling and sharing",
    filter: (q) => q
      .or("violation.ilike.%sell%,violation.ilike.%share%,key_compliance_failure.ilike.%sharing%,key_compliance_failure.ilike.%opt-out%"),
  },
  opt_out_link: {
    descriptionForUser: "Missing or non-functional opt-out mechanisms",
    filter: (q) => q
      .or("key_compliance_failure.ilike.%opt-out%,key_compliance_failure.ilike.%opt out%,violation.ilike.%opt-out%"),
  },
  sensitive_pi: {
    descriptionForUser: "Sensitive PI — biometric, health, children's data",
    filter: (q) => q
      .or("biometric_related.eq.true,violation.ilike.%biometric%,violation.ilike.%health%,violation.ilike.%child%,key_compliance_failure.ilike.%sensitive%"),
  },
  authentication: {
    descriptionForUser: "Authentication and credential failures",
    filter: (q) => q
      .or("key_compliance_failure.ilike.%authentication%,key_compliance_failure.ilike.%credential%,key_compliance_failure.ilike.%password%,key_compliance_failure.ilike.%mfa%"),
  },
  vulnerability: {
    descriptionForUser: "Unpatched vulnerabilities",
    filter: (q) => q
      .or("key_compliance_failure.ilike.%patch%,key_compliance_failure.ilike.%vulnerability%,key_compliance_failure.ilike.%cve%"),
  },
  incident_response: {
    descriptionForUser: "Incident response failures",
    filter: (q) => q
      .eq("breach_related", true)
      .or("key_compliance_failure.ilike.%incident%,key_compliance_failure.ilike.%response%,key_compliance_failure.ilike.%notification%"),
  },
};

export function useEnforcementSignals(keys: (keyof typeof SIGNAL_QUERIES)[]): EnforcementSignalMap {
  const [signals, setSignals] = useState<EnforcementSignalMap>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results: EnforcementSignalMap = {};
      await Promise.all(
        keys.map(async (key) => {
          const config = SIGNAL_QUERIES[key];
          if (!config) return;
          try {
            const baseQuery = (supabase as any)
              .from("enforcement_actions")
              .select("regulator, jurisdiction, violation, key_compliance_failure, fine_eur", { count: "exact" })
              .not("verification_status", "eq", "rejected")
              // SWEEP-2 T11: exclude moderator-review rows from signal counts/samples.
              .not("verification_status", "eq", "requires_review")
              .order("fine_eur", { ascending: false })
              .limit(5);
            const { data, count } = await config.filter(baseQuery);
            if (cancelled) return;
            const caseCount = count ?? (data?.length ?? 0);
            const topCase = data?.[0];
            let summary = `${caseCount} enforcement action${caseCount !== 1 ? "s" : ""} in our 119-regulator corpus involve ${config.descriptionForUser}.`;
            if (topCase?.regulator && topCase?.violation) {
              summary += ` Most significant: ${topCase.regulator} — ${(topCase.violation as string).slice(0, 120)}.`;
            }
            summary += " Ensure your answer here is consistent with your actual practices and privacy policy.";
            results[key] = { summary, caseCount };
          } catch {
            // Silent — signals must never block the form
          }
        })
      );
      if (!cancelled) setSignals(results);
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return signals;
}
