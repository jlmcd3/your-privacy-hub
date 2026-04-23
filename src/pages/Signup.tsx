import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/account";

  const blockExfil = (e: React.ClipboardEvent | React.DragEvent) => {
    e.preventDefault();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
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
        <title>Create Account | EndUserPrivacy</title>
        <meta name="description" content="Create a free EndUserPrivacy account. Get a personalized weekly digest covering your regions and topics. Professional Intelligence Briefs from $29/month." />
      </Helmet>
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* Left panel — hidden on mobile */}
        <div className="hidden lg:flex lg:w-[420px] bg-gradient-to-br from-navy to-steel flex-col justify-center px-12 py-16">
          <div className="text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-4">EndUserPrivacy</div>
          <h2 className="font-display text-white text-[24px] font-bold leading-tight mb-6">
            Global privacy law, tracked daily.
          </h2>
          <div className="space-y-4">
            {[
              '119 regulatory authorities monitored',
              '150+ jurisdictions covered',
              'Weekly digest — free',
              'Personalized analysis for $20/month',
            ].map(item => (
              <div key={item} className="flex items-center gap-3 text-blue-200 text-[14px]">
                <span className="text-accent font-bold">✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 flex items-center justify-center py-16 px-4 bg-paper">
          <div className="w-full max-w-md bg-card border border-fog rounded-2xl shadow-eup-sm p-8">
            <h1 className="font-display text-[24px] text-navy text-center mb-1.5">Create Account</h1>
            <p className="text-sm text-slate text-center mb-7">
              {redirect.includes("subscribe") || redirect.includes("success")
                ? "Create your account to complete your Professional subscription"
                : "Join EndUserPrivacy — free to browse, Professional from $29/month"}
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
                  className="w-full px-3.5 py-2.5 text-[14px] bg-paper border border-silver rounded-lg text-navy outline-none placeholder:text-slate-light focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-navy mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-[14px] bg-paper border border-silver rounded-lg text-navy outline-none placeholder:text-slate-light focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
                  placeholder="Min. 6 characters"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-[14px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg shadow-[0_2px_8px_rgba(59,130,196,0.25)] hover:opacity-90 hover:-translate-y-px transition-all disabled:opacity-50 cursor-pointer border-none"
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
      <Footer />
    </div>
  );
};

export default Signup;
