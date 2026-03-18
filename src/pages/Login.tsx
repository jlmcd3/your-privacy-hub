import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/account";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate(redirect);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <Topbar />
      <Navbar />
      <div className="flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md bg-card border border-fog rounded-2xl shadow-eup-sm p-8">
          <h1 className="font-display text-[24px] text-navy text-center mb-1.5">Sign In</h1>
          <p className="text-sm text-slate text-center mb-7">
            {redirect === "/subscribe"
              ? "Sign in to complete your upgrade"
              : "Welcome back to EndUserPrivacy"}
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
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-[14px] bg-paper border border-silver rounded-lg text-navy outline-none placeholder:text-slate-light focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
                placeholder="Your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-[14px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg shadow-[0_2px_8px_rgba(59,130,196,0.25)] hover:opacity-90 hover:-translate-y-px transition-all disabled:opacity-50 cursor-pointer border-none"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="flex items-center justify-between mt-6 text-[13px]">
            <Link
              to={`/signup?redirect=${encodeURIComponent(redirect)}`}
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
      <Footer />
    </div>
  );
};

export default Login;
