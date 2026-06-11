import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface ResearchToolCTAProps {
  toolName: string;
  toolDescription: string;
  href: string;
  context?: string;
}

export function ResearchToolCTA({
  toolName,
  toolDescription,
  href,
  context,
}: ResearchToolCTAProps) {
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
        className="flex-shrink-0 flex items-center gap-1.5 text-sm font-semibold no-underline hover:underline"
        style={{ color: "hsl(var(--gold))" }}
      >
        Open tool <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
