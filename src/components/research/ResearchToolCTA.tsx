import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useConversionEvent } from "@/hooks/useConversionEvent";

interface ResearchToolCTAProps {
  toolName: string;
  toolDescription: string;
  href: string;
  context?: string;
}

// PP-1: any href pointing at a subscription/pricing surface is treated as a
// subscribe_cta_click. Anything else is a tool_start_click keyed off the last
// path segment.
const SUBSCRIBE_HREFS = new Set(["/subscribe", "/get-intelligence"]);

export function ResearchToolCTA({
  toolName,
  toolDescription,
  href,
  context,
}: ResearchToolCTAProps) {
  const fireConversion = useConversionEvent();
  const onClick = () => {
    if (SUBSCRIBE_HREFS.has(href)) {
      fireConversion("subscribe_cta_click", {
        cta_label: toolName,
        cta_position: "sidebar",
      });
    } else {
      const slug = href.replace(/^\//, "").split("/")[0] || href;
      fireConversion("tool_start_click", {
        tool_slug: slug,
        page_path: typeof window !== "undefined" ? window.location.pathname : "",
        user_type: "anonymous",
      });
    }
  };
  return (
    <div className="mt-5 rounded-r-lg bg-card border border-brand-cloud border-l-[3px] border-l-brand-navy px-4 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-eyebrow mb-0.5" style={{ color: "hsl(var(--gold))" }}>
          {context ?? "Compliance Tool"}
        </p>
        <p className="text-card-title text-gray-900">{toolName}</p>
        <p className="text-meta text-gray-500 mt-0.5">{toolDescription}</p>
      </div>
      <Link
        to={href}
        onClick={onClick}
        className="flex-shrink-0 flex items-center gap-1.5 text-sm font-semibold no-underline hover:underline"
        style={{ color: "hsl(var(--gold))" }}
      >
        Open tool <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
