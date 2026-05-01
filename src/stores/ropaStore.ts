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
  isSaving: false,
  saveError: null,
  lastSavedAt: null,
  activeMinutes: 0,

  async loadSession(sessionId: string) {
    const { data: session, error: sErr } = await SUPA.from("ropa_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();
    if (sErr) {
      set({ saveError: sErr.message });
      return;
    }
    const { data: activities } = await SUPA.from("ropa_processing_activities")
      .select("*")
      .eq("session_id", sessionId)
      .order("display_order", { ascending: true });
    set({
      currentSession: session as RopaSession,
      allActivities: (activities ?? []) as RopaActivity[],
    });
  },

  async loadActivity(activityId: string) {
    const { data: activity, error: aErr } = await SUPA.from(
      "ropa_processing_activities"
    )
      .select("*")
      .eq("id", activityId)
      .single();
    if (aErr) {
      set({ saveError: aErr.message });
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

  async createFlag(flag) {
    const { error } = await SUPA.from("ropa_flags").insert({
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
    });
    if (error) set({ saveError: error.message });
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
      isSaving: false,
      saveError: null,
      lastSavedAt: null,
      activeMinutes: 0,
    });
  },
}));
