import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

interface MathMarkdownProps {
  content: string | null | undefined;
  className?: string;
}

export function MathMarkdown({ content, className = "" }: MathMarkdownProps) {
  if (!content) return null;

  // Pre-process any escaped LaTeX backslashes or bracket delimiters
  const processed = content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => `$$${eq}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, eq) => `$${eq}$`);

  return (
    <div className={cn("prose-sm max-w-none text-inherit leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <span className="inline">{children}</span>,
          strong: ({ children }) => <strong className="font-bold text-inherit">{children}</strong>,
          em: ({ children }) => <em className="italic text-inherit">{children}</em>,
          code: ({ children }) => (
            <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[11px] text-inherit">
              {children}
            </code>
          ),
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}

export default MathMarkdown;
