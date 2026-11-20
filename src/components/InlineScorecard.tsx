import React from 'react';
import { ForgeXTheme } from '../types';

export interface ScorecardItem {
  label: string;
  status: string;
  tone?: 'good' | 'warning' | 'bad' | 'neutral';
}

export interface ScorecardConfig {
  title: string;
  score: number;
  maxScore: number;
  scoreLabel?: string;
  subtitle?: string;
  columns: [string, string];
  items: ScorecardItem[];
}

interface InlineScorecardProps {
  config: ScorecardConfig;
  theme?: ForgeXTheme;
}

function tryParseJsonRelaxed(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    const cleaned = str.replace(/,\s*([}\]])/g, '$1').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

export function parseScorecardConfig(raw: string, language = ''): ScorecardConfig | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const cleanLang = language.trim().toLowerCase();
  const isExplicitLang =
    cleanLang === 'scorecard' || cleanLang === 'assessment' || cleanLang === 'evaluation';

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace <= firstBrace) return null;

  const parsed = tryParseJsonRelaxed(trimmed.slice(firstBrace, lastBrace + 1));
  if (!parsed || typeof parsed !== 'object') return null;

  const rawItems = Array.isArray(parsed.items)
    ? parsed.items
    : Array.isArray(parsed.criteria)
    ? parsed.criteria
    : Array.isArray(parsed.rows)
    ? parsed.rows
    : null;

  if (!rawItems || rawItems.length === 0) return null;

  // Avoid false-positives on quiz/chart JSON blocks unless explicit scorecard shape
  if (!isExplicitLang && (Array.isArray(parsed.questions) || Array.isArray(parsed.data))) {
    return null;
  }

  const hasScore =
    typeof parsed.score === 'number' ||
    typeof parsed.overallScore === 'number' ||
    typeof parsed.scoreLabel === 'string';

  if (!isExplicitLang && !hasScore) return null;

  const items: ScorecardItem[] = rawItems
    .filter((item: any) => item && typeof item === 'object')
    .map((item: any) => ({
      label: String(item.label ?? item.capability ?? item.criterion ?? item.name ?? item.metric ?? '').trim(),
      status: String(item.status ?? item.assessment ?? item.rating ?? item.grade ?? item.value ?? '').trim(),
      tone: item.tone,
    }))
    .filter((item: ScorecardItem) => item.label && item.status);

  if (items.length === 0) return null;

  const maxScore =
    typeof parsed.maxScore === 'number' && parsed.maxScore > 0
      ? parsed.maxScore
      : typeof parsed.max === 'number' && parsed.max > 0
      ? parsed.max
      : 100;

  const rawScore =
    typeof parsed.score === 'number'
      ? parsed.score
      : typeof parsed.overallScore === 'number'
      ? parsed.overallScore
      : 0;

  const score = Math.max(0, Math.min(maxScore, rawScore));

  const cols: [string, string] =
    Array.isArray(parsed.columns) && parsed.columns.length >= 2
      ? [String(parsed.columns[0]), String(parsed.columns[1])]
      : [
          String(parsed.leftHeader || 'Capability'),
          String(parsed.rightHeader || 'Assessment'),
        ];

  return {
    title: String(parsed.title || 'Performance Evaluation').trim(),
    score,
    maxScore,
    scoreLabel: parsed.scoreLabel ? String(parsed.scoreLabel).trim() : `${score}/${maxScore}`,
    subtitle: parsed.subtitle || parsed.note || parsed.caption ? String(parsed.subtitle || parsed.note || parsed.caption).trim() : undefined,
    columns: cols,
    items,
  };
}

function resolveTone(status: string, explicitTone?: ScorecardItem['tone']): 'good' | 'warning' | 'bad' | 'neutral' {
  if (explicitTone) return explicitTone;
  const s = status.trim().toLowerCase();

  if (
    /^(good|great|strong|excellent|outstanding|pass|passed|verified|supported|accurate|complete|completed|high|yes|optimal|solid|healthy)$/.test(
      s
    )
  ) {
    return 'good';
  }
  if (
    /^(weak|needs work|needs improvement|moderate|fair|partial|partially supported|medium|average|mixed|limited|in progress|warning|caution|ok|okay)$/.test(
      s
    )
  ) {
    return 'warning';
  }
  if (
    /^(missing|poor|fail|failed|unsupported|invalid|critical|none|absent|no|bad|low|unverified|incorrect|error)$/.test(
      s
    )
  ) {
    return 'bad';
  }
  return 'neutral';
}

export const InlineScorecard: React.FC<InlineScorecardProps> = ({ config, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const pct = Math.max(0, Math.min(100, Math.round((config.score / Math.max(1, config.maxScore)) * 100)));

  const scoreToneClass =
    pct >= 50
      ? isDark
        ? 'bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent'
        : 'bg-gradient-to-r from-pink-500 via-purple-600 to-blue-600 bg-clip-text text-transparent'
      : pct >= 35
      ? isDark
        ? 'text-amber-400'
        : 'text-amber-600'
      : isDark
      ? 'text-rose-400'
      : 'text-rose-600';

  const barGradientStyle = 'linear-gradient(90deg, #ec4899 0%, #a855f7 50%, #3b82f6 100%)';

  return (
    <div
      className={`my-3.5 w-full max-w-full min-w-0 overflow-hidden rounded-2xl border p-4 sm:p-5 transition-colors ${
        isDark
          ? 'bg-[#161619] border-neutral-800 text-neutral-100'
          : 'bg-white border-neutral-200/90 text-neutral-900'
      }`}
    >
      {/* Header: Title + Score */}
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2.5">
        <h4 className="text-[14px] sm:text-[15px] font-semibold tracking-tight font-display min-w-0 flex-1 break-words">
          {config.title}
        </h4>
        <span className={`text-lg sm:text-xl font-bold tracking-tight tabular-nums shrink-0 ${scoreToneClass}`}>
          {config.scoreLabel || `${config.score}/${config.maxScore}`}
        </span>
      </div>

      {/* Progress Bar (Pink-to-Blue Gradient) */}
      <div
        className={`w-full h-2.5 rounded-full overflow-hidden mb-2.5 ${
          isDark ? 'bg-neutral-800' : 'bg-neutral-100'
        }`}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundImage: barGradientStyle,
          }}
        />
      </div>

      {/* Quiet Subtitle / Disclaimer */}
      {config.subtitle && (
        <p
          className={`text-[11px] sm:text-xs leading-relaxed mb-4 break-words ${
            isDark ? 'text-neutral-400' : 'text-neutral-500'
          }`}
        >
          {config.subtitle}
        </p>
      )}

      {/* Clean Rubric / Capability Rows */}
      <div className="w-full min-w-0">
        <div
          className={`flex items-center justify-between gap-4 py-2 border-b text-xs font-semibold ${
            isDark ? 'border-neutral-800 text-neutral-300' : 'border-neutral-200 text-neutral-800'
          }`}
        >
          <span className="min-w-0 flex-1 truncate">{config.columns[0]}</span>
          <span className="shrink-0 text-right">{config.columns[1]}</span>
        </div>

        <div className={`divide-y ${isDark ? 'divide-neutral-800/70' : 'divide-neutral-100'}`}>
          {config.items.map((item, idx) => {
            const tone = resolveTone(item.status, item.tone);
            const pillClass =
              tone === 'good'
                ? isDark
                  ? 'bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 text-pink-200 border border-pink-400/25'
                  : 'bg-gradient-to-r from-pink-500/12 via-purple-500/12 to-blue-500/12 text-purple-700 border border-pink-400/25'
                : tone === 'warning'
                ? isDark
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-orange-100/85 text-orange-800'
                : tone === 'bad'
                ? isDark
                  ? 'bg-rose-500/15 text-rose-400'
                  : 'bg-rose-100/85 text-rose-800'
                : isDark
                ? 'bg-neutral-800 text-neutral-300'
                : 'bg-neutral-100 text-neutral-700';

            return (
              <div
                key={`${item.label}-${idx}`}
                className="flex items-center justify-between gap-3 py-2.5 text-[13px] sm:text-sm"
              >
                <span
                  className={`min-w-0 flex-1 break-words leading-snug ${
                    isDark ? 'text-neutral-200' : 'text-neutral-800'
                  }`}
                >
                  {item.label}
                </span>
                <span
                  className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] sm:text-xs font-medium shrink-0 whitespace-nowrap max-w-[160px] truncate ${pillClass}`}
                  title={item.status}
                >
                  {item.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
