import { Link } from "react-router-dom";

interface RuleCardProps {
  label: string;
  requirement: string;
  detail?: string;
  accentColor?: "orange" | "sky" | "teal" | "amber" | "red";
  enforcementLink?: string;
}

export function RuleCard({
  label,
  requirement,
  detail,
  accentColor = "sky",
  enforcementLink,
}: RuleCardProps) {
  const borderColor = {
    orange: "border-l-orange-500 bg-orange-50",
    sky: "border-l-sky-600 bg-sky-50",
    teal: "border-l-teal-600 bg-teal-50",
    amber: "border-l-amber-500 bg-amber-50",
    red: "border-l-red-600 bg-red-50",
  }[accentColor];

  const labelColor = {
    orange: "text-orange-800",
    sky: "text-sky-800",
    teal: "text-teal-800",
    amber: "text-amber-800",
    red: "text-red-800",
  }[accentColor];

  return (
    <div className={`border-l-4 rounded-r-lg px-5 py-4 mb-4 ${borderColor}`}>
      <p className={`text-[10px] font-bold tracking-wider uppercase mb-2 ${labelColor}`}>{label}</p>
      <p className="text-[14px] font-medium text-navy leading-relaxed mb-1">{requirement}</p>
      {detail && <p className="text-[13px] text-slate leading-relaxed">{detail}</p>}
      {enforcementLink && (
        <Link to={enforcementLink} className="text-[12px] text-sky-700 hover:underline mt-2 inline-block">
          See enforcement examples →
        </Link>
      )}
    </div>
  );
}
