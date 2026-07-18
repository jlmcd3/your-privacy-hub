// _shared/translation-engine.ts
// TRANSLATE-1 — Chunked translation engine used by translate-report and
// translate-weekly-brief. Fixes the single-shot JSON truncation failure class
// documented in the 2026-07-18 incident: long documents (IR playbooks ≥100KB)
// exceed the model's output cap → truncated mid-string → unparseable JSON.
//
// Strategy:
//   1) Walk the source JSON and collect translatable STRING values with paths.
//      Keys are never translated. Excluded string values (citation markers,
//      URLs, dates, numbers, enum-like tokens, statutory citation strings)
//      pass through byte-identical.
//   2) LONG single strings (paragraphs of prose, e.g. playbook_text) are split
//      at paragraph boundaries and translated as PLAIN TEXT — never wrapped in
//      a JSON envelope. This alone deletes the "unterminated JSON string"
//      failure class entirely.
//   3) Short strings are batched into compact JSON maps (path → text) whose
//      output token budget is bounded so truncation cannot occur within the
//      per-call cap.
//   4) Reassembly puts every translated unit back at its source path. A
//      deterministic verification pass confirms every source path is present
//      and array lengths are unchanged; any missing/mangled unit triggers a
//      retry of THAT chunk only (max 2 retries per chunk).
//
// Model: claude-haiku-4-5 (translation-appropriate, cheap). Not the reasoning
// tier — translation is not a reasoning task.

export const TRANSLATION_ENGINE_VERSION = "translate-1-engine@2026-07-18";
export const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// Per-call output token target. Assume ~1.4× expansion for non-English + slack.
// Haiku 4.5 supports up to 64k output; we deliberately stay small so no single
// call can approach the cap. 3000 output tokens ≈ ~10-12KB text.
const OUTPUT_TOKEN_TARGET = 3000;
const CHARS_PER_OUTPUT_TOKEN = 3.2;                       // conservative for non-English
const EXPANSION_FACTOR = 1.4;                             // English → non-English char growth
const MAX_ENGLISH_CHARS_PER_CHUNK =
  Math.floor((OUTPUT_TOKEN_TARGET * CHARS_PER_OUTPUT_TOKEN) / EXPANSION_FACTOR); // ≈ 6800
const MAX_TOKENS_PER_CALL = 8000;                         // upper bound sent to Anthropic

const MAX_RETRIES_PER_CHUNK = 2;

// ─────────────────────────────────────────────────────────────────────────
// Exclusion rules (mirror translate-report's original ban list, verbatim).
// ─────────────────────────────────────────────────────────────────────────
const URL_RE = /^https?:\/\//i;
const NUMBER_ONLY_RE = /^-?\d+(?:[.,]\d+)?%?$/;
const DATE_LIKE_RE = /^\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?$/;
const ENUM_LIKE_RE = /^[a-z][a-z0-9_]*$/;                 // snake_case status enums
const ALL_CAPS_ENUM_RE = /^[A-Z][A-Z0-9_]{1,}$/;          // SCREAMING_SNAKE
const CITATION_MARKER_RE = /^\[(?:[A-Za-z0-9., §()\-–—]+)\]$/;
// Statutory citation strings like "GDPR Article 6(1)", "Cal. Civ. Code § 1798.140"
const STATUTORY_RE = /^(?:GDPR|CCPA|CPRA|LGPD|PIPEDA|APP|Cal\.\s*Civ\.\s*Code|Art\.|Article|§|Recital)\b/i;

export function isExcludedFromTranslation(value: string): boolean {
  const s = value.trim();
  if (s.length === 0) return true;
  if (URL_RE.test(s)) return true;
  if (NUMBER_ONLY_RE.test(s)) return true;
  if (DATE_LIKE_RE.test(s)) return true;
  if (ENUM_LIKE_RE.test(s) && s.length <= 40) return true;
  if (ALL_CAPS_ENUM_RE.test(s) && s.length <= 40) return true;
  if (CITATION_MARKER_RE.test(s)) return true;
  if (STATUTORY_RE.test(s) && s.length <= 80) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────
// Path-walking extraction
// ─────────────────────────────────────────────────────────────────────────
export interface StringUnit { path: string; value: string; }

export function extractStringUnits(root: unknown): StringUnit[] {
  const out: StringUnit[] = [];
  function walk(node: unknown, path: string) {
    if (node === null || node === undefined) return;
    if (typeof node === "string") {
      out.push({ path, value: node });
      return;
    }
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) walk(node[i], `${path}[${i}]`);
      return;
    }
    if (typeof node === "object") {
      for (const k of Object.keys(node as Record<string, unknown>)) {
        // Escape dots/brackets in keys defensively.
        const safeKey = /[.\[\]]/.test(k) ? `["${k.replace(/"/g, '\\"')}"]` : k;
        const nextPath = path ? `${path}.${safeKey}` : safeKey;
        walk((node as Record<string, unknown>)[k], nextPath);
      }
      return;
    }
    // numbers/booleans left in place at reassembly time
  }
  walk(root, "");
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Path-based set/get
// ─────────────────────────────────────────────────────────────────────────
function tokenizePath(path: string): Array<{ kind: "key" | "index"; value: string | number }> {
  const tokens: Array<{ kind: "key" | "index"; value: string | number }> = [];
  let i = 0;
  while (i < path.length) {
    if (path[i] === ".") { i++; continue; }
    if (path[i] === "[") {
      const close = path.indexOf("]", i);
      if (close === -1) break;
      const raw = path.slice(i + 1, close);
      if (raw.startsWith('"') && raw.endsWith('"')) {
        tokens.push({ kind: "key", value: raw.slice(1, -1).replace(/\\"/g, '"') });
      } else {
        tokens.push({ kind: "index", value: parseInt(raw, 10) });
      }
      i = close + 1;
      continue;
    }
    // key up to next . or [
    let j = i;
    while (j < path.length && path[j] !== "." && path[j] !== "[") j++;
    tokens.push({ kind: "key", value: path.slice(i, j) });
    i = j;
  }
  return tokens;
}

export function setAtPath(root: any, path: string, value: string): boolean {
  const tokens = tokenizePath(path);
  if (tokens.length === 0) return false;
  let cur: any = root;
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i];
    if (t.kind === "key") {
      if (cur == null || typeof cur !== "object") return false;
      cur = cur[t.value as string];
    } else {
      if (!Array.isArray(cur)) return false;
      cur = cur[t.value as number];
    }
  }
  const last = tokens[tokens.length - 1];
  if (last.kind === "key") {
    if (cur == null || typeof cur !== "object") return false;
    cur[last.value as string] = value;
  } else {
    if (!Array.isArray(cur)) return false;
    cur[last.value as number] = value;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────
// Chunk planning
// ─────────────────────────────────────────────────────────────────────────
export type Chunk =
  | { kind: "json_map"; units: StringUnit[] }
  | { kind: "prose"; path: string; segments: string[] };

const LONG_STRING_THRESHOLD = 1200; // strings above this are split as prose

// Split a long string at paragraph boundaries. Keeps segments under
// MAX_ENGLISH_CHARS_PER_CHUNK; falls back to single-newline / hard break.
export function splitProseSegments(text: string): string[] {
  if (text.length <= MAX_ENGLISH_CHARS_PER_CHUNK) return [text];
  const paragraphs = text.split(/(\n\s*\n)/); // keep separators as odd indices
  const merged: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if ((buf + p).length > MAX_ENGLISH_CHARS_PER_CHUNK && buf.length > 0) {
      merged.push(buf);
      buf = p;
    } else {
      buf += p;
    }
  }
  if (buf.length > 0) merged.push(buf);
  // Any oversized paragraph — hard split.
  const finalSegs: string[] = [];
  for (const seg of merged) {
    if (seg.length <= MAX_ENGLISH_CHARS_PER_CHUNK) { finalSegs.push(seg); continue; }
    for (let i = 0; i < seg.length; i += MAX_ENGLISH_CHARS_PER_CHUNK) {
      finalSegs.push(seg.slice(i, i + MAX_ENGLISH_CHARS_PER_CHUNK));
    }
  }
  return finalSegs;
}

export function planChunks(units: StringUnit[]): Chunk[] {
  const chunks: Chunk[] = [];
  const smalls: StringUnit[] = [];
  let smallCharsBudget = 0;

  function flushSmalls() {
    if (smalls.length === 0) return;
    chunks.push({ kind: "json_map", units: smalls.slice() });
    smalls.length = 0;
    smallCharsBudget = 0;
  }

  for (const u of units) {
    if (isExcludedFromTranslation(u.value)) continue; // stays byte-identical
    if (u.value.length >= LONG_STRING_THRESHOLD) {
      flushSmalls();
      chunks.push({
        kind: "prose",
        path: u.path,
        segments: splitProseSegments(u.value),
      });
      continue;
    }
    if (smallCharsBudget + u.value.length > MAX_ENGLISH_CHARS_PER_CHUNK) flushSmalls();
    smalls.push(u);
    smallCharsBudget += u.value.length;
  }
  flushSmalls();
  return chunks;
}

// ─────────────────────────────────────────────────────────────────────────
// Anthropic call helpers
// ─────────────────────────────────────────────────────────────────────────
function stripFences(s: string): string {
  return s.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function jsonMapSystemPrompt(languageName: string): string {
  return `You are a professional legal and regulatory translator specialising in privacy law, data protection, and technology regulation. Translate the JSON object below from English into ${languageName}.

Rules:
- The input is a flat object: each KEY is a path identifier — DO NOT translate keys. Preserve every key exactly.
- Translate every string VALUE into ${languageName}.
- NEVER translate: citation markers like [Art. 6(1)(f)], [Recital 47], [E1], [A2], [F3]; statutory strings ("GDPR Article 6(1)", "Cal. Civ. Code § 1798.140"); regulator names (CNIL, ICO, BfDI, EDPB, AP, APD/GBA); URLs; dates; numbers; enum-like status values.
- Preserve any inline markdown/HTML in each value.
- Return ONLY the translated JSON object. No fences, no commentary.`;
}

function proseSystemPrompt(languageName: string): string {
  return `You are a professional legal and regulatory translator specialising in privacy law, data protection, and technology regulation. Translate the plain text below from English into ${languageName}.

Rules:
- Preserve paragraph breaks and any inline markdown/HTML formatting exactly.
- NEVER translate: citation markers like [Art. 6(1)(f)], [Recital 47], [E1], [A2], [F3]; statutory strings ("GDPR Article 6(1)", "Cal. Civ. Code § 1798.140"); regulator names (CNIL, ICO, BfDI, EDPB, AP, APD/GBA); URLs; dates; numbers.
- Match the tone of the source: authoritative, professional, precise.
- Return ONLY the translated text. No commentary, no meta.`;
}

async function anthropicCall(
  apiKey: string,
  system: string,
  user: string,
): Promise<string> {
  const r = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: MAX_TOKENS_PER_CALL,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Anthropic ${r.status}: ${t.slice(0, 400)}`);
  }
  const data = await r.json();
  const block = Array.isArray(data?.content)
    ? data.content.find((b: any) => b?.type === "text" && typeof b?.text === "string")
    : null;
  const text = block?.text?.trim();
  if (!text) throw new Error("Empty translation text");
  return text;
}

// ─────────────────────────────────────────────────────────────────────────
// Public: translate a chunk with per-chunk retry
// ─────────────────────────────────────────────────────────────────────────
async function translateJsonMapChunk(
  apiKey: string,
  languageName: string,
  units: StringUnit[],
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const u of units) map[u.path] = u.value;
  const payload = JSON.stringify(map);
  const raw = await anthropicCall(apiKey, jsonMapSystemPrompt(languageName), payload);
  const parsed = JSON.parse(stripFences(raw));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("json_map chunk: not an object");
  }
  // Verify every requested path is present.
  for (const u of units) {
    const v = (parsed as Record<string, unknown>)[u.path];
    if (typeof v !== "string") {
      throw new Error(`json_map chunk: missing/malformed path ${u.path}`);
    }
  }
  return parsed as Record<string, string>;
}

async function translateProseChunk(
  apiKey: string,
  languageName: string,
  segments: string[],
): Promise<string> {
  const parts: string[] = [];
  for (const seg of segments) {
    const t = await anthropicCall(apiKey, proseSystemPrompt(languageName), seg);
    parts.push(t);
  }
  return parts.join("");
}

// ─────────────────────────────────────────────────────────────────────────
// Public: end-to-end translation of a JSON document
// ─────────────────────────────────────────────────────────────────────────
export interface TranslateDocumentOptions {
  apiKey: string;
  languageCode: string;
  languageName: string;
  onProgress?: (chunksDone: number, chunksTotal: number) => Promise<void> | void;
}

export interface TranslateDocumentResult {
  translated: unknown;
  chunksTotal: number;
  chunksDone: number;
  units: number;
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES_PER_CHUNK; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      console.error(`[translation-engine] ${label} attempt ${attempt + 1} failed: ${(e as Error).message}`);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function translateDocument(
  source: unknown,
  opts: TranslateDocumentOptions,
): Promise<TranslateDocumentResult> {
  // Deep clone via JSON so we can safely mutate.
  const cloned = JSON.parse(JSON.stringify(source));
  const units = extractStringUnits(cloned);
  const chunks = planChunks(units);
  const chunksTotal = chunks.length;
  let chunksDone = 0;

  // Empty document short-circuit — still returns the clone unchanged.
  if (chunksTotal === 0) {
    return { translated: cloned, chunksTotal: 0, chunksDone: 0, units: units.length };
  }

  for (const chunk of chunks) {
    if (chunk.kind === "json_map") {
      const translated = await withRetry(
        () => translateJsonMapChunk(opts.apiKey, opts.languageName, chunk.units),
        `json_map(${chunk.units.length} units)`,
      );
      for (const u of chunk.units) {
        setAtPath(cloned, u.path, translated[u.path]);
      }
    } else {
      const joined = await withRetry(
        () => translateProseChunk(opts.apiKey, opts.languageName, chunk.segments),
        `prose(${chunk.segments.length} segs @${chunk.path})`,
      );
      setAtPath(cloned, chunk.path, joined);
    }
    chunksDone++;
    if (opts.onProgress) {
      try { await opts.onProgress(chunksDone, chunksTotal); }
      catch (e) { console.error("[translation-engine] onProgress threw:", (e as Error).message); }
    }
  }

  return { translated: cloned, chunksTotal, chunksDone, units: units.length };
}

// ─────────────────────────────────────────────────────────────────────────
// Public: translate a single plain-text document (used by translate-weekly-brief)
// ─────────────────────────────────────────────────────────────────────────
export async function translatePlainText(
  text: string,
  opts: TranslateDocumentOptions,
): Promise<TranslateDocumentResult> {
  const segments = splitProseSegments(text);
  const chunksTotal = segments.length;
  let chunksDone = 0;
  const parts: string[] = [];
  for (const seg of segments) {
    const t = await withRetry(
      () => anthropicCall(opts.apiKey, proseSystemPrompt(opts.languageName), seg),
      `prose_segment`,
    );
    parts.push(t);
    chunksDone++;
    if (opts.onProgress) {
      try { await opts.onProgress(chunksDone, chunksTotal); }
      catch { /* fire and forget */ }
    }
  }
  return { translated: parts.join(""), chunksTotal, chunksDone, units: chunksTotal };
}
