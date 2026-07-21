import { useState } from "react";
import { Languages, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ReportType =
  | "biometric"
  | "dpa"
  | "dpia"
  | "li"
  | "governance"
  | "ir"
  | "registration";

interface TranslateReportButtonProps {
  reportType: ReportType;
  reportId: string;
  /** Called with the translated content (same shape as report_data). */
  onTranslated?: (translated: unknown, lang: string) => void;
  /** Called when the user reverts to the original English source. */
  onReverted?: () => void;
  className?: string;
}

// EU-first ordering. Add more as needed — must match LANGUAGE_NAMES in the edge function.
const LANGUAGES: Array<{ code: string; label: string; flag: string }> = [
  { code: "en", label: "English",    flag: "🇬🇧" },
  { code: "de", label: "Deutsch",    flag: "🇩🇪" },
  { code: "fr", label: "Français",   flag: "🇫🇷" },
  { code: "es", label: "Español",    flag: "🇪🇸" },
  { code: "it", label: "Italiano",   flag: "🇮🇹" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "pl", label: "Polski",     flag: "🇵🇱" },
];

export default function TranslateReportButton({
  reportType,
  reportId,
  onTranslated,
  onReverted,
  className,
}: TranslateReportButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<string>("en");

  async function handleSelect(code: string) {
    if (code === activeLang) {
      setOpen(false);
      return;
    }

    if (code === "en") {
      setActiveLang("en");
      setOpen(false);
      onReverted?.();
      return;
    }

    setLoading(code);
    try {
      const { data, error } = await supabase.functions.invoke("translate-report", {
        body: {
          report_type: reportType,
          report_id: reportId,
          target_lang: code,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const translated = data?.translated_content;
      if (!translated) throw new Error("No translated content returned");

      setActiveLang(code);
      setOpen(false);
      onTranslated?.(translated, code);

      toast({
        title: "Report translated",
        description: data.cached
          ? `Loaded cached ${LANGUAGES.find((l) => l.code === code)?.label} translation.`
          : `Translated using ${data.glossary_terms_applied ?? 0} GDPR statutory terms.`,
      });
    } catch (e: any) {
      toast({
        title: "Translation failed",
        description: e?.message ?? "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  const active = LANGUAGES.find((l) => l.code === activeLang) ?? LANGUAGES[0];

  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={loading !== null}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-brand-cloud bg-white text-slate text-sm font-medium hover:border-brand-navy/30 transition-colors disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Languages className="w-4 h-4" />
        )}
        <span>{active.flag} {active.label}</span>
      </button>

      {open && !loading && (
        <div
          role="listbox"
          className="absolute right-0 mt-1.5 w-56 bg-white border border-brand-cloud rounded-xl shadow-lg z-50 overflow-hidden"
        >
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-brand-cloud">
            Translate report
          </div>
          {LANGUAGES.map((l) => {
            const isActive = l.code === activeLang;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => handleSelect(l.code)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-brand-cloud transition-colors ${
                  isActive ? "text-brand-navy font-medium" : "text-slate"
                }`}
                role="option"
                aria-selected={isActive}
              >
                <span>{l.flag} {l.label}</span>
                {isActive && <Check className="w-4 h-4 text-brand-navy" />}
              </button>
            );
          })}
          <div className="px-3 py-2 text-[11px] text-muted-foreground border-t border-brand-cloud leading-snug">
            Translations use the official GDPR statutory glossary.
          </div>
        </div>
      )}
    </div>
  );
}
