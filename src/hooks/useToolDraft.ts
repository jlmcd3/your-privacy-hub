// Reusable draft-autosave hook for intake tools.
// Persists answer state to public.tool_sessions for the signed-in user,
// keyed by toolType + clientId (or NULL). Autosave is debounced and silent
// on failure. Completed drafts are flagged, not deleted (retention policy).
//
// Anonymous capture: when nobody is signed in, the same payload is mirrored
// to sessionStorage so intake typed before the sign-in gate survives the trip
// through /login or /signup within the same browsing session. It is session
// scoped on purpose (2026-09-04 policy): an anonymous visitor who leaves does
// not get to return later and finish — the decision is made in-session. On the
// next render with a user present, the pending session draft is migrated into
// tool_sessions and auto-restored silently (no Resume banner) via
// `autoRestoreToken`. Legacy localStorage copies are purged on read.


import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UseToolDraftOptions {
  toolType: string;
  clientId: string | null;
  data: Record<string, unknown>;
  currentStage: number;
  enabled: boolean;
  debounceMs?: number;
}

interface UseToolDraftReturn {
  draftFound: boolean;
  draftUpdatedAt: Date | null;
  restoreData: Record<string, unknown> | null;
  restoreStage: number | null;
  saving: boolean;
  lastSavedAt: Date | null;
  /** Increments when a recovered anonymous draft should be applied silently. */
  autoRestoreToken: number;
  clearDraft: () => Promise<void>;
  dismissDraft: () => void;
}

const LOCAL_PREFIX = "eup_tool_draft_v1";

function localKey(toolType: string, clientId: string | null): string {
  return `${LOCAL_PREFIX}:${toolType}:${clientId ?? "none"}`;
}

function hasContent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(hasContent);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasContent);
  return false;
}

function readLocalDraft(toolType: string, clientId: string | null):
  { data: Record<string, unknown>; currentStage: number; updatedAt: string } | null {
  try {
    const raw = localStorage.getItem(localKey(toolType, clientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.data) return null;
    return {
      data: parsed.data as Record<string, unknown>,
      currentStage: typeof parsed.currentStage === "number" ? parsed.currentStage : 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeLocalDraft(toolType: string, clientId: string | null, payload: unknown) {
  try {
    localStorage.setItem(localKey(toolType, clientId), JSON.stringify(payload));
  } catch (e) {
    console.warn("[useToolDraft] local save failed", e);
  }
}

function removeLocalDraft(toolType: string, clientId: string | null) {
  try {
    localStorage.removeItem(localKey(toolType, clientId));
  } catch { /* ignore */ }
}

export function useToolDraft({
  toolType,
  clientId,
  data,
  currentStage,
  enabled,
  debounceMs = 2000,
}: UseToolDraftOptions): UseToolDraftReturn {
  const { user } = useAuth();
  const [draftFound, setDraftFound] = useState(false);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<Date | null>(null);
  const [restoreData, setRestoreData] = useState<Record<string, unknown> | null>(null);
  const [restoreStage, setRestoreStage] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autoRestoreToken, setAutoRestoreToken] = useState(0);

  const draftIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerializedRef = useRef<string>("");

  // Initial lookup: pending anonymous draft first (migrate + auto-restore),
  // otherwise the existing server-side draft (Resume banner).
  useEffect(() => {
    let cancelled = false;

    // Anonymous visitor returning to the tool: restore their own local draft.
    if (!user) {
      const local = readLocalDraft(toolType, clientId);
      if (local && hasContent(local.data)) {
        setRestoreData(local.data);
        setRestoreStage(local.currentStage);
        setDraftUpdatedAt(new Date(local.updatedAt));
        setAutoRestoreToken((t) => t + 1);
      }
      return;
    }

    (async () => {
      try {
        // 1. Migrate a pending anonymous draft into tool_sessions.
        // The anonymous draft is always keyed with clientId=null.
        const pending = readLocalDraft(toolType, null);
        if (pending && hasContent(pending.data)) {
          const { data: inserted, error: insErr } = await supabase
            .from("tool_sessions" as any)
            .insert({
              user_id: user.id,
              client_id: clientId,
              tool_type: toolType,
              session_data: pending.data as any,
              current_stage: pending.currentStage,
              completed: false,
            })
            .select("id")
            .single();
          removeLocalDraft(toolType, null);
          if (cancelled) return;
          if (!insErr) {
            draftIdRef.current = (inserted as any)?.id ?? null;
            lastSerializedRef.current = JSON.stringify({
              data: pending.data,
              currentStage: pending.currentStage,
            });
          }
          setRestoreData(pending.data);
          setRestoreStage(pending.currentStage);
          setDraftUpdatedAt(new Date(pending.updatedAt));
          setLastSavedAt(new Date());
          setAutoRestoreToken((t) => t + 1);
          return; // silent restore — no banner
        }

        // 2. Existing server draft.
        let q = supabase
          .from("tool_sessions" as any)
          .select("id, session_data, current_stage, updated_at")
          .eq("user_id", user.id)
          .eq("tool_type", toolType)
          .eq("completed", false)
          .order("updated_at", { ascending: false })
          .limit(1);
        q = clientId ? q.eq("client_id", clientId) : q.is("client_id", null);
        const { data: rows, error } = await q;
        if (cancelled || error || !rows || rows.length === 0) return;
        const row: any = rows[0];
        draftIdRef.current = row.id;
        setDraftFound(true);
        setDraftUpdatedAt(row.updated_at ? new Date(row.updated_at) : null);
        setRestoreData((row.session_data || {}) as Record<string, unknown>);
        setRestoreStage(typeof row.current_stage === "number" ? row.current_stage : 1);
      } catch (e) {
        console.warn("[useToolDraft] load failed", e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, toolType, clientId]);

  // Debounced autosave.
  useEffect(() => {
    const serialized = JSON.stringify({ data, currentStage });

    // Anonymous capture — mirror locally so the sign-in gate does not lose input.
    // Deliberately independent of `enabled`, which callers gate on `!!user`.
    if (!user) {
      if (!hasContent(data)) return;
      if (serialized === lastSerializedRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        writeLocalDraft(toolType, null, { data, currentStage, updatedAt: new Date().toISOString() });
        lastSerializedRef.current = serialized;
      }, 800);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    if (!enabled) return;
    if (serialized === lastSerializedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        if (draftIdRef.current) {
          const { error } = await supabase
            .from("tool_sessions" as any)
            .update({ session_data: data as any, current_stage: currentStage })
            .eq("id", draftIdRef.current);
          if (error) throw error;
        } else {
          const { data: inserted, error } = await supabase
            .from("tool_sessions" as any)
            .insert({
              user_id: user.id,
              client_id: clientId,
              tool_type: toolType,
              session_data: data as any,
              current_stage: currentStage,
              completed: false,
            })
            .select("id")
            .single();
          if (error) throw error;
          draftIdRef.current = (inserted as any)?.id ?? null;
        }
        lastSerializedRef.current = serialized;
        setLastSavedAt(new Date());
      } catch (e) {
        console.warn("[useToolDraft] save failed", e);
      } finally {
        setSaving(false);
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, user, data, currentStage, toolType, clientId, debounceMs]);

  const clearDraft = useCallback(async () => {
    removeLocalDraft(toolType, null);
    removeLocalDraft(toolType, clientId);
    if (!draftIdRef.current) {
      setDraftFound(false);
      setRestoreData(null);
      setRestoreStage(null);
      return;
    }
    try {
      await supabase
        .from("tool_sessions" as any)
        .update({ completed: true })
        .eq("id", draftIdRef.current);
    } catch (e) {
      console.warn("[useToolDraft] clear failed", e);
    } finally {
      draftIdRef.current = null;
      setDraftFound(false);
      setRestoreData(null);
      setRestoreStage(null);
    }
  }, [toolType, clientId]);

  const dismissDraft = useCallback(() => {
    setDraftFound(false);
  }, []);

  return {
    draftFound,
    draftUpdatedAt,
    restoreData,
    restoreStage,
    saving,
    lastSavedAt,
    autoRestoreToken,
    clearDraft,
    dismissDraft,
  };
}

/**
 * Applies a recovered anonymous draft exactly once per token bump.
 * Call it in the tool page immediately after `applyRestore` is defined.
 */
export function useAutoRestoreDraft(token: number, apply: () => void) {
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const lastRef = useRef(0);
  useEffect(() => {
    if (token > 0 && token !== lastRef.current) {
      lastRef.current = token;
      applyRef.current();
    }
  }, [token]);
}

export default useToolDraft;
