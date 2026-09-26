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
            <h1 className={`text-xl font-bold tracking-tight mt-4 mb-2 pb-1 border-b font-display ${
              isDark ? 'text-neutral-100 border-neutral-800/60' : 'text-neutral-900 border-neutral-200'
            }`}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`text-lg font-bold tracking-tight mt-3 mb-2 font-display ${
              isDark ? 'text-amber-400' : 'text-amber-700'
            }`}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`text-base font-semibold tracking-tight mt-2.5 mb-1.5 font-display ${
              isDark ? 'text-neutral-200' : 'text-neutral-900'
            }`}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className={`text-sm font-semibold tracking-tight mt-2 mb-1 ${
              isDark ? 'text-neutral-200' : 'text-neutral-900'
            }`}>
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
            <ul className="list-disc pl-5 my-2 space-y-1 text-inherit">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1 text-inherit">
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
              className={`border-l-2 pl-3.5 py-1.5 my-2 rounded-r-lg italic text-xs leading-relaxed ${
                isDark 
                  ? 'border-amber-500/80 bg-amber-500/5 text-neutral-300' 
                  : 'border-amber-500 bg-amber-50/80 text-neutral-800'
              }`}
            >
              {children}
            </blockquote>
          ),
          // Tables
          table: ({ children }) => (
            <div className={`overflow-x-auto my-3 rounded-xl border shadow-sm ${
              isDark ? 'border-neutral-800/80' : 'border-neutral-200'
            }`}>
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
            <tbody className={isDark ? 'divide-y divide-neutral-800/60' : 'divide-y divide-neutral-200'}>
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className={isDark ? 'hover:bg-neutral-800/30' : 'hover:bg-neutral-50'}>
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className={`px-3.5 py-2.5 font-semibold font-mono text-[11px] uppercase tracking-wider ${
              isDark ? 'text-neutral-400' : 'text-neutral-600'
            }`}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 text-inherit leading-relaxed">
              {children}
            </td>
          ),
          // Links
          a: ({ href, children }) => {
            const textStr = String(children).trim();
            const isCitationBadge = /^\[?\d+\]?$/.test(textStr);
            if (isCitationBadge) {
              const num = textStr.replace(/[\[\]]/g, '');
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center min-w-4 h-4 px-1 -translate-y-1 mx-0.5 rounded-full text-[10px] font-mono font-bold transition-all border ${
                    isDark
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/35 hover:text-white'
                      : 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
                  }`}
                  title={`View source [${num}]`}
                >
                  {num}
                </a>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline underline-offset-2 transition-colors font-medium ${
                  isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800'
                }`}
              >
                {children}
              </a>
            );
          },
          // Horizontal rule
          hr: () => (
            <hr className={`my-3 ${isDark ? 'border-neutral-800/60' : 'border-neutral-200'}`} />
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
