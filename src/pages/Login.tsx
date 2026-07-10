import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const blockExfil = (e: React.ClipboardEvent | React.DragEvent) => {
    e.preventDefault();
  };
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  // Only honor same-origin, in-app paths; ignore /login itself
  const safeRedirect =
    redirectParam &&
    redirectParam.startsWith("/") &&
    !redirectParam.startsWith("//") &&
    !redirectParam.startsWith("/login")
      ? redirectParam
      : null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Single-active-session policy: revoke this user's sessions on all other
    // devices. Two people sharing one login will repeatedly sign each other
    // out. Non-blocking: a failure here must never prevent a valid login.
    try {
      await supabase.auth.signOut({ scope: "others" });
    } catch (e) {
      console.warn("session revocation (scope: others) failed — continuing login", e);
    }

    if (safeRedirect) {
      navigate(safeRedirect);
      return;
    }

    // Smart default: premium → /dashboard, free → /updates
    let destination = "/updates";
    try {
      const userId = signInData.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_premium")
          .eq("id", userId)
          .maybeSingle();
        if (profile?.is_premium) destination = "/dashboard";
      }
    } catch {
      // fall through to /updates default
    }
    navigate(destination);
  };

  return (
    <div className="min-h-screen bg-brand-cloud flex flex-col">
      <Helmet>
        <title>Sign In | End User Privacy</title>
        <meta name="description" content="Sign in to your End User Privacy account to access your personalized dashboard, weekly digest, and Privacy Intelligence Reports." />
      </Helmet>
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* Left panel — hidden on mobile */}
        <div className="hidden lg:flex lg:w-[420px] bg-gradient-to-br from-brand-navy to-brand-steel flex-col justify-center px-12 py-16">
          <div className="text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-4">End User Privacy</div>
          <h2 className="font-display text-white leading-tight mb-6">
            Global privacy law, tracked daily.
          </h2>
          <div className="space-y-4">
            {[
              'Regulatory authorities monitored across the world',
              'Key developments covered',

              'Weekly digest — free',
              `Intelligence from ${INTELLIGENCE_PRICING.monthly()}`,
              `Professional from ${PLATFORM_PRICING.standardMonthly()} base + ${PLATFORM_PRICING.clientAddon()}`,
            ].map(item => (
              <div key={item} className="flex items-center gap-3 text-blue-200 text-[14px]">
                <span className="text-accent font-bold">✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 flex items-center justify-center py-16 px-4 bg-brand-cloud">
          <div className="w-full max-w-md bg-card border border-brand-cloud rounded-2xl shadow-eup-sm p-8">
            <h1 className="font-display text-brand-navy text-center mb-1.5">Sign In</h1>
            <p className="text-sm text-slate text-center mb-7">
              {safeRedirect?.includes("subscribe")
                ? "Sign in to complete your subscription"
                : safeRedirect?.includes("dashboard")
                ? "Sign in to access your Privacy Intelligence Report"
                : safeRedirect?.includes("account")
                ? "Sign in to manage your account"
                : "Global privacy law, tracked daily — sign in to pick up where you left off."}
            </p>

            {error && (
              <div className="mb-5 p-3 rounded-lg bg-severity-warning/10 border border-severity-warning/30 text-severity-warning text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-navy mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-[14px] bg-brand-cloud border border-silver rounded-lg text-brand-navy outline-none placeholder:text-brand-mist focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-colors"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-navy mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onCopy={blockExfil}
                    onCut={blockExfil}
                    onDragStart={blockExfil}
                    onDrop={blockExfil}
                    autoComplete="current-password"
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    className="w-full px-3.5 py-2.5 pr-11 text-[14px] bg-brand-cloud border border-silver rounded-lg text-brand-navy outline-none placeholder:text-brand-mist focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-colors"
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-slate hover:text-brand-navy transition-colors bg-transparent border-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-[14px] font-semibold text-white bg-gradient-to-br from-brand-steel to-brand-teal rounded-lg shadow-[0_2px_8px_rgba(59,130,196,0.25)] hover:opacity-90 hover:-translate-y-px transition-all disabled:opacity-50 cursor-pointer border-none"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="flex items-center justify-between mt-6 text-sm">
              <Link
                to={safeRedirect ? `/signup?redirect=${encodeURIComponent(safeRedirect)}` : "/signup"}
                className="text-brand-teal-text font-medium hover:underline no-underline"
              >
                Create account
              </Link>
              <Link
                to="/forgot-password"
                className="text-slate hover:text-brand-navy transition-colors no-underline"
              >
                Forgot password?
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate text-center">
              Signing in here will sign you out on any other device.
            </p>
          </div>
        </div>

      </div>
      <Footer />
    </div>
  );
};

export default Login;
