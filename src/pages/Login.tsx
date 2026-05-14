import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="min-h-full bg-paper">
      <Helmet>
        <title>Log In | End User Privacy</title>
        <meta name="description" content="Sign in to your End User Privacy account to access your personalized dashboard, weekly digest, and Intelligence Briefs." />
      </Helmet>
      <div className="flex items-center justify-center min-h-full py-16 px-4">

          <div className="w-full max-w-md bg-card border border-fog rounded-2xl shadow-eup-sm p-8">
            <h1 className="font-display text-[24px] text-navy text-center mb-1.5">Sign In</h1>
            <p className="text-sm text-slate text-center mb-7">
              {safeRedirect?.includes("subscribe")
                ? "Sign in to complete your subscription"
                : safeRedirect?.includes("dashboard")
                ? "Sign in to access your Privacy Intelligence Report"
                : safeRedirect?.includes("account")
                ? "Sign in to manage your account"
                : "Welcome back to End User Privacy"}
            </p>

            {error && (
              <div className="mb-5 p-3 rounded-lg bg-warn/10 border border-warn/30 text-warn text-[13px] text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-navy mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    className="w-full px-3.5 py-2.5 pr-11 text-[14px] bg-paper border border-silver rounded-lg text-navy outline-none placeholder:text-slate-light focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
                    placeholder="Your password"
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
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-[14px] font-semibold text-navy bg-gold rounded-lg shadow-[0_2px_8px_rgba(200,146,42,0.35)] hover:bg-gold/90 hover:-translate-y-px transition-all disabled:opacity-50 cursor-pointer border-none"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="flex items-center justify-between mt-6 text-[13px]">
              <Link
                to={safeRedirect ? `/signup?redirect=${encodeURIComponent(safeRedirect)}` : "/signup"}
                className="text-blue font-medium hover:underline no-underline"
              >
                Create account
              </Link>
              <Link
                to="/forgot-password"
                className="text-slate hover:text-navy transition-colors no-underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
