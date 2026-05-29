import { useCallback, useEffect, useState } from "react";

// Global "show enrichment on all articles" preference.
// Per-article overrides stored as a Set of article IDs that have been
// explicitly toggled OFF (when global=true) or ON (when global=false).
const GLOBAL_KEY = "enrichment.showAll";
const OVERRIDES_KEY = "enrichment.overrides";
const EVENT = "enrichment-toggle-change";

type Store = { showAll: boolean; overrides: Set<string> };

function readStore(): Store {
  try {
    const showAll = localStorage.getItem(GLOBAL_KEY);
    const overrides = localStorage.getItem(OVERRIDES_KEY);
    return {
      showAll: showAll === null ? true : showAll === "true",
      overrides: new Set(overrides ? (JSON.parse(overrides) as string[]) : []),
    };
  } catch {
    return { showAll: true, overrides: new Set() };
  }
}

function writeStore(s: Store) {
  try {
    localStorage.setItem(GLOBAL_KEY, String(s.showAll));
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(Array.from(s.overrides)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function useEnrichmentToggle(articleId: string) {
  const [store, setStore] = useState<Store>(() =>
    typeof window === "undefined" ? { showAll: true, overrides: new Set() } : readStore(),
  );

  useEffect(() => {
    const handler = () => setStore(readStore());
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const isOverridden = store.overrides.has(articleId);
  const expanded = isOverridden ? !store.showAll : store.showAll;

  const toggleArticle = useCallback(() => {
    const next = { ...store, overrides: new Set(store.overrides) };
    if (next.overrides.has(articleId)) next.overrides.delete(articleId);
    else next.overrides.add(articleId);
    writeStore(next);
  }, [articleId, store]);

  const toggleAll = useCallback(() => {
    // Flip global and clear all per-article overrides (so the new global wins everywhere).
    writeStore({ showAll: !store.showAll, overrides: new Set() });
  }, [store]);

  return { expanded, showAll: store.showAll, toggleArticle, toggleAll };
}
