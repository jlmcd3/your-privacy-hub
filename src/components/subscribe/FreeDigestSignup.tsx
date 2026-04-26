import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "Please enter a valid email address" })
  .max(255, { message: "Email must be less than 255 characters" });

type Status = "idle" | "loading" | "success" | "duplicate" | "error";

interface FreeDigestSignupProps {
  /** Tag written to email_signups.source (defaults to "website") */
  source?: string;
  className?: string;
}

const FreeDigestSignup = ({ source = "website", className = "" }: FreeDigestSignupProps) => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setStatus("error");
      setErrorMsg(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }

    setStatus("loading");

    try {
      const { data, error } = await supabase.functions.invoke("subscribe-email", {
        body: { email: parsed.data, source },
      });

      if (error) throw error;

      const body = data as { success?: boolean; error?: string };
      if (body?.error === "already_subscribed") {
        setStatus("duplicate");
      } else if (body?.success) {
        setStatus("success");
      } else {
        throw new Error(body?.error ?? "Unknown response");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  return (
    <section
      className={`bg-card border border-border rounded-2xl p-6 md:p-8 ${className}`}
      aria-labelledby="free-digest-signup-heading"
    >
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-[11px] font-bold tracking-widest uppercase text-accent mb-2">
          Free — no card required
        </p>
        <h2
          id="free-digest-signup-heading"
          className="font-display text-2xl md:text-3xl text-foreground mb-2"
        >
          Not ready for the full Intelligence Brief?
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Get the personalized weekly digest free — filtered to your regions and topics, every Monday.
        </p>

        {status === "success" ? (
          <p className="text-sm font-medium text-accent" role="status">
            ✓ You're subscribed — check your inbox Monday.
          </p>
        ) : status === "duplicate" ? (
          <p className="text-sm font-medium text-primary" role="status">
            You're already subscribed — see you Monday!
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
            noValidate
          >
            <label htmlFor="free-digest-email" className="sr-only">
              Email address
            </label>
            <input
              id="free-digest-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              maxLength={255}
              autoComplete="email"
              className="flex-1 px-4 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:border-primary transition-colors"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="px-5 py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {status === "loading" ? "Subscribing…" : "Get free digest"}
            </button>
          </form>
        )}

        {status === "error" && errorMsg && (
          <p className="text-xs text-destructive mt-3" role="alert">
            {errorMsg}
          </p>
        )}
      </div>
    </section>
  );
};

export default FreeDigestSignup;
