import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";

interface ResearchSynthesisBlockProps {
  sectionKey: string;
}

export function ResearchSynthesisBlock({ sectionKey }: ResearchSynthesisBlockProps) {
  const [data, setData] = useState<{
    synthesis_text: string;
    generated_at: string;
    article_count: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("research_syntheses")
      .select("synthesis_text, generated_at, article_count")
      .eq("section_key", sectionKey)
      .single()
      .then(({ data: row }) => {
        if (row?.synthesis_text) setData(row as any);
        setLoading(false);
      });
  }, [sectionKey]);

  if (loading || !data) return null;

  const updatedDate = data.generated_at
    ? new Date(data.generated_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className="mt-6 mb-2 rounded-r-lg"
      style={{
        borderLeft: "3px solid hsl(var(--cobalt))",
        background: "hsl(210 52% 97%)",
        padding: "1rem 1.25rem",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(var(--cobalt))" }} />
        <span className="text-eyebrow" style={{ color: "hsl(var(--cobalt))" }}>
          Recent Developments — Last 30 Days
        </span>
      </div>

      <div className="text-body text-gray-700 space-y-3" style={{ lineHeight: "1.65" }}>
        {data.synthesis_text.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {updatedDate && (
        <p className="text-meta text-gray-400 mt-3">
          Updated {updatedDate}
          {data.article_count > 0 && ` · based on ${data.article_count} monitored sources`}
        </p>
      )}
    </div>
  );
}
