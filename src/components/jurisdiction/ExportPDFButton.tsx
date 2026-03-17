import { Download } from "lucide-react";

interface ExportPDFButtonProps {
  jurisdictionName: string;
}

export default function ExportPDFButton({ jurisdictionName }: ExportPDFButtonProps) {
  const handleExport = () => {
    const style = document.createElement("style");
    style.id = "eup-print-style";
    style.innerHTML = `
      @media print {
        body > *:not(main) { display: none !important; }
        nav, footer, .no-print { display: none !important; }
        main { margin: 0 !important; padding: 20px !important; }
        @page { margin: 1.5cm; size: A4; }
        h1, h2, h3 { page-break-after: avoid; }
        .print-break { page-break-before: always; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      const el = document.getElementById("eup-print-style");
      if (el) el.remove();
    }, 1000);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-fog bg-white text-slate text-xs font-semibold hover:border-blue/30 hover:text-navy transition-all cursor-pointer no-print"
    >
      <Download className="w-3.5 h-3.5" />
      Export PDF
    </button>
  );
}
