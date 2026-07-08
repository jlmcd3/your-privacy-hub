import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet><title>Reset Password | End User Privacy</title></Helmet>
      <Navbar />
      <div className="flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md bg-card border border-brand-cloud rounded-2xl shadow-eup-sm p-8">
          {!sent ? (
            <>
              <h1 className="font-display text-brand-navy text-center mb-1.5">
                Reset Password
              </h1>
              <p className="text-sm text-slate text-center mb-7">
                Enter your email and we'll send you a link to reset your password.
              </p>
              {error && (
                <div className="mb-5 p-3 rounded-lg bg-severity-warning/10 border border-severity-warning/30 text-severity-warning text-sm text-center">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-navy mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-[14px] bg-brand-cloud border border-silver rounded-lg text-brand-navy outline-none placeholder:text-brand-mist focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-colors"
                    placeholder="you@company.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-[14px] font-semibold text-white bg-gradient-to-br from-brand-steel to-brand-teal rounded-lg hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer border-none"
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
              <div className="text-center mt-5">
                <Link to="/login" className="text-sm text-brand-teal-text hover:text-brand-navy no-underline">
                  ← Back to Sign In
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="font-display text-brand-navy mb-2">Check your inbox</h2>
              <p className="text-slate text-sm leading-relaxed mb-6">
                We sent a password reset link to <strong>{email}</strong>.
                Click the link in that email to set a new password.
              </p>
              <p className="text-brand-mist text-[12px] mb-6">
                Didn't receive it? Check your spam folder, or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="text-brand-teal-text hover:text-brand-navy bg-transparent border-none cursor-pointer p-0 text-[12px]"
                >
                  try again
                </button>
                .
              </p>
              <Link to="/login" className="text-sm text-brand-teal-text hover:text-brand-navy no-underline">
                ← Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
