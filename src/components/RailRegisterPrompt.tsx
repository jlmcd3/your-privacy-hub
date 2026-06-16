// src/components/RailRegisterPrompt.tsx
// Soft inline registration prompt shown in the rail panel area
// when an anonymous user focuses a guided field.

import { BookOpen } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface RailRegisterPromptProps {
  /** True when the user has focused a field and the prompt should activate. */
  triggered: boolean;
}

export default function RailRegisterPrompt({ triggered }: RailRegisterPromptProps) {
  const location = useLocation();
  const redirect = encodeURIComponent(`${location.pathname}${location.search}`);

  return (
    <aside className="hidden lg:flex flex-col w-[300px] shrink-0">
      <div className="sticky top-4">
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-[hsl(var(--brand-navy)/0.03)]">
            <BookOpen className="w-3.5 h-3.5 text-[hsl(var(--brand-navy))]" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--brand-navy))]">
              Regulation Reference
            </span>
          </div>
          <div className="p-4">
            {!triggered ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BookOpen className="w-8 h-8 text-muted-foreground/40 mb-3" />
                <p className="text-[12px] text-muted-foreground">
                  Focus on a field to see the relevant regulation text here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md bg-[hsl(var(--cobalt)/0.07)] border border-[hsl(var(--cobalt)/0.15)] p-3">
                  <p className="text-[12px] font-semibold text-[hsl(var(--cobalt))] mb-1">
                    Regulation text available
                  </p>
                  <p className="text-[12px] leading-relaxed text-foreground/80">
                    Create a free account to see the verbatim GDPR article text
                    for this field.
                  </p>
                </div>
                <Link
                  to={`/signup?redirect=${redirect}`}
                  className="block w-full text-center text-[12px] font-semibold bg-[hsl(var(--brand-navy))] text-white py-2 px-3 rounded-md no-underline hover:opacity-90 transition-opacity"
                >
                  Create free account →
                </Link>
                <Link
                  to={`/login?redirect=${redirect}`}
                  className="block w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Already have an account? Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
