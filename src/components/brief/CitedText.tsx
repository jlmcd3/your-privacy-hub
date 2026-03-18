import React from "react";

export type SourceMap = Record<string, { title: string; url: string; source: string }>;

interface CitedTextProps {
  text: string;
  sourceMap: SourceMap;
  className?: string;
}

export function CitedText({ text, sourceMap, className = "" }: CitedTextProps) {
  const parts = text.split(/(\[ref:\d+\])/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const refMatch = part.match(/^\[ref:(\d+)\]$/);
        if (!refMatch) return <React.Fragment key={i}>{part}</React.Fragment>;

        const refNum = refMatch[1];
        const source = sourceMap[refNum];

        if (!source?.url) {
          return (
            <sup key={i} className="text-muted-foreground text-[9px] ml-0.5 select-none">
              [{refNum}]
            </sup>
          );
        }

        return (
          <a
            key={i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Source: ${source.source} — ${source.title}`}
            className="no-underline"
          >
            <sup className="text-primary hover:text-foreground text-[10px] font-semibold ml-0.5 transition-colors cursor-pointer">
              [{refNum}]
            </sup>
          </a>
        );
      })}
    </span>
  );
}

interface CitedParagraphsProps {
  content: string;
  sourceMap: SourceMap;
  className?: string;
}

export function CitedParagraphs({ content, sourceMap, className = "" }: CitedParagraphsProps) {
  const paragraphs = content.split("\n").filter(Boolean);

  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i} className={`leading-relaxed ${className}`}>
          <CitedText text={para} sourceMap={sourceMap} />
        </p>
      ))}
    </>
  );
}
