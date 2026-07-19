// WORD-PROMPTS-1 — "Convert to Word" panel.
//
// A subscriber-facing dialog trigger that sits next to the PDF download.
// It shows a document-type-specific conversion prompt with a copy button,
// plus the legal-ruling notice that conversion happens outside our control.
//
// Word (.docx) is NOT a product deliverable. This UI does not produce a
// .docx file — it hands the subscriber a curated prompt to run in their
// own AI tool.

import { useState } from "react";
import { Copy, Check, FileType2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/trackEvent";
import {
  getWordConversionPrompt,
  WORD_PROMPT_DISCLAIMER,
  type WordPromptDocumentType,
} from "@/data/wordConversionPrompts";

interface Props {
  documentType: WordPromptDocumentType;
  className?: string;
  /** When true, render as a compact icon-first button matching the PDF button. */
  compact?: boolean;
}

export default function WordConversionPromptButton({
  documentType,
  className,
  compact,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const entry = getWordConversionPrompt(documentType);

  const triggerClass =
    className ??
    (compact
      ? "inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-brand-navy bg-brand-cloud hover:bg-brand-cloud/70 border border-brand-cloud rounded-lg transition-colors"
      : "inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(entry.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      void trackEvent("word_prompt_copied", { document_type: documentType });
    } catch (err) {
      console.error("Clipboard write failed", err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={triggerClass} aria-label={`Convert ${entry.label} to Word`}>
          <FileType2 className="w-3.5 h-3.5" aria-hidden />
          Convert to Word
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Convert to Word — {entry.label}</DialogTitle>
          <DialogDescription>
            Copy the prompt below and paste it — along with the PDF you just
            downloaded — into your own AI tool. {WORD_PROMPT_DISCLAIMER}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 max-h-[50vh] overflow-y-auto rounded-lg border border-border bg-muted/50 p-4 text-xs whitespace-pre-wrap font-mono text-foreground">
          {entry.prompt}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={handleCopy} className="gap-2">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy prompt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
