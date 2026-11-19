import React, { useEffect, useState } from 'react';
import { ArrowRight, Loader2, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import { ForgeXTheme, ScheduledTask } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { voiceController } from '../services/voiceService';
import { ScheduledTaskIcon } from './ScheduledTaskIcon';

export interface StartupBriefingItem {
  task: ScheduledTask;
  output: string;
  error?: string;
}

interface StartupBriefingViewProps {
  theme: ForgeXTheme;
  status: 'loading' | 'ready';
  items: StartupBriefingItem[];
  activeTaskTitle?: string;
  onStartApp: () => void;
  onOpenInChat: (title: string, output: string, chatSessionId?: string) => void;
}

function buildSpokenSummary(items: StartupBriefingItem[]): string {
  const valid = items.filter((item) => item.output && !item.error);
  if (valid.length === 0) return '';
  const combined = valid
    .map((item) => {
      const plain = item.output
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[#*_`>\[\]]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      return `Here is your ${item.task.title}. ${plain.slice(0, 650)}`;
    })
    .join(' ');
  return combined.slice(0, 1200);
}

export const StartupBriefingView: React.FC<StartupBriefingViewProps> = ({
  theme,
  status,
  items,
  activeTaskTitle,
  onStartApp,
  onOpenInChat,
}) => {
  const isDark = theme === 'dark';
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechBlocked, setSpeechBlocked] = useState(false);

  const spokenText = buildSpokenSummary(items);

  useEffect(() => {
    if (status !== 'ready' || !spokenText) return;
    let cancelled = false;
    setIsSpeaking(true);
    setSpeechBlocked(false);

    void voiceController.playSynthesizedResponse(
      spokenText,
      undefined,
      undefined,
      () => {
        if (!cancelled) setIsSpeaking(false);
      },
      () => {
        if (!cancelled) {
          setIsSpeaking(false);
          setSpeechBlocked(true);
        }
      }
    );

    return () => {
      cancelled = true;
      voiceController.interruptSpeaking(false);
    };
  }, [status, spokenText]);

  const handleToggleSpeech = () => {
    voiceController.unlockAudio();
    if (isSpeaking) {
      voiceController.interruptSpeaking(false);
      setIsSpeaking(false);
      return;
    }
    if (!spokenText) return;
    setSpeechBlocked(false);
    setIsSpeaking(true);
    void voiceController.playSynthesizedResponse(
      spokenText,
      undefined,
      undefined,
      () => setIsSpeaking(false),
      () => {
        setIsSpeaking(false);
        setSpeechBlocked(true);
      }
    );
  };

  const handleContinue = () => {
    voiceController.interruptSpeaking(false);
    onStartApp();
  };

  return (
    <div
      id="startup-daily-briefing-view"
      onClick={() => voiceController.unlockAudio()}
      className={`fixed inset-0 z-50 overflow-y-auto flex flex-col ${
        isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-[#fafafa] text-neutral-900'
      }`}
    >
      {/* Top Bar */}
      <div className="w-full max-w-3xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
            }`}
          >
            <ScheduledTaskIcon task={items[0]?.task} titleFallback={activeTaskTitle} className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display font-semibold text-base leading-tight">
              Daily Briefing
            </div>
            <div className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'ready' && spokenText && (
            <button
              id="btn-briefing-toggle-voice"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleSpeech();
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                isSpeaking
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
                  : isDark
                    ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-200'
                    : 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-800'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isSpeaking ? 'Stop audio' : speechBlocked ? 'Play audio' : 'Read aloud'}</span>
            </button>
          )}

          <button
            id="btn-briefing-continue"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleContinue();
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              isDark
                ? 'bg-white text-black hover:bg-neutral-200'
                : 'bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            <span>{status === 'loading' ? 'Skip' : 'Start ForgeX'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-3xl mx-auto px-6 py-6 sm:py-10">
        {status === 'loading' ? (
          <div className="py-16 flex flex-col items-center text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <div className="space-y-1.5">
              <h2 className="font-display text-xl sm:text-2xl font-semibold">
                Fetching your {activeTaskTitle || 'daily news'}...
              </h2>
              <p className={`text-sm max-w-md ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Preparing today&apos;s live scheduled update before starting your workspace.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-10 pb-12">
            {items.map((item) => (
              <section key={item.task.id} className="space-y-4">
                <div className={`pb-3 border-b flex items-center justify-between gap-3 ${
                  isDark ? 'border-neutral-800' : 'border-neutral-200'
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ScheduledTaskIcon task={item.task} className="w-5 h-5 shrink-0" />
                    <h2 className="font-display text-xl sm:text-2xl font-semibold truncate">
                      {item.task.title}
                    </h2>
                  </div>

                  {item.output && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        voiceController.interruptSpeaking(false);
                        onOpenInChat(item.task.title, item.output, item.task.chatSessionId);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                        isDark
                          ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-200'
                          : 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Open Daily Chat</span>
                    </button>
                  )}
                </div>

                {item.error ? (
                  <p className="text-sm text-red-500">{item.error}</p>
                ) : (
                  <MarkdownRenderer content={item.output} theme={theme} />
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
