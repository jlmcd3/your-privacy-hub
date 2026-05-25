import { cn } from "@/lib/utils";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-severity-critical/10 text-severity-critical border-severity-critical/30",
  high: "bg-severity-warning/10 text-severity-warning border-severity-warning/30",
  medium: "bg-brand-cloud text-brand-slate-teal border-brand-mist",
  low: "bg-brand-cloud text-brand-steel border-brand-mist",
  info: "bg-brand-cloud text-brand-ocean border-brand-mist",
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

/**
 * Functional severity badge for data displays only — feed articles, tool
 * findings, validation errors, status indicators. Never used on buttons,
 * links, marketing surfaces, or navigation chrome (brand guidelines §8).
 */
export function SeverityBadge({
  severity,
  label,
  className,
}: {
  severity: Severity;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-[0.12em] border",
        SEVERITY_STYLES[severity],
        className
      )}
    >
      {label ?? SEVERITY_LABELS[severity]}
    </span>
  );
}

export default SeverityBadge;
