import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  // Supabase fires PASSWORD_RECOVERY when user lands from reset email
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/account"), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <Helmet><title>Set New Password | End User Privacy</title></Helmet>
      <Navbar />
      <div className="flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md bg-card border border-fog rounded-2xl shadow-eup-sm p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✅</div>
              <h2 className="font-display text-[22px] text-navy mb-2">Password updated</h2>
              <p className="text-slate text-[13px]">
                Your password has been changed. Redirecting to your account…
              </p>
            </div>
          ) : !ready ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-blue/30 border-t-blue rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate text-[13px]">
                Verifying your reset link…
              </p>
              <p className="text-slate-light text-[12px] mt-3">
                If this takes too long,{" "}
                <Link to="/forgot-password" className="text-blue no-underline">
                  request a new link
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-[24px] text-navy text-center mb-1.5">
                Set New Password
              </h1>
              <p className="text-sm text-slate text-center mb-7">
                Choose a strong password for your End User Privacy account.
              </p>
              {error && (
                <div className="mb-5 p-3 rounded-lg bg-warn/10 border border-warn/30 text-warn text-[13px] text-center">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-navy mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-[14px] bg-paper border border-silver rounded-lg text-navy outline-none focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
                    placeholder="Min. 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-navy mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-[14px] bg-paper border border-silver rounded-lg text-navy outline-none focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
                    placeholder="Repeat your password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-[14px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer border-none"
                >
                  {loading ? "Saving…" : "Set New Password →"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
