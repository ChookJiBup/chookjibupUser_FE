import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PolicyMarkdownProps {
  content: string;
}

export function PolicyMarkdown({ content }: PolicyMarkdownProps) {
  return (
    <div className="policy-markdown body-small break-keep text-zinc-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="heading-small mt-6 mb-3 first:mt-0 text-zinc-950">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="body-regular-bold mt-6 mb-2 first:mt-0 text-zinc-950">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="body-small-bold mt-4 mb-2 first:mt-0 text-zinc-950">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-point-600 underline underline-offset-2 hover:text-point-500"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="body-small-bold text-zinc-950">{children}</strong>
          ),
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto last:mb-0">
              <table className="w-full min-w-[28rem] border-collapse text-left">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-zinc-50">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-zinc-200">{children}</tr>,
          th: ({ children }) => (
            <th className="body-small-bold px-2 py-2 align-top text-zinc-950">{children}</th>
          ),
          td: ({ children }) => <td className="px-2 py-2 align-top text-zinc-700">{children}</td>,
          hr: () => <hr className="my-4 border-zinc-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
