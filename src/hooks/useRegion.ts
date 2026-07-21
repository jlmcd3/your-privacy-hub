// UX-2a — Client-side regional inference for the homepage.
//
// D2 ruling: navigator.language + Intl.DateTimeFormat().resolvedOptions().timeZone
// are the ONLY inputs. Europe/* timezone (or an EEA-adjacent Atlantic zone,
// or an EU/UK locale suffix) => "EU_UK". Otherwise => "US".
//
// No IP lookups. No third-party fetches. No consent-surface changes.
// Explicit user choice via the header switcher always wins and is persisted
// to localStorage.

import { useCallback, useEffect, useState } from "react";

export type Region = "US" | "EU_UK";

const STORAGE_KEY = "eup_region";
const EXPLICIT_KEY = "eup_region_explicit";
const EVENT_NAME = "eup:region-change";

// EEA + UK + associated territories whose primary locale/timezone falls under
// the region-switch UI, deliberately over-inclusive (matches the same posture
// as src/lib/adRegion.ts).
const EU_ATLANTIC_TZ = new Set<string>([
  "Atlantic/Canary",
  "Atlantic/Madeira",
  "Atlantic/Azores",
  "Atlantic/Reykjavik",
]);

// Locale suffix -> EU/UK. Kept conservative so the timezone stays authoritative.
const EU_UK_LOCALE_SUFFIX =
  /-(GB|IE|DE|FR|IT|ES|NL|SE|DK|FI|NO|PL|PT|AT|BE|CH|CZ|SK|HU|RO|BG|HR|SI|EE|LV|LT|MT|IS|LU|EL|CY|GR)$/i;

function detectRegion(): Region {
  if (typeof window === "undefined") return "US";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz.startsWith("Europe/")) return "EU_UK";
    if (EU_ATLANTIC_TZ.has(tz)) return "EU_UK";
    const lang = navigator.language ?? "";
    if (EU_UK_LOCALE_SUFFIX.test(lang)) return "EU_UK";
  } catch {
    /* fall through to US default */
  }
  return "US";
}

function readStoredRegion(): Region | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "US" || stored === "EU_UK") return stored;
  } catch {
    /* ignore */
  }
  return null;
}

function readExplicit(): boolean {
  try {
    return localStorage.getItem(EXPLICIT_KEY) === "1";
  } catch {
    return false;
  }
}

export function useRegion(): {
  region: Region;
  setRegion: (r: Region) => void;
  toggleRegion: () => void;
  isExplicit: boolean;
} {
  const [region, setRegionState] = useState<Region>(() => {
    if (typeof window === "undefined") return "US";
    return readStoredRegion() ?? detectRegion();
  });
  const [isExplicit, setIsExplicit] = useState<boolean>(() =>
    typeof window === "undefined" ? false : readExplicit()
  );

  const setRegion = useCallback((r: Region) => {
    try {
      localStorage.setItem(STORAGE_KEY, r);
      localStorage.setItem(EXPLICIT_KEY, "1");
    } catch {
      /* ignore quota / disabled storage */
    }
    setRegionState(r);
    setIsExplicit(true);
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: r }));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleRegion = useCallback(() => {
    setRegion(region === "US" ? "EU_UK" : "US");
  }, [region, setRegion]);

  // Cross-component sync (multiple useRegion consumers, other tabs).
  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "US" || detail === "EU_UK") setRegionState(detail);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "US" || e.newValue === "EU_UK")) {
        setRegionState(e.newValue);
      }
      if (e.key === EXPLICIT_KEY) setIsExplicit(e.newValue === "1");
    };
    window.addEventListener(EVENT_NAME, onEvent);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onEvent);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return { region, setRegion, toggleRegion, isExplicit };
}

/** Convenience for legacy callers. */
export function isEuUk(region: Region): boolean {
  return region === "EU_UK";
}
