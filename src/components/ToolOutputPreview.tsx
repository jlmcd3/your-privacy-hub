import { FileText } from "lucide-react";

interface ToolOutputPreviewProps {
  label: string;
  lines: string[];
}

export function ToolOutputPreview({ label, lines }: ToolOutputPreviewProps) {
  return (
    <div className="my-6 rounded-lg border border-[hsl(var(--cobalt)/0.2)] bg-[#F8F9FF] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--cobalt)/0.05)] border-b border-[hsl(var(--cobalt)/0.15)]">
        <FileText className="w-3.5 h-3.5 text-[hsl(var(--cobalt))] flex-shrink-0" />
        <span className="text-xs font-semibold text-[hsl(var(--cobalt))] uppercase tracking-wider">
          {label}
        </span>
        <span className="ml-auto text-[11px] text-slate-400 hidden sm:inline">
          Example output — your result will reflect your inputs
        </span>
      </div>

      <div className="relative px-4 pt-3 pb-0">
        <div className="space-y-2">
          {lines.map((line, i) => (
            <p
              key={i}
              className="text-xs text-gray-700 font-mono leading-relaxed"
              style={{ opacity: 1 - i * 0.15 }}
            >
              {line}
            </p>
          ))}
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(248,249,255,0) 0%, rgba(248,249,255,1) 100%)",
          }}
        />
      </div>
      <div className="px-4 py-2 text-[11px] text-slate-400 text-right">
        Full output generated after completing the assessment
      </div>
    </div>
  );
}

export default ToolOutputPreview;
