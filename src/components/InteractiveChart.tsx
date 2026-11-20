import React, { useState, useId } from 'react';
import { BarChart3, Download, Copy, Check, TrendingUp } from 'lucide-react';
import { ForgeXTheme } from '../types';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartConfig {
  type?: 'bar' | 'line' | 'horizontal-bar';
  title: string;
  subtitle?: string;
  unit?: string;
  max?: number;
  data: ChartDataPoint[];
}

interface InteractiveChartProps {
  config: ChartConfig;
  theme?: ForgeXTheme;
}

function wrapChartLabel(label: string, maxCharsPerLine: number, maxLines = 3): string[] {
  const clean = String(label || '').trim();
  if (!clean) return [''];
  const safeMax = Math.max(5, maxCharsPerLine);
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  const pushWord = (word: string) => {
    if (word.length <= safeMax) {
      if (!current) {
        current = word;
      } else if (current.length + 1 + word.length <= safeMax) {
        current += ' ' + word;
      } else {
        lines.push(current);
        current = word;
      }
      return;
    }
    // Word itself exceeds maxCharsPerLine: flush current and chunk word
    if (current) {
      lines.push(current);
      current = '';
    }
    let remaining = word;
    while (remaining.length > safeMax && lines.length < maxLines - 1) {
      lines.push(remaining.slice(0, safeMax - 1) + '-');
      remaining = remaining.slice(safeMax - 1);
    }
    current = remaining;
  };

  for (const w of words) {
    if (lines.length >= maxLines) break;
    pushWord(w);
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  // Ellipsize last line if text was truncated or still too wide
  if (lines.length > 0) {
    const lastIdx = lines.length - 1;
    const joined = lines.join(' ');
    const overflowed = joined.replace(/-/g, '').length < clean.replace(/\s+/g, ' ').length;
    if (lines[lastIdx].length > safeMax) {
      lines[lastIdx] = lines[lastIdx].slice(0, Math.max(2, safeMax - 1)) + '…';
    } else if (overflowed && lines.length === maxLines && !lines[lastIdx].endsWith('…')) {
      lines[lastIdx] =
        lines[lastIdx].length >= safeMax
          ? lines[lastIdx].slice(0, Math.max(2, safeMax - 1)) + '…'
          : lines[lastIdx] + '…';
    }
  }

  return lines.slice(0, maxLines);
}

function truncateText(str: string, maxChars: number): string {
  const s = String(str || '').trim();
  if (s.length <= maxChars) return s;
  return s.slice(0, Math.max(3, maxChars - 1)) + '…';
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({ config, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const data = config.data || [];
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(
    data.length > 1 ? 1 : data.length > 0 ? 0 : null
  );
  const [copied, setCopied] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line'>(config.type === 'line' ? 'line' : 'bar');
  const chartId = useId();

  const rawMax = Math.max(...data.map((d) => Number(d.value) || 0), 10);
  const calculatedMax = config.max || Math.ceil(rawMax / 30) * 30 || 120;
  const unit = config.unit || 'Score';

  // Y-axis tick divisions (e.g. 0, 30, 60, 90, 120)
  const steps = 4;
  const tickValues = Array.from({ length: steps + 1 }, (_, i) =>
    Math.round((calculatedMax / steps) * (steps - i))
  );
  const maxTickChars = Math.max(...tickValues.map((v) => String(v).length), 3);

  const handleCopyData = () => {
    const text =
      `${config.title}\n${config.subtitle || ''}\n\n` +
      data.map((d) => `${d.label}: ${d.value} ${unit}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    const svgElem = document.getElementById(`chart-svg-${chartId}`);
    if (!svgElem) return;
    const svgData = new XMLSerializer().serializeToString(svgElem);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(config.title || 'chart').toLowerCase().replace(/\s+/g, '-')}-chart.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Responsive dimensions with strict overflow protection
  const barCount = Math.max(data.length, 1);
  const svgWidth = Math.max(600, barCount * 82);
  const paddingLeft = Math.max(46, maxTickChars * 7 + 16);
  const paddingRight = 28;
  const paddingTop = 26;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const slotWidth = plotWidth / barCount;
  const barWidth = Math.min(slotWidth * 0.58, 54);
  const labelFontSize = barCount > 8 ? 9.5 : 10.5;
  const maxCharsPerLine = Math.max(6, Math.floor((slotWidth - 10) / (labelFontSize * 0.58)));

  const wrappedLabels = data.map((item) => wrapChartLabel(item.label, maxCharsPerLine, 3));
  const maxWrappedLines = Math.max(1, ...wrappedLabels.map((lines) => lines.length));

  const paddingBottom = 26 + maxWrappedLines * 13;
  const plotHeight = 205;
  const svgHeight = paddingTop + plotHeight + paddingBottom;

  const barGradientId = `bar-pink-blue-${chartId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const lineGradientId = `line-pink-blue-${chartId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <div
      className={`my-3 sm:my-4 w-full max-w-full min-w-0 overflow-hidden rounded-xl sm:rounded-2xl border transition-all shadow-sm ${
        isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white border-neutral-200'
      } p-3 sm:p-5`}
    >
      {/* Header with Title, Subtitle, and Toolbar - strict no-overflow wrapping */}
      <div className="flex items-start justify-between gap-2.5 mb-3 sm:mb-4 min-w-0">
        <div className="min-w-0 flex-1 pr-2">
          <h3
            className={`font-bold text-xs sm:text-base tracking-tight font-display break-words ${
              isDark ? 'text-neutral-100' : 'text-neutral-900'
            }`}
          >
            {config.title}
          </h3>
          {config.subtitle && (
            <p
              className={`text-[10px] sm:text-xs mt-0.5 break-words leading-normal ${
                isDark ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              {config.subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <button
            type="button"
            onClick={() => setChartType((prev) => (prev === 'bar' ? 'line' : 'bar'))}
            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              isDark
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
            title={`Switch to ${chartType === 'bar' ? 'Line' : 'Bar'} chart`}
          >
            {chartType === 'bar' ? <TrendingUp className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleCopyData}
            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              isDark
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
            title="Copy chart data"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleDownloadSvg}
            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              isDark
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
            title="Export chart as SVG"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Interactive Chart Area */}
      <div className="relative w-full min-w-0 overflow-x-auto touch-pan-x custom-scrollbar">
        <svg
          id={`chart-svg-${chartId}`}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className={`w-full h-auto max-h-[340px] select-none block ${
            barCount > 7 ? 'min-w-[540px]' : 'min-w-0'
          }`}
        >
          <defs>
            <linearGradient id={barGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id={lineGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          {/* Subtle Gridlines and Y-Axis Ticks */}
          {tickValues.map((val, idx) => {
            const yPos = paddingTop + (idx / steps) * plotHeight;
            return (
              <g key={`tick-${idx}`}>
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={svgWidth - paddingRight}
                  y2={yPos}
                  stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                  strokeDasharray={idx === steps ? 'none' : '3,3'}
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  fontSize="10"
                  fontFamily="system-ui, sans-serif"
                  fill={isDark ? '#a3a3a3' : '#737373'}
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Bar Chart Mode */}
          {chartType === 'bar' &&
            data.map((item, idx) => {
              const xSlotStart = paddingLeft + idx * slotWidth;
              const xCenter = xSlotStart + slotWidth / 2;
              const barX = xSlotStart + (slotWidth - barWidth) / 2;
              const safeVal = Math.max(0, Number(item.value) || 0);
              const barHeight = Math.max(Math.min((safeVal / calculatedMax) * plotHeight, plotHeight), 4);
              const barY = paddingTop + plotHeight - barHeight;
              const isHovered = hoveredIndex === idx;

              const useDefaultGradient =
                !item.color || item.color.toLowerCase() === '#f472b6' || item.color.toLowerCase() === '#ec4899';
              const barFill = useDefaultGradient ? `url(#${barGradientId})` : item.color!;
              const labelLines = wrappedLabels[idx] || [item.label];

              return (
                <g
                  key={`bar-${idx}`}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onTouchStart={() => setHoveredIndex(idx)}
                  onClick={() => setHoveredIndex(idx)}
                >
                  {/* Invisible hit area for smooth hover interaction */}
                  <rect
                    x={xSlotStart}
                    y={paddingTop}
                    width={slotWidth}
                    height={plotHeight + paddingBottom}
                    fill="transparent"
                  />

                  {/* Rounded bar with pink-blue gradient */}
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    rx="10"
                    ry="10"
                    fill={barFill}
                    opacity={isHovered ? 1 : 0.9}
                    className="transition-all duration-200"
                    style={{
                      filter: isHovered
                        ? useDefaultGradient
                          ? 'drop-shadow(0 4px 12px rgba(236, 72, 153, 0.38))'
                          : `drop-shadow(0 4px 12px ${item.color}66)`
                        : 'none',
                    }}
                  />

                  {/* Wrapped Category Label below X axis */}
                  <text
                    x={xCenter}
                    y={paddingTop + plotHeight + 17}
                    textAnchor="middle"
                    fontSize={labelFontSize}
                    fontWeight={isHovered ? '600' : '400'}
                    fontFamily="system-ui, sans-serif"
                    fill={
                      isHovered
                        ? isDark
                          ? '#ffffff'
                          : '#0f172a'
                        : isDark
                        ? '#a3a3a3'
                        : '#525252'
                    }
                  >
                    {labelLines.map((line, lIdx) => (
                      <tspan key={lIdx} x={xCenter} dy={lIdx === 0 ? 0 : 12}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}

          {/* Line Chart Mode */}
          {chartType === 'line' && (
            <g>
              <path
                d={data.reduce((acc, item, idx) => {
                  const x = paddingLeft + idx * slotWidth + slotWidth / 2;
                  const safeVal = Math.max(0, Number(item.value) || 0);
                  const y = paddingTop + plotHeight - Math.min((safeVal / calculatedMax) * plotHeight, plotHeight);
                  return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                }, '')}
                fill="none"
                stroke={`url(#${lineGradientId})`}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {data.map((item, idx) => {
                const cx = paddingLeft + idx * slotWidth + slotWidth / 2;
                const safeVal = Math.max(0, Number(item.value) || 0);
                const cy = paddingTop + plotHeight - Math.min((safeVal / calculatedMax) * plotHeight, plotHeight);
                const isHovered = hoveredIndex === idx;
                const labelLines = wrappedLabels[idx] || [item.label];
                const useDefaultGradient =
                  !item.color || item.color.toLowerCase() === '#f472b6' || item.color.toLowerCase() === '#ec4899';

                return (
                  <g
                    key={`point-${idx}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onTouchStart={() => setHoveredIndex(idx)}
                    onClick={() => setHoveredIndex(idx)}
                  >
                    <rect
                      x={paddingLeft + idx * slotWidth}
                      y={paddingTop}
                      width={slotWidth}
                      height={plotHeight + paddingBottom}
                      fill="transparent"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 7 : 5}
                      fill={isDark ? '#171717' : '#ffffff'}
                      stroke={useDefaultGradient ? '#ec4899' : item.color}
                      strokeWidth="3"
                    />
                    <text
                      x={cx}
                      y={paddingTop + plotHeight + 17}
                      textAnchor="middle"
                      fontSize={labelFontSize}
                      fontWeight={isHovered ? '600' : '400'}
                      fontFamily="system-ui, sans-serif"
                      fill={
                        isHovered
                          ? isDark
                            ? '#ffffff'
                            : '#0f172a'
                          : isDark
                          ? '#a3a3a3'
                          : '#525252'
                      }
                    >
                      {labelLines.map((line, lIdx) => (
                        <tspan key={lIdx} x={cx} dy={lIdx === 0 ? 0 : 12}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Dynamic-Width Floating Tooltip Pill (never overflows box or SVG bounds) */}
          {hoveredIndex !== null &&
            data[hoveredIndex] &&
            (() => {
              const active = data[hoveredIndex];
              const xCenter = paddingLeft + hoveredIndex * slotWidth + slotWidth / 2;
              const safeVal = Math.max(0, Number(active.value) || 0);
              const yVal = paddingTop + plotHeight - Math.min((safeVal / calculatedMax) * plotHeight, plotHeight);

              const titleText = truncateText(active.label, 28);
              const metricUnitText = truncateText(unit, 16);
              const metricFullText = `${metricUnitText} ${active.value}`;

              const estTitleWidth = titleText.length * 6.5 + 26;
              const estMetricWidth = metricFullText.length * 6.6 + 44;
              const tooltipWidth = Math.max(108, Math.min(240, Math.ceil(Math.max(estTitleWidth, estMetricWidth))));
              const tooltipHeight = 44;

              const tooltipX = Math.max(
                paddingLeft + 4,
                Math.min(xCenter - tooltipWidth / 2, svgWidth - paddingRight - tooltipWidth - 4)
              );
              const tooltipY = Math.max(
                6,
                Math.min(yVal - 16, paddingTop + plotHeight - tooltipHeight - 4)
              );

              return (
                <g className="transition-all duration-150 pointer-events-none">
                  <rect
                    x={tooltipX}
                    y={tooltipY}
                    width={tooltipWidth}
                    height={tooltipHeight}
                    rx="8"
                    ry="8"
                    fill={isDark ? '#1e1e1e' : '#ffffff'}
                    stroke={isDark ? '#333333' : '#e2e8f0'}
                    strokeWidth="1"
                    style={{
                      filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.15))',
                    }}
                  />
                  <text
                    x={tooltipX + tooltipWidth / 2}
                    y={tooltipY + 16}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fontFamily="system-ui, sans-serif"
                    fill={isDark ? '#f5f5f5' : '#0f172a'}
                  >
                    {titleText}
                  </text>
                  <circle
                    cx={tooltipX + 16}
                    cy={tooltipY + 30}
                    r="4"
                    fill={
                      !active.color ||
                      active.color.toLowerCase() === '#f472b6' ||
                      active.color.toLowerCase() === '#ec4899'
                        ? `url(#${barGradientId})`
                        : active.color
                    }
                  />
                  <text
                    x={tooltipX + 25}
                    y={tooltipY + 34}
                    fontSize="11"
                    fontWeight="500"
                    fontFamily="system-ui, sans-serif"
                    fill={isDark ? '#d4d4d4' : '#475569'}
                  >
                    {metricUnitText}{' '}
                    <tspan fontWeight="700" fill={isDark ? '#ffffff' : '#0f172a'}>
                      {active.value}
                    </tspan>
                  </text>
                </g>
              );
            })()}
        </svg>
      </div>
    </div>
  );
};

