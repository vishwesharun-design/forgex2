import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import { ForgeXTheme } from '../types';

interface MarkdownRendererProps {
  content: string;
  theme?: ForgeXTheme;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  theme = 'dark',
  className = '',
}) => {
  const isDark = theme === 'dark';

  return (
    <div className={`markdown-body text-sm leading-relaxed space-y-3 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks and inline code
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');
            const codeString = String(children).replace(/\n$/, '');

            if (isInline) {
              return (
                <code
                  className={`px-1.5 py-0.5 rounded-md font-mono text-xs font-semibold ${
                    isDark
                      ? 'bg-neutral-800/90 text-amber-300 border border-neutral-700/60'
                      : 'bg-neutral-100 text-amber-700 border border-neutral-200'
                  }`}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock
                language={match ? match[1] : 'text'}
                code={codeString}
                isDark={isDark}
              />
            );
          },
          // Headings
          h1: ({ children }) => (
            <h1 className="text-xl font-bold tracking-tight mt-4 mb-2 pb-1 border-b border-neutral-800/40 font-display">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold tracking-tight mt-3 mb-2 font-display text-amber-400">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold tracking-tight mt-2.5 mb-1.5 font-display">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold tracking-tight mt-2 mb-1">
              {children}
            </h4>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="my-1.5 leading-relaxed text-inherit">
              {children}
            </p>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">
              {children}
            </li>
          ),
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote
              className={`border-l-2 border-amber-500/80 pl-3.5 py-1 my-2 rounded-r-lg italic text-xs leading-relaxed ${
                isDark ? 'bg-amber-500/5 text-neutral-300' : 'bg-amber-50 text-neutral-700'
              }`}
            >
              {children}
            </blockquote>
          ),
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-neutral-800/60 shadow-sm">
              <table className="min-w-full text-xs text-left">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className={isDark ? 'bg-neutral-900/80 border-b border-neutral-800' : 'bg-neutral-100 border-b border-neutral-200'}>
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-neutral-800/40">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className={isDark ? 'hover:bg-neutral-800/30' : 'hover:bg-neutral-50'}>
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-semibold text-neutral-400 font-mono text-[11px] uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 text-inherit leading-relaxed">
              {children}
            </td>
          ),
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors"
            >
              {children}
            </a>
          ),
          // Horizontal rule
          hr: () => (
            <hr className="my-3 border-neutral-800/60" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

interface CodeBlockProps {
  language: string;
  code: string;
  isDark: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, isDark }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`my-3 rounded-2xl overflow-hidden border font-mono text-xs ${
        isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-900 border-neutral-800 text-neutral-100'
      }`}
    >
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-neutral-900/90 border-b border-neutral-800/80 text-[11px] text-neutral-400">
        <span className="font-semibold uppercase tracking-wider text-amber-400/90">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-neutral-800 hover:text-neutral-200 transition-colors text-neutral-400"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-sans">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="font-sans">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-4 overflow-x-auto text-xs leading-relaxed font-mono text-neutral-200 selection:bg-amber-500/30">
        <code>{code}</code>
      </pre>
    </div>
  );
};
