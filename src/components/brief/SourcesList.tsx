import { ExternalLink } from "lucide-react";
import type { SourceMap } from "./CitedText";

interface SourcesListProps {
  sourceMap: SourceMap;
  usedIn?: string;
}

export function SourcesList({ sourceMap, usedIn }: SourcesListProps) {
  const usedRefs = usedIn
    ? [...usedIn.matchAll(/\[ref:(\d+)\]/g)].map(m => m[1])
    : Object.keys(sourceMap);

  const uniqueRefs = [...new Set(usedRefs)].sort((a, b) => Number(a) - Number(b));
  if (uniqueRefs.length === 0) return null;

  const sourcesToShow = uniqueRefs
    .map(n => ({ num: n, ...sourceMap[n] }))
    .filter(s => s.url && s.title);

  if (sourcesToShow.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-border/60">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Sources
      </p>
      <ol className="space-y-1.5 list-none p-0 m-0">
        {sourcesToShow.map(({ num, title, url, source }) => (
          <li key={num} className="flex items-start gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground flex-shrink-0 w-5 text-right">
              [{num}]
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-primary hover:text-foreground no-underline hover:underline transition-colors flex items-start gap-1 leading-snug"
            >
              <span className="flex-1">
                <span className="text-muted-foreground text-[10px] font-medium mr-1">
                  {source}
                </span>
                {title.length > 90 ? title.substring(0, 87) + "…" : title}
              </span>
              <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-60" />
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
