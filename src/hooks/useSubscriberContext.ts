import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import type { SubscriberContext } from '@/lib/generateResearchInvestigationPrompt';

export function useSubscriberContext(): {
  context: SubscriberContext | null;
  loading: boolean;
  error: string | null;
} {
  const { isPremium, user, isLoading: authLoading } = usePremiumStatus();
  const [context, setContext] = useState<SubscriberContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    // Non-premium users get no context — components must handle context === null.
    if (!isPremium || !user) {
      setContext(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      // 1. Role from profile
      supabase
        .from('profiles')
        .select('brief_role')
        .eq('id', user.id)
        .maybeSingle(),

      // 2. Brief preferences (industries / jurisdictions / topics)
      supabase
        .from('user_brief_preferences')
        .select('industries, jurisdictions, topics')
        .eq('user_id', user.id)
        .maybeSingle(),

      // 3. Watchlist items
      supabase
        .from('user_watchlist')
        .select('type, slug, label, flag')
        .eq('user_id', user.id),
    ])
      .then(([profileResult, prefsResult, watchlistResult]) => {
        if (cancelled) return;

        // Surface the first non-PGRST116 error (row-not-found is fine)
        const firstError = [profileResult, prefsResult, watchlistResult].find(
          (r) => r.error && r.error.code !== 'PGRST116'
        );
        if (firstError?.error) {
          setError(firstError.error.message);
        }

        const role = (profileResult.data as any)?.brief_role ?? undefined;
        const prefs = prefsResult.data as any;
        const watchlist: SubscriberContext['watchlist'] =
          (watchlistResult.data ?? []) as SubscriberContext['watchlist'];

        setContext({
          role,
          industries: prefs?.industries ?? [],
          jurisdictions: prefs?.jurisdictions ?? [],
          topics: prefs?.topics ?? [],
          watchlist: watchlist ?? [],
        });
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        // On any unexpected error, surface a minimal context so the prompt
        // still renders (just without personalisation).
        setError(e?.message ?? 'Failed to load subscriber profile');
        setContext({ industries: [], jurisdictions: [], topics: [], watchlist: [] });
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isPremium, user, authLoading]);

  return { context, loading, error };
}
