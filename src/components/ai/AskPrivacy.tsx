import { useState } from "react";
import { Link } from "react-router-dom";
import { Send, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message { role: "user" | "assistant"; content: string; }

const SUGGESTED_QUESTIONS = [
  "What is the breach notification deadline in France?",
  "Does Germany require a DPO for all companies?",
  "What are the key differences between GDPR and CCPA?",
  "Is there a privacy law in India currently in force?",
  "What enforcement actions has the ICO taken in 2025?",
];

interface AskPrivacyProps { isPremium: boolean; }

export default function AskPrivacy({ isPremium }: AskPrivacyProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text?: string) => {
    const question = text ?? input;
    if (!question.trim() || loading) return;
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
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <div className="bg-white rounded-2xl border border-fog p-6 text-center">
        <Sparkles className="w-8 h-8 text-blue mx-auto mb-3" />
        <h3 className="font-bold text-navy text-[16px] mb-2">Ask a Privacy Question</h3>
        <p className="text-slate text-sm mb-4 max-w-sm mx-auto">
          Premium members can ask our AI assistant any privacy regulatory question
          and get an instant, cited answer.
        </p>
        <Link to="/subscribe" className="inline-block bg-gradient-to-br from-navy to-blue text-white font-semibold text-sm px-6 py-2.5 rounded-xl no-underline hover:opacity-90 transition-all">
          Upgrade to Premium →
        </Link>
        <div className="mt-6 text-left space-y-2">
          <p className="text-xs text-slate-light font-semibold uppercase tracking-wider mb-3">Example questions:</p>
          {SUGGESTED_QUESTIONS.slice(0,3).map(q => (
            <div key={q} className="bg-fog rounded-lg px-3 py-2 text-xs text-slate">{q}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-fog overflow-hidden">
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
            <p className="text-slate text-sm mb-3">Try one of these questions:</p>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="block w-full text-left bg-fog hover:bg-blue/5 border border-fog hover:border-blue/20 rounded-xl px-3 py-2.5 text-xs text-navy transition-all cursor-pointer"
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
                    ? "bg-navy text-white rounded-br-sm"
                    : "bg-fog text-navy rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-fog rounded-2xl rounded-bl-sm px-4 py-2.5 text-[13px] text-slate animate-pulse">
              Researching…
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-fog p-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask about any privacy law, regulator, or enforcement action…"
          className="flex-1 bg-fog rounded-xl px-4 py-2.5 text-[13px] text-navy placeholder:text-slate-light focus:outline-none focus:ring-2 focus:ring-blue/20"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="bg-blue text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-navy transition-colors disabled:opacity-40 cursor-pointer border-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[10px] text-slate-light text-center pb-2">
        AI responses should be verified against primary sources. Not legal advice.
      </p>
    </div>
  );
}
