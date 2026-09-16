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
            // Governance F21 (2026-09-15) — count only actions that cite the
            // requested provisions; a fallback pool is not a topic count.
            const matchedActions = actions.filter((a) => a?.topic_match !== false);
            const caseCount: number = typeof json.topic_matched_count === "number"
              ? json.topic_matched_count
              : matchedActions.length;
            const example = matchedActions.find((a) => a?.regulator && a?.violation) ?? null;
            const provisionLabel = config.articles.map((a) => a.replace(/^gdpr:/, "Art. ")).join(" / ");

            let summary: string;
            if (caseCount > 0) {
              summary = `${caseCount} GDPR enforcement action${caseCount !== 1 ? "s" : ""} in our corpus cite${caseCount === 1 ? "s" : ""} ${provisionLabel} GDPR — ${config.description}.`;
              if (example) summary += ` One example: ${example.regulator as string} — ${String(example.violation).slice(0, 100)}.`;
            } else {
              summary = `No action in our corpus cites ${provisionLabel} GDPR for ${config.description}; this is a general prompt, not evidence of enforcement on this point.`;
            }
            summary += " Ensure your answer is consistent with your actual practices and privacy policy.";

            results[key] = {
              summary,
              caseCount,
              example: example ? { regulator: String(example.regulator), violation: String(example.violation), url: typeof example.source_url === "string" ? example.source_url : null } : null,
              noTopicMatch: caseCount === 0,
            };
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
