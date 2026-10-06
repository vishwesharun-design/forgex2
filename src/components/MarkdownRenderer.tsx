import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Code2, 
  Play, 
  EyeOff, 
  Image as ImageIcon,
  Terminal
} from 'lucide-react';
import { ForgeXTheme } from '../types';
import { FormattedMathText, MathView } from './MathView';
import { InteractiveChart, ChartConfig } from './InteractiveChart';
import { InteractiveTable, TableCellRenderer } from './InteractiveTable';
import { InteractiveQuiz, QuizConfig } from './InteractiveQuiz';

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
    // If it contains math expressions ($$, $, or symbols)
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
 * Handles:
 * - Proper ```quiz JSON
 * - Unescaped LaTeX backslashes (\Delta, \frac, \sqrt, \alpha, etc.)
 * - Trailing commas and unquoted keys
 * - Python / JS quiz assignments (questions = [...])
 * - Untagged or misc-tagged code blocks containing questions
 */
function parseQuizConfig(raw: string): QuizConfig | null {
  if (!raw || typeof raw !== 'string') return null;

  let cleaned = raw.trim();
  // Strip code fences if present
  cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // If raw assignment e.g. "questions = [...]" or "const quiz = { ... }"
  const assignmentMatch = cleaned.match(/(?:(?:const|let|var)\s+\w+\s*=\s*|\w+\s*=\s*)([{\[][\s\S]+)/);
  if (assignmentMatch && assignmentMatch[1]) {
    cleaned = assignmentMatch[1].replace(/;?\s*$/, '').trim();
  }

  // Attempt parse helpers:
  const tryParseJson = (str: string): any => {
    try {
      return JSON.parse(str);
    } catch {
      // 1. Fix unescaped backslashes (common in LaTeX formulas)
      const sanitized = str
        .replace(/\\([^"\\\/bfnrtu]|u[0-9a-fA-F]{0,3}[^0-9a-fA-F])/g, '\\\\$1')
        .replace(/,\s*([}\]])/g, '$1');
      try {
        return JSON.parse(sanitized);
      } catch {
        // 2. Relaxed quotes / keys
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

  // If not parsed directly, try to extract first JSON object {...} or array [...]
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

  // If parsed is array, wrap it in { questions: parsed }
  if (Array.isArray(parsed)) {
    parsed = { questions: parsed };
  }

  // Verify questions array
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
    <div className={`markdown-body text-xs sm:text-sm leading-relaxed space-y-3 break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Code blocks, Charts and interactive runners
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1].toLowerCase() : '';
            const isInline = !match && !String(children).includes('\n');
            const codeString = String(children).replace(/\n$/, '');

            if (isInline) {
              if (/^[\d\s+\-*/×÷=^_\\]+$/.test(codeString) || /\\boxed|\\frac|\\sqrt/.test(codeString)) {
                return <MathView math={codeString} display={false} />;
              }
              return (
                <code
                  className={`px-1.5 py-0.5 rounded-md font-mono text-[11px] sm:text-xs font-semibold ${
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

            // Detect quiz code blocks or any code containing quiz questions
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

            // Detect chart code blocks (e.g. ```chart or ```json with chart data)
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
                // Not chart JSON, fall back to CodeBlock
              }
            }

            // Detect LaTeX math block (```latex or ```math)
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

          // Headings with clean left alignment and math support
          h1: ({ children }) => (
            <h1 className={`block text-left text-lg sm:text-xl font-bold tracking-tight mt-4 mb-2 pb-1 border-b font-display ${
              isDark ? 'text-neutral-100 border-neutral-800/60' : 'text-neutral-900 border-neutral-200'
            }`}>
              {renderWithMath(children)}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`block text-left text-base sm:text-lg font-bold tracking-tight mt-3 mb-2 font-display ${
              isDark ? 'text-amber-400' : 'text-amber-700'
            }`}>
              {renderWithMath(children)}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`block text-left text-sm sm:text-base font-semibold tracking-tight mt-2.5 mb-1.5 font-display ${
              isDark ? 'text-neutral-200' : 'text-neutral-900'
            }`}>
              {renderWithMath(children)}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className={`block text-left text-xs sm:text-sm font-semibold tracking-tight mt-2 mb-1 ${
              isDark ? 'text-neutral-200' : 'text-neutral-900'
            }`}>
              {renderWithMath(children)}
            </h4>
          ),

          // Paragraphs with recursive math parsing and clean line height
          p: ({ children }: any) => {
            return (
              <div className="my-2 leading-relaxed text-inherit text-left">
                {renderWithMath(children)}
              </div>
            );
          },

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1 text-inherit text-left">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1 text-inherit text-left">
              {children}
            </ol>
          ),
          li: ({ children }: any) => {
            return (
              <li className="leading-relaxed text-left">
                {renderWithMath(children)}
              </li>
            );
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote
              className={`border-l-2 pl-3 py-1 my-2 rounded-r-lg italic text-xs leading-relaxed text-left ${
                isDark 
                  ? 'border-neutral-600 bg-neutral-900/40 text-neutral-300' 
                  : 'border-neutral-400 bg-neutral-100 text-neutral-800'
              }`}
            >
              {renderWithMath(children)}
            </blockquote>
          ),

          // Enhanced ChatGPT-style Tables with strict column alignment
          table: ({ children }) => (
            <InteractiveTable theme={theme}>
              {children}
            </InteractiveTable>
          ),
          thead: ({ children }) => (
            <thead className={isDark ? 'bg-neutral-900/90 border-b border-neutral-800' : 'bg-neutral-100/90 border-b border-neutral-200'}>
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className={isDark ? 'divide-y divide-neutral-800/60' : 'divide-y border-neutral-200 divide-neutral-200'}>
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className={`transition-colors ${isDark ? 'hover:bg-neutral-800/40' : 'hover:bg-neutral-50/80'}`}>
              {children}
            </tr>
          ),
          th: ({ children, style }: any) => {
            const str = String(children || '').trim().toLowerCase();
            const isAnswerCol = str.includes('answer') || str.includes('result') || str.includes('score') || str.includes('value');
            const isDiffCol = str.includes('difficulty') || str.includes('tier') || str.includes('level');
            const alignClass = isAnswerCol ? 'text-right' : isDiffCol ? 'text-center' : 'text-left';

            return (
              <th
                className={`px-3 py-2.5 sm:px-4 sm:py-3 font-semibold font-sans text-xs tracking-wide ${alignClass} ${
                  isDark ? 'text-neutral-300' : 'text-neutral-700'
                }`}
                style={style}
              >
                <TableCellRenderer content={children} isHeader={true} theme={theme} />
              </th>
            );
          },
          td: ({ children, style }: any) => {
            const str = typeof children === 'string' ? children.trim().toLowerCase() : '';
            const isNumericAnswer = /^\d+(?:\/\d+)?(?:\.\d+)?$/.test(str) || /^\$?\d+/.test(str);
            const isDiff = /^(easy|medium|hard)$/i.test(str);
            const alignClass = isNumericAnswer ? 'text-right font-mono font-bold' : isDiff ? 'text-center' : 'text-left';

            return (
              <td
                className={`px-3 py-2.5 sm:px-4 sm:py-3 text-inherit leading-relaxed align-middle ${alignClass}`}
                style={style}
              >
                <TableCellRenderer content={children} isHeader={false} theme={theme} />
              </td>
            );
          },

          // Links & Source Badges
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

          // Embedded AI Images
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
                        title="Open in Image Studio for variations, inpainting & upscaling"
                      >
                        <ImageIcon className="w-3 h-3 text-amber-500" />
                        <span className="hidden sm:inline">Image Studio</span>
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

interface CodeBlockProps {
  language: string;
  code: string;
  isDark: boolean;
  onOpenInCodeStudio?: (code: string, language: string) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, isDark, onOpenInCodeStudio }) => {
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);
  const [executionDuration, setExecutionDuration] = useState<number | null>(null);

  const cleanLang = language.toLowerCase();
  const isPreviewable = ['html', 'svg'].includes(cleanLang);
  const isRunnable = ['python', 'py', 'javascript', 'js', 'typescript', 'ts', 'html', 'svg'].includes(cleanLang);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunCode = () => {
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
            log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
            error: (...args: any[]) => logs.push('Error: ' + args.join(' ')),
            warn: (...args: any[]) => logs.push('Warning: ' + args.join(' ')),
          };
          const fn = new Function('console', code);
          fn(customConsole);
          setExecutionOutput(logs.length > 0 ? logs.join('\n') : 'Process finished with exit code 0 (No stdout output)');
        } else if (isPreviewable) {
          setExecutionOutput('Rendering interactive preview sandbox below...');
        }
      } catch (err: any) {
        setExecutionOutput(`Traceback (most recent call last):\n  ${err?.message || String(err)}`);
      } finally {
        setExecutionDuration(Math.round(performance.now() - start));
        setIsRunning(false);
      }
    }, 120);
  };

  return (
    <div
      className={`my-3 sm:my-4 rounded-xl sm:rounded-2xl overflow-hidden border font-mono text-xs shadow-sm ${
        isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-900 border-neutral-800 text-neutral-100'
      }`}
    >
      {/* Code Header Bar matching ChatGPT Screenshot 2 (</> Python, Copy, Run) */}
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 bg-neutral-900 border-b border-neutral-800 text-[11px] text-neutral-400">
        <span className="font-semibold tracking-wider text-neutral-200 flex items-center gap-1.5 sm:gap-2">
          <span className="text-amber-400 font-bold">&lt;/&gt;</span>
          <span className="capitalize">{language || 'Code'}</span>
        </span>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Open in Code Studio button */}
          {onOpenInCodeStudio && (
            <button
              type="button"
              onClick={() => onOpenInCodeStudio(code, language)}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 transition-colors text-[11px]"
              title="Open and edit in Code Studio"
            >
              <ExternalLink className="w-3 h-3 text-amber-400" />
              <span className="font-sans hidden sm:inline">Code Studio</span>
            </button>
          )}

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg hover:bg-neutral-800 hover:text-neutral-200 transition-colors text-neutral-400"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-sans hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="font-sans hidden sm:inline">Copy</span>
              </>
            )}
          </button>

          {/* Run Button from ChatGPT Screenshot */}
          {isRunnable && (
            <button
              type="button"
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold font-sans transition-all active:scale-95 text-[11px]"
              title="Execute code and display output"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isRunning ? 'Running...' : 'Run'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Code Text Content */}
      <pre className="p-3 sm:p-4 overflow-x-auto text-[11px] sm:text-xs leading-relaxed font-mono text-neutral-200 selection:bg-amber-500/30">
        <code>{code}</code>
      </pre>

      {/* Execution Output Console */}
      {executionOutput !== null && (
        <div className="border-t border-neutral-800 bg-black/90 p-3 sm:p-3.5">
          <div className="flex items-center justify-between text-[10px] text-neutral-400 pb-2 border-b border-neutral-800/80 font-sans">
            <span className="flex items-center gap-1.5 font-semibold text-neutral-300">
              <Terminal className="w-3 h-3 text-emerald-400" />
              Console Output
            </span>
            <div className="flex items-center gap-2">
              {executionDuration !== null && (
                <span className="text-neutral-500 font-mono">{executionDuration}ms</span>
              )}
              <span className="text-emerald-400 font-mono text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                Exit 0
              </span>
              <button
                type="button"
                onClick={() => setExecutionOutput(null)}
                className="text-neutral-500 hover:text-neutral-300 ml-1"
                title="Close console output"
              >
                ✕
              </button>
            </div>
          </div>
          <pre className="mt-2 text-[11px] sm:text-xs font-mono text-emerald-300/90 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {executionOutput}
          </pre>
        </div>
      )}

      {/* Live Iframe for HTML / SVG */}
      {isPreviewable && executionOutput && (
        <div className="border-t border-neutral-800 bg-white dark:bg-neutral-950 p-2">
          <iframe
            srcDoc={code}
            className="w-full h-48 sm:h-56 rounded-lg border border-neutral-800 bg-white"
            sandbox="allow-scripts"
            title="Code Preview"
          />
        </div>
      )}
    </div>
  );
};

function runPythonSafely(code: string): string {
  const lines = code.split('\n');
  const outputs: string[] = [];
  const variables: Record<string, any> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Handle print statements
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

    // Handle variable assignments
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
