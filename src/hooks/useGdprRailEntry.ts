// src/hooks/useGdprRailEntry.ts
// Fetches verbatim GDPR article text + recital context from the database.
// Returns a RailEntry for use with StatuteRail.
//
// gdpr_articles: Articles 1–99, jurisdictions "eu" and "uk", fully populated.
// gdpr_recitals: Recitals 1–173, fully populated — no backfill needed.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RailEntry } from "@/components/intake/StatuteRail";

export interface GdprRailEntryOpts {
  article: string;
  jurisdiction: "eu" | "uk";
  recital?: number;
  plainSummary: string;
  fieldLabel: string;
  enforcementNote?: string;
  relatedCitations?: { citation: string; label: string }[];
}

export interface GdprRailEntryState {
  entry: RailEntry | null;
  loading: boolean;
}

const EU_URL = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679";
const UK_URL = "https://www.legislation.gov.uk/eur/2016/679/contents";

export function useGdprRailEntry(opts: GdprRailEntryOpts | null): GdprRailEntryState {
  const [entry, setEntry] = useState<RailEntry | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!opts) { setEntry(null); return; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data: articleRows } = await (supabase as any)
          .from("gdpr_articles")
          .select("article_number, article_title, body_text, jurisdiction")
          .eq("article_number", opts.article)
          .in("jurisdiction", [opts.jurisdiction, "eu"])
          .limit(2);

        if (cancelled) return;

        const preferred = (articleRows ?? []).find(
          (r: any) => r.jurisdiction === opts.jurisdiction
        ) ?? (articleRows ?? [])[0] ?? null;

        const regulationText: string = preferred?.body_text ?? "";
        const articleTitle: string = preferred?.article_title
          ? ` — ${preferred.article_title as string}`
          : "";

        let fscrContext: string | undefined;
        if (opts.recital) {
          const { data: recitalRows } = await (supabase as any)
            .from("gdpr_recitals")
            .select("recital_number, body_text")
            .eq("recital_number", opts.recital)
            .limit(1);
          if (!cancelled && recitalRows?.[0]?.body_text) {
            fscrContext = `Recital ${opts.recital}: ${recitalRows[0].body_text as string}`;
          }
        }

        if (!cancelled) {
          setEntry({
            fieldLabel: opts.fieldLabel,
            citation: `Art. ${opts.article} ${opts.jurisdiction.toUpperCase()} GDPR${articleTitle}`,
            citationUrl: opts.jurisdiction === "uk" ? UK_URL : EU_URL,
            plainSummary: opts.plainSummary,
            regulationText: regulationText || "[Article text not available in corpus]",
            fscrContext,
            enforcementNote: opts.enforcementNote,
            relatedCitations: opts.relatedCitations,
          });
        }
      } catch {
        // Silent — rail is enhancement only
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [opts?.article, opts?.jurisdiction, opts?.recital]);

  return { entry, loading };
}
