import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

interface PremiumGateProps {
  /** Short message explaining what's behind the gate */
  message: string;
  /** If true, show the blurred preview style. If false, show a locked card only. */
  blur?: boolean;
  children?: React.ReactNode;
}

/**
 * Soft blur overlay with premium CTA — wraps gated content so free users
 * can see the shape but not the substance.
 */
export default function PremiumGate({ message, blur = true, children }: PremiumGateProps) {
  if (blur && children) {
    return (
      <div className="relative rounded-xl overflow-hidden">
        {/* Blurred content preview */}
        <div className="select-none pointer-events-none" style={{ filter: "blur(5px)" }} aria-hidden>
          {children}
        </div>
        {/* CTA overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
          <div className="text-center px-6 py-5 max-w-sm">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full mb-3">
              ⭐ Professional
            </span>
            <p className="text-[13px] text-muted-foreground leading-snug mb-3">{message}</p>
            <Link
              to="/subscribe"
              className="inline-block bg-gradient-to-br from-navy to-blue text-white font-semibold text-[13px] px-5 py-2 rounded-xl no-underline hover:opacity-90 transition-all"
            >
              See Plans →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // No children — locked card style
  return (
    <div className="bg-card rounded-xl border border-border p-6 text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Lock className="w-4 h-4 text-amber-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          ⭐ Professional
        </span>
      </div>
      <p className="text-[13px] text-muted-foreground mb-3">{message}</p>
      <Link
        to="/subscribe"
        className="inline-block bg-gradient-to-br from-navy to-blue text-white font-semibold text-[13px] px-5 py-2 rounded-xl no-underline hover:opacity-90 transition-all"
      >
        See Plans →
      </Link>
    </div>
  );
}
