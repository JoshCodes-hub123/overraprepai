import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

interface LatexFormulaPreviewProps {
  content: string;
  className?: string;
  inline?: boolean;
}

/**
 * LaTeX Formula Previewer with KaTeX and Markdown support.
 * Safely renders LaTeX formulas ($...$ or $$...$$) and HTML/text formatting.
 */
export const LatexFormulaPreview: React.FC<LatexFormulaPreviewProps> = ({
  content,
  className,
  inline = false,
}) => {
  // Normalize escaped backslashes commonly found in JSON imports
  const normalizedContent = useMemo(() => {
    if (!content) return "";
    return content
      .replace(/\\\\([a-zA-Z]+)/g, "\\$1") // Fix double-escaped latex commands
      .trim();
  }, [content]);

  if (!normalizedContent) {
    return <span className="text-muted-foreground italic text-xs">Empty content</span>;
  }

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words",
        inline ? "inline-block text-sm" : "text-sm leading-relaxed",
        "[&_.katex]:text-amber-900 dark:[&_.katex]:text-amber-200 [&_.katex-display]:my-2 [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-1",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ node, ...props }) => (
            <p className={inline ? "inline" : "mb-1 last:mb-0"} {...props} />
          ),
          code: ({ node, className, children, ...props }: any) => {
            return (
              <code
                className="bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded font-mono text-xs"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};

export default LatexFormulaPreview;
