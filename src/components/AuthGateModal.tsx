import { Link, useLocation } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Optional: where to send the user back after login/signup. Defaults to current path. */
  redirectTo?: string;
  /** Optional override for the heading. */
  heading?: string;
  /** Optional override for the body copy. */
  body?: string;
}

/**
 * Modal that gates a tool purchase behind a free account.
 * Shown when an unauthenticated visitor clicks a purchase CTA.
 */
export default function AuthGateModal({
  open,
  onClose,
  redirectTo,
  heading = "Sign in or create a free account to continue",
  body = "Your report will be saved to your account and emailed to you.",
}: Props) {
  const location = useLocation();
  const target = redirectTo ?? `${location.pathname}${location.search}`;
  const encoded = encodeURIComponent(target);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-card border border-border rounded-2xl max-w-[440px] w-full shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-display font-bold text-navy text-[20px] leading-snug">
            {heading}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-light hover:text-navy text-[24px] leading-none bg-transparent border-none cursor-pointer -mt-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-slate text-[13px] leading-relaxed mb-5">{body}</p>

        <div className="flex flex-col gap-2.5">
          <Link
            to={`/signup?redirect=${encoded}`}
            className="text-center bg-navy text-white font-bold text-[14px] py-3 px-5 rounded-xl no-underline hover:opacity-90 transition-all"
          >
            Create free account
          </Link>
          <Link
            to={`/login?redirect=${encoded}`}
            className="text-center bg-card border border-primary/40 text-primary font-semibold text-[14px] py-3 px-5 rounded-xl no-underline hover:bg-primary/5 transition-all"
          >
            Sign in
          </Link>
        </div>

        <p className="text-[11px] text-slate-light text-center mt-4">
          Intelligence subscribers receive subscriber pricing on every tool.
        </p>
      </div>
    </div>
  );
}
