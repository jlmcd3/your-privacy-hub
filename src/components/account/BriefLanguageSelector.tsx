import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import PremiumBadge from "@/components/PremiumBadge";

const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "pt", label: "Portuguese" },
  { code: "sv", label: "Swedish" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "ar", label: "Arabic" },
  { code: "tr", label: "Turkish" },
  { code: "da", label: "Danish" },
  { code: "no", label: "Norwegian" },
  { code: "fi", label: "Finnish" },
  { code: "cs", label: "Czech" },
  { code: "ro", label: "Romanian" },
  { code: "el", label: "Greek" },
  { code: "th", label: "Thai" },
  { code: "id", label: "Indonesian" },
  { code: "hi", label: "Hindi" },
  { code: "he", label: "Hebrew" },
];

export default function BriefLanguageSelector() {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const [language, setLanguage] = useState<string>("en");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    if (!user || !isPremium) return;
    supabase
      .from("profiles")
      .select("preferred_language")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const code = (data as any)?.preferred_language;
        if (code && LANGUAGES.some((l) => l.code === code)) {
          setLanguage(code);
        } else {
          setLanguage("en");
        }
        setLoaded(true);
      });
  }, [user, isPremium]);

  useEffect(() => {
    if (status === "saved") {
      const t = setTimeout(() => setStatus("idle"), 2000);
      return () => clearTimeout(t);
    }
  }, [status]);

  if (!isPremium || !user) return null;

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setLanguage(newCode);
    const { error } = await supabase
      .from("profiles")
      .update({ preferred_language: newCode } as any)
      .eq("id", user.id);
    setStatus(error ? "error" : "saved");
  };

  return (
    <div className="bg-card border border-fog rounded-2xl p-6 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-4 h-4 text-navy" />
        <h2 className="font-semibold text-navy text-[14px] uppercase tracking-wider">
          Weekly Brief Language
        </h2>
        <PremiumBadge />
      </div>
      <p className="text-[12px] text-slate mb-4">
        Your weekly brief will be delivered in your preferred language. Powered by AI translation —
        legal and regulatory terminology preserved.
      </p>
      <select
        value={language}
        onChange={handleChange}
        disabled={!loaded}
        className="w-full bg-paper border border-fog rounded-lg px-3 py-2.5 text-[13px] text-navy focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue cursor-pointer disabled:opacity-50"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      {status === "saved" && (
        <p className="mt-2 text-[12px] text-accent transition-opacity">Preference saved ✓</p>
      )}
      {status === "error" && (
        <p className="mt-2 text-[12px] text-warn">Could not save — please try again</p>
      )}
    </div>
  );
}
