import React, { useState, useId } from 'react';
import { BarChart3, Download, Copy, Check, TrendingUp, Maximize2 } from 'lucide-react';
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

export const InteractiveChart: React.FC<InteractiveChartProps> = ({ config, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(1); // Default to Geometry like in screenshot or null
  const [copied, setCopied] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line'>(config.type === 'line' ? 'line' : 'bar');
  const chartId = useId();

  const data = config.data || [];
  const rawMax = Math.max(...data.map((d) => d.value), 10);
  const calculatedMax = config.max || Math.ceil(rawMax / 30) * 30 || 120;
  const unit = config.unit || 'Score';

  // Y-axis tick divisions (e.g. 0, 30, 60, 90, 120)
  const steps = 4;
  const tickValues = Array.from({ length: steps + 1 }, (_, i) => Math.round((calculatedMax / steps) * (steps - i)));

  const handleCopyData = () => {
    const text = `${config.title}\n${config.subtitle || ''}\n\n` +
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
    link.download = `${config.title.toLowerCase().replace(/\s+/g, '-')}-chart.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Dimensions
  const svgWidth = 600;
  const svgHeight = 280;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 45;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const barCount = data.length || 1;
  const slotWidth = plotWidth / barCount;
  const barWidth = Math.min(slotWidth * 0.62, 54);

  return (
    <div
      className={`my-3 sm:my-4 rounded-xl sm:rounded-2xl border transition-all shadow-sm ${
        isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white border-neutral-200'
      } p-3 sm:p-5`}
    >
      {/* Header with Title, Subtitle, and Toolbar - strict no-overflow wrapping */}
      <div className="flex items-start justify-between gap-2.5 mb-3 sm:mb-4">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className={`font-bold text-xs sm:text-base tracking-tight font-display break-words ${
            isDark ? 'text-neutral-100' : 'text-neutral-900'
          }`}>
            {config.title}
          </h3>
          {config.subtitle && (
            <p className={`text-[10px] sm:text-xs mt-0.5 break-words leading-normal ${
              isDark ? 'text-neutral-400' : 'text-neutral-500'
            }`}>
              {config.subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <button
            type="button"
            onClick={() => setChartType(prev => prev === 'bar' ? 'line' : 'bar')}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
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
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
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
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
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
      <div className="relative w-full overflow-x-auto -mx-1 px-1 touch-pan-x custom-scrollbar">
        <svg
          id={`chart-svg-${chartId}`}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[300px] max-h-[320px] select-none"
        >
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
              const barX = xSlotStart + (slotWidth - barWidth) / 2;
              const barHeight = Math.max((item.value / calculatedMax) * plotHeight, 4);
              const barY = paddingTop + plotHeight - barHeight;
              const isHovered = hoveredIndex === idx;

              const defaultBarColor = '#f472b6';
              const barFill = item.color || defaultBarColor;

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

                  {/* Rounded bar with soft pink aesthetic from screenshot */}
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    rx="10"
                    ry="10"
                    fill={barFill}
                    opacity={isHovered ? 1 : 0.88}
                    className="transition-all duration-200"
                    style={{
                      filter: isHovered
                        ? `drop-shadow(0 4px 12px ${barFill}66)`
                        : 'none',
                    }}
                  />

                  {/* Category Label below X axis with multi-word wrapping for mobile */}
                  <text
                    x={xSlotStart + slotWidth / 2}
                    y={paddingTop + plotHeight + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight={isHovered ? '600' : '400'}
                    fontFamily="system-ui, sans-serif"
                    fill={
                      isHovered
                        ? (isDark ? '#ffffff' : '#0f172a')
                        : (isDark ? '#a3a3a3' : '#525252')
                    }
                  >
                    {item.label.includes(' ') ? (
                      <>
                        <tspan x={xSlotStart + slotWidth / 2} dy="0">{item.label.split(' ')[0]}</tspan>
                        <tspan x={xSlotStart + slotWidth / 2} dy="11">{item.label.split(' ').slice(1).join(' ')}</tspan>
                      </>
                    ) : (
                      item.label
                    )}
                  </text>
                </g>
              );
            })}

          {/* Line Chart Mode */}
          {chartType === 'line' && (
            <g>
              {/* Line path */}
              <path
                d={data.reduce((acc, item, idx) => {
                  const x = paddingLeft + idx * slotWidth + slotWidth / 2;
                  const y = paddingTop + plotHeight - (item.value / calculatedMax) * plotHeight;
                  return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                }, '')}
                fill="none"
                stroke="#f472b6"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {data.map((item, idx) => {
                const cx = paddingLeft + idx * slotWidth + slotWidth / 2;
                const cy = paddingTop + plotHeight - (item.value / calculatedMax) * plotHeight;
                const isHovered = hoveredIndex === idx;

                return (
                  <g
                    key={`point-${idx}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 7 : 5}
                      fill={isDark ? '#171717' : '#ffffff'}
                      stroke="#f472b6"
                      strokeWidth="3"
                    />
                    <text
                      x={cx}
                      y={paddingTop + plotHeight + 20}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight={isHovered ? '600' : '400'}
                      fontFamily="system-ui, sans-serif"
                      fill={isDark ? '#a3a3a3' : '#525252'}
                    >
                      {item.label}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Floating Tooltip Pill from screenshot (e.g. Geometry | Score: 84) */}
          {hoveredIndex !== null && data[hoveredIndex] && (
            (() => {
              const active = data[hoveredIndex];
              const xCenter = paddingLeft + hoveredIndex * slotWidth + slotWidth / 2;
              const yVal = paddingTop + plotHeight - (active.value / calculatedMax) * plotHeight;
              const tooltipWidth = 92;
              const tooltipHeight = 44;
              const tooltipX = Math.max(
                paddingLeft + 5,
                Math.min(xCenter - tooltipWidth / 2, svgWidth - paddingRight - tooltipWidth - 5)
              );
              // Position tooltip cleanly centered over the bar or slightly above it
              const tooltipY = Math.max(paddingTop + 10, yVal - 15);

              return (
                <g className="transition-all duration-150 pointer-events-none">
                  {/* Tooltip Background Card */}
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
                  {/* Title: Category name */}
                  <text
                    x={tooltipX + tooltipWidth / 2}
                    y={tooltipY + 16}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fontFamily="system-ui, sans-serif"
                    fill={isDark ? '#f5f5f5' : '#0f172a'}
                  >
                    {active.label}
                  </text>
                  {/* Color dot indicator */}
                  <circle
                    cx={tooltipX + 18}
                    cy={tooltipY + 30}
                    r="4"
                    fill={active.color || '#f472b6'}
                  />
                  {/* Value: Metric + number */}
                  <text
                    x={tooltipX + 27}
                    y={tooltipY + 34}
                    fontSize="11"
                    fontWeight="500"
                    fontFamily="system-ui, sans-serif"
                    fill={isDark ? '#d4d4d4' : '#475569'}
                  >
                    {unit} <tspan fontWeight="700" fill={isDark ? '#ffffff' : '#0f172a'}>{active.value}</tspan>
                  </text>
                </g>
              );
            })()
          )}
        </svg>
      </div>
    </div>
  );
};
