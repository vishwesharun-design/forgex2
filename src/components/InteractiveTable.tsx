import React, { useState } from 'react';
import { Copy, Check, Maximize2, Minimize2, Type, Table as TableIcon } from 'lucide-react';
import { ForgeXTheme } from '../types';
import { FormattedMathText } from './MathView';

interface InteractiveTableProps {
  children?: React.ReactNode;
  theme?: ForgeXTheme;
}

export const InteractiveTable: React.FC<InteractiveTableProps> = ({ children, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleCopyTable = () => {
    const tableElem = document.getElementById('interactive-table-root');
    if (!tableElem) return;

    const rows = Array.from(tableElem.querySelectorAll('tr'));
    const tsv = rows
      .map((row) =>
        Array.from(row.querySelectorAll('th, td'))
          .map((cell) => cell.textContent?.trim() || '')
          .join('\t')
      )
      .join('\n');

    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`my-3 sm:my-4 rounded-xl sm:rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
        isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200'
      } ${
        isFullscreen
          ? 'fixed inset-2 sm:inset-6 z-50 p-4 sm:p-6 flex flex-col bg-neutral-950/98 backdrop-blur-2xl border-neutral-700 shadow-2xl'
          : ''
      }`}
    >
      {/* Table Action Bar matching ChatGPT Screenshot */}
      <div
        className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 border-b text-xs ${
          isDark
            ? 'bg-neutral-900/90 border-neutral-800/80 text-neutral-400'
            : 'bg-neutral-50/90 border-neutral-200 text-neutral-600'
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 font-medium">
          <TableIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-[11px] sm:text-xs">Data Table</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Font Size Toggle [A] from screenshot */}
          <button
            type="button"
            onClick={() => setFontSize((prev) => (prev === 'normal' ? 'large' : 'normal'))}
            className={`p-1 sm:p-1.5 rounded-lg border text-xs font-serif font-bold transition-colors ${
              fontSize === 'large'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : isDark
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
            title="Toggle text size"
          >
            <Type className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>

          {/* Copy Table Button */}
          <button
            type="button"
            onClick={handleCopyTable}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-colors ${
              isDark
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
            title="Copy table data"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] sm:text-[11px] text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="text-[10px] sm:text-[11px]">Copy</span>
              </>
            )}
          </button>

          {/* Fullscreen Expand Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-1 sm:p-1.5 rounded-lg border text-xs transition-colors ${
              isDark
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
            title={isFullscreen ? 'Exit fullscreen' : 'Expand table'}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          </button>
        </div>
      </div>

      {/* Table Body Area with responsive horizontal scroll */}
      <div
        id="interactive-table-root"
        className={`overflow-x-auto w-full ${isFullscreen ? 'flex-1 overflow-y-auto' : ''}`}
      >
        <table
          className={`w-full text-left border-collapse transition-all ${
            fontSize === 'large' ? 'text-xs sm:text-sm' : 'text-[11px] sm:text-xs'
          }`}
        >
          {children}
        </table>
      </div>
    </div>
  );
};

export const TableCellRenderer: React.FC<{
  content: React.ReactNode;
  isHeader?: boolean;
  theme?: ForgeXTheme;
}> = ({ content, isHeader = false, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const textStr = typeof content === 'string' ? content.trim() : '';

  // Format Difficulty badges: Easy, Medium, Hard
  if (!isHeader && /^(easy|medium|hard)$/i.test(textStr)) {
    const lower = textStr.toLowerCase();
    let badgeClass = isDark
      ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
      : 'bg-neutral-100 text-neutral-700 border-neutral-300';

    if (lower === 'easy') {
      badgeClass = isDark
        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        : 'bg-emerald-50 text-emerald-700 border-emerald-300';
    } else if (lower === 'medium') {
      badgeClass = isDark
        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
        : 'bg-amber-50 text-amber-700 border-amber-300';
    } else if (lower === 'hard') {
      badgeClass = isDark
        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
        : 'bg-rose-50 text-rose-700 border-rose-300';
    }

    return (
      <span
        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium border whitespace-nowrap ${badgeClass}`}
      >
        {textStr.charAt(0).toUpperCase() + textStr.slice(1).toLowerCase()}
      </span>
    );
  }

  // Format pure numbers or answers (bold font)
  const isNumericAnswer = /^\d+(?:\/\d+)?(?:\.\d+)?$/.test(textStr);

  return (
    <span className={`inline-block ${isNumericAnswer ? 'font-mono font-bold' : ''}`}>
      {typeof content === 'string' ? <FormattedMathText text={content} inlineOnly={true} /> : content}
    </span>
  );
};
