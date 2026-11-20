import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  Copy,
  Check,
  Download,
  Code2,
  Play,
  Image as ImageIcon,
  Terminal,
  ArrowRightToLine,
  X,
  Sparkles,
} from 'lucide-react';
import { ForgeXTheme } from '../types';
import { FormattedMathText, MathView } from './MathView';
import { InteractiveChart, ChartConfig } from './InteractiveChart';
import { InteractiveTable, TableCellRenderer } from './InteractiveTable';
import { InteractiveQuiz, QuizConfig } from './InteractiveQuiz';
import { InlineVisualDiagram, parseVisualDiagramConfig } from './InlineVisualDiagram';
import { InlineScorecard, parseScorecardConfig } from './InlineScorecard';

interface MarkdownRendererProps {
  content: string;
  theme?: ForgeXTheme;
  className?: string;
  onOpenInCodeStudio?: (code: string, language: string) => void;
  onOpenInImageStudio?: (imageUrl: string, prompt: string) => void;
  onViewImageFullscreen?: (imageUrl: string, prompt: string) => void;
}

// Recursively inspect and format text nodes with math if needed
function renderWithMath(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') {
    if (/(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|[×÷²³]|√\d+)/.test(children)) {
      return <FormattedMathText text={children} />;
    }
    return children;
  }
  if (Array.isArray(children)) {
    return children.map((child, idx) => (
      <React.Fragment key={idx}>
        {renderWithMath(child)}
      </React.Fragment>
    ));
  }
  return children;
}

/**
 * Universal error-tolerant parser for Interactive Quizzes
 */
function parseQuizConfig(raw: string): QuizConfig | null {
  if (!raw || typeof raw !== 'string') return null;

  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  const assignmentMatch = cleaned.match(/(?:(?:const|let|var)\s+\w+\s*=\s*|\w+\s*=\s*)([{\[][\s\S]+)/);
  if (assignmentMatch && assignmentMatch[1]) {
    cleaned = assignmentMatch[1].replace(/;?\s*$/, '').trim();
  }

  const tryParseJson = (str: string): any => {
    try {
      return JSON.parse(str);
    } catch {
      const sanitized = str
        .replace(/\\([^"\\\/bfnrtu]|u[0-9a-fA-F]{0,3}[^0-9a-fA-F])/g, '\\\\$1')
        .replace(/,\s*([}\]])/g, '$1');
      try {
        return JSON.parse(sanitized);
      } catch {
        try {
          const relaxed = sanitized
            .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
            .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
          return JSON.parse(relaxed);
        } catch {
          return null;
        }
      }
    }
  };

  let parsed = tryParseJson(cleaned);

  if (!parsed) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      parsed = tryParseJson(cleaned.slice(firstBrace, lastBrace + 1));
    }
  }

  if (!parsed) {
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      const arr = tryParseJson(cleaned.slice(firstBracket, lastBracket + 1));
      if (Array.isArray(arr)) {
        parsed = { questions: arr };
      }
    }
  }

  if (Array.isArray(parsed)) {
    parsed = { questions: parsed };
  }

  if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
    const rawQuestions = parsed.questions;
    const validQuestions = [];

    for (let idx = 0; idx < rawQuestions.length; idx++) {
      const q = rawQuestions[idx];
      if (!q) continue;

      const questionText = q.question || q.q || q.prompt || q.title || `Question ${idx + 1}`;
      let options: string[] = [];

      if (Array.isArray(q.options)) {
        options = q.options.map((opt: any) => String(opt));
      } else if (Array.isArray(q.choices)) {
        options = q.choices.map((opt: any) => String(opt));
      } else if (q.options && typeof q.options === 'object') {
        options = Object.values(q.options).map((opt: any) => String(opt));
      }

      if (options.length < 2) continue;

      let correctIndex = 0;
      if (typeof q.correctIndex === 'number') {
        correctIndex = q.correctIndex;
      } else if (typeof q.answer === 'number') {
        correctIndex = q.answer;
      } else if (typeof q.correctAnswer === 'number') {
        correctIndex = q.correctAnswer;
      } else if (typeof q.answer === 'string') {
        const cleanAns = q.answer.trim().toLowerCase();
        const letterIdx = ['a', 'b', 'c', 'd', 'e'].indexOf(cleanAns);
        if (letterIdx !== -1) {
          correctIndex = letterIdx;
        } else {
          const matchIdx = options.findIndex((opt) => opt.toLowerCase().includes(cleanAns));
          if (matchIdx !== -1) correctIndex = matchIdx;
        }
      } else if (typeof q.correctAnswer === 'string') {
        const cleanAns = q.correctAnswer.trim().toLowerCase();
        const letterIdx = ['a', 'b', 'c', 'd', 'e'].indexOf(cleanAns);
        if (letterIdx !== -1) {
          correctIndex = letterIdx;
        } else {
          const matchIdx = options.findIndex((opt) => opt.toLowerCase().includes(cleanAns));
          if (matchIdx !== -1) correctIndex = matchIdx;
        }
      }

      if (correctIndex < 0 || correctIndex >= options.length) {
        correctIndex = 0;
      }

      validQuestions.push({
        id: q.id ?? idx + 1,
        question: questionText,
        options,
        correctIndex,
        explanation: q.explanation || q.reason || q.desc || 'Verified answer explanation.',
        hint: q.hint || q.clue || q.tip,
        source: q.source,
        difficulty: q.difficulty,
      });
    }

    if (validQuestions.length > 0) {
      return {
        title: parsed.title || parsed.quizTitle || 'Interactive Knowledge Quiz',
        topic: parsed.topic || parsed.subject || 'Interactive Quiz',
        difficulty: parsed.difficulty || 'Medium',
        description: parsed.description,
        verifiedFromWeb: Boolean(parsed.verifiedFromWeb || parsed.source || parsed.searchQueries),
        questions: validQuestions,
      };
    }
  }

  return null;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  theme = 'dark',
  className = '',
  onOpenInCodeStudio,
  onOpenInImageStudio,
  onViewImageFullscreen,
}) => {
  const isDark = theme === 'dark';

  return (
    <div className={`markdown-body min-w-0 w-full max-w-full text-sm sm:text-[15px] leading-[1.75] space-y-4 break-words [overflow-wrap:anywhere] ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-([a-zA-Z0-9_+-]+)/.exec(className || '');
            const lang = match ? match[1].toLowerCase() : '';
            const isInline = !match && !String(children).includes('\n');
            const codeString = String(children).replace(/\n$/, '');

            if (isInline) {
              if (/^[\d\s+\-*/×÷=^_\\]+$/.test(codeString) || /\\boxed|\\frac|\\sqrt/.test(codeString)) {
                return <MathView math={codeString} display={false} />;
              }
              return (
                <code
                  className={`px-1.5 py-0.5 rounded-md font-mono text-[11px] sm:text-xs font-medium ${
                    isDark
                      ? 'bg-neutral-800/90 text-neutral-200 border border-neutral-700/60'
                      : 'bg-neutral-100 text-neutral-800 border border-neutral-200/80'
                  }`}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // Detect quiz code blocks
            const isPotentialQuiz =
              lang === 'quiz' ||
              lang === 'quiz-interactive' ||
              lang === 'json' ||
              lang === 'javascript' ||
              lang === 'js' ||
              lang === 'python' ||
              lang === 'py' ||
              lang === 'text' ||
              !lang ||
              codeString.includes('"questions"') ||
              codeString.includes("'questions'") ||
              codeString.includes('options');

            if (isPotentialQuiz) {
              const quizConfig = parseQuizConfig(codeString);
              if (quizConfig) {
                return <InteractiveQuiz quiz={quizConfig} theme={theme} />;
              }
            }

            // Detect chart code blocks
            if (lang === 'chart' || lang === 'chart-bar' || lang === 'chart-line' || lang === 'json') {
              try {
                const parsed = JSON.parse(codeString);
                if (parsed && (parsed.data || parsed.series) && (parsed.title || parsed.type)) {
                  const chartConfig: ChartConfig = {
                    title: parsed.title || 'Chart Analysis',
                    subtitle: parsed.subtitle,
                    type: parsed.type || (lang === 'chart-line' ? 'line' : 'bar'),
                    unit: parsed.unit || 'Score',
                    max: parsed.max,
                    data: Array.isArray(parsed.data)
                      ? parsed.data.map((item: any) => ({
                          label: item.label || item.name || item.x || 'Item',
                          value: typeof item.value === 'number' ? item.value : (item.y || 0),
                          color: item.color,
                        }))
                      : Array.isArray(parsed.series?.[0]?.data)
                      ? parsed.series[0].data.map((val: number, idx: number) => ({
                          label: parsed.xAxis?.[idx] || `Item ${idx + 1}`,
                          value: val,
                          color: parsed.series[0]?.color,
                        }))
                      : [],
                  };
                  return <InteractiveChart config={chartConfig} theme={theme} />;
                }
              } catch {
                // Fall back to CodeBlock
              }
            }

            // Detect inline evaluation scorecard / rubric blocks
            if (lang === 'scorecard' || lang === 'assessment' || lang === 'evaluation' || lang === 'json') {
              const scorecardConfig = parseScorecardConfig(codeString, lang);
              if (scorecardConfig) {
                return <InlineScorecard config={scorecardConfig} theme={theme} />;
              }
            }

            // Detect inline visual representation / diagram / svg blocks
            if (lang === 'visual' || lang === 'diagram' || lang === 'svg' || lang === 'json') {
              const visualConfig = parseVisualDiagramConfig(codeString, lang);
              if (visualConfig) {
                return (
                  <InlineVisualDiagram
                    config={visualConfig}
                    rawSource={codeString}
                    theme={theme}
                  />
                );
              }
            }

            if (lang === 'math' || lang === 'latex') {
              return (
                <div className="math-sum-card my-3 py-2 flex items-center justify-center text-base sm:text-lg overflow-x-auto max-w-full">
                  <MathView math={codeString} display={true} />
                </div>
              );
            }

            return (
              <CodeBlock
                language={match ? match[1] : 'text'}
                code={codeString}
                isDark={isDark}
                onOpenInCodeStudio={onOpenInCodeStudio}
              />
            );
          },

          h1: ({ children }) => (
            <h1 className={`block text-left text-lg sm:text-xl font-bold tracking-tight mt-6 mb-3 pb-1.5 border-b font-display ${
              isDark ? 'text-neutral-100 border-neutral-800/60' : 'text-neutral-900 border-neutral-200'
            }`}>
              {renderWithMath(children)}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`block text-left text-base sm:text-lg font-bold tracking-tight mt-5 mb-2.5 font-display ${
              isDark ? 'text-amber-400' : 'text-amber-700'
            }`}>
              {renderWithMath(children)}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`block text-left text-sm sm:text-base font-semibold tracking-tight mt-4 mb-2 font-display ${
              isDark ? 'text-neutral-200' : 'text-neutral-900'
            }`}>
              {renderWithMath(children)}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className={`block text-left text-xs sm:text-sm font-semibold tracking-tight mt-3 mb-1.5 ${
              isDark ? 'text-neutral-200' : 'text-neutral-900'
            }`}>
              {renderWithMath(children)}
            </h4>
          ),

          p: ({ children }: any) => (
            <div className="my-3.5 leading-[1.75] text-inherit text-left">
              {renderWithMath(children)}
            </div>
          ),

          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-3.5 space-y-2.5 text-inherit text-left">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-3.5 space-y-2.5 text-inherit text-left">
              {children}
            </ol>
          ),
          li: ({ children }: any) => (
            <li className="leading-[1.75] text-left">
              {renderWithMath(children)}
            </li>
          ),

          blockquote: ({ children }) => (
            <blockquote
              className={`border-l-2 pl-3.5 py-1.5 my-4 rounded-r-lg italic text-sm leading-[1.75] text-left ${
                isDark
                  ? 'border-neutral-600 bg-neutral-900/40 text-neutral-300'
                  : 'border-neutral-400 bg-neutral-100 text-neutral-800'
              }`}
            >
              {renderWithMath(children)}
            </blockquote>
          ),

          table: ({ children }) => (
            <InteractiveTable theme={theme}>
              {children}
            </InteractiveTable>
          ),
          thead: ({ children }) => (
            <thead className={isDark ? 'bg-neutral-900/80 border-b border-neutral-800' : 'bg-neutral-50/80 border-b border-neutral-200'}>
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-transparent">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className={`transition-colors ${isDark ? 'hover:bg-neutral-800/40' : 'hover:bg-neutral-50/80'}`}>
              {children}
            </tr>
          ),
          th: ({ children, style }: any) => {
            let alignClass = 'text-left';
            if (style?.textAlign === 'right') alignClass = 'text-right';
            else if (style?.textAlign === 'center') alignClass = 'text-center';

            return (
              <th
                className={`px-4 py-3 font-semibold font-sans text-xs tracking-wider border-b ${alignClass} ${
                  isDark ? 'text-neutral-300 border-neutral-800' : 'text-neutral-700 border-neutral-200'
                }`}
                style={style}
              >
                <TableCellRenderer content={children} isHeader={true} theme={theme} />
              </th>
            );
          },
          td: ({ children, style }: any) => {
            let alignClass = 'text-left';
            if (style?.textAlign === 'right') alignClass = 'text-right font-mono font-medium';
            else if (style?.textAlign === 'center') alignClass = 'text-center';

            return (
              <td
                className={`px-4 py-3 text-inherit leading-relaxed align-middle border-b ${alignClass} ${
                  isDark ? 'border-neutral-800/60' : 'border-neutral-100'
                }`}
                style={style}
              >
                <TableCellRenderer content={children} isHeader={false} theme={theme} />
              </td>
            );
          },

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

          hr: () => (
            <hr className={`my-3 sm:my-4 ${isDark ? 'border-neutral-800/60' : 'border-neutral-200'}`} />
          ),

          img: ({ src, alt }: any) => {
            if (!src) return null;
            return (
              <div className={`my-3 rounded-2xl sm:rounded-3xl overflow-hidden border p-2 max-w-lg shadow-lg group relative transition-colors ${
                isDark ? 'border-neutral-800 bg-neutral-950/80' : 'border-neutral-200 bg-neutral-50/90'
              }`}>
                <div
                  className="relative rounded-xl overflow-hidden cursor-pointer"
                  onClick={() => onViewImageFullscreen?.(src, alt || 'Creation')}
                  title="Click to view full screen, edit or download"
                >
                  <img
                    src={src}
                    alt={alt || 'Generated Creation'}
                    className="w-full h-auto rounded-xl object-cover max-h-[440px] transition-transform duration-300 group-hover:scale-[1.01]"
                    loading="lazy"
                  />
                </div>
                <div className={`flex items-center justify-between px-1.5 pt-2 pb-0.5 text-xs gap-2 ${
                  isDark ? 'text-neutral-400' : 'text-neutral-600'
                }`}>
                  <span className={`truncate max-w-[190px] sm:max-w-[260px] font-medium ${
                    isDark ? 'text-neutral-300' : 'text-neutral-700'
                  }`}>
                    {alt || 'AI Creation'}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {onOpenInImageStudio && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenInImageStudio(src, alt || '');
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors ${
                          isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                        }`}
                        title="Open in Image tool"
                      >
                        <ImageIcon className="w-3 h-3 text-amber-500" />
                        <span className="hidden sm:inline">Image</span>
                      </button>
                    )}
                    <a
                      href={src}
                      download={`forgex-creation-${Date.now()}.jpg`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 font-semibold text-[11px] transition-colors border border-amber-500/30"
                      title="Download image"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

/* ============================================================================
   LIGHTWEIGHT SYNTAX HIGHLIGHTER MATCHING CLEAN CHAT CODE UI
   ============================================================================ */

const UPPERCASE_LANGS = new Set(['html', 'css', 'sql', 'json', 'jsx', 'tsx', 'xml', 'svg', 'yaml', 'yml', 'php', 'cpp', 'c']);
const LANG_DISPLAY_MAP: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  py: 'Python',
  python: 'Python',
  rs: 'Rust',
  rust: 'Rust',
  go: 'Go',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  md: 'Markdown',
  markdown: 'Markdown',
  text: 'Code',
  plaintext: 'Code',
};

function formatLanguageLabel(lang: string): string {
  const clean = (lang || '').trim().toLowerCase();
  if (!clean) return 'Code';
  if (UPPERCASE_LANGS.has(clean)) return clean.toUpperCase();
  if (LANG_DISPLAY_MAP[clean]) return LANG_DISPLAY_MAP[clean];
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case',
  'break', 'continue', 'default', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'import',
  'export', 'from', 'as', 'class', 'extends', 'implements', 'interface', 'type', 'enum', 'new',
  'this', 'super', 'typeof', 'instanceof', 'in', 'of', 'void', 'delete', 'true', 'false', 'null',
  'undefined', 'def', 'elif', 'lambda', 'pass', 'raise', 'with', 'yield', 'global', 'nonlocal',
  'assert', 'True', 'False', 'None', 'and', 'or', 'not', 'is', 'pub', 'fn', 'mut', 'struct',
  'impl', 'trait', 'use', 'mod', 'match', 'package', 'func', 'select', 'SELECT', 'FROM', 'WHERE',
  'GROUP', 'BY', 'ORDER', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'ON', 'AS', 'INSERT', 'INTO', 'VALUES',
  'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'WITH', 'AND', 'OR', 'NOT', 'NULL', 'DESC', 'ASC',
]);

function highlightLineTokens(line: string, isDark: boolean): React.ReactNode[] {
  const tokenRegex =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|<!--[\s\S]*?-->|<\/?[a-zA-Z][a-zA-Z0-9-]*|>|\/>|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][A-Za-z0-9_$]*(?=\s*\()|\.[A-Za-z_$][A-Za-z0-9_$]*|\b[A-Za-z_$][A-Za-z0-9_$]*\b)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }

    const token = match[0];
    let colorClass = '';

    if (token.startsWith('//') || token.startsWith('/*') || token.startsWith('#') || token.startsWith('<!--')) {
      colorClass = isDark ? 'text-neutral-500 italic' : 'text-neutral-500 italic';
    } else if (token.startsWith('<') || token === '>' || token === '/>') {
      colorClass = isDark ? 'text-purple-400' : 'text-[#9b2393]';
    } else if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
      colorClass = isDark ? 'text-emerald-400' : 'text-[#047857]';
    } else if (/^\d/.test(token)) {
      colorClass = isDark ? 'text-amber-400' : 'text-[#b45309]';
    } else if (KEYWORDS.has(token)) {
      colorClass = isDark ? 'text-purple-400' : 'text-[#9b2393]';
    } else if (token.startsWith('.')) {
      nodes.push('.');
      nodes.push(
        <span key={`t-${keyIdx++}`} className={isDark ? 'text-sky-400' : 'text-[#1d4ed8]'}>
          {token.slice(1)}
        </span>
      );
      lastIndex = tokenRegex.lastIndex;
      continue;
    } else if (line[tokenRegex.lastIndex] === '(') {
      colorClass = isDark ? 'text-sky-400' : 'text-[#1d4ed8]';
    } else if (/^[A-Z]/.test(token)) {
      colorClass = isDark ? 'text-amber-300' : 'text-[#0369a1]';
    } else {
      colorClass = isDark ? 'text-neutral-200' : 'text-[#27272a]';
    }

    nodes.push(
      <span key={`t-${keyIdx++}`} className={colorClass}>
        {token}
      </span>
    );
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }

  return nodes;
}

function buildHtmlPreviewDoc(rawCode: string, lang: string): string {
  const clean = lang.toLowerCase();
  if (clean === 'css') {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${rawCode}</style></head><body style="font-family:system-ui,sans-serif;padding:24px;"><div class="card preview-box"><h3>Live CSS Preview</h3><p>Styled preview box rendered inside sandbox.</p><button class="btn">Interactive Button</button></div></body></html>`;
  }
  if (clean === 'svg') {
    return `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff;">${rawCode}</body></html>`;
  }
  // HTML snippet: ensure canvas or script-only fragments also run nicely
  const hasHtmlShell = /<!doctype|<html|<body/i.test(rawCode);
  if (hasHtmlShell) return rawCode;
  const needsCanvas = /getElementById\s*\(\s*["']game["']\s*\)/.test(rawCode) && !/<canvas/i.test(rawCode);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #fafafa; }
    canvas { border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
  </style>
</head>
<body>
  ${needsCanvas ? '<canvas id="game" width="480" height="360"></canvas>' : ''}
  ${rawCode}
</body>
</html>`;
}

interface CodeBlockProps {
  language: string;
  code: string;
  isDark: boolean;
  onOpenInCodeStudio?: (code: string, language: string) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, isDark, onOpenInCodeStudio }) => {
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(1);
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);
  const [executionDuration, setExecutionDuration] = useState<number | null>(null);
  const [isCanvasModalOpen, setIsCanvasModalOpen] = useState(false);
  const [editableCode, setEditableCode] = useState(code);

  const cleanLang = (language || 'text').toLowerCase();
  const displayLang = formatLanguageLabel(language);
  const isHtmlPreviewable = ['html', 'svg', 'xml', 'css'].includes(cleanLang);
  const isConsoleRunnable = ['python', 'py', 'javascript', 'js', 'typescript', 'ts'].includes(cleanLang);
  const isRunnable = isHtmlPreviewable || isConsoleRunnable;

  const highlightedLines = useMemo(() => {
    return code.split('\n').map((line) => highlightLineTokens(line, isDark));
  }, [code, isDark]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunCode = () => {
    if (isHtmlPreviewable) {
      if (showLivePreview) {
        setShowLivePreview(false);
      } else {
        setPreviewRefreshKey((k) => k + 1);
        setShowLivePreview(true);
      }
      return;
    }

    if (isRunning) return;
    setIsRunning(true);
    const start = performance.now();

    setTimeout(() => {
      try {
        if (cleanLang === 'python' || cleanLang === 'py') {
          const simulatedOutput = runPythonSafely(code);
          setExecutionOutput(simulatedOutput);
        } else if (cleanLang === 'javascript' || cleanLang === 'js' || cleanLang === 'typescript' || cleanLang === 'ts') {
          const logs: string[] = [];
          const customConsole = {
            log: (...args: any[]) =>
              logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
            error: (...args: any[]) => logs.push('Error: ' + args.join(' ')),
            warn: (...args: any[]) => logs.push('Warning: ' + args.join(' ')),
          };
          const executable =
            cleanLang === 'typescript' || cleanLang === 'ts'
              ? code
                  .replace(/export\s+/g, '')
                  .replace(/:\s*[A-Za-z0-9_<>[\]|,\s]+(?=[=,);])/g, '')
              : code;
          const fn = new Function('console', executable);
          fn(customConsole);
          setExecutionOutput(
            logs.length > 0 ? logs.join('\n') : 'Process finished with exit code 0 (No stdout output)'
          );
        }
      } catch (err: any) {
        setExecutionOutput(`Traceback (most recent call last):\n  ${err?.message || String(err)}`);
      } finally {
        setExecutionDuration(Math.round(performance.now() - start));
        setIsRunning(false);
      }
    }, 100);
  };

  const handleOpenCanvas = () => {
    setEditableCode(code);
    setPreviewRefreshKey((k) => k + 1);
    setIsCanvasModalOpen(true);
  };

  const handleDownloadCode = () => {
    const extMap: Record<string, string> = {
      html: 'html',
      css: 'css',
      svg: 'svg',
      xml: 'xml',
      javascript: 'js',
      js: 'js',
      typescript: 'ts',
      ts: 'ts',
      python: 'py',
      py: 'py',
      json: 'json',
      sql: 'sql',
    };
    const ext = extMap[cleanLang] || 'txt';
    const contentToDownload = isHtmlPreviewable ? buildHtmlPreviewDoc(code, cleanLang) : code;
    const blob = new Blob([contentToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanLang === 'html' ? 'index.html' : `forgex-code.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isInteractiveMode = (isHtmlPreviewable && showLivePreview) || executionOutput !== null;

  return (
    <>
      {/* Clean ChatGPT-style Code Card matching attached reference */}
      <div
        className={`my-3.5 rounded-2xl overflow-hidden border transition-colors ${
          isDark
            ? 'bg-[#1c1c1f] border-neutral-800 text-neutral-100'
            : 'bg-[#f4f4f4] border-neutral-200/80 text-neutral-900'
        }`}
      >
        {/* Minimal Flat Header: </> Language on left; when running shows Download + </> back-to-code */}
        <div className="flex items-center justify-between px-4 py-2.5 select-none">
          <div className={`flex items-center gap-2 text-[13px] font-medium font-sans ${
            isDark ? 'text-neutral-200' : 'text-neutral-800'
          }`}>
            <Code2 className={`w-4 h-4 shrink-0 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`} />
            <span>{displayLang}</span>
          </div>

          {isInteractiveMode ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDownloadCode}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/75'
                }`}
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowLivePreview(false);
                  setExecutionOutput(null);
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/75'
                }`}
                title="View code"
              >
                <Code2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {/* Open Canvas / Expand button (->|) */}
              <button
                type="button"
                onClick={handleOpenCanvas}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/75'
                }`}
                title="Open in interactive Code Canvas"
              >
                <ArrowRightToLine className="w-4 h-4" />
              </button>

              {/* Copy Icon Button */}
              <button
                type="button"
                onClick={handleCopy}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  copied
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/75'
                }`}
                title={copied ? 'Copied' : 'Copy code'}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Run / Live Preview Play Icon Button */}
              {isRunnable && (
                <button
                  type="button"
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/75'
                  }`}
                  title={isHtmlPreviewable ? 'Run interactive preview' : 'Run code'}
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Interactive Mode vs Source Code View */}
        {isHtmlPreviewable && showLivePreview ? (
          <div className={`border-t ${isDark ? 'border-neutral-800 bg-white' : 'border-neutral-200/80 bg-white'}`}>
            <iframe
              key={previewRefreshKey}
              srcDoc={buildHtmlPreviewDoc(code, cleanLang)}
              className="w-full h-[340px] sm:h-[480px] border-0 bg-white block"
              sandbox="allow-scripts allow-modals allow-forms"
              title="Interactive Live Page"
            />
          </div>
        ) : executionOutput !== null ? (
          <div className={`border-t p-4 min-h-[220px] ${
            isDark ? 'border-neutral-800 bg-[#141416]' : 'border-neutral-200 bg-white'
          }`}>
            <div className={`flex items-center justify-between text-[11px] pb-2 border-b font-sans ${
              isDark ? 'border-neutral-800 text-neutral-400' : 'border-neutral-200 text-neutral-600'
            }`}>
              <span className="flex items-center gap-1.5 font-medium">
                <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                Output
              </span>
              {executionDuration !== null && (
                <span className="font-mono text-[10px] opacity-75">{executionDuration}ms</span>
              )}
            </div>
            <pre className={`mt-3 text-xs sm:text-[13px] font-mono whitespace-pre-wrap leading-relaxed max-h-[360px] overflow-y-auto ${
              isDark ? 'text-emerald-300' : 'text-emerald-800'
            }`}>
              {executionOutput}
            </pre>
          </div>
        ) : (
          /* Syntax-Highlighted Code Body (scrollable, no line-number clutter) */
          <pre
            className={`px-4 pt-1 pb-4 max-h-[380px] overflow-auto text-[12.5px] sm:text-[13px] leading-[1.65] font-mono selection:bg-sky-500/20 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full ${
              isDark
                ? '[&::-webkit-scrollbar-thumb]:bg-neutral-700/80'
                : '[&::-webkit-scrollbar-thumb]:bg-neutral-400/55'
            }`}
          >
            <code>
              {highlightedLines.map((lineNodes, idx) => (
                <React.Fragment key={idx}>
                  {lineNodes.length > 0 ? lineNodes : ' '}
                  {idx < highlightedLines.length - 1 ? '\n' : ''}
                </React.Fragment>
              ))}
            </code>
          </pre>
        )}
      </div>

      {/* Expanded Code & Preview Canvas Modal (opened via ->| button) */}
      {isCanvasModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCanvasModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
        >
          <div
            className={`w-full max-w-6xl h-[90dvh] sm:h-[86dvh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
              isDark ? 'bg-[#18181b] border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            {/* Modal Top Bar */}
            <div className={`px-3 sm:px-4 py-2.5 sm:py-3 border-b flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0 ${
              isDark ? 'border-neutral-800 bg-[#1e1e22]' : 'border-neutral-200 bg-[#f8f8f8]'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <Code2 className="w-4 h-4 text-neutral-500 shrink-0" />
                <span className="font-sans font-semibold text-sm truncate">{displayLang} Canvas</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {onOpenInCodeStudio && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCanvasModalOpen(false);
                      onOpenInCodeStudio(editableCode, language);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      isDark
                        ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
                        : 'border-neutral-300 hover:bg-neutral-100 text-neutral-800'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Modify in Chat</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(editableCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    isDark
                      ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
                      : 'border-neutral-300 hover:bg-neutral-100 text-neutral-800'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                {isHtmlPreviewable && (
                  <button
                    type="button"
                    onClick={() => setPreviewRefreshKey((k) => k + 1)}
                    className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsCanvasModalOpen(false)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'
                  }`}
                  title="Close canvas"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Split Editor + Live Preview Body */}
            <div className={`flex-1 min-h-0 overflow-y-auto lg:overflow-hidden grid ${isHtmlPreviewable ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              <div className={`flex flex-col min-h-[220px] ${isHtmlPreviewable ? 'border-b lg:border-b-0 lg:border-r' : ''} ${
                isDark ? 'border-neutral-800 bg-[#141416]' : 'border-neutral-200 bg-[#f7f7f7]'
              }`}>
                <textarea
                  value={editableCode}
                  onChange={(e) => setEditableCode(e.target.value)}
                  spellCheck={false}
                  className={`flex-1 w-full p-4 font-mono text-[13px] leading-relaxed bg-transparent outline-none resize-none ${
                    isDark ? 'text-neutral-200' : 'text-neutral-800'
                  }`}
                />
              </div>

              {isHtmlPreviewable && (
                <div className="flex flex-col min-h-[260px] bg-white">
                  <iframe
                    key={`modal-${previewRefreshKey}`}
                    srcDoc={buildHtmlPreviewDoc(editableCode, cleanLang)}
                    className="w-full h-full border-none bg-white flex-1"
                    sandbox="allow-scripts allow-modals allow-forms"
                    title="Canvas Live Preview"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function runPythonSafely(code: string): string {
  const lines = code.split('\n');
  const outputs: string[] = [];
  const variables: Record<string, any> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const printMatch = line.match(/^print\s*\((.*)\)$/);
    if (printMatch) {
      const expr = printMatch[1].trim();
      if (expr.startsWith('f"') || expr.startsWith("f'")) {
        const strContent = expr.slice(2, -1);
        const resolved = strContent.replace(/\{([^}]+)\}/g, (_, varName) => {
          const v = varName.trim();
          if (v in variables) return String(variables[v]);
          try {
            return String(evalSimpleMath(v, variables));
          } catch {
            return varName;
          }
        });
        outputs.push(resolved);
        continue;
      }

      if (expr in variables) {
        outputs.push(typeof variables[expr] === 'object' ? JSON.stringify(variables[expr]) : String(variables[expr]));
        continue;
      }

      try {
        const evaluated = evalSimpleMath(expr, variables);
        outputs.push(String(evaluated));
      } catch {
        outputs.push(expr.replace(/^['"]|['"]$/g, ''));
      }
      continue;
    }

    const assignMatch = line.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (assignMatch) {
      const varName = assignMatch[1];
      const valExpr = assignMatch[2].trim();
      try {
        if (valExpr.startsWith('[') && valExpr.endsWith(']')) {
          variables[varName] = JSON.parse(valExpr);
        } else if (!isNaN(Number(valExpr))) {
          variables[varName] = Number(valExpr);
        } else {
          variables[varName] = evalSimpleMath(valExpr, variables);
        }
      } catch {
        variables[varName] = valExpr;
      }
    }
  }

  if (outputs.length === 0) {
    return 'Program executed successfully with no print output.';
  }
  return outputs.join('\n');
}

function evalSimpleMath(expr: string, vars: Record<string, any>): any {
  let replaced = expr;
  replaced = replaced.replace(/sum\(([a-zA-Z_]\w*)\)/g, (_, listName) => {
    const list = vars[listName];
    if (Array.isArray(list)) return String(list.reduce((a, b) => a + Number(b), 0));
    return '0';
  });
  replaced = replaced.replace(/len\(([a-zA-Z_]\w*)\)/g, (_, listName) => {
    const list = vars[listName];
    if (Array.isArray(list)) return String(list.length);
    return '0';
  });
  replaced = replaced.replace(/max\(([a-zA-Z_]\w*)\)/g, (_, listName) => {
    const list = vars[listName];
    return Array.isArray(list) ? String(Math.max(...list)) : '0';
  });
  replaced = replaced.replace(/min\(([a-zA-Z_]\w*)\)/g, (_, listName) => {
    const list = vars[listName];
    return Array.isArray(list) ? String(Math.min(...list)) : '0';
  });

  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === 'number') {
      replaced = replaced.replace(new RegExp(`\\b${k}\\b`, 'g'), String(v));
    }
  }

  if (/^[\d\s+\-*/%().]+$/.test(replaced)) {
    return Function(`"use strict"; return (${replaced});`)();
  }
  return expr;
}
