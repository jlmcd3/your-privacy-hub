import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { JURISDICTION_OPTIONS } from "@/data/registration_jurisdictions";

interface UserRoleRow {
  id: string;
  label: string;
}

import { SECTORS } from "@/constants/sectors";

export default function OnboardingProfile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/account";

  const [roles, setRoles] = useState<UserRoleRow[]>([]);
  const [role, setRole] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [sector, setSector] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  // Load roles + check whether user already confirmed
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent("/onboarding-profile")}`, { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      const [{ data: roleRows }, { data: profile }] = await Promise.all([
        supabase.from("eup_user_roles").select("id, label").order("label"),
        supabase.from("profiles").select("role_confirmed_at").eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setRoles(roleRows ?? []);
      if (profile?.role_confirmed_at) {
        navigate(redirect, { replace: true });
        return;
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, navigate, redirect]);

  const jurisdictionSuggestions = useMemo(() => JURISDICTION_OPTIONS, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    // ITEM 360 — user_role / role_confirmed_at are service-role-only columns.
    // The declaration goes through a security-definer routine that stamps the
    // confirmation time server-side so it cannot be fabricated.
    const { error: updateErr } = await (supabase as any).rpc("set_self_declared_role", {
      _role: role || null,
      _primary_jurisdiction: jurisdiction.trim() || null,
      _sector: sector || null,
    });
    if (updateErr) {
      setError(updateErr.message);
      setSaving(false);
      return;
    }
    navigate(redirect, { replace: true });
  };

  const handleSkip = async () => {
    if (!user) return;
    setSaving(true);
    const { error: updateErr } = await (supabase as any).rpc("set_self_declared_role", {
      _role: null,
      _primary_jurisdiction: null,
      _sector: null,
    });

    if (updateErr) {
      setError(updateErr.message);
      setSaving(false);
      return;
    }
    navigate(redirect, { replace: true });
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-brand-cloud flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-teal/30 border-t-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cloud flex flex-col">
      <Helmet>
        <title>Personalise your intelligence feed | End User Privacy</title>
        <meta name="description" content="Tell us your role, jurisdiction, and sector so we can personalise your Action Brief on every article." />
      </Helmet>
      <Navbar />
      <main id="main-content" aria-label="Onboarding profile" className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-lg bg-card border border-brand-cloud rounded-2xl shadow-eup-sm p-8">
          <h1 className="font-display text-brand-navy mb-2">
            Personalise your intelligence feed
          </h1>
          <p className="text-slate text-[14px] leading-relaxed mb-6">
            We use this to personalise your Action Brief on every article — showing you what
            requires YOUR attention specifically.
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-severity-warning/10 border border-severity-warning/30 text-severity-warning text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-navy mb-1.5">Your role</label>
              <select
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 text-[14px] bg-brand-cloud border border-silver rounded-lg text-brand-navy outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-colors"
              >
                <option value="">Select your role…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-navy mb-1.5">
                Primary jurisdiction you work in
              </label>
              <input
                type="text"
                required
                list="jurisdiction-options"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="Start typing… e.g. Germany, California (US), United Kingdom"
                className="w-full px-3.5 py-2.5 text-[14px] bg-brand-cloud border border-silver rounded-lg text-brand-navy outline-none placeholder:text-brand-mist focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-colors"
              />
              <datalist id="jurisdiction-options">
                {jurisdictionSuggestions.map((j) => (
                  <option key={j.code} value={j.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-navy mb-1.5">Sector</label>
              <select
                required
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3.5 py-2.5 text-[14px] bg-brand-cloud border border-silver rounded-lg text-brand-navy outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-colors"
              >
                <option value="">Select your sector…</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 mt-2 text-[14px] font-semibold text-white bg-gradient-to-br from-brand-steel to-brand-teal rounded-lg shadow-[0_2px_8px_rgba(59,130,196,0.25)] hover:opacity-90 hover:-translate-y-px transition-all disabled:opacity-50 cursor-pointer border-none"
            >
              {saving ? "Saving…" : "Set my preferences →"}
            </button>
          </form>

          <div className="text-center mt-5">
            <button
              type="button"
              onClick={handleSkip}
              disabled={saving}
              className="text-sm text-slate hover:text-brand-navy underline bg-transparent border-none cursor-pointer disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
