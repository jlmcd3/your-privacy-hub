import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EmailSignupProps {
  variant?: "strip" | "card";
  className?: string;
}

const EmailSignup = ({ variant = "card", className = "" }: EmailSignupProps) => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "duplicate">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setStatus("loading");

    try {
      const { data, error } = await supabase.functions.invoke("subscribe-email", {
        body: { email },
      });

      if (error) throw error;

      const body = data as any;
      if (body?.error === "already_subscribed") {
        setStatus("duplicate");
      } else {
        setStatus("success");
      }
    } catch {
      setStatus("error");
    }
  };

  if (variant === "strip") {
    return (
      <div className={`bg-gradient-to-r from-navy to-navy-mid py-8 px-4 md:px-8 ${className}`}>
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h3 className="font-display text-lg text-white mb-1">
              Free: the full weekly Intelligence Brief, every Monday
            </h3>
            <p className="text-sm text-slate-light">
              8-section AI analysis of every significant privacy development.
              Enforcement table included. Always free.
            </p>
          </div>
          {status === "success" ? (
            <p className="text-sm font-medium text-accent">✓ You're subscribed — check your inbox Monday</p>
          ) : status === "duplicate" ? (
            <p className="text-sm font-medium text-sky">Already subscribed!</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="flex-1 md:w-[280px] px-4 py-2.5 rounded-lg text-sm bg-white/10 border border-white/20 text-white placeholder:text-white/50 outline-none focus:border-sky transition-colors"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="px-5 py-2.5 text-sm font-semibold text-navy bg-white rounded-lg hover:bg-white/90 transition-colors disabled:opacity-60"
              >
                {status === "loading" ? "…" : "Get free brief"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card border border-border rounded-xl p-5 ${className}`}>
      <h4 className="font-display text-base text-foreground mb-1">
        📬 Weekly Intelligence Brief — Free
      </h4>
      <p className="text-xs text-muted-foreground mb-3">
        Full 8-section AI analysis, every Monday. Enforcement table included.
        Always free with registration.
      </p>
      {status === "success" ? (
        <p className="text-sm font-medium text-accent">✓ You're subscribed — check your inbox Monday</p>
      ) : status === "duplicate" ? (
        <p className="text-sm font-medium text-primary">Already subscribed!</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:border-primary transition-colors"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-colors disabled:opacity-60"
          >
            {status === "loading" ? "…" : "Subscribe"}
          </button>
        </form>
      )}
      {status === "error" && <p className="text-xs text-destructive mt-2">Something went wrong. Please try again.</p>}
    </div>
  );
};

export default EmailSignup;
