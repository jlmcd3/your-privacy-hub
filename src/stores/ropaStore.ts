import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface RopaSession {
  id: string;
  client_id: string;
  status: string;
  version_number: number;
  is_refresh: boolean;
  parent_session_id: string | null;
  total_activities: number;
  completed_activities: number;
  open_flags_count: number;
  payment_confirmed: boolean;
  paid_at: string | null;
}

export interface RopaActivity {
  id: string;
  session_id: string;
  client_id: string;
  template_key: string | null;
  display_name: string;
  category: string;
  status: string;
  completion_pct: number;
  is_high_risk: boolean;
  is_public_facing: boolean;
  display_order: number;
}

export interface Question {
  key: string;
  text: string;
  whyWeAsk: string;
  type: string;
  options?: Array<{ value: string; label: string; example?: string }>;
  isRequired: boolean;
  showIf?: { questionKey: string; operator: string; value: string | string[] };
  flagIf?: Array<{
    operator: string;
    value: string | string[];
    flagType: string;
    severity: string;
    message: string;
    consequence: string;
    actionLabel?: string;
    actionRoute?: string;
  }>;
  jurisdictionOnly?: string[];
}

export interface RopaFlag {
  id: string;
  session_id: string;
  activity_id: string | null;
  flag_type: string;
  severity: string;
  question_key: string | null;
  flag_message: string;
  consequence: string | null;
  action_label: string | null;
  action_route: string | null;
  resolved: boolean;
}

export interface FlagSummary {
  total: number;
  errors: number;
  warnings: number;
  recommendations: number;
  unresolvedActivities: string[];
}

interface RopaStore {
  currentSession: RopaSession | null;
  allActivities: RopaActivity[];
  currentActivity: RopaActivity | null;
  currentQuestions: Question[];
  currentAnswers: Record<string, JsonValue>;
  currentQuestionIndex: number;
  skippedQuestionKeys: Set<string>;
  flags: RopaFlag[];
  isSaving: boolean;
  saveError: string | null;
  lastSavedAt: Date | null;
  activeMinutes: number;

  loadSession: (sessionId: string) => Promise<void>;
  loadActivity: (activityId: string) => Promise<void>;
  loadFlags: () => Promise<void>;
  createSession: (clientId: string) => Promise<string>;
  saveAnswer: (questionKey: string, value: JsonValue) => Promise<void>;
  clearAnswersDownstreamOf: (questionKey: string) => Promise<void>;
  goToQuestion: (index: number) => void;
  goToNextQuestion: () => void;
  goToPreviousQuestion: () => void;
  markActivityComplete: () => Promise<void>;
  deleteActivity: (activityId: string) => Promise<void>;
  createFlag: (
    flag: Omit<RopaFlag, "id" | "created_at"> & { created_at?: string }
  ) => Promise<void>;
  resolveFlag: (flagId: string) => Promise<void>;
  evaluateFlagsForAnswer: (
    questionKey: string,
    value: JsonValue,
    flagIfList: Array<{
      operator: string;
      value: string | string[];
      flagType: string;
      severity: string;
      message: string;
      consequence: string;
      actionLabel?: string;
      actionRoute?: string;
    }>
  ) => Promise<void>;
  runSessionLevelChecks: () => Promise<void>;
  getFlagSummary: () => FlagSummary;
  heartbeat: () => void;
  startHeartbeat: () => void;
  clearSession: () => void;
}

// ----- module-level mutex / debounce state -----

let saveQueue: Promise<void> = Promise.resolve();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

function enqueueSave(work: () => Promise<void>) {
  saveQueue = saveQueue.then(work, work);
  return saveQueue;
}

const SUPA = supabase as unknown as {
  from: (table: string) => any;
};

export const useRopaStore = create<RopaStore>()((set, get) => ({
  currentSession: null,
  allActivities: [],
  currentActivity: null,
  currentQuestions: [],
  currentAnswers: {},
  currentQuestionIndex: 0,
  skippedQuestionKeys: new Set<string>(),
  flags: [],
  isSaving: false,
  saveError: null,
  lastSavedAt: null,
  activeMinutes: 0,

  async loadSession(sessionId: string) {
    set({
      currentSession: null,
      allActivities: [],
      flags: [],
      currentActivity: null,
      currentAnswers: {},
      saveError: null,
    });
    const { data: session, error: sErr } = await SUPA.from("ropa_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();
    if (sErr) {
      set({ saveError: sErr.message, currentSession: null, allActivities: [], flags: [] });
      return;
    }
    const { data: activities } = await SUPA.from("ropa_processing_activities")
      .select("*")
      .eq("session_id", sessionId)
      .order("display_order", { ascending: true });
    const { data: flagRows } = await SUPA.from("ropa_flags")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    set({
      currentSession: session as RopaSession,
      allActivities: (activities ?? []) as RopaActivity[],
      flags: (flagRows ?? []) as RopaFlag[],
    });
  },

  async loadActivity(activityId: string) {
    set({
      currentActivity: null,
      currentAnswers: {},
      currentQuestionIndex: 0,
      skippedQuestionKeys: new Set<string>(),
      saveError: null,
    });
    const { data: activity, error: aErr } = await SUPA.from(
      "ropa_processing_activities"
    )
      .select("*")
      .eq("id", activityId)
      .single();
    if (aErr) {
      set({ saveError: aErr.message, currentActivity: null, currentAnswers: {} });
      return;
    }
    const { data: answerRows } = await SUPA.from("ropa_answers")
      .select("question_key, answer_value")
      .eq("activity_id", activityId);
    const answerMap: Record<string, JsonValue> = {};
    for (const r of answerRows ?? []) {
      answerMap[r.question_key as string] = r.answer_value as JsonValue;
    }
    set({
      currentActivity: activity as RopaActivity,
      currentAnswers: answerMap,
      currentQuestionIndex: 0,
      skippedQuestionKeys: new Set<string>(),
    });
  },

  async createSession(clientId: string) {
    const { data, error } = await SUPA.from("ropa_sessions")
      .insert({ client_id: clientId })
      .select("*")
      .single();
    if (error) throw error;
    const session = data as RopaSession;
    set({ currentSession: session });
    return session.id;
  },

  async saveAnswer(questionKey: string, value: JsonValue) {
    const activity = get().currentActivity;
    const session = get().currentSession;
    if (!activity || !session) return;

    // Optimistic local update
    set((s) => ({
      currentAnswers: { ...s.currentAnswers, [questionKey]: value },
    }));

    // Debounce per-question 500ms, then enqueue serialized save
    const existing = debounceTimers.get(questionKey);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      debounceTimers.delete(questionKey);
      enqueueSave(async () => {
        set({ isSaving: true, saveError: null });
        const { error } = await SUPA.from("ropa_answers").upsert(
          {
            activity_id: activity.id,
            session_id: session.id,
            question_key: questionKey,
            answer_value: value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "activity_id,question_key" }
        );
        if (error) {
          set({ isSaving: false, saveError: error.message });
        } else {
          set({ isSaving: false, lastSavedAt: new Date(), saveError: null });
        }
      });
    }, 500);
    debounceTimers.set(questionKey, timer);
  },

  async clearAnswersDownstreamOf(questionKey: string) {
    const { currentQuestions, currentAnswers, currentActivity } = get();
    if (!currentActivity) return;
    const downstreamKeys = currentQuestions
      .filter((q) => q.showIf?.questionKey === questionKey)
      .map((q) => q.key);
    if (downstreamKeys.length === 0) return;

    await SUPA.from("ropa_answers")
      .delete()
      .eq("activity_id", currentActivity.id)
      .in("question_key", downstreamKeys);

    const next = { ...currentAnswers };
    for (const k of downstreamKeys) delete next[k];
    set({ currentAnswers: next, skippedQuestionKeys: new Set<string>() });
  },

  goToQuestion(index: number) {
    set({ currentQuestionIndex: Math.max(0, index) });
  },
  goToNextQuestion() {
    set((s) => ({
      currentQuestionIndex: Math.min(
        s.currentQuestions.length - 1,
        s.currentQuestionIndex + 1
      ),
    }));
  },
  goToPreviousQuestion() {
    set((s) => ({
      currentQuestionIndex: Math.max(0, s.currentQuestionIndex - 1),
    }));
  },

  async markActivityComplete() {
    const activity = get().currentActivity;
    if (!activity) return;
    const { error } = await SUPA.from("ropa_processing_activities")
      .update({ status: "complete", completion_pct: 100 })
      .eq("id", activity.id);
    if (error) {
      set({ saveError: error.message });
      return;
    }
    set((s) => ({
      currentActivity: s.currentActivity
        ? { ...s.currentActivity, status: "complete", completion_pct: 100 }
        : null,
      allActivities: s.allActivities.map((a) =>
        a.id === activity.id
          ? { ...a, status: "complete", completion_pct: 100 }
          : a
      ),
    }));
  },

  async deleteActivity(activityId: string) {
    const session = get().currentSession;
    // Wipe everything tied to this activity: answers, flags, then the row.
    await SUPA.from("ropa_answers").delete().eq("activity_id", activityId);
    const { data: removedFlags } = await SUPA.from("ropa_flags")
      .delete()
      .eq("activity_id", activityId)
      .select("id, resolved");
    const { error } = await SUPA.from("ropa_processing_activities")
      .delete()
      .eq("id", activityId);
    if (error) {
      set({ saveError: error.message });
      throw error;
    }

    const openRemoved = (removedFlags ?? []).filter(
      (f: { resolved: boolean }) => !f.resolved
    ).length;

    if (session && openRemoved > 0) {
      const newCount = Math.max(0, (session.open_flags_count ?? 0) - openRemoved);
      await SUPA.from("ropa_sessions")
        .update({ open_flags_count: newCount })
        .eq("id", session.id);
    }

    set((s) => {
      const remaining = s.allActivities.filter((a) => a.id !== activityId);
      const openRemovedSafe = openRemoved;
      return {
        allActivities: remaining,
        flags: s.flags.filter((f) => f.activity_id !== activityId),
        currentActivity:
          s.currentActivity?.id === activityId ? null : s.currentActivity,
        currentAnswers:
          s.currentActivity?.id === activityId ? {} : s.currentAnswers,
        currentSession:
          s.currentSession && openRemovedSafe > 0
            ? {
                ...s.currentSession,
                open_flags_count: Math.max(
                  0,
                  (s.currentSession.open_flags_count ?? 0) - openRemovedSafe
                ),
              }
            : s.currentSession,
      };
    });
  },

  async loadFlags() {
    const session = get().currentSession;
    if (!session) return;
    const { data } = await SUPA.from("ropa_flags")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false });
    set({ flags: (data ?? []) as RopaFlag[] });
  },

  async createFlag(flag) {
    const sessionId = flag.session_id;
    const existing = get().flags.find(
      (f) =>
        !f.resolved &&
        f.session_id === sessionId &&
        f.activity_id === flag.activity_id &&
        f.question_key === flag.question_key &&
        f.flag_type === flag.flag_type
    );
    if (existing) return;

    const { data, error } = await SUPA.from("ropa_flags")
      .insert({
        session_id: flag.session_id,
        activity_id: flag.activity_id,
        flag_type: flag.flag_type,
        severity: flag.severity,
        question_key: flag.question_key,
        flag_message: flag.flag_message,
        consequence: flag.consequence,
        action_label: flag.action_label,
        action_route: flag.action_route,
        resolved: flag.resolved,
      })
      .select()
      .single();
    if (error) {
      set({ saveError: error.message });
      return;
    }
    const newCount = (get().currentSession?.open_flags_count ?? 0) + 1;
    await SUPA.from("ropa_sessions")
      .update({ open_flags_count: newCount })
      .eq("id", sessionId);
    set((s) => ({
      flags: [data as RopaFlag, ...s.flags],
      currentSession: s.currentSession
        ? { ...s.currentSession, open_flags_count: newCount }
        : s.currentSession,
    }));
  },

  async resolveFlag(flagId: string) {
    const flag = get().flags.find((f) => f.id === flagId);
    if (!flag || flag.resolved) return;
    const { error } = await SUPA.from("ropa_flags")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", flagId);
    if (error) {
      set({ saveError: error.message });
      return;
    }
    const newCount = Math.max(
      0,
      (get().currentSession?.open_flags_count ?? 1) - 1
    );
    await SUPA.from("ropa_sessions")
      .update({ open_flags_count: newCount })
      .eq("id", flag.session_id);
    set((s) => ({
      flags: s.flags.map((f) =>
        f.id === flagId ? { ...f, resolved: true } : f
      ),
      currentSession: s.currentSession
        ? { ...s.currentSession, open_flags_count: newCount }
        : s.currentSession,
    }));
  },

  async evaluateFlagsForAnswer(questionKey, value, flagIfList) {
    const activity = get().currentActivity;
    const session = get().currentSession;
    if (!activity || !session) return;

    const matchesCondition = (cond: { operator: string; value: string | string[] }) => {
      if (cond.operator === "equals") return value === cond.value;
      if (cond.operator === "contains") {
        if (Array.isArray(value)) {
          return Array.isArray(cond.value)
            ? cond.value.some((c) => (value as string[]).includes(c))
            : (value as string[]).includes(cond.value as string);
        }
        return false;
      }
      return false;
    };

    for (const cond of flagIfList) {
      const triggered = matchesCondition(cond);
      const existing = get().flags.find(
        (f) =>
          f.session_id === session.id &&
          f.activity_id === activity.id &&
          f.question_key === questionKey &&
          f.flag_type === cond.flagType
      );

      if (triggered && (!existing || existing.resolved)) {
        await get().createFlag({
          session_id: session.id,
          activity_id: activity.id,
          flag_type: cond.flagType,
          severity: cond.severity,
          question_key: questionKey,
          flag_message: cond.message,
          consequence: cond.consequence,
          action_label: cond.actionLabel ?? null,
          action_route: cond.actionRoute ?? null,
          resolved: false,
        });
      } else if (!triggered && existing && !existing.resolved) {
        await get().resolveFlag(existing.id);
      }
    }
  },

  async runSessionLevelChecks() {
    const session = get().currentSession;
    if (!session) return;
    const activities = get().allActivities;

    const { data: answerRows } = await SUPA.from("ropa_answers")
      .select("activity_id, question_key, answer_value")
      .eq("session_id", session.id);

    const answersByActivity: Record<string, Record<string, JsonValue>> = {};
    for (const r of answerRows ?? []) {
      const aid = r.activity_id as string;
      if (!answersByActivity[aid]) answersByActivity[aid] = {};
      answersByActivity[aid][r.question_key as string] = r.answer_value as JsonValue;
    }

    for (const a of activities) {
      const aAnswers = answersByActivity[a.id] ?? {};
      const procVal = aAnswers["processor_platform"];
      const isEmpty =
        procVal == null ||
        (Array.isArray(procVal) && procVal.length === 0) ||
        procVal === "";
      if (Object.keys(aAnswers).length > 0 && isEmpty) {
        await get().createFlag({
          session_id: session.id,
          activity_id: a.id,
          flag_type: "missing_required",
          severity: "warning",
          question_key: "processor_platform",
          flag_message: `Processor not documented for ${a.display_name}`,
          consequence:
            "GDPR Art.30 requires identifying processors used for each processing activity.",
          action_label: null,
          action_route: null,
          resolved: false,
        });
      }
    }

    const { data: profile } = await SUPA.from("ropa_client_profiles")
      .select("dpo_name, selected_jurisdictions")
      .eq("client_id", session.client_id)
      .maybeSingle();

    const jurisdictions: string[] =
      (profile?.selected_jurisdictions as string[]) ?? [];
    if (!profile?.dpo_name && jurisdictions.includes("EU_GDPR")) {
      await get().createFlag({
        session_id: session.id,
        activity_id: null,
        flag_type: "recommendation",
        severity: "info",
        question_key: null,
        flag_message:
          "Consider whether a DPO is required under GDPR Art.37. Organisations engaged in large-scale systematic monitoring or processing of special category data on a large scale are required to appoint a DPO.",
        consequence:
          "Failure to designate a required DPO is a breach of GDPR Art.37.",
        action_label: null,
        action_route: null,
        resolved: false,
      });
    }

    const usPlatformDetected = Object.values(answersByActivity).some((aa) => {
      const v = aa["processor_platform"];
      if (!v) return false;
      const s = JSON.stringify(v).toLowerCase();
      return /aws|google|microsoft|hubspot|salesforce|stripe|mailchimp|zendesk|slack|atlassian|cloudflare/.test(
        s
      );
    });
    const dpaConfirmed = Object.values(answersByActivity).some((aa) => {
      const v = aa["dpa_in_place"] ?? aa["processor_agreement_signed"];
      return v === "yes" || v === true;
    });
    if (usPlatformDetected && !dpaConfirmed) {
      await get().createFlag({
        session_id: session.id,
        activity_id: null,
        flag_type: "recommendation",
        severity: "recommendation",
        question_key: null,
        flag_message:
          "Ensure Data Processing Agreements are in place with all US-based processors. These are required under GDPR Art.28 regardless of transfer mechanism.",
        consequence:
          "Missing Art.28 DPAs expose the controller to direct enforcement risk.",
        action_label: "Generate DPA",
        action_route: "/dpa-generator",
        resolved: false,
      });
    }
  },

  getFlagSummary() {
    const open = get().flags.filter((f) => !f.resolved);
    const errors = open.filter((f) => f.flag_type === "missing_required").length;
    const warnings = open.filter(
      (f) => f.severity === "warning" && f.flag_type !== "missing_required"
    ).length;
    const recommendations = open.filter(
      (f) => f.flag_type === "recommendation" || f.flag_type === "cross_sell"
    ).length;

    const activityMap = new Map<string, string>();
    get().allActivities.forEach((a) => activityMap.set(a.id, a.display_name));
    const unresolvedActivities = Array.from(
      new Set(
        open
          .map((f) => (f.activity_id ? activityMap.get(f.activity_id) : null))
          .filter((v): v is string => Boolean(v))
      )
    );

    return {
      total: open.length,
      errors,
      warnings,
      recommendations,
      unresolvedActivities,
    };
  },

  heartbeat() {
    if (typeof document === "undefined") return;
    if (document.visibilityState !== "visible") return;
    set((s) => ({ activeMinutes: s.activeMinutes + 1 }));
  },

  startHeartbeat() {
    if (heartbeatInterval) return;
    heartbeatInterval = setInterval(() => {
      get().heartbeat();
    }, 60_000);
  },

  clearSession() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    for (const t of debounceTimers.values()) clearTimeout(t);
    debounceTimers.clear();
    set({
      currentSession: null,
      allActivities: [],
      currentActivity: null,
      currentQuestions: [],
      currentAnswers: {},
      currentQuestionIndex: 0,
      skippedQuestionKeys: new Set<string>(),
      flags: [],
      isSaving: false,
      saveError: null,
      lastSavedAt: null,
      activeMinutes: 0,
    });
  },
}));
