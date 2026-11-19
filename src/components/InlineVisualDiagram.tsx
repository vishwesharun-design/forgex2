import React, { useMemo, useState, useId } from 'react';
import { Copy, Check, Download, Code2, Eye, Maximize2, X } from 'lucide-react';
import { ForgeXTheme } from '../types';

export interface VisualPrimitiveElement {
  type: 'rect' | 'circle' | 'ellipse' | 'line' | 'arrow' | 'polygon' | 'polyline' | 'path' | 'text';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rx?: number;
  ry?: number;
  cx?: number;
  cy?: number;
  r?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  points?: string;
  d?: string;
  text?: string;
  lines?: string[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  fontSize?: number;
  fontWeight?: string | number;
  textAnchor?: 'start' | 'middle' | 'end';
  opacity?: number;
}

export interface VisualDiagramConfig {
  title: string;
  caption?: string;
  svg: string;
  hasDarkCanvas: boolean;
}

interface InlineVisualDiagramProps {
  config: VisualDiagramConfig;
  rawSource?: string;
  theme?: ForgeXTheme;
}

function escapeXml(val: string): string {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeSvgMarkup(rawSvg: string): { svg: string; hasDarkCanvas: boolean } | null {
  if (!rawSvg || typeof rawSvg !== 'string') return null;

  const svgMatch = rawSvg.match(/<svg\b[\s\S]*?<\/svg>/i);
  if (!svgMatch) return null;

  let clean = svgMatch[0];

  // Strictly strip unsafe executable or external DOM injection tags/attributes
  clean = clean
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject\b[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object\b[\s\S]*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*\/?>/gi, '')
    .replace(/<link\b[^>]*\/?>/gi, '')
    .replace(/<meta\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(?:href|xlink:href)\s*=\s*(?:"\s*(?:javascript:|data:text\/html)[^"]*"|'\s*(?:javascript:|data:text\/html)[^']*')/gi, '');

  // Ensure a clean responsive viewBox and remove fixed oversized pixel width/height
  const openTagMatch = clean.match(/^<svg\b([^>]*)>/i);
  if (!openTagMatch) return null;

  let attrs = openTagMatch[1] || '';
  const hasViewBox = /\bviewBox\s*=/i.test(attrs);
  const wMatch = attrs.match(/\bwidth\s*=\s*["']\s*(\d+(?:\.\d+)?)(?:px)?\s*["']/i);
  const hMatch = attrs.match(/\bheight\s*=\s*["']\s*(\d+(?:\.\d+)?)(?:px)?\s*["']/i);
  const inferredW = wMatch ? Number(wMatch[1]) : 640;
  const inferredH = hMatch ? Number(hMatch[1]) : 360;

  // Strip width/height & inline styles that fix rigid dimensions
  attrs = attrs
    .replace(/\s*\bwidth\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*\bheight\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*\bclass\s*=\s*["'][^"']*["']/gi, '');

  if (!hasViewBox) {
    attrs += ` viewBox="0 0 ${inferredW} ${inferredH}"`;
  }
  attrs += ' preserveAspectRatio="xMidYMid meet" width="100%" style="display:block;max-width:100%;height:auto;"';

  clean = clean.replace(/^<svg\b[^>]*>/i, `<svg${attrs}>`);

  // Detect if SVG explicitly supplies its own dark background canvas
  const hasDarkCanvas =
    /<rect[^>]+fill\s*=\s*["']\s*(?:#0[0-9a-f]{5}|#1[0-9a-f]{5}|#0f172a|#111827|#18181b|rgb\(\s*[0-3]?\d\s*,)/i.test(
      clean.slice(0, 600)
    ) ||
    /<svg[^>]+style\s*=\s*["'][^"']*background(?:-color)?\s*:\s*(?:#0|#1|rgb\(\s*[0-3]?\d\s*,)/i.test(
      clean.slice(0, 400)
    );

  return { svg: clean, hasDarkCanvas };
}

function buildSvgFromElements(
  elements: VisualPrimitiveElement[],
  width = 640,
  height = 360,
  arrowId = 'fx-arrow'
): string {
  const parts: string[] = [
    `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`,
    `<defs>`,
    `  <marker id="${arrowId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">`,
    `    <path d="M 0 1 L 10 5 L 0 9 z" fill="context-stroke" />`,
    `  </marker>`,
    `</defs>`,
  ];

  for (const el of elements) {
    if (!el || typeof el !== 'object') continue;
    const stroke = el.stroke ? ` stroke="${escapeXml(el.stroke)}"` : '';
    const fill = el.fill !== undefined ? ` fill="${escapeXml(el.fill)}"` : ' fill="none"';
    const sw = el.strokeWidth !== undefined ? ` stroke-width="${Number(el.strokeWidth)}"` : '';
    const dash = el.strokeDasharray ? ` stroke-dasharray="${escapeXml(el.strokeDasharray)}"` : '';
    const opacity = el.opacity !== undefined ? ` opacity="${Number(el.opacity)}"` : '';

    switch (el.type) {
      case 'rect': {
        const rx = el.rx !== undefined ? ` rx="${Number(el.rx)}"` : '';
        const ry = el.ry !== undefined ? ` ry="${Number(el.ry)}"` : '';
        parts.push(
          `<rect x="${Number(el.x ?? 0)}" y="${Number(el.y ?? 0)}" width="${Number(el.width ?? 100)}" height="${Number(el.height ?? 60)}"${rx}${ry}${fill}${stroke}${sw}${dash}${opacity} />`
        );
        break;
      }
      case 'circle': {
        parts.push(
          `<circle cx="${Number(el.cx ?? el.x ?? 0)}" cy="${Number(el.cy ?? el.y ?? 0)}" r="${Number(el.r ?? 24)}"${fill}${stroke}${sw}${dash}${opacity} />`
        );
        break;
      }
      case 'ellipse': {
        parts.push(
          `<ellipse cx="${Number(el.cx ?? el.x ?? 0)}" cy="${Number(el.cy ?? el.y ?? 0)}" rx="${Number(el.rx ?? 40)}" ry="${Number(el.ry ?? 24)}"${fill}${stroke}${sw}${dash}${opacity} />`
        );
        break;
      }
      case 'line': {
        parts.push(
          `<line x1="${Number(el.x1 ?? 0)}" y1="${Number(el.y1 ?? 0)}" x2="${Number(el.x2 ?? 100)}" y2="${Number(el.y2 ?? 0)}" stroke="${escapeXml(el.stroke || '#0f172a')}" stroke-width="${Number(el.strokeWidth ?? 2)}"${dash}${opacity} stroke-linecap="round" />`
        );
        break;
      }
      case 'arrow': {
        parts.push(
          `<line x1="${Number(el.x1 ?? 0)}" y1="${Number(el.y1 ?? 0)}" x2="${Number(el.x2 ?? 100)}" y2="${Number(el.y2 ?? 0)}" stroke="${escapeXml(el.stroke || '#0f172a')}" stroke-width="${Number(el.strokeWidth ?? 2)}"${dash}${opacity} stroke-linecap="round" marker-end="url(#${arrowId})" />`
        );
        break;
      }
      case 'polygon': {
        if (el.points) {
          parts.push(
            `<polygon points="${escapeXml(el.points)}"${fill}${stroke}${sw}${dash}${opacity} stroke-linejoin="round" />`
          );
        }
        break;
      }
      case 'polyline': {
        if (el.points) {
          parts.push(
            `<polyline points="${escapeXml(el.points)}"${fill}${stroke}${sw}${dash}${opacity} stroke-linecap="round" stroke-linejoin="round" />`
          );
        }
        break;
      }
      case 'path': {
        if (el.d) {
          parts.push(
            `<path d="${escapeXml(el.d)}"${fill}${stroke}${sw}${dash}${opacity} stroke-linecap="round" stroke-linejoin="round" />`
          );
        }
        break;
      }
      case 'text': {
        const tx = Number(el.x ?? 0);
        const ty = Number(el.y ?? 0);
        const fs = Number(el.fontSize ?? 16);
        const fw = el.fontWeight ? ` font-weight="${escapeXml(String(el.fontWeight))}"` : '';
        const anchor = el.textAnchor ? ` text-anchor="${escapeXml(el.textAnchor)}"` : ' text-anchor="middle"';
        const textFill = el.fill || '#111827';
        const lines = Array.isArray(el.lines) && el.lines.length > 0 ? el.lines : [el.text || ''];
        if (lines.length === 1) {
          parts.push(
            `<text x="${tx}" y="${ty}" fill="${escapeXml(textFill)}" font-size="${fs}" font-family="system-ui, -apple-system, sans-serif"${fw}${anchor}${opacity}>${escapeXml(lines[0])}</text>`
          );
        } else {
          const lineHeight = Math.round(fs * 1.3);
          const tspans = lines
            .map(
              (line, idx) =>
                `<tspan x="${tx}" dy="${idx === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
            )
            .join('');
          parts.push(
            `<text x="${tx}" y="${ty}" fill="${escapeXml(textFill)}" font-size="${fs}" font-family="system-ui, -apple-system, sans-serif"${fw}${anchor}${opacity}>${tspans}</text>`
          );
        }
        break;
      }
    }
  }

  parts.push('</svg>');
  return parts.join('\n');
}

function tryParseJsonRelaxed(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    const cleaned = str
      .replace(/,\s*([}\]])/g, '$1')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

export function parseVisualDiagramConfig(
  raw: string,
  language = ''
): VisualDiagramConfig | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const cleanLang = language.trim().toLowerCase();

  // 1. Check JSON wrapper or structured primitive JSON
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace && (trimmed.startsWith('{') || cleanLang === 'visual' || cleanLang === 'diagram' || cleanLang === 'json')) {
    const parsed = tryParseJsonRelaxed(trimmed.slice(firstBrace, lastBrace + 1));
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.svg === 'string' && /<svg\b/i.test(parsed.svg)) {
        const sanitized = sanitizeSvgMarkup(parsed.svg);
        if (sanitized) {
          return {
            title: String(parsed.title || 'Visual representation').trim(),
            caption: parsed.caption ? String(parsed.caption).trim() : undefined,
            svg: sanitized.svg,
            hasDarkCanvas: sanitized.hasDarkCanvas,
          };
        }
      }
      if (Array.isArray(parsed.elements) && parsed.elements.length > 0) {
        const rawSvg = buildSvgFromElements(
          parsed.elements,
          Number(parsed.width) || 640,
          Number(parsed.height) || 360
        );
        const sanitized = sanitizeSvgMarkup(rawSvg);
        if (sanitized) {
          return {
            title: String(parsed.title || 'Visual representation').trim(),
            caption: parsed.caption ? String(parsed.caption).trim() : undefined,
            svg: sanitized.svg,
            hasDarkCanvas: sanitized.hasDarkCanvas,
          };
        }
      }
    }
  }

  // 2. Check direct <svg> inside ```svg```, ```visual```, or ```diagram```
  if (/<svg\b[\s\S]*<\/svg>/i.test(trimmed)) {
    const titleComment = trimmed.match(/<!--\s*title\s*:\s*([^>]+?)\s*-->/i);
    const captionComment = trimmed.match(/<!--\s*(?:caption|note)\s*:\s*([^>]+?)\s*-->/i);
    const titleTag = trimmed.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descTag = trimmed.match(/<desc[^>]*>([^<]+)<\/desc>/i);

    const sanitized = sanitizeSvgMarkup(trimmed);
    if (sanitized) {
      return {
        title: (titleComment?.[1] || titleTag?.[1] || 'Visual representation').trim(),
        caption: (captionComment?.[1] || descTag?.[1] || '').trim() || undefined,
        svg: sanitized.svg,
        hasDarkCanvas: sanitized.hasDarkCanvas,
      };
    }
  }

  return null;
}

export const InlineVisualDiagram: React.FC<InlineVisualDiagramProps> = ({
  config,
  rawSource,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const diagramId = useId();

  const svgMarkup = useMemo(() => config.svg, [config.svg]);
  const codeText = rawSource || config.svg;

  const handleCopySvg = () => {
    navigator.clipboard.writeText(svgMarkup);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = (config.title || 'visual-representation')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    a.download = `${slug || 'visual-representation'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div
        className={`my-3.5 rounded-2xl border transition-colors ${
          isDark
            ? 'bg-[#161619] border-neutral-800 text-neutral-100'
            : 'bg-white border-neutral-200/90 text-neutral-900'
        } p-4 sm:p-5`}
      >
        {/* Clean Header: Title on left, crisp minimal icon controls on right */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <h4
            className={`text-[13px] sm:text-sm font-semibold tracking-tight font-display ${
              isDark ? 'text-neutral-200' : 'text-neutral-900'
            }`}
          >
            {config.title || 'Visual representation'}
          </h4>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setShowCode((v) => !v)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
              title={showCode ? 'Show visual diagram' : 'View SVG source'}
            >
              {showCode ? <Eye className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleCopySvg}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                copied
                  ? 'text-emerald-500'
                  : isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
              title={copied ? 'Copied SVG' : 'Copy SVG'}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleDownloadSvg}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
              title="Download SVG"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
              title="Expand diagram"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Diagram Drawing Stage vs Raw Code Toggle */}
        {showCode ? (
          <pre
            className={`p-3.5 rounded-xl border text-xs font-mono overflow-auto max-h-[340px] leading-relaxed ${
              isDark
                ? 'bg-[#101012] border-neutral-800 text-neutral-300'
                : 'bg-neutral-50 border-neutral-200 text-neutral-800'
            }`}
          >
            <code>{codeText}</code>
          </pre>
        ) : (
          <div
            id={`visual-diagram-${diagramId}`}
            className={`w-full rounded-xl flex items-center justify-center overflow-hidden ${
              config.hasDarkCanvas
                ? 'bg-[#0f172a] p-2 sm:p-4'
                : isDark
                ? 'bg-white p-3 sm:p-5 border border-neutral-800/40'
                : 'bg-white px-1 py-2'
            }`}
          >
            <div
              className="w-full max-w-[660px] mx-auto [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[380px] select-none"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          </div>
        )}

        {/* Quiet Caption Note Matching Reference Card Footer */}
        {config.caption && (
          <p
            className={`mt-3 text-[11px] sm:text-xs leading-relaxed ${
              isDark ? 'text-neutral-400' : 'text-neutral-500'
            }`}
          >
            {config.caption}
          </p>
        )}
      </div>

      {/* Expanded Lightbox View */}
      {isFullscreen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFullscreen(false);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-8"
        >
          <div
            className={`w-full max-w-4xl rounded-2xl border p-5 sm:p-6 shadow-2xl ${
              isDark
                ? 'bg-[#161619] border-neutral-800 text-neutral-100'
                : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h4 className="text-sm sm:text-base font-semibold font-display">
                {config.title || 'Visual representation'}
              </h4>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    isDark
                      ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
                      : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>SVG</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'
                  }`}
                  title="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className={`w-full rounded-xl p-4 sm:p-6 flex items-center justify-center ${
                config.hasDarkCanvas ? 'bg-[#0f172a]' : 'bg-white'
              }`}
            >
              <div
                className="w-full max-w-[820px] [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[70vh]"
                dangerouslySetInnerHTML={{ __html: svgMarkup }}
              />
            </div>

            {config.caption && (
              <p className={`mt-3 text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {config.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
