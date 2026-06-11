// Shared language list for translation UIs (TRANS-2).
// Codes MUST stay in lockstep with ALLOWED_LANGUAGES in
// supabase/functions/translate-report/index.ts (23 codes; English is the
// authoritative original and is not part of the translatable set).

export interface LanguageChip {
  code: string;
  flag: string;
  name: string;
}

// Prominent first (matches SampleBriefLanguageToggle ordering), then the rest.
export const SUPPORTED_LANGUAGES: LanguageChip[] = [
  { code: "fr",    flag: "🇫🇷", name: "French" },
  { code: "de",    flag: "🇩🇪", name: "German" },
  { code: "es",    flag: "🇪🇸", name: "Spanish" },
  { code: "pt",    flag: "🇧🇷", name: "Portuguese" },
  { code: "ja",    flag: "🇯🇵", name: "Japanese" },
  { code: "zh-CN", flag: "🇨🇳", name: "Chinese (Simplified)" },
  { code: "ar",    flag: "🇸🇦", name: "Arabic" },
  { code: "ko",    flag: "🇰🇷", name: "Korean" },
  { code: "it",    flag: "🇮🇹", name: "Italian" },
  { code: "nl",    flag: "🇳🇱", name: "Dutch" },
  { code: "pl",    flag: "🇵🇱", name: "Polish" },
  { code: "sv",    flag: "🇸🇪", name: "Swedish" },
  { code: "da",    flag: "🇩🇰", name: "Danish" },
  { code: "no",    flag: "🇳🇴", name: "Norwegian" },
  { code: "fi",    flag: "🇫🇮", name: "Finnish" },
  { code: "cs",    flag: "🇨🇿", name: "Czech" },
  { code: "ro",    flag: "🇷🇴", name: "Romanian" },
  { code: "el",    flag: "🇬🇷", name: "Greek" },
  { code: "tr",    flag: "🇹🇷", name: "Turkish" },
  { code: "th",    flag: "🇹🇭", name: "Thai" },
  { code: "id",    flag: "🇮🇩", name: "Indonesian" },
  { code: "hi",    flag: "🇮🇳", name: "Hindi" },
  { code: "he",    flag: "🇮🇱", name: "Hebrew" },
];

const RTL_CODES = new Set(["ar", "he"]);
export function isRtl(code: string | null | undefined): boolean {
  return !!code && RTL_CODES.has(code);
}

export function getLanguageName(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.name ?? code;
}
