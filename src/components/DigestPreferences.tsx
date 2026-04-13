import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const REGIONS = [
  { key: "us-canada", label: "US & Canada", flag: "🇺🇸" },
  { key: "eu-uk", label: "EU & UK", flag: "🇪🇺" },
  { key: "apac", label: "Asia-Pacific", flag: "🌏" },
  { key: "latam", label: "Latin America", flag: "🌎" },
  { key: "mea", label: "Middle East & Africa", flag: "🌍" },
];

const TOPICS = [
  { key: "enforcement", label: "Enforcement Actions" },
  { key: "ai-privacy", label: "AI & Privacy" },
  { key: "adtech", label: "AdTech & Consent" },
  { key: "children", label: "Children's Privacy" },
  { key: "health", label: "Health & Medical Data" },
  { key: "breaches", label: "Data Breaches" },
  { key: "transfers", label: "Cross-Border Transfers" },
  { key: "biometric", label: "Biometric Data" },
];

interface DigestPreferencesProps {
  userId: string;
  onSave: () => void;
  onSkip?: () => void;
  compact?: boolean;
}

export default function DigestPreferences({ userId, onSave, onSkip, compact = false }: DigestPreferencesProps) {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Load existing preferences
  useEffect(() => {
    (supabase as any)
      .from("profiles")
      .select("digest_jurisdictions, digest_topics")
      .eq("id", userId)
      .single()
      .then(({ data }: any) => {
        if (data?.digest_jurisdictions) setSelectedRegions(data.digest_jurisdictions);
        if (data?.digest_topics) setSelectedTopics(data.digest_topics);
      });
  }, [userId]);

  const toggleRegion = (key: string) => {
    setSelectedRegions((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 2) return [prev[1], key]; // drop oldest
      return [...prev, key];
    });
  };

  const toggleTopic = (key: string) => {
    setSelectedTopics((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 2) return [prev[1], key];
      return [...prev, key];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await (supabase as any)
      .from("profiles")
      .update({
        digest_jurisdictions: selectedRegions,
        digest_topics: selectedTopics,
      })
      .eq("id", userId);
    setSaving(false);
    onSave();
  };

  const canSave = selectedRegions.length > 0 && selectedTopics.length > 0;

  return (
    <div>
      {!compact && (
        <div className="mb-6">
          <h3 className="font-display font-bold text-foreground text-[18px] mb-1">
            Customize your weekly digest
          </h3>
          <p className="text-[13px] text-muted-foreground">
            Pick up to 2 regions and 2 topics. We'll send you filtered updates every Monday.
          </p>
        </div>
      )}

      {/* Regions */}
      <div className="mb-5">
        <p className="text-[12px] font-semibold text-foreground mb-2.5">
          Which regions matter to you? <span className="text-muted-foreground font-normal">(pick up to 2)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => {
            const sel = selectedRegions.includes(r.key);
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => toggleRegion(r.key)}
                className={`text-[13px] px-3.5 py-2 rounded-lg border transition-all cursor-pointer ${
                  sel
                    ? "bg-navy text-white border-navy"
                    : "bg-white text-slate border-fog hover:border-navy/30"
                }`}
              >
                {r.flag} {r.label}
              </button>
            );
          })}
        </div>
        {selectedRegions.length >= 2 && (
          <p className="text-[11px] text-muted-foreground mt-1.5">You can select up to 2 regions.</p>
        )}
      </div>

      {/* Topics */}
      <div className="mb-6">
        <p className="text-[12px] font-semibold text-foreground mb-2.5">
          Which topics do you follow? <span className="text-muted-foreground font-normal">(pick up to 2)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => {
            const sel = selectedTopics.includes(t.key);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => toggleTopic(t.key)}
                className={`text-[13px] px-3.5 py-2 rounded-lg border transition-all cursor-pointer ${
                  sel
                    ? "bg-navy text-white border-navy"
                    : "bg-white text-slate border-fog hover:border-navy/30"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {selectedTopics.length >= 2 && (
          <p className="text-[11px] text-muted-foreground mt-1.5">You can select up to 2 topics.</p>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className="w-full py-3 text-[14px] font-semibold text-white bg-navy rounded-xl border-none cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save my digest preferences →"}
      </button>

      {onSkip && (
        <button
          onClick={onSkip}
          className="block w-full text-center mt-3 text-[12px] text-muted-foreground bg-transparent border-none cursor-pointer hover:text-foreground transition-colors"
        >
          Skip for now — I'll set this later
        </button>
      )}
    </div>
  );
}
