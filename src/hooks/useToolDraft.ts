// Reusable draft-autosave hook for intake tools.
// Persists answer state to public.tool_sessions for the signed-in user,
// keyed by toolType + clientId (or NULL). Autosave is debounced and silent
// on failure. Completed drafts are flagged, not deleted (retention policy).

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
  clearDraft: () => Promise<void>;
  dismissDraft: () => void;
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

  const draftIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerializedRef = useRef<string>("");

  // Initial lookup of existing active draft.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
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
    if (!enabled || !user) return;
    const serialized = JSON.stringify({ data, currentStage });
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
    if (!draftIdRef.current) return;
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
  }, []);

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
    clearDraft,
    dismissDraft,
  };
}

export default useToolDraft;
