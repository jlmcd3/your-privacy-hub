import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fireEmailCaptured } from "@/lib/analyticsEvents";

/**
 * Hybrid gate for /get-intelligence.
 * The truncated on-page preview (BriefBuilder) is ungated. This component
 * captures an email for full-preview delivery, saved preferences, and
 * future editions of the Monday Privacy Intelligence Report. Fires email_captured with source="get_intelligence".
 */
export default function GetIntelligenceEmailCapture() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.toLowerCase().trim();
    if (!clean) return;
    setBusy(true);
    setErr(null);
    try {
      const { error } = await (supabase as any)
        .from("email_signups")
        .insert({ email: clean, source: "get_intelligence" });
      // Duplicate-key errors are fine — the user is already on the list.
      if (error && !/duplicate|unique/i.test(error.message)) {
        setErr("Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      fireEmailCaptured("get_intelligence");
      setSent(true);
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <section className="mt-10 rounded-2xl border border-brand-cloud bg-card p-6 md:p-8 text-center">
        <p className="text-sm font-semibold text-brand-navy">
          You're on the list.
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          The full preview will arrive by email shortly, and your Monday
          Privacy Intelligence brief will follow every week.
        </p>
      </section>
    );
  }

  return (
    <section
      className="mt-10 rounded-2xl border border-brand-cloud bg-card p-6 md:p-8"
      aria-labelledby="get-intelligence-email-heading"
    >
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-[11px] font-bold tracking-widest uppercase text-brand-teal-text mb-2">
          Get the full preview
        </p>
        <h2
          id="get-intelligence-email-heading"
          className="font-display text-brand-navy mb-2"
        >
          Get the full preview and future Monday briefs by email
        </h2>
        <p className="text-sm text-slate mb-5 leading-relaxed">
          The on-page preview is truncated. Enter your email to receive the
          full sample brief, save your preferences, and get the Monday
          Privacy Intelligence Report every week.
        </p>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            className="flex-1 h-11 px-3.5 rounded-lg border border-silver bg-brand-cloud text-sm text-brand-navy outline-none placeholder:text-brand-mist focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-11 px-5 rounded-lg text-sm font-semibold text-white bg-brand-navy hover:opacity-90 disabled:opacity-50 border-none cursor-pointer"
          >
            {busy ? "Sending…" : "Send full preview"}
          </button>
        </form>
        {err && <p className="text-xs text-severity-warning mt-2">{err}</p>}
        <p className="text-[11px] text-muted-foreground mt-3">
          One-click unsubscribe in every email. See our{" "}
          <Link to="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>
    </section>
  );
}
