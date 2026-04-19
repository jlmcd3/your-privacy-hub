// Shared disclaimer mounted on every Registration Manager surface.
// Plain English, conservative, and consistent.

export default function RegistrationDisclaimer({
  variant = "default",
}: {
  variant?: "default" | "compact";
}) {
  if (variant === "compact") {
    return (
      <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/40 pt-3 mt-4">
        EndUserPrivacy's Registration Manager generates draft filings and checklists tailored to your inputs.
        It is not legal advice, does not create an attorney-client relationship, and does not guarantee
        acceptance by any data protection authority. Filing requirements change — always verify with the
        relevant authority and consult qualified counsel before submission.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[12.5px] leading-relaxed text-amber-900">
      <div className="font-semibold mb-1">Important — Please read</div>
      <p>
        EndUserPrivacy's Registration Manager produces <strong>draft documents and filing checklists</strong> based
        on the information you provide and our most recent verified jurisdiction data. It is{" "}
        <strong>not legal advice</strong> and does not create an attorney–client relationship.
      </p>
      <p className="mt-2">
        Registration requirements, fees, deadlines, and acceptance criteria change frequently and vary by
        authority. Before filing, you must independently verify the requirements with the relevant data
        protection authority and consult qualified privacy counsel — particularly for higher-risk activities
        (special-category data, AI Act high-risk systems, or cross-border transfers). EndUserPrivacy is not
        responsible for filings rejected, delayed, or otherwise affected by changes in the underlying law.
      </p>
    </div>
  );
}
