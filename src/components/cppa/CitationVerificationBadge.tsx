/**
 * Sprint 7 — pass/fail chip rendered next to a CPPA citation.
 * Verification is against `cppa_authorities` (status='current').
 * An unverified citation is NOT necessarily wrong — it just means our
 * corpus doesn't carry it, so the user/auditor must check primary source.
 */
export function CitationVerificationBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-[0.1em] border bg-brand-teal/5 text-brand-teal-text border-brand-teal/20">
        Verified
      </span>
    );
  }
  return (
    <span
      title="Not found in our CCPA/CPPA corpus — verify against the primary source."
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-[0.1em] border bg-brand-slate-teal/5 text-brand-slate-teal border-brand-slate-teal/20"
    >
      Unverified
    </span>
  );
}

export default CitationVerificationBadge;
