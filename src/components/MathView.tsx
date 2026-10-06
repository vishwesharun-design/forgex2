import React from 'react';
import katex from 'katex';

interface MathViewProps {
  math: string;
  display?: boolean;
  className?: string;
}

export const MathView: React.FC<MathViewProps> = ({ math, display = false, className = '' }) => {
  let cleanMath = math.trim();

  // Normalize common unicode operators and text replacements for math
  cleanMath = cleanMath
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/√(\d+)/g, '\\sqrt{$1}')
    .replace(/√\(([^)]+)\)/g, '\\sqrt{$1}')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/\[(\d+)\]/g, '\\boxed{$1}'); // Box numbers like [700] into \boxed{700}

  try {
    const html = katex.renderToString(cleanMath, {
      displayMode: display,
      throwOnError: false,
      strict: false,
    });

    if (display) {
      return (
        <div
          className={`math-rendered select-text my-2 sm:my-2.5 py-1 text-center overflow-x-auto max-w-full text-xs sm:text-sm md:text-base leading-normal ${className}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    return (
      <span
        className={`math-rendered select-text inline-block align-middle px-0.5 whitespace-nowrap overflow-x-auto max-w-full text-xs sm:text-sm ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (err) {
    return <span className={`font-mono text-xs ${className}`}>{math}</span>;
  }
};

/**
 * Parses a string containing potential LaTeX math ($...$, $$...$$, \[...\], \(...\))
 * and renders formatted math with KaTeX.
 * 
 * Accurately detects whether a math formula is standalone on its line (display mode)
 * or preceded/succeeded by explanatory text (inline mode), ensuring crisp left-alignment
 * for math identities (e.g. "Sum of Cubes: a³ + b³ = ...") without awkward line breaks.
 */
export const FormattedMathText: React.FC<{ text: string; className?: string; inlineOnly?: boolean }> = ({ 
  text, 
  className = '',
  inlineOnly = false
}) => {
  if (!text || typeof text !== 'string') return null;

  // 1. Detect if entire string is a standalone pure math expression
  // e.g. "(125 + 75) \times 4 - 300 \div 3 = \boxed{700}"
  const isPureMathSum = !inlineOnly &&
    /^(?:\$\$)?\s*\(?[\d\s+\-*/×÷=^_\\{}(),.boxedfracsqrt]+\)?\s*(?:\$\$)?$/i.test(text.trim()) &&
    /[=+\-*/×÷^\\_]/.test(text.trim()) &&
    !/[a-zA-Z]{5,}/.test(text); // No long text words

  if (isPureMathSum) {
    const stripped = text.replace(/^\$\$|\$\$$|^\\\[|\\\]$/g, '').trim();
    return (
      <div className="math-sum-card my-2 sm:my-3 py-1.5 sm:py-2.5 flex items-center justify-center overflow-x-auto max-w-full text-xs sm:text-sm md:text-base">
        <MathView math={stripped} display={true} />
      </div>
    );
  }

  // 2. Tokenize string into normal text and math segments
  const regex = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
  const parts = text.split(regex);

  // Helper: check if a display equation at index has sibling text on the same line
  const hasSiblingTextOnSameLine = (idx: number): boolean => {
    // Check preceding part
    const prev = parts[idx - 1];
    if (prev && !prev.endsWith('\n') && prev.trim().length > 0) return true;
    // Check succeeding part
    const next = parts[idx + 1];
    if (next && !next.startsWith('\n') && next.trim().length > 0) return true;
    return false;
  };

  return (
    <span className={`inline text-inherit ${className}`}>
      {parts.map((part, index) => {
        if (!part) return null;

        // Block display math: $$...$$ or \[...\]
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const inner = part.slice(2, -2).trim();
          // If inlineOnly OR there is text on the same line before/after it (e.g. "Sum of Cubes: $$...$$"):
          // Render as inline math so text and formula stay together, left-aligned, matching ChatGPT style
          const isInline = inlineOnly || hasSiblingTextOnSameLine(index);
          return <MathView key={index} math={inner} display={!isInline} />;
        }

        if (part.startsWith('\\[') && part.endsWith('\\]')) {
          const inner = part.slice(2, -2).trim();
          const isInline = inlineOnly || hasSiblingTextOnSameLine(index);
          return <MathView key={index} math={inner} display={!isInline} />;
        }

        // Inline math: $...$ or \(...\)
        if (part.startsWith('$') && part.endsWith('$')) {
          const inner = part.slice(1, -1).trim();
          return <MathView key={index} math={inner} display={false} />;
        }

        if (part.startsWith('\\(') && part.endsWith('\\)')) {
          const inner = part.slice(2, -2).trim();
          return <MathView key={index} math={inner} display={false} />;
        }

        // Check if segment has inline unicode math symbols like 17² or √2025 or 25 × 16 or 144 ÷ 12
        if (/(?:\d+\s*[×÷]\s*\d+|\d+[²³]|√\d+)/.test(part)) {
          return <MathView key={index} math={part} display={false} />;
        }

        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};
