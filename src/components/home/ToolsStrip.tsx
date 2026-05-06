import { Link } from "react-router-dom";

/**
 * Thin strip between the "How we can help" triptych and the
 * "Latest Privacy Updates" feed. Promotes the Pro tools catalog.
 */
export default function ToolsStrip() {
  return (
    <div className="bg-muted/50 border-y border-border text-center py-1.5 px-4">
      <p className="text-[11px] text-muted-foreground">
        🛠️ Compliance tools built on enforcement precedent
        <span className="text-border mx-1.5">·</span>
        <span className="text-amber-600 font-semibold">
          Assessments, DPIAs, LIAs, RoPA, privacy notices, breach playbooks & more
        </span>
        <span className="text-border mx-1.5">·</span>
        <Link to="/tools" className="text-primary font-semibold no-underline hover:underline">
          Browse all tools →
        </Link>
      </p>
    </div>
  );
}
