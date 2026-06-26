import { useEffect, useState } from "react";

const CACHE_KEY = "eup_geo_country";

/**
 * Returns the visitor's ISO country code (e.g. "US", "GB", "DE") detected from
 * Cloudflare's public trace endpoint. Cached for the session. Returns null
 * while loading or if detection fails.
 */
export function useGeoCountry(): string | null {
  const [country, setCountry] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return sessionStorage.getItem(CACHE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (country) return;
    let cancelled = false;
    fetch("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store" })
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return;
        const match = text.match(/^loc=([A-Z]{2})$/m);
        if (match) {
          const cc = match[1];
          try {
            sessionStorage.setItem(CACHE_KEY, cc);
          } catch {
            /* ignore */
          }
          setCountry(cc);
        }
      })
      .catch(() => {
        /* ignore — fall back to default US copy */
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  return country;
}

const EU_EEA = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE", "IS", "LI", "NO",
]);

export function isEuOrUk(country: string | null): boolean {
  if (!country) return false;
  return country === "GB" || EU_EEA.has(country);
}
