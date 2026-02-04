'use client';

import ReactMarkdown, {type Components} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

const components: Components = {
  p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({children}) => (
    <strong className="font-bold text-foreground">{children}</strong>
  ),
  em: ({children}) => <em className="italic text-green">{children}</em>,
  code: ({children, className}) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className="block bg-background border border-border p-2 my-2 text-green overflow-x-auto">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-background border border-border px-1 py-0.5 text-green">
        {children}
      </code>
    );
  },
  pre: ({children}) => <pre className="my-2 overflow-x-auto">{children}</pre>,
  a: ({href, children}) => {
    if (!href) return <span>{children}</span>;
    const isInternal = href.startsWith('/');
    if (isInternal) {
      return (
        <Link
          href={href}
          className="text-green underline underline-offset-2 hover:text-foreground transition-colors"
        >
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-green underline underline-offset-2 hover:text-foreground transition-colors"
      >
        {children}
      </a>
    );
  },
  ul: ({children}) => (
    <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>
  ),
  ol: ({children}) => (
    <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>
  ),
  li: ({children}) => <li className="leading-relaxed">{children}</li>,
  h1: ({children}) => (
    <h1 className="text-base font-bold text-green mb-1">{children}</h1>
  ),
  h2: ({children}) => (
    <h2 className="text-sm font-bold text-green mb-1">{children}</h2>
  ),
  h3: ({children}) => (
    <h3 className="text-xs font-bold text-green mb-1">{children}</h3>
  ),
  blockquote: ({children}) => (
    <blockquote className="border-l-2 border-green pl-2 my-2 text-dim italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border my-2" />,
  table: ({children}) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-xs border border-border">{children}</table>
    </div>
  ),
  thead: ({children}) => (
    <thead className="bg-background text-green">{children}</thead>
  ),
  th: ({children}) => (
    <th className="border border-border px-2 py-1 text-left">{children}</th>
  ),
  td: ({children}) => (
    <td className="border border-border px-2 py-1">{children}</td>
  ),
};

export function MarkdownRenderer({content}: {content: string}) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
