import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { INTELLIGENCE_PRICING } from "@/config/pricing";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/onboarding-profile";

  const blockExfil = (e: React.ClipboardEvent | React.DragEvent) => {
    e.preventDefault();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirect
          ? `${window.location.origin}${redirect}`
          : window.location.origin,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      window.location.href = `/check-email?redirect=${encodeURIComponent(redirect)}&email=${encodeURIComponent(email.trim())}`;
      return;
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Helmet>
        <title>Create Account | End User Privacy</title>
        <meta name="description" content={`Create a free End User Privacy account. Get a personalized weekly digest covering your regions and topics. Intelligence Briefs from ${INTELLIGENCE_PRICING.monthly()}.`} />
      </Helmet>
      <div className="flex items-center justify-center min-h-full py-16 px-4">

        {/* Form panel */}
        <div className="w-full flex items-center justify-center bg-paper">
          <div className="w-full max-w-md bg-card border border-fog rounded-2xl shadow-eup-sm p-8">
            <h1 className="font-display text-[24px] text-navy text-center mb-1.5">Create Account</h1>
            <p className="text-sm text-slate text-center mb-7">
              {redirect.includes("subscribe") || redirect.includes("success")
                ? "Create your account to complete your Intelligence subscription"
                : `Join End User Privacy — free to browse, Intelligence from ${INTELLIGENCE_PRICING.monthly()}`}
            </p>

            {message && (
              <div className="mb-5 p-3 rounded-lg bg-accent/10 border border-accent/30 text-accent text-[13px] text-center">
                {message}
              </div>
            )}
            {error && (
              <div className="mb-5 p-3 rounded-lg bg-warn/10 border border-warn/30 text-warn text-[13px] text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-navy mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  className="w-full px-3.5 py-2.5 text-[14px] bg-paper border border-silver rounded-lg text-navy outline-none placeholder:text-slate-light focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-navy mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onCopy={blockExfil}
                    onCut={blockExfil}
                    onDragStart={blockExfil}
                    onDrop={blockExfil}
                    autoComplete="new-password"
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    className="w-full px-3.5 py-2.5 pr-11 text-[14px] bg-paper border border-silver rounded-lg text-navy outline-none placeholder:text-slate-light focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
                    placeholder="Min. 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-slate hover:text-navy transition-colors bg-transparent border-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[13px] text-navy leading-snug">
                  I agree to the{" "}
                  <Link to="/terms" className="font-bold underline text-blue hover:text-steel">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy-policy" className="font-bold underline text-blue hover:text-steel">
                    Privacy Policy
                  </Link>
                  .
                </p>
                <label className="flex items-start gap-2 cursor-pointer text-[13px] text-navy">
                  <input
                    type="checkbox"
                    required
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-silver text-blue focus:ring-blue cursor-pointer"
                    aria-label="I agree to the Terms of Service and Privacy Policy"
                  />
                  <span>I agree</span>
                </label>
              </div>
              <button
                type="submit"
                disabled={loading || !agreed}
                className="w-full py-3 text-[14px] font-semibold text-navy bg-gold rounded-lg shadow-[0_2px_8px_rgba(200,146,42,0.35)] hover:bg-gold/90 hover:-translate-y-px transition-all disabled:opacity-50 cursor-pointer border-none"
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>

            <p className="text-[13px] text-slate text-center mt-6">
              Already have an account?{" "}
              <Link
                to={`/login?redirect=${encodeURIComponent(redirect)}`}
                className="text-blue font-medium hover:underline no-underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Signup;
