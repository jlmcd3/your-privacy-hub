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

export function normalizeTitle(title: string | null | undefined): string {
  if (!title) return '';
  const t = title.trim();
  if (!t) return '';
  if (t === t.toLowerCase() || t[0] === t[0].toLowerCase()) {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return t;
}
