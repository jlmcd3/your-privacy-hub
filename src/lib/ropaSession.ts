// Helpers for keeping the RoPA flow scoped to a single session as the user
// navigates back and forth through Setup → Activities → Q&A → Review → Documents.
//
// Strategy: every step page reads `?session=<uuid>` from the URL. If absent it
// falls back to "latest open session for the active client" and then locks the
// URL by calling setSearchParams. All internal navigation preserves the param.

import { useSearchParams } from "react-router-dom";

const SESSION_QS_KEY = "session";

/** Read the current `?session=` value from the URL, if any. */
export function useRopaSessionParam(): string | null {
  const [params] = useSearchParams();
  const v = params.get(SESSION_QS_KEY);
  return v && v.length > 0 ? v : null;
}

/** Append `?session=<id>` to a path (idempotent; replaces existing param). */
export function withSession(path: string, sessionId: string | null | undefined): string {
  if (!sessionId) return path;
  const [base, existingQs = ""] = path.split("?");
  const sp = new URLSearchParams(existingQs);
  sp.set(SESSION_QS_KEY, sessionId);
  return `${base}?${sp.toString()}`;
}

export const ROPA_SESSION_QS_KEY = SESSION_QS_KEY;
