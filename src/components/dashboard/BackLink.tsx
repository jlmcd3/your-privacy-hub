// Explicit "back" affordance for detail pages.
// Browser back works natively, but mobile users + email-link arrivals need a visible way out.

import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackLinkProps {
  to: string;
  label: string;
  className?: string;
}

export default function BackLink({ to, label, className }: BackLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-1 text-[13px] text-slate hover:text-navy no-underline font-medium transition-colors",
        className,
      )}
    >
      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
