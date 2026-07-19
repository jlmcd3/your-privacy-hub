interface ToolDisclaimerProps {
  /**
   * Optional tool-specific tail sentence appended to the second paragraph.
   * Used for tools that have additional warnings (e.g., DPA counterparty execution,
   * IR Playbook deadline verification, Registration self-submission).
   */
  addition?: string;
}

export default function ToolDisclaimer({ addition }: ToolDisclaimerProps) {
  return (
    <div className="border-t border-border/40 pt-3 mt-4 space-y-1.5">
      <p className="text-meta text-muted-foreground leading-relaxed">
        This document is not legal advice and does not create an attorney-client relationship. Findings should be validated against your organization's authoritative records before operational reliance.
      </p>
      <p className="text-meta text-muted-foreground leading-relaxed">
        End User Privacy makes no warranty as to the accuracy or legal sufficiency of this output, no attorney-client relationship is created, and End User Privacy accepts no liability for any action, inaction, or loss arising from use of or reliance on this document.{addition ? ` ${addition}` : ""}
      </p>
    </div>
  );
}
