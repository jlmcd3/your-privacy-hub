import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useConversionEvent } from "@/hooks/useConversionEvent";

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
  const fireConversion = useConversionEvent();
  const target = redirectTo ?? `${location.pathname}${location.search}`;
  const encoded = encodeURIComponent(target);

  // PP-1 D3: firing the unauthenticated-redirect-gate leg of signup_initiated
  // when the auth gate is presented on an intake route. referrer_path is the
  // route the user was trying to complete (the intake page). variant is
  // "page-load" here since the gate is a page-scoped modal.
  useEffect(() => {
    if (!open) return;
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    fireConversion("signup_initiated", {
      referrer_path: location.pathname,
      utm_source: params.get("utm_source") || "",
      utm_campaign: params.get("utm_campaign") || "",
      variant: "page-load",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
          <h2 className="font-display text-brand-navy leading-snug">
            {heading}
          </h2>
          <button
            onClick={onClose}
            className="text-brand-mist hover:text-brand-navy text-[24px] leading-none bg-transparent border-none cursor-pointer -mt-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-slate text-sm leading-relaxed mb-5">{body}</p>

        <div className="flex flex-col gap-2.5">
          <Link
            to={`/signup?redirect=${encoded}`}
            onClick={() =>
              fireConversion("signup_initiated", {
                referrer_path: location.pathname,
                utm_source: "",
                utm_campaign: "",
                variant: "form-engagement",
              })
            }
            className="text-center bg-brand-navy text-white font-bold text-[14px] py-3 px-5 rounded-xl no-underline hover:opacity-90 transition-all"
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

        <p className="text-[11px] text-brand-mist text-center mt-4">
          Intelligence subscribers receive subscriber pricing on every tool.
        </p>
      </div>
    </div>
  );
}
