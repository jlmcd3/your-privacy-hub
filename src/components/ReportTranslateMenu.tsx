// ReportTranslateMenu (TRANS-2)
// Compact dropdown that calls the `translate-report` edge function and hands
// the translated payload (or null on revert) back to the parent result page.
// The component owns the on-screen translation notice banner. The banner is
// rendered with `basis-full` so when placed inside a flex-wrap actions row it
// drops to its own line directly below the button; it remains visible in
// print/export (intentionally NOT print:hidden).

import { useState } from "react";
import { Languages, Loader2, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_LANGUAGES, isRtl, getLanguageName } from "@/lib/languages";

interface ReportTranslateMenuProps {
  toolType: string;
  reportId: string;
  /** Called with the translated payload (or null to revert to English). */
  onTranslated: (payload: any | null, dir: "ltr" | "rtl") => void;
}

export default function ReportTranslateMenu({
  toolType,
  reportId,
  onTranslated,
}: ReportTranslateMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // TRANSLATE-1 — async translation with polling.
  // POST kicks off translation and returns 202 with status='translating'.
  // A GET on the same function reports status until 'complete' or 'failed'.
  async function pollUntilDone(code: string): Promise<any | null> {
    const MAX_MS = 5 * 60_000;         // 5 min ceiling
    const INTERVAL_MS = 2500;
    const started = Date.now();
    while (Date.now() - started < MAX_MS) {
      await new Promise((r) => setTimeout(r, INTERVAL_MS));
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const url = new URL(
        `${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/translate-report`,
      );
      url.searchParams.set("report_type", toolType);
      url.searchParams.set("report_id", reportId);
      url.searchParams.set("language_code", code);
      const r = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) continue;
      const body = await r.json().catch(() => null);
      if (!body) continue;
      if (body.status === "complete") return body.translated_payload;
      if (body.status === "failed") throw new Error(body.error ?? "Translation failed");
      // still translating → keep polling
    }
    throw new Error("Translation timed out");
  }

  async function handleSelect(code: string | null) {
    setOpen(false);
    if (code === null || code === "en") {
      setActiveLang(null);
      setNotice(null);
      onTranslated(null, "ltr");
      return;
    }
    if (code === activeLang) return;

    setLoading(code);
    try {
      const { data, error } = await supabase.functions.invoke("translate-report", {
        body: { tool_type: toolType, report_id: reportId, language_code: code },
      });
      if (error) throw error;
      const errMsg: string | undefined = (data as any)?.error;
      if (errMsg) {
        if (errMsg.startsWith("TRANSLATION_LIMIT")) {
          toast.error("This report has reached its 4-language translation limit.");
        } else if (errMsg.startsWith("NOT_TRANSLATABLE")) {
          toast.error("This document type does not yet support translation.");
        } else {
          toast.error("Translation failed. Please try again.");
        }
        return;
      }

      // Two success shapes:
      //   { status:'complete', translated_payload } — cache hit
      //   { status:'translating', ... }             — kicked off, poll for result
      let payload = (data as any)?.translated_payload;
      const status = (data as any)?.status;
      if (!payload && status === "translating") {
        toast.info("Translating… this may take up to a minute for long documents.");
        payload = await pollUntilDone(code);
      }
      if (!payload) {
        toast.error("Translation failed. Please try again.");
        return;
      }
      const dir: "ltr" | "rtl" = isRtl(code) ? "rtl" : "ltr";
      setActiveLang(code);
      setNotice(
        typeof payload.translation_notice === "string"
          ? payload.translation_notice
          : null,
      );
      onTranslated(payload, dir);
      toast.success(`Translated to ${getLanguageName(code)}.`);
    } catch (e: any) {
      console.error("[ReportTranslateMenu] invoke error:", e?.message);
      toast.error("Translation failed. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  const activeChip = SUPPORTED_LANGUAGES.find((l) => l.code === activeLang);
  const buttonLabel = activeChip
    ? `${activeChip.flag} ${activeChip.name}`
    : "Translate";

  return (
    <>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-60"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Languages className="w-4 h-4" />
          )}
          <span>{buttonLabel}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </button>

        {open && !loading && (
          <div
            role="listbox"
            className="absolute right-0 mt-1.5 w-60 max-h-80 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg z-50"
          >
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              Translate report
            </div>
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-brand-cloud transition-colors ${
                activeLang === null ? "text-foreground font-medium" : "text-foreground/80"
              }`}
              role="option"
              aria-selected={activeLang === null}
            >
              <span>🇬🇧 English (original)</span>
              {activeLang === null && <Check className="w-4 h-4" />}
            </button>
            <div className="h-px bg-border" />
            {SUPPORTED_LANGUAGES.map((l) => {
              const isActive = l.code === activeLang;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => handleSelect(l.code)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-brand-cloud transition-colors ${
                    isActive ? "text-foreground font-medium" : "text-foreground/80"
                  }`}
                  role="option"
                  aria-selected={isActive}
                >
                  <span>{l.flag} {l.name}</span>
                  {isActive && <Check className="w-4 h-4" />}
                </button>
              );
            })}
            <div className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border leading-snug">
              Machine translation. English remains authoritative.
            </div>
          </div>
        )}
      </div>

      {notice && activeLang && (
        <div className="basis-full w-full mt-2 px-3 py-2 rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-[12px] leading-snug">
          {notice}
        </div>
      )}
    </>
  );
}
