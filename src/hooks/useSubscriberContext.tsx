import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import type { SubscriberContext } from '@/lib/generateResearchInvestigationPrompt';

type WatchlistRow = {
  type: string;
  slug: string;
  label: string;
  flag?: string;
};

interface SubscriberContextValue {
  context: SubscriberContext | null;
  loading: boolean;
  error: string | null;
  /**
   * Push updaters — call these immediately after persisting a change (e.g.
   * from the Watchlist) so every mounted prompt re-renders with the new
   * role/watchlist without waiting for a refetch.
   */
  setRole: (role: string | undefined) => void;
  setWatchlist: (items: WatchlistRow[]) => void;
}

const SubscriberCtx = createContext<SubscriberContextValue | null>(null);

function deriveFromWatchlist(role: string | undefined, watchlist: WatchlistRow[]): SubscriberContext {
  // Derive preference arrays from the watchlist so the AI prompt matches
  // exactly what the subscriber sees ticked on /watchlist.
  const industries = watchlist.filter((w) => w.type === 'industry').map((w) => w.slug);
  const jurisdictions = watchlist.filter((w) => w.type === 'jurisdiction').map((w) => w.slug);
  const topics = watchlist.filter((w) => w.type === 'topic').map((w) => w.slug);
  return {
    role,
    industries,
    jurisdictions,
    topics,
    watchlist: watchlist as SubscriberContext['watchlist'],
  };
}

export function SubscriberContextProvider({ children }: { children: ReactNode }) {
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

      // 2. Watchlist items — the single source of truth for industries,
      //    jurisdictions, and topics. Anything the user has ticked on
      //    /watchlist (which mirrors /brief-preferences) feeds the AI prompt.
      supabase
        .from('user_watchlist')
        .select('type, slug, label, flag')
        .eq('user_id', user.id),
    ])
      .then(([profileResult, watchlistResult]) => {
        if (cancelled) return;

        const firstError = [profileResult, watchlistResult].find(
          (r) => r.error && r.error.code !== 'PGRST116'
        );
        if (firstError?.error) {
          setError(firstError.error.message);
        }

        const role = (profileResult.data as any)?.brief_role ?? undefined;
        const watchlist = (watchlistResult.data ?? []) as WatchlistRow[];

        setContext(deriveFromWatchlist(role, watchlist));
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? 'Failed to load subscriber profile');
        setContext({ industries: [], jurisdictions: [], topics: [], watchlist: [] });
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isPremium, user, authLoading]);

  const setRole = useCallback((role: string | undefined) => {
    setContext((prev) => (prev ? { ...prev, role: role || undefined } : prev));
  }, []);

  const setWatchlist = useCallback((items: WatchlistRow[]) => {
    setContext((prev) => {
      if (!prev) return prev;
      const next = deriveFromWatchlist(prev.role, items);
      return next;
    });
  }, []);

  return (
    <SubscriberCtx.Provider value={{ context, loading, error, setRole, setWatchlist }}>
      {children}
    </SubscriberCtx.Provider>
  );
}

export function useSubscriberContext(): SubscriberContextValue {
  const value = useContext(SubscriberCtx);
  // Tolerate usage outside the provider (tests, isolated renders): behave
  // like the old per-component hook did for a non-premium visitor.
  if (!value) {
    return {
      context: null,
      loading: false,
      error: null,
      setRole: () => {},
      setWatchlist: () => {},
    };
  }
  return value;
}
