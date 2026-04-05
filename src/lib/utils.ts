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
  // Decode entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
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
