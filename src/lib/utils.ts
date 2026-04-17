import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  // First pass: remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');
  // Decode named entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/g, "'")
    .replace(/&hellip;/gi, '…')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"');
  // Decode numeric entities (&#8230; etc.)
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  // Second pass: remove any tags that were revealed by entity decoding
  text = text.replace(/<[^>]*>/g, ' ');
  // Collapse whitespace
  return text.replace(/\s+/g, ' ').trim();
}

// Normalize an enforcement fine to "<symbol> <amount> <unit>" (e.g. "€45 million").
// Inputs vary wildly: "45,000,000", "$20 million", "£12.7M", "EUR 6,200,000", "20m", etc.
// Falls back to the raw string when nothing parseable is found.
export function formatFine(
  fine_amount: string | null | undefined,
  fine_eur?: number | null,
  jurisdiction?: string | null
): string {
  const raw = (fine_amount ?? "").trim();

  // Currency detection from raw string
  const currencyMap: Record<string, string> = {
    "$": "$", "€": "€", "£": "£", "¥": "¥",
    USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥",
    KRW: "₩", BRL: "R$", INR: "₹", CAD: "C$", AUD: "A$", CHF: "CHF",
  };
  let symbol = "";
  if (raw) {
    for (const [k, v] of Object.entries(currencyMap)) {
      const re = new RegExp(`(^|\\s|\\b)${k.replace(/[$.]/g, "\\$&")}`, "i");
      if (re.test(raw)) { symbol = v; break; }
    }
  }
  // Jurisdiction-based fallback
  if (!symbol && jurisdiction) {
    const j = jurisdiction.toLowerCase();
    if (j.includes("u.s.") || j.includes("united states") || j.includes("federal")) symbol = "$";
    else if (j.includes("uk") || j.includes("united kingdom")) symbol = "£";
    else if (j.includes("eu") || j.includes("europe")) symbol = "€";
    else if (j.includes("brazil")) symbol = "R$";
    else if (j.includes("japan")) symbol = "¥";
    else if (j.includes("korea")) symbol = "₩";
    else if (j.includes("china")) symbol = "¥";
    else if (j.includes("india")) symbol = "₹";
    else if (j.includes("canada")) symbol = "C$";
    else if (j.includes("australia")) symbol = "A$";
  }

  // Parse the number + magnitude from the raw string
  let value: number | null = null;
  if (raw) {
    const m = raw.match(/([\d][\d,.\s]*)\s*(billion|bn|b\b|million|mn|m\b|thousand|k\b)?/i);
    if (m) {
      const numStr = m[1].replace(/[,\s]/g, "");
      let n = parseFloat(numStr);
      if (!isNaN(n)) {
        const unit = (m[2] || "").toLowerCase();
        if (/^(billion|bn|b)$/.test(unit)) n *= 1_000_000_000;
        else if (/^(million|mn|m)$/.test(unit)) n *= 1_000_000;
        else if (/^(thousand|k)$/.test(unit)) n *= 1_000;
        value = n;
      }
    }
  }

  // Last-resort fallback to fine_eur (EUR)
  if (value === null && typeof fine_eur === "number" && !isNaN(fine_eur)) {
    value = fine_eur;
    if (!symbol) symbol = "€";
  }

  if (value === null) return raw || "—";
  if (!symbol) symbol = "€"; // safe default for unlabeled numbers

  // Format with magnitude word
  let display: string;
  if (value >= 1_000_000_000) display = `${+(value / 1_000_000_000).toFixed(2)} billion`;
  else if (value >= 1_000_000) display = `${+(value / 1_000_000).toFixed(2)} million`;
  else if (value >= 1_000) display = `${+(value / 1_000).toFixed(1)} thousand`;
  else display = `${value}`;

  return `${symbol}${display}`;
}

export function normalizeTitle(title: string | null | undefined): string {
  if (!title) return '';
  const t = title.trim();
  if (!t) return '';
  if (t === t.toLowerCase() || t[0] === t[0].toLowerCase()) {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return t;
}
