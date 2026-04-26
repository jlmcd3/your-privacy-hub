/**
 * SponsorshipBanner — yourprivacyhub.com FRD v2.1 §8.4
 *
 * Renders an active sponsorship row from the public.sponsorships table
 * for a given placement. Uses a simple "Sponsored by · LOGO · Sponsor Name"
 * layout. Falls back to nothing when no active sponsor matches.
 *
 * Sponsorships are EDITORIAL placements managed by EUP — they are NOT
 * behaviourally targeted ads, and they are shown to all users.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SponsorshipBannerProps {
  placement: string;
  className?: string;
}

interface Sponsorship {
  id: string;
  sponsor_name: string;
  label: string | null;
  logo_url: string | null;
  link_url: string | null;
}

export default function SponsorshipBanner({
  placement,
  className = "",
}: SponsorshipBannerProps) {
  const [sponsor, setSponsor] = useState<Sponsorship | null>(null);

  useEffect(() => {
    let cancelled = false;
    const now = new Date().toISOString();

    supabase
      .from("sponsorships")
      .select("id, sponsor_name, label, logo_url, link_url")
      .eq("placement", placement)
      .eq("active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setSponsor(data as Sponsorship);
      });

    return () => {
      cancelled = true;
    };
  }, [placement]);

  if (!sponsor) return null;

  const inner = (
    <div
      className={`flex items-center justify-center gap-3 py-2 px-4 bg-fog/60 border border-silver/60 rounded-lg ${className}`}
      data-sponsorship-placement={placement}
      aria-label={`${sponsor.label ?? "Sponsored by"} ${sponsor.sponsor_name}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate/70">
        {sponsor.label ?? "Sponsored by"}
      </span>
      {sponsor.logo_url ? (
        <img
          src={sponsor.logo_url}
          alt={sponsor.sponsor_name}
          className="h-5 w-auto object-contain"
        />
      ) : null}
      <span className="text-[12px] font-semibold text-navy">
        {sponsor.sponsor_name}
      </span>
    </div>
  );

  if (sponsor.link_url) {
    return (
      <a
        href={sponsor.link_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="no-underline block"
      >
        {inner}
      </a>
    );
  }
  return inner;
}
