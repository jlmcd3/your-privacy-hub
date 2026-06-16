// src/hooks/useGdprEnforcementSignals.ts
// Fetches GDPR-regime enforcement signals via the get-enforcement-context edge function.
// regime="gdpr" applies the EU/EEA jurisdiction whitelist — prevents US enforcement
// actions appearing on GDPR questions.
//
// Only fires when enabled=true (i.e. guidanceTier.tier === "paid").
// Silent absence for all other tiers.

import { useEffect, useState } from "react";
import type { EnforcementSignalMap } from "@/hooks/useEnforcementSignals";

const SIGNAL_CONFIGS: Record<string, {
  articles: string[];
  description: string;
}> = {
  special_categories: {
    articles: ["gdpr:9"],
    description: "unlawful processing of special category data",
  },
  breach_notification: {
    articles: ["gdpr:33"],
    description: "failure to notify the supervisory authority within 72 hours",
  },
  dpo_absence: {
    articles: ["gdpr:37"],
    description: "failure to designate a required Data Protection Officer",
  },
  dpia_absence: {
    articles: ["gdpr:35"],
    description: "failure to conduct a mandatory Data Protection Impact Assessment",
  },
  processor_contract: {
    articles: ["gdpr:28"],
    description: "inadequate or absent processor contracts",
  },
  biometric: {
    articles: ["gdpr:9"],
    description: "unlawful biometric data processing without an Art. 9(2) condition",
  },
  international_transfer: {
    articles: ["gdpr:44", "gdpr:46"],
    description: "unlawful international data transfer without an Art. 46 mechanism",
  },
};

export function useGdprEnforcementSignals(
  keys: (keyof typeof SIGNAL_CONFIGS)[],
  enabled: boolean
): EnforcementSignalMap {
  const [signals, setSignals] = useState<EnforcementSignalMap>({});

  useEffect(() => {
    if (!enabled || !keys.length) return;
    let cancelled = false;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

    (async () => {
      const results: EnforcementSignalMap = {};
      await Promise.all(
        keys.map(async (key) => {
          const config = SIGNAL_CONFIGS[key];
          if (!config) return;
          try {
            const url = new URL(`${supabaseUrl}/functions/v1/get-enforcement-context`);
            url.searchParams.set("regime", "gdpr");
            url.searchParams.set("articles", config.articles.join(","));
            url.searchParams.set("limit", "5");

            const res = await fetch(url.toString(), {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            });
            if (!res.ok || cancelled) return;

            const json = await res.json();
            const actions: any[] = json.results ?? json.enforcement_context ?? [];
            const caseCount: number = json.total_matched ?? actions.length;
            const topCase = actions[0];

            let summary = `${caseCount} GDPR enforcement action${caseCount !== 1 ? "s" : ""} in our corpus involve ${config.description}.`;
            if (topCase?.regulator && topCase?.violation) {
              summary += ` Most significant: ${topCase.regulator as string} — ${String(topCase.violation).slice(0, 100)}.`;
            }
            summary += " Ensure your answer is consistent with your actual practices and privacy policy.";

            results[key] = { summary, caseCount };
          } catch {
            // Silent — signals must never block the form
          }
        })
      );
      if (!cancelled) setSignals(results);
    })();

    return () => { cancelled = true; };
  }, [enabled, JSON.stringify(keys)]);

  return signals;
}
