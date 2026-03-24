import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Send, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Message { role: "user" | "assistant"; content: string; }

const SUGGESTED_QUESTIONS = [
  "What is the breach notification deadline in France?",
  "Does Germany require a DPO for all companies?",
  "What are the key differences between GDPR and CCPA?",
  "Is there a privacy law in India currently in force?",
  "What enforcement actions has the ICO taken in 2025?",
];

const FREE_QUESTION_LIMIT = 3;
const PREMIUM_QUESTION_LIMIT = 50;

interface AskPrivacyProps { isPremium: boolean; }

export default function AskPrivacy({ isPremium }: AskPrivacyProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);

  // Fetch current question count
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("ask_privacy_count, ask_privacy_reset_date")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const today = new Date().toISOString().split("T")[0];
        const resetDate = (data as any).ask_privacy_reset_date;
        if (resetDate && resetDate.slice(0, 7) < today.slice(0, 7)) {
          setQuestionCount(0);
        } else {
          setQuestionCount((data as any).ask_privacy_count ?? 0);
        }
      });
  }, [user]);

  const questionLimit = isPremium ? PREMIUM_QUESTION_LIMIT : FREE_QUESTION_LIMIT;

  useEffect(() => {
    if (questionCount >= questionLimit) {
      setLimitReached(true);
    }
  }, [questionCount, questionLimit]);

  const sendMessage = async (text?: string) => {
    const question = text ?? input;
    if (!question.trim() || loading) return;

    // Check limit before sending
    if (questionCount >= questionLimit) {
      setLimitReached(true);
      return;
    }

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const response = await supabase.functions.invoke("ask-privacy", {
        body: {
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: question },
          ],
        },
      });
      const answer = response.data?.answer ?? "Sorry, I couldn't process that question.";
      setMessages(prev => [...prev, { role: "assistant", content: answer }]);

      // Increment local count for free users
      if (!isPremium) {
        setQuestionCount(prev => prev + 1);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  // Fully locked state for non-premium users (no questions available)
  if (!isPremium && limitReached) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 text-center">
        <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h3 className="font-bold text-foreground text-[16px] mb-2">Question Limit Reached</h3>
        <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
          You've used your {FREE_QUESTION_LIMIT} free questions this month. Upgrade to ask unlimited
          questions with full conversation memory.
        </p>
        <Link to="/subscribe" className="inline-block bg-gradient-to-br from-navy to-blue text-white font-semibold text-sm px-6 py-2.5 rounded-xl no-underline hover:opacity-90 transition-all">
          Upgrade to Premium →
        </Link>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="text-center mb-4">
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="font-bold text-foreground text-[16px] mb-2">Ask a Privacy Question</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            {FREE_QUESTION_LIMIT - questionCount} free question{FREE_QUESTION_LIMIT - questionCount !== 1 ? "s" : ""} remaining this month.
            Premium members get unlimited questions.
          </p>
        </div>

        {/* Show conversation if any */}
        {messages.length > 0 && (
          <div className="min-h-[100px] max-h-[300px] overflow-y-auto mb-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5 text-[13px] text-muted-foreground animate-pulse">
                  Researching…
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask about any privacy law, regulator, or enforcement action…"
            className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-primary text-primary-foreground w-10 h-10 rounded-xl flex items-center justify-center hover:opacity-90 transition-colors disabled:opacity-40 cursor-pointer border-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {messages.length === 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Try a question:</p>
            {SUGGESTED_QUESTIONS.slice(0, 3).map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="block w-full text-left bg-muted hover:bg-accent border border-border hover:border-primary/20 rounded-xl px-3 py-2.5 text-xs text-foreground transition-all cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          AI responses should be verified against primary sources. Not legal advice.
        </p>
      </div>
    );
  }

  // Premium experience — unchanged
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="bg-navy px-5 py-4 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-300" />
        <h3 className="font-bold text-white text-[14px]">Ask a Privacy Question</h3>
        <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-2 py-0.5 rounded-full">
          Premium
        </span>
      </div>

      <div className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="py-4">
            <p className="text-muted-foreground text-sm mb-3">Try one of these questions:</p>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="block w-full text-left bg-muted hover:bg-accent border border-border hover:border-primary/20 rounded-xl px-3 py-2.5 text-xs text-foreground transition-all cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5 text-[13px] text-muted-foreground animate-pulse">
              Researching…
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask about any privacy law, regulator, or enforcement action…"
          className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="bg-primary text-primary-foreground w-10 h-10 rounded-xl flex items-center justify-center hover:opacity-90 transition-colors disabled:opacity-40 cursor-pointer border-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center pb-2">
        AI responses should be verified against primary sources. Not legal advice.
      </p>
    </div>
  );
}
