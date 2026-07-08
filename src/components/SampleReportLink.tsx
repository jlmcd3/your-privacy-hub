// Subtle "View a sample report" link inserted near primary CTAs on tool
// landing pages. Points at the matching /samples/:toolSlug public page.
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

interface Props {
  toolSlug: string;
  label?: string;
  className?: string;
  /** "outline" renders a Button-styled outline; "link" renders an inline text link. */
  variant?: "outline" | "link";
  /** Override hover/text classes when sitting on a dark hero. */
  tone?: "default" | "onDark";
}

export default function SampleReportLink({
  toolSlug,
  label = "View a sample report",
  className,
  variant = "outline",
  tone = "default",
}: Props) {
  if (variant === "link") {
    return (
      <Link
        to={`/samples/${toolSlug}`}
        className={`inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline ${
          tone === "onDark" ? "text-white/90 hover:text-white" : "text-brand-teal-text"
        } ${className ?? ""}`}
      >
        <FileText className="h-4 w-4" aria-hidden />
        {label}
      </Link>
    );
  }
  const base =
    tone === "onDark"
      ? "border-white/30 text-white hover:bg-white/10"
      : "border-brand-cloud text-brand-navy hover:bg-brand-cloud/40";
  return (
    <Link
      to={`/samples/${toolSlug}`}
      className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${base} ${className ?? ""}`}
    >
      <FileText className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}
