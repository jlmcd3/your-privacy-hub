// Reusable draft-autosave hook for intake tools.
// Persists answer state to public.tool_sessions for the signed-in user,
// keyed by toolType + clientId (or NULL) and, when the page supplies one, an
// explicit assessmentKey stored inside session_data. Autosave is debounced;
// failures surface through `saveError`. Completed drafts are flagged, not
// deleted (retention policy).
//
// Anonymous capture: when nobody is signed in, the same payload is mirrored
// to sessionStorage so intake typed before the sign-in gate survives the trip
// through /login or /signup within the same browsing session. It is session
// scoped on purpose (2026-09-04 policy): an anonymous visitor who leaves does
// not get to return later and finish — the decision is made in-session. On the
// next render with a user present, the pending session draft is migrated into
// tool_sessions and auto-restored silently (no Resume banner) via
// `autoRestoreToken`. Legacy localStorage copies are purged on read.
//
// LIA F01 / Governance F02 / DPIA F02 (intake master reviews, 2026-09-15) —
// DRAFT IDENTITY. The hook used to store the found row's id the moment the
// lookup returned and UPDATE that row as soon as the customer typed, so typing
// on a new assessment silently overwrote an earlier draft, a row from another
// assessment could be adopted, and a failed anonymous migration still deleted
// the local copy. Now:
//   - the FOUND row and the TARGET row are separate; autosave never targets the
//     found row until the customer chooses Resume (`resumeDraft`);
//   - typing before a choice saves to a SEPARATE new row (the earlier draft is
//     kept); `startNewDraft` makes that choice explicit; `clearDraft` completes
//     the found row (Discard);
//   - every ref and every visible restore state resets when the identity
//     (user, tool, client, assessmentKey) changes;
//   - with an `assessmentKey`, lookup and adoption require the row to carry
//     that key inside session_data, and the key is written with every save;
//   - the anonymous migration keeps the local copy when the insert fails.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DRAFT_ASSESSMENT_KEY,
  draftRowMatches,
  type DraftChoice,
  withAssessmentKey,
  withoutAssessmentKey,
} from "@/lib/draftIdentity";

interface UseToolDraftOptions {
  toolType: string;
  clientId: string | null;
  data: Record<string, unknown>;
  currentStage: number;
  enabled: boolean;
  debounceMs?: number;
  /**
   * Explicit assessment identity (e.g. the LIA preview row id). When given,
   * only a draft carrying this key is offered or updated, and the key is
   * stored with every save. Omit for tools whose draft is per user/client.
   */
  assessmentKey?: string | null;
}

interface UseToolDraftReturn {
  draftFound: boolean;
  draftUpdatedAt: Date | null;
  restoreData: Record<string, unknown> | null;
  restoreStage: number | null;
  saving: boolean;
  lastSavedAt: Date | null;
  /** The last save failure, in words the page can show; null when the last save succeeded. */
  saveError: string | null;
  /** Where the customer stands on a found draft (see DraftChoice). */
  draftChoice: DraftChoice;
  /** Increments when a recovered anonymous draft should be applied silently. */
  autoRestoreToken: number;
  /** Discard: completes the FOUND draft; current work (if any) is kept. */
  clearDraft: () => Promise<void>;
  /** Resume: autosave targets the found draft from now on; hides the banner. */
  resumeDraft: () => void;
  /** Keep separate: the found draft stays; current work saves to its own row. */
  startNewDraft: () => void;
  /** @deprecated Kept for pages that call it after applying a restore; equals resumeDraft(). */
  dismissDraft: () => void;
}

const LOCAL_PREFIX = "eup_tool_draft_v1";

function localKey(toolType: string, clientId: string | null): string {
  return `${LOCAL_PREFIX}:${toolType}:${clientId ?? "none"}`;
}

// QA batch 2026-09-05 (RA 01 / AD 03) — the blank-payload guard lives in a
// pure module so it is testable; re-exported here for callers.
import { hasContent } from "@/lib/draftContent";
export { hasContent };

function readLocalDraft(toolType: string, clientId: string | null):
  { data: Record<string, unknown>; currentStage: number; updatedAt: string } | null {
  try {
    // Purge any legacy cross-session copy left by the previous localStorage
    // implementation — anonymous drafts are session scoped now.
    try { localStorage.removeItem(localKey(toolType, clientId)); } catch { /* ignore */ }
    const raw = sessionStorage.getItem(localKey(toolType, clientId));
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
    sessionStorage.setItem(localKey(toolType, clientId), JSON.stringify(payload));
  } catch (e) {
    console.warn("[useToolDraft] session save failed", e);
  }
}

function removeLocalDraft(toolType: string, clientId: string | null) {
  try {
    sessionStorage.removeItem(localKey(toolType, clientId));
  } catch { /* ignore */ }
  try {
    localStorage.removeItem(localKey(toolType, clientId));
  } catch { /* ignore */ }
}

function errorText(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return "The draft could not be saved.";
}

export function useToolDraft({
  toolType,
  clientId,
  data,
  currentStage,
  enabled,
  debounceMs = 2000,
  assessmentKey = null,
}: UseToolDraftOptions): UseToolDraftReturn {
  const { user } = useAuth();
  const [draftFound, setDraftFound] = useState(false);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<Date | null>(null);
  const [restoreData, setRestoreData] = useState<Record<string, unknown> | null>(null);
  const [restoreStage, setRestoreStage] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftChoice, setDraftChoice] = useState<DraftChoice>("none");
  const [autoRestoreToken, setAutoRestoreToken] = useState(0);

  /** The row the lookup found (never written until resumed). */
  const foundIdRef = useRef<string | null>(null);
  /** The row autosave writes to (the found row after Resume; otherwise a new row). */
  const targetIdRef = useRef<string | null>(null);
  const choiceRef = useRef<DraftChoice>("none");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerializedRef = useRef<string>("");

  const setChoice = (c: DraftChoice) => { choiceRef.current = c; setDraftChoice(c); };

  // Initial lookup: pending anonymous draft first (migrate + auto-restore),
  // otherwise the existing server-side draft (Resume banner).
  useEffect(() => {
    let cancelled = false;

    // Identity changed (user / tool / client / assessment): nothing from the
    // previous identity may survive — no row id, no banner, no restore data.
    foundIdRef.current = null;
    targetIdRef.current = null;
    lastSerializedRef.current = "";
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setDraftFound(false);
    setDraftUpdatedAt(null);
    setRestoreData(null);
    setRestoreStage(null);
    setSaveError(null);
    setChoice("none");

    // Anonymous visitor returning to the tool: restore their own local draft.
    if (!user) {
      const local = readLocalDraft(toolType, clientId);
      if (local && hasContent(withoutAssessmentKey(local.data)) && draftRowMatches(local.data, assessmentKey)) {
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
        if (pending && hasContent(withoutAssessmentKey(pending.data)) && draftRowMatches(pending.data, assessmentKey)) {
          const { data: inserted, error: insErr } = await supabase
            .from("tool_sessions" as any)
            .insert({
              user_id: user.id,
              client_id: clientId,
              tool_type: toolType,
              session_data: withAssessmentKey(pending.data, assessmentKey) as any,
              current_stage: pending.currentStage,
              completed: false,
            })
            .select("id")
            .single();
          if (cancelled) return;
          if (insErr) {
            // The local copy is the only copy — keep it, say so, still restore it.
            setSaveError(`Your earlier answers were restored but could not be saved to your account yet (${errorText(insErr)}). They remain in this browser session.`);
          } else {
            removeLocalDraft(toolType, null);
            targetIdRef.current = (inserted as any)?.id ?? null;
            lastSerializedRef.current = JSON.stringify({
              data: pending.data,
              currentStage: pending.currentStage,
            });
            setLastSavedAt(new Date());
            // The migrated row is the customer's own in-session work; it is the
            // active draft (no Resume decision is owed for it).
            setChoice("resumed");
          }
          setRestoreData(pending.data);
          setRestoreStage(pending.currentStage);
          setDraftUpdatedAt(new Date(pending.updatedAt));
          setAutoRestoreToken((t) => t + 1);
          return; // silent restore — no banner
        }

        // 2. Existing server draft — scoped to this assessment when a key is given.
        let q = supabase
          .from("tool_sessions" as any)
          .select("id, session_data, current_stage, updated_at")
          .eq("user_id", user.id)
          .eq("tool_type", toolType)
          .eq("completed", false)
          .order("updated_at", { ascending: false })
          .limit(1);
        q = clientId ? q.eq("client_id", clientId) : q.is("client_id", null);
        if (assessmentKey) q = q.eq(`session_data->>${DRAFT_ASSESSMENT_KEY}`, assessmentKey);
        const { data: rows, error } = await q;
        if (cancelled || error || !rows || rows.length === 0) return;
        const row: any = rows[0];
        if (!draftRowMatches(row.session_data, assessmentKey)) return;
        foundIdRef.current = row.id;
        setDraftFound(true);
        setChoice("unresolved");
        setDraftUpdatedAt(row.updated_at ? new Date(row.updated_at) : null);
        setRestoreData((row.session_data || {}) as Record<string, unknown>);
        setRestoreStage(typeof row.current_stage === "number" ? row.current_stage : 1);
      } catch (e) {
        console.warn("[useToolDraft] load failed", e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, toolType, clientId, assessmentKey]);

  // Debounced autosave.
  useEffect(() => {
    const serialized = JSON.stringify({ data, currentStage });
    const content = hasContent(withoutAssessmentKey(data));

    // Anonymous capture — mirror locally so the sign-in gate does not lose input.
    // Deliberately independent of `enabled`, which callers gate on `!!user`.
    if (!user) {
      if (!content) return;
      if (serialized === lastSerializedRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        writeLocalDraft(toolType, null, { data: withAssessmentKey(data, assessmentKey), currentStage, updatedAt: new Date().toISOString() });
        lastSerializedRef.current = serialized;
      }, 800);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    if (!enabled) return;
    // QA batch 2026-09-05 (RA 01 / AD 03) — never write a blank form to the
    // server. When a page's `enabled` gate misfires on an empty first render,
    // this would UPDATE the target draft with nothing.
    if (!content) return;
    if (serialized === lastSerializedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        const payload = withAssessmentKey(data, assessmentKey);
        if (targetIdRef.current) {
          const { error } = await supabase
            .from("tool_sessions" as any)
            .update({ session_data: payload as any, current_stage: currentStage })
            .eq("id", targetIdRef.current);
          if (error) throw error;
        } else {
          // No target yet: a found-but-undecided draft is never written to.
          // The customer's current work gets its own row; the found draft is
          // kept until they Resume or Discard it.
          const { data: inserted, error } = await supabase
            .from("tool_sessions" as any)
            .insert({
              user_id: user.id,
              client_id: clientId,
              tool_type: toolType,
              session_data: payload as any,
              current_stage: currentStage,
              completed: false,
            })
            .select("id")
            .single();
          if (error) throw error;
          targetIdRef.current = (inserted as any)?.id ?? null;
          if (choiceRef.current === "unresolved") setChoice("separate");
        }
        lastSerializedRef.current = serialized;
        setLastSavedAt(new Date());
        setSaveError(null);
      } catch (e) {
        console.warn("[useToolDraft] save failed", e);
        setSaveError(errorText(e));
      } finally {
        setSaving(false);
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, user, data, currentStage, toolType, clientId, debounceMs, assessmentKey]);

  const completeRow = useCallback(async (id: string | null) => {
    if (!id) return;
    try {
      await supabase
        .from("tool_sessions" as any)
        .update({ completed: true })
        .eq("id", id);
    } catch (e) {
      console.warn("[useToolDraft] clear failed", e);
    }
  }, []);

  /** Discard the FOUND draft. Current work (a separate row, if any) is kept. */
  const clearDraft = useCallback(async () => {
    removeLocalDraft(toolType, null);
    removeLocalDraft(toolType, clientId);
    const found = foundIdRef.current;
    // A resumed draft IS the target: discarding it retires the current work too
    // (the page's completion path calls clearDraft after a successful purchase).
    const target = targetIdRef.current;
    foundIdRef.current = null;
    if (choiceRef.current === "resumed" || found === target) targetIdRef.current = null;
    setDraftFound(false);
    setRestoreData(null);
    setRestoreStage(null);
    setChoice(targetIdRef.current ? "separate" : "none");
    await completeRow(found);
    if (found !== target && choiceRef.current !== "separate") await completeRow(target);
  }, [toolType, clientId, completeRow]);

  /** Resume the found draft: it becomes the autosave target. A separate row
   *  created before the decision is retired so one draft remains. */
  const resumeDraft = useCallback(() => {
    if (!foundIdRef.current) { setDraftFound(false); return; }
    const separate = targetIdRef.current;
    targetIdRef.current = foundIdRef.current;
    lastSerializedRef.current = "";
    setChoice("resumed");
    setDraftFound(false);
    if (separate && separate !== foundIdRef.current) void completeRow(separate);
  }, [completeRow]);

  /** Keep the found draft aside; current work saves to its own row. */
  const startNewDraft = useCallback(() => {
    setChoice("separate");
    setDraftFound(false);
  }, []);

  return {
    draftFound,
    draftUpdatedAt,
    restoreData,
    restoreStage,
    saving,
    lastSavedAt,
    saveError,
    draftChoice,
    autoRestoreToken,
    clearDraft,
    resumeDraft,
    startNewDraft,
    dismissDraft: resumeDraft,
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
