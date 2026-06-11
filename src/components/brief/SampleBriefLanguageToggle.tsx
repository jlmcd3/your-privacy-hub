import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_LANGUAGES, isRtl, type LanguageChip } from "@/lib/languages";

interface Props {
  englishContent: string;
  onLanguageChange: (content: string, dir: "ltr" | "rtl") => void;
}

type LangChip = LanguageChip;

// Preserve the original two-row layout: 8 prominent chips, then "more" reveals the rest.
const PROMINENT: LangChip[] = SUPPORTED_LANGUAGES.slice(0, 8);
const MORE: LangChip[] = SUPPORTED_LANGUAGES.slice(8);

const SampleBriefLanguageToggle: React.FC<Props> = ({ englishContent, onLanguageChange }) => {
  const [activeLang, setActiveLang] = React.useState<string | null>(null);
  const [loadingLang, setLoadingLang] = React.useState<string | null>(null);
  const [showMore, setShowMore] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  const handleLangClick = async (chip: LangChip) => {
    setLoadingLang(chip.code);
    setNotice(null);
    try {
      const { data, error } = await supabase
        .from("sample_brief_translations")
        .select("translated_content")
        .eq("language_code", chip.code)
        .maybeSingle();

      if (error) {
        console.warn("[SampleBriefLanguageToggle] query error:", error.message);
      }

      if (data?.translated_content) {
        const dir: "ltr" | "rtl" = RTL_LANGS.has(chip.code) ? "rtl" : "ltr";
        onLanguageChange(data.translated_content, dir);
        setActiveLang(chip.code);
      } else {
        setNotice(`Translation for ${chip.name} not yet available — showing English`);
        onLanguageChange(englishContent, "ltr");
        setActiveLang(chip.code);
      }
    } finally {
      setLoadingLang(null);
    }
  };

  const handleEnglish = () => {
    setActiveLang(null);
    setNotice(null);
    onLanguageChange(englishContent, "ltr");
  };

  const renderChip = (chip: LangChip) => {
    const isActive = activeLang === chip.code;
    const isLoading = loadingLang === chip.code;
    return (
      <button
        key={chip.code}
        type="button"
        onClick={() => handleLangClick(chip)}
        disabled={isLoading}
        className={`text-[12px] px-3 py-1.5 rounded-full border transition-all whitespace-nowrap
          ${isActive
            ? "bg-brand-navy text-white border-brand-navy"
            : "bg-white text-slate-700 border-slate-200 hover:border-brand-navy hover:bg-slate-50"}
          ${isLoading ? "opacity-60 cursor-wait" : ""}`}
      >
        <span className="mr-1">{chip.flag}</span>
        {chip.name}
        {isLoading && <span className="ml-2 animate-pulse">…</span>}
      </button>
    );
  };

  return (
    <div className="mb-6">
      <p className="text-sm text-slate mb-3">
        Intelligence subscribers receive this brief in their preferred language —
        accurate legal terminology, not generic translation. See for yourself:
      </p>

      <div className="flex flex-wrap gap-2 items-center">
        {PROMINENT.map(renderChip)}
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="text-[12px] px-3 py-1.5 rounded-full border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
        >
          {showMore ? "Fewer languages ↑" : "More languages ↓"}
        </button>
      </div>

      {showMore && (
        <div className="flex flex-wrap gap-2 items-center mt-3">
          {MORE.map(renderChip)}
          <span className="mx-2 h-5 w-px bg-slate-200" aria-hidden />
          <button
            type="button"
            onClick={handleEnglish}
            className={`text-[12px] px-3 py-1.5 rounded-full border transition-all whitespace-nowrap
              ${activeLang === null
                ? "bg-brand-navy text-white border-brand-navy"
                : "bg-white text-slate-700 border-slate-200 hover:border-brand-navy hover:bg-slate-50"}`}
          >
            🔄 English (original)
          </button>
        </div>
      )}

      {notice && (
        <p className="text-[12px] text-amber-700 mt-2">{notice}</p>
      )}
    </div>
  );
};

export default SampleBriefLanguageToggle;
