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
    if (!isPremium || !user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      supabase.from('profiles').select('brief_role').eq('id', user.id).maybeSingle(),
      supabase
        .from('user_brief_preferences')
        .select('industries, jurisdictions, topics')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])
      .then(([profileResult, prefsResult]) => {
        if (cancelled) return;
        if (profileResult.error && profileResult.error.code !== 'PGRST116') {
          setError(profileResult.error.message);
        } else if (prefsResult.error && prefsResult.error.code !== 'PGRST116') {
          setError(prefsResult.error.message);
        }
        const role = (profileResult.data as any)?.brief_role ?? undefined;
        const prefs = prefsResult.data as any;
        setContext({
          role,
          industries: prefs?.industries ?? [],
          jurisdictions: prefs?.jurisdictions ?? [],
          topics: prefs?.topics ?? [],
        });
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? 'Failed to load profile');
        setContext({ industries: [], jurisdictions: [], topics: [] });
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isPremium, user, authLoading]);

  return { context, loading, error };
}
