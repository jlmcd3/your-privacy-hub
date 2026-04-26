import { useState } from "react";
import { generateNavReport } from "@/lib/generateNavReport";

export default function NavReportButton() {
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    try {
      const { filename } = await generateNavReport();
      setLast(filename);
    } catch (e) {
      console.error("Nav_Report generation failed", e);
      alert("Failed to generate Nav_Report — see console.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-2 bg-gradient-to-br from-navy to-blue text-white font-semibold text-[13px] px-4 py-2 rounded-xl hover:opacity-90 transition-all disabled:opacity-60"
      >
        {busy ? "Generating…" : "📄 Generate Nav_Report (.docx)"}
      </button>
      {last && (
        <span className="text-[11px] text-slate">Downloaded: {last}</span>
      )}
    </div>
  );
}
