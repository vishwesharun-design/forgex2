import React, { useState, useEffect, useRef } from 'react';
import {
  CircleDashed,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Telescope,
  Copy,
  Check,
  Globe,
  RotateCcw,
} from 'lucide-react';
import { ChatMessage, ForgeXTheme } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface InlineDeepResearchCardProps {
  message: ChatMessage;
  theme: ForgeXTheme;
  onStart: (messageId: string, steps: string[]) => void;
  onCancel: (messageId: string) => void;
  onUpdateSteps: (messageId: string, steps: string[]) => void;
  onCopy: (content: string, id: string) => void;
  copiedMessageId: string | null;
  renderSourcePills: (sources: any[] | undefined, messageId: string) => React.ReactNode;
  onOpenInCodeStudio?: (code: string, lang: any) => void;
  onOpenInImageStudio?: () => void;
  onViewImageFullscreen?: (url: string, prompt: string) => void;
}

export const InlineDeepResearchCard: React.FC<InlineDeepResearchCardProps> = ({
  message,
  theme,
  onStart,
  onCancel,
  onUpdateSteps,
  onCopy,
  copiedMessageId,
  renderSourcePills,
  onOpenInCodeStudio,
  onOpenInImageStudio,
  onViewImageFullscreen,
}) => {
  const isDark = theme === 'dark';
  const dr = message.deepResearch!;
  const [isPlanExpanded, setIsPlanExpanded] = useState(true);
  const [isStepsExpanded, setIsStepsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftSteps, setDraftSteps] = useState<string[]>(dr.steps);
  const [countdown, setCountdown] = useState<number>(60);
  const [runningStepIdx, setRunningStepIdx] = useState<number>(0);
  const [runningElapsed, setRunningElapsed] = useState<number>(0);
  const autoStartedRef = useRef<boolean>(false);

  // Sync draft steps when async /api/deep-research/plan replaces initial placeholder steps
  useEffect(() => {
    if (!isEditing) {
      setDraftSteps(dr.steps);
    }
  }, [dr.steps, isEditing]);

  // 60-second auto-start countdown during 'planning' phase (paused while user edits steps)
  useEffect(() => {
    if (dr.status !== 'planning' || isEditing) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!autoStartedRef.current) {
            autoStartedRef.current = true;
            setTimeout(() => onStart(message.id, draftSteps), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [dr.status, isEditing, message.id, draftSteps, onStart]);

  // Animated progress stepper during 'running' phase
  useEffect(() => {
    if (dr.status !== 'running') {
      setRunningStepIdx(0);
      setRunningElapsed(0);
      return;
    }
    const stepTimer = setInterval(() => {
      setRunningStepIdx((prev) => Math.min(dr.steps.length - 1, prev + 1));
    }, 2400);
    const secTimer = setInterval(() => {
      setRunningElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(stepTimer);
      clearInterval(secTimer);
    };
  }, [dr.status, dr.steps.length]);

  const handleSaveEdit = () => {
    const cleaned = draftSteps.map((s) => s.trim()).filter(Boolean);
    const nextSteps = cleaned.length > 0 ? cleaned : dr.steps;
    setDraftSteps(nextSteps);
    onUpdateSteps(message.id, nextSteps);
    setIsEditing(false);
  };

  if (dr.status === 'cancelled') {
    return (
      <div
        className={`w-full max-w-[96%] sm:max-w-[88%] md:max-w-[82%] lg:max-w-[78%] rounded-2xl border px-4 py-3 text-xs flex items-center justify-between gap-3 ${
          isDark
            ? 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
            : 'bg-neutral-50 border-neutral-200 text-neutral-600'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Telescope className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span className="truncate">
            Research cancelled for &ldquo;{dr.query}&rdquo;
          </span>
        </div>
        <button
          type="button"
          onClick={() => onStart(message.id, draftSteps)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
            isDark
              ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
              : 'border-neutral-300 hover:bg-neutral-200/70 text-neutral-800'
          }`}
        >
          <RotateCcw className="w-3 h-3" />
          <span>Run anyway</span>
        </button>
      </div>
    );
  }

  if (dr.status === 'planning') {
    return (
      <div className="w-full max-w-[96%] sm:max-w-[88%] md:max-w-[82%] lg:max-w-[78%] flex flex-col gap-2 animate-in fade-in duration-200">
        {/* Worked for a few seconds > */}
        <button
          type="button"
          onClick={() => setIsPlanExpanded((p) => !p)}
          className={`inline-flex items-center gap-1 text-xs font-medium w-fit transition-colors cursor-pointer ${
            isDark
              ? 'text-neutral-400 hover:text-neutral-200'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <span>
            {dr.planDurationSec
              ? `Worked for ${dr.planDurationSec}s`
              : 'Worked for a few seconds'}
          </span>
          {isPlanExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {isPlanExpanded && (
          <div
            className={`rounded-2xl border p-4 sm:p-5 transition-all ${
              isDark
                ? 'bg-neutral-900/90 border-neutral-800 text-neutral-100 shadow-md shadow-black/30'
                : 'bg-white border-neutral-200/90 text-neutral-900 shadow-xs'
            }`}
          >
            <h4 className="text-[15px] font-semibold tracking-tight mb-3.5">
              Research &lsquo;{dr.query}&rsquo;
            </h4>

            <div className="space-y-3 mb-5">
              {draftSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <CircleDashed
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      isDark ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  />
                  {isEditing ? (
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => {
                        const updated = [...draftSteps];
                        updated[idx] = e.target.value;
                        setDraftSteps(updated);
                      }}
                      className={`flex-1 text-[13px] px-2.5 py-1 rounded-lg border outline-none transition-colors ${
                        isDark
                          ? 'bg-neutral-950 border-neutral-700 text-white focus:border-sky-500'
                          : 'bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-sky-500'
                      }`}
                    />
                  ) : (
                    <span
                      className={`text-[13.5px] leading-snug ${
                        isDark ? 'text-neutral-200' : 'text-neutral-800'
                      }`}
                    >
                      {step}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Footer Controls matching ChatGPT Screenshot: Edit on left, Cancel & Start (N) on right */}
            <div className="flex items-center justify-between gap-2 pt-1">
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                    isDark
                      ? 'border-sky-500/60 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
                      : 'border-sky-500/60 bg-sky-50 text-sky-700 hover:bg-sky-100'
                  }`}
                >
                  Save
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                    isDark
                      ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
                      : 'border-neutral-300 hover:bg-neutral-100 text-neutral-800'
                  }`}
                >
                  Edit
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      setDraftSteps(dr.steps);
                      setIsEditing(false);
                    } else {
                      onCancel(message.id);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                    isDark
                      ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
                      : 'border-neutral-300 hover:bg-neutral-100 text-neutral-800'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      handleSaveEdit();
                    }
                    autoStartedRef.current = true;
                    onStart(message.id, draftSteps);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                    isDark
                      ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  <span>Start</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-semibold border ${
                      isDark
                        ? 'border-neutral-300 text-neutral-900'
                        : 'border-white/35 text-white'
                    }`}
                  >
                    {countdown}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (dr.status === 'running') {
    return (
      <div className="w-full max-w-[96%] sm:max-w-[88%] md:max-w-[82%] lg:max-w-[78%] py-2 flex flex-col gap-3 animate-in fade-in duration-200">
        {/* Subtle progress pill matching Screenshot 3 */}
        <div
          className={`h-2.5 w-32 rounded-full overflow-hidden ${
            isDark ? 'bg-neutral-800' : 'bg-neutral-200/80'
          }`}
        >
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-sky-400 animate-pulse" />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Telescope className="w-4 h-4 text-sky-500 shrink-0 animate-pulse" />
            <span
              className={`text-sm font-medium truncate ${
                isDark ? 'animate-text-shimmer-dark' : 'animate-text-shimmer-light'
              }`}
            >
              Researching &ldquo;{dr.query}&rdquo;
            </span>
            <span className="text-xs text-neutral-400 tabular-nums shrink-0">
              {runningElapsed}s
            </span>
          </div>
          <button
            type="button"
            onClick={() => onCancel(message.id)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer shrink-0 ${
              isDark
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-500'
            }`}
          >
            Stop
          </button>
        </div>

        <div className="space-y-1.5 pl-1">
          {dr.steps.map((step, idx) => {
            const done = idx < runningStepIdx;
            const active = idx === runningStepIdx;
            return (
              <div
                key={idx}
                className={`flex items-start gap-2 text-xs transition-opacity duration-300 ${
                  done
                    ? 'text-neutral-500 dark:text-neutral-400 opacity-85'
                    : active
                    ? 'text-neutral-800 dark:text-neutral-100 font-medium'
                    : 'text-neutral-400 dark:text-neutral-600 opacity-60'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <CircleDashed
                    className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                      active ? 'text-sky-500 animate-spin-slow' : ''
                    }`}
                  />
                )}
                <span>{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // status === 'completed'
  return (
    <div
      className={`relative w-full max-w-[96%] sm:max-w-[88%] md:max-w-[82%] lg:max-w-[78%] rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all text-xs sm:text-sm leading-relaxed ${
        isDark
          ? 'bg-neutral-900/90 border border-neutral-800 text-neutral-100 rounded-tl-sm shadow-md shadow-black/40'
          : 'bg-white border border-neutral-200 text-neutral-900 rounded-tl-sm shadow-sm'
      }`}
    >
      {/* Researched header toggle matching Screenshot 3 */}
      <button
        type="button"
        onClick={() => setIsStepsExpanded((p) => !p)}
        className={`mb-3 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
          isDark
            ? 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
            : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
        }`}
      >
        <Telescope className="w-3.5 h-3.5 text-sky-500 shrink-0" />
        <span>
          Researched the requested topic
          {dr.researchDurationSec ? ` · ${dr.researchDurationSec}s` : ''}
        </span>
        {isStepsExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {isStepsExpanded && dr.steps.length > 0 && (
        <div
          className={`mb-3.5 p-3 rounded-xl border space-y-1.5 text-xs ${
            isDark
              ? 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
              : 'bg-neutral-50 border-neutral-200/80 text-neutral-700'
          }`}
        >
          {dr.steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}

      {/* Full Markdown Deep Research Report */}
      <div className="relative">
        <MarkdownRenderer
          content={message.content}
          theme={theme}
          onOpenInCodeStudio={(code, lang) => onOpenInCodeStudio?.(code, lang)}
          onOpenInImageStudio={() => onOpenInImageStudio?.()}
          onViewImageFullscreen={(url, prompt) => onViewImageFullscreen?.(url, prompt)}
        />
      </div>

      {/* Sources Pills */}
      {message.groundingSources && message.groundingSources.length > 0
        ? renderSourcePills(message.groundingSources, message.id)
        : null}

      {/* Reply Footer Actions */}
      <div
        className={`mt-2.5 pt-2 border-t flex items-center justify-between text-xs ${
          isDark ? 'border-neutral-800/40 text-neutral-400' : 'border-neutral-200 text-neutral-600'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-sky-600 dark:text-sky-400 inline-flex items-center gap-1 font-medium bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
            <Globe className="w-2.5 h-2.5" />
            <span>Deep Research</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => onCopy(message.content, message.id)}
          className={`flex items-center gap-1 transition-colors cursor-pointer ${
            isDark ? 'hover:text-white text-neutral-400' : 'hover:text-neutral-950 text-neutral-600'
          }`}
        >
          {copiedMessageId === message.id ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                Copied
              </span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
