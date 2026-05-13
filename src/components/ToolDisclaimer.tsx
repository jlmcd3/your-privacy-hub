interface ToolDisclaimerProps {
  /**
   * Optional tool-specific tail sentence appended to the disclaimer paragraph.
   * Used for tools that have additional warnings (e.g., DPA counterparty execution,
   * IR Playbook deadline verification, Registration self-submission).
   */
  addition?: string;
}

export default function ToolDisclaimer({ addition }: ToolDisclaimerProps) {
  return (
    <div className="border-t border-border/40 pt-3 mt-4 space-y-1.5">
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        This output is a compliance framework tool for informational purposes only. It does not constitute legal advice. Review all outputs with qualified legal counsel before acting on them.{addition ? ` ${addition}` : ""}
      </p>
    </div>
  );
}
