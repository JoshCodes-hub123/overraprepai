import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/**
 * Overra's answer typography. Deliberately plain: no bubble, no gradient —
 * the response reads like a well-set page, with real maths and real code.
 */
export function CoachMarkdown({ children }: { children: string }) {
  return (
    <div className="coach-prose text-[15.5px] leading-[1.65] text-brand-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ node, ...p }) => <p className="mb-3 last:mb-0" {...p} />,
          h1: ({ node, ...p }) => (
            <h2 className="mb-2 mt-5 text-[17px] font-bold tracking-tight text-brand-ink" {...p} />
          ),
          h2: ({ node, ...p }) => (
            <h3 className="mb-2 mt-5 text-[16px] font-bold tracking-tight text-brand-ink" {...p} />
          ),
          h3: ({ node, ...p }) => (
            <h4 className="mb-1.5 mt-4 text-[15px] font-bold text-brand-ink" {...p} />
          ),
          ul: ({ node, ...p }) => <ul className="mb-3 list-disc space-y-1.5 pl-5" {...p} />,
          ol: ({ node, ...p }) => <ol className="mb-3 list-decimal space-y-1.5 pl-5" {...p} />,
          strong: ({ node, ...p }) => <strong className="font-semibold text-brand-ink" {...p} />,
          a: ({ node, ...p }) => (
            <a className="font-medium text-env underline underline-offset-2" {...p} />
          ),
          blockquote: ({ node, ...p }) => (
            <blockquote
              className="my-3 border-l-2 border-brand-line pl-3 text-brand-ink-soft"
              {...p}
            />
          ),
          code: ({ node, className, children, ...props }: any) => {
            const isBlock = /language-/.test(className ?? "");
            if (!isBlock) {
              return (
                <code
                  className="rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[13.5px] text-brand-ink"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className="font-mono text-[13px] leading-relaxed" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ node, ...p }) => (
            <pre
              className="mb-3 overflow-x-auto rounded-brand border border-brand-line bg-brand-soft p-3.5"
              {...p}
            />
          ),
          table: ({ node, ...p }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full border-collapse text-[14px]" {...p} />
            </div>
          ),
          th: ({ node, ...p }) => (
            <th
              className="border-b border-brand-line px-2 py-1.5 text-left font-semibold"
              {...p}
            />
          ),
          td: ({ node, ...p }) => <td className="border-b border-brand-line px-2 py-1.5" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default CoachMarkdown;
