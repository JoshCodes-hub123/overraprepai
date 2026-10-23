import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface KaTeXMarkdownProps {
  children: string;
  className?: string;
}

/**
 * Preprocess math expressions to ensure KaTeX handles edge-cases without crashing:
 * - Normalizes escaped brackets \( ... \) and \[ ... \] into $ ... $ and $$ ... $$
 * - Cleans stray unescaped delimiters and line-broken formulas
 */
function normalizeMathDelimiters(text: string): string {
  if (!text) return "";
  let processed = text;

  // Convert block math \[ ... \] to $$ ... $$
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`);

  // Convert inline math \( ... \) to $ ... $
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);

  return processed;
}

/**
 * KaTeXMarkdown — High-performance, zero-reflow Markdown + KaTeX LaTeX formula renderer
 * Designed for university STEM curricula (Physics, Calculus, Chemistry, Engineering)
 */
export const KaTeXMarkdown: React.FC<KaTeXMarkdownProps> = ({ children, className = "" }) => {
  const normalized = useMemo(() => normalizeMathDelimiters(children), [children]);

  return (
    <div className={`katex-markdown prose prose-sm max-w-none text-neutral-800 leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ ...props }) => (
            <h2 className="text-base font-bold text-neutral-900 mt-5 mb-2.5 flex items-center gap-2 border-b border-neutral-100 pb-1.5" {...props} />
          ),
          h2: ({ ...props }) => (
            <h3 className="text-sm font-bold text-neutral-900 mt-4 mb-2 flex items-center gap-2" {...props} />
          ),
          h3: ({ ...props }) => (
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mt-3.5 mb-1.5" {...props} />
          ),
          p: ({ ...props }) => <p className="mb-3 text-[13.5px] leading-relaxed text-neutral-700" {...props} />,
          ul: ({ ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-[13px] text-neutral-700" {...props} />,
          ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-[13px] text-neutral-700" {...props} />,
          li: ({ ...props }) => <li className="pl-1" {...props} />,
          strong: ({ ...props }) => <strong className="font-bold text-neutral-950" {...props} />,
          em: ({ ...props }) => <em className="italic text-neutral-800" {...props} />,
          blockquote: ({ ...props }) => (
            <blockquote className="border-l-4 border-amber-400 pl-3.5 py-1 my-3 bg-amber-50/50 rounded-r-xl text-neutral-700 text-xs italic" {...props} />
          ),
          code: ({ className: codeClassName, children: codeChildren, ...props }: any) => {
            const isBlock = /language-/.test(codeClassName || "");
            if (!isBlock) {
              return (
                <code className="px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200/60 font-mono text-xs text-amber-950 font-semibold" {...props}>
                  {codeChildren}
                </code>
              );
            }
            return (
              <pre className="p-3 my-2.5 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-xs overflow-x-auto">
                <code {...props}>{codeChildren}</code>
              </pre>
            );
          },
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
};

export default KaTeXMarkdown;
