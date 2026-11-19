import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Filter,
  Mic,
  Plus,
} from 'lucide-react';
import { ForgeXTheme, ScheduledFrequency, ScheduledTask } from '../types';
import {
  formatCleanReminderText,
  formatFrequencyLabel,
  isReminderTask,
  parseSchedulePrompt,
  RECOMMENDED_SCHEDULE_TEMPLATES,
  RecommendedScheduleTemplate,
  scheduledTaskService,
} from '../services/scheduledTaskService';
import { chatService } from '../services/chatService';
import { deviceNotificationService } from '../services/deviceNotificationService';
import { ScheduledTaskIcon } from './ScheduledTaskIcon';

interface ScheduledWorkspaceProps {
  theme: ForgeXTheme;
  tasks: ScheduledTask[];
  onTasksChange: (tasks: ScheduledTask[]) => void;
  onOpenTaskInChat: (task: ScheduledTask) => void;
  onRunTaskInChat: (task: ScheduledTask) => void;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ScheduledWorkspace: React.FC<ScheduledWorkspaceProps> = ({
  theme,
  tasks,
  onTasksChange,
  onOpenTaskInChat,
  onRunTaskInChat,
}) => {
  const isDark = theme === 'dark';

  const [promptInput, setPromptInput] = useState('');
  const [frequency, setFrequency] = useState<ScheduledFrequency>('daily');
  const [timeOfDay, setTimeOfDay] = useState('09:00');
  const [dayOfWeek, setDayOfWeek] = useState<number>(new Date().getDay());
  const [hasManualTiming, setHasManualTiming] = useState(false);
  const [isSchedulePopoverOpen, setIsSchedulePopoverOpen] = useState(false);

  const [filterMode, setFilterMode] = useState<'active' | 'all' | 'paused'>('active');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isRecommendedOpen, setIsRecommendedOpen] = useState(true);
  const [isListeningMic, setIsListeningMic] = useState(false);

  const schedulePopoverRef = useRef<HTMLDivElement | null>(null);
  const filterPopoverRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isSchedulePopoverOpen && !isFilterOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        isSchedulePopoverOpen &&
        schedulePopoverRef.current &&
        !schedulePopoverRef.current.contains(e.target as Node)
      ) {
        setIsSchedulePopoverOpen(false);
      }
      if (
        isFilterOpen &&
        filterPopoverRef.current &&
        !filterPopoverRef.current.contains(e.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isSchedulePopoverOpen, isFilterOpen]);

  const filteredTasks = tasks.filter((t) => {
    if (filterMode === 'all') return true;
    return t.status === filterMode;
  });

  const handleToggleMic = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (isListeningMic) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListeningMic(false);
      return;
    }
    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setPromptInput(transcript.trim());
      };
      rec.onerror = () => setIsListeningMic(false);
      rec.onend = () => setIsListeningMic(false);
      recognitionRef.current = rec;
      rec.start();
      setIsListeningMic(true);
    } catch {
      setIsListeningMic(false);
    }
  };

  const handleCreateTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = promptInput.trim();
    if (!trimmed) return;

    if (deviceNotificationService.getPermission() === 'default') {
      void deviceNotificationService.requestPermission();
    }

    const parsed = parseSchedulePrompt(trimmed, frequency, timeOfDay, dayOfWeek);
    const created = scheduledTaskService.createTask({
      title: parsed.title,
      prompt: parsed.prompt,
      frequency: hasManualTiming ? frequency : parsed.frequency,
      timeOfDay: hasManualTiming ? timeOfDay : parsed.timeOfDay,
      dayOfWeek: hasManualTiming ? dayOfWeek : parsed.dayOfWeek,
      nextRunAt: hasManualTiming ? undefined : parsed.nextRunAtOverride,
    });

    const needsLiveFetch = /\b(?:news|weather|headlines|briefing|roundup|stock|price|score)\b/i.test(
      `${created.title} ${created.prompt}`
    );

    if (isReminderTask(created) && !needsLiveFetch) {
      const { message } = formatCleanReminderText(created);
      const nextTime = new Date(created.nextRunAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      if (created.chatSessionId) {
        chatService.appendMessagesToSession(
          created.chatSessionId,
          [
            {
              id: `usr_sched_${Date.now()}`,
              role: 'user',
              content: trimmed,
              timestamp: Date.now(),
              toolBadge: 'schedule',
            },
            {
              id: `asst_sched_confirm_${Date.now() + 1}`,
              role: 'assistant',
              content: `Scheduled reminder for **${formatFrequencyLabel(created)}** (next at **${nextTime}**): **${message}**.\n\nI'll announce it aloud and show it below while you're chatting when it's time.`,
              timestamp: Date.now() + 1,
              modelUsed: 'ForgeX Reminder',
            },
          ],
          'forge-2-ultra',
          created.title
        );
      }
      onTasksChange(scheduledTaskService.getTasks());
      setPromptInput('');
      setHasManualTiming(false);
      setIsSchedulePopoverOpen(false);
      onOpenTaskInChat(created);
      return;
    }

    onTasksChange(scheduledTaskService.getTasks());
    setPromptInput('');
    setHasManualTiming(false);
    setIsSchedulePopoverOpen(false);
    onRunTaskInChat(created);
  };

  const handleAddRecommended = (tpl: RecommendedScheduleTemplate) => {
    if (deviceNotificationService.getPermission() === 'default') {
      void deviceNotificationService.requestPermission();
    }

    const existing = scheduledTaskService
      .getTasks()
      .find((t) => t.title.toLowerCase() === tpl.title.toLowerCase());
    if (existing) {
      onOpenTaskInChat(existing);
      return;
    }

    const created = scheduledTaskService.createTask({
      title: tpl.title,
      prompt: tpl.prompt,
      frequency: tpl.frequency,
      timeOfDay: tpl.timeOfDay,
      dayOfWeek: tpl.dayOfWeek,
    });

    onTasksChange(scheduledTaskService.getTasks());
    onRunTaskInChat(created);
  };

  const filterLabel =
    filterMode === 'active' ? 'Active' : filterMode === 'paused' ? 'Paused' : 'All';

  return (
    <div
      id="scheduled-workspace"
      className={`flex-1 overflow-y-auto px-4 sm:px-8 py-8 sm:py-12 ${
        isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-[#fafafa] text-neutral-900'
      }`}
    >
      <div className="max-w-3xl mx-auto">
        {/* Top Title + Active Filter Pill */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display font-semibold text-2xl sm:text-[26px] tracking-tight text-neutral-900 dark:text-white">
              Scheduled
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Ask ForgeX to schedule tasks, set reminders, or monitor for updates
            </p>
          </div>

          <div ref={filterPopoverRef} className="relative shrink-0">
            <button
              type="button"
              id="btn-scheduled-filter"
              onClick={() => setIsFilterOpen((v) => !v)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
                isDark
                  ? 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200'
                  : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-800 shadow-2xs'
              }`}
            >
              <Filter className="w-3.5 h-3.5 opacity-75" />
              <span>{filterLabel}</span>
            </button>

            {isFilterOpen && (
              <div
                className={`absolute right-0 mt-2 w-72 rounded-2xl border p-2 shadow-xl z-40 animate-in fade-in zoom-in-95 duration-100 ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-800 text-neutral-100 shadow-black/70'
                    : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300/60'
                }`}
              >
                <div className={`flex items-center gap-1 p-1 rounded-xl mb-2 ${isDark ? 'bg-neutral-950' : 'bg-neutral-100'}`}>
                  {(['active', 'all', 'paused'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFilterMode(mode)}
                      className={`flex-1 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                        filterMode === mode
                          ? isDark
                            ? 'bg-neutral-800 text-white'
                            : 'bg-white text-neutral-950 shadow-2xs'
                          : isDark
                            ? 'text-neutral-400 hover:text-white'
                            : 'text-neutral-600 hover:text-neutral-950'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {filteredTasks.length === 0 ? (
                  <p className={`px-2 py-3 text-xs text-center ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    No {filterMode === 'all' ? '' : `${filterMode} `}schedules yet
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {filteredTasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => {
                          setIsFilterOpen(false);
                          onOpenTaskInChat(task);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                        }`}
                      >
                        <ScheduledTaskIcon task={task} className="w-4 h-4 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{task.title}</div>
                          <div className={`text-[11px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                            {formatFrequencyLabel(task)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Capsule Composer Input ("Schedule a task") */}
        <form onSubmit={handleCreateTask} className="mb-8 relative">
          <div
            className={`rounded-full px-3 py-2 border flex items-center gap-2 transition-all shadow-sm ${
              isDark
                ? 'bg-neutral-900 border-neutral-800 focus-within:border-neutral-700 shadow-black/40'
                : 'bg-white border-neutral-200 focus-within:border-neutral-300 shadow-neutral-200/50'
            }`}
          >
            {/* Left '+' Schedule Timing Popover Button */}
            <div ref={schedulePopoverRef} className="relative shrink-0">
              <button
                type="button"
                id="btn-schedule-timing-options"
                onClick={() => setIsSchedulePopoverOpen((v) => !v)}
                title="Set cadence and time"
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  hasManualTiming
                    ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                    : isDark
                      ? 'hover:bg-neutral-800 text-neutral-300'
                      : 'hover:bg-neutral-100 text-neutral-600'
                }`}
              >
                <Plus className="w-4 h-4" />
              </button>

              {isSchedulePopoverOpen && (
                <div
                  className={`absolute left-0 top-full mt-2.5 w-72 rounded-2xl border p-3.5 shadow-xl z-40 space-y-3 animate-in fade-in zoom-in-95 duration-100 ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-100 shadow-black/70'
                      : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300/60'
                  }`}
                >
                  <div className="text-xs font-semibold">Schedule timing</div>
                  <div className="grid grid-cols-4 gap-1">
                    {(['daily', 'weekly', 'hourly', 'once'] as ScheduledFrequency[]).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => {
                          setFrequency(f);
                          setHasManualTiming(true);
                        }}
                        className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                          frequency === f
                            ? isDark
                              ? 'bg-white text-black'
                              : 'bg-neutral-900 text-white'
                            : isDark
                              ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {frequency === 'weekly' && (
                    <select
                      value={dayOfWeek}
                      onChange={(e) => {
                        setDayOfWeek(Number(e.target.value));
                        setHasManualTiming(true);
                      }}
                      className={`w-full px-3 py-1.5 rounded-xl text-xs border outline-none ${
                        isDark
                          ? 'bg-neutral-950 border-neutral-800 text-white'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                      }`}
                    >
                      {WEEKDAYS.map((name, idx) => (
                        <option key={name} value={idx}>
                          {name}
                        </option>
                      ))}
                    </select>
                  )}

                  {frequency !== 'hourly' && (
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                        Time
                      </span>
                      <input
                        type="time"
                        value={timeOfDay}
                        onChange={(e) => {
                          setTimeOfDay(e.target.value);
                          setHasManualTiming(true);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs border outline-none ${
                          isDark
                            ? 'bg-neutral-950 border-neutral-800 text-white'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                        }`}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <input
              id="input-schedule-task"
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Schedule a task"
              className={`flex-1 bg-transparent text-sm sm:text-base outline-none px-1 ${
                isDark ? 'text-white placeholder:text-neutral-500' : 'text-neutral-900 placeholder:text-neutral-400'
              }`}
            />

            <button
              type="button"
              onClick={handleToggleMic}
              title={isListeningMic ? 'Stop listening' : 'Dictate scheduled task'}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                isListeningMic
                  ? 'bg-red-500/15 text-red-500 animate-pulse'
                  : isDark
                    ? 'hover:bg-neutral-800 text-neutral-300'
                    : 'hover:bg-neutral-100 text-neutral-600'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>

            <button
              type="submit"
              id="btn-submit-schedule-task"
              disabled={!promptInput.trim()}
              title="Create & open in chat"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                promptInput.trim()
                  ? isDark
                    ? 'bg-white text-black hover:bg-neutral-200'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  : isDark
                    ? 'bg-neutral-800 text-neutral-500'
                    : 'bg-neutral-200 text-neutral-400'
              }`}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Recommended Templates Section (Exact Match to Screenshot — no added tasks box here!) */}
        <div>
          <button
            type="button"
            onClick={() => setIsRecommendedOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 text-sm font-medium mb-3 cursor-pointer transition-colors ${
              isDark ? 'text-neutral-300 hover:text-white' : 'text-neutral-700 hover:text-neutral-950'
            }`}
          >
            <span>Recommended</span>
            {isRecommendedOpen ? (
              <ChevronDown className="w-4 h-4 opacity-70" />
            ) : (
              <ChevronRight className="w-4 h-4 opacity-70" />
            )}
          </button>

          {isRecommendedOpen && (
            <div className={`divide-y ${isDark ? 'divide-neutral-800/80' : 'divide-neutral-200/80'}`}>
              {RECOMMENDED_SCHEDULE_TEMPLATES.map((tpl) => {
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleAddRecommended(tpl)}
                    className={`w-full py-4 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer group ${
                      isDark ? 'hover:bg-neutral-900/40' : 'hover:bg-neutral-100/60'
                    } px-2 -mx-2 rounded-xl`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        <ScheduledTaskIcon titleFallback={tpl.title} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {tpl.title}
                        </div>
                        <div className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                          {tpl.subtitle}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isDark
                          ? 'text-neutral-400 group-hover:text-white group-hover:bg-neutral-800'
                          : 'text-neutral-500 group-hover:text-neutral-950 group-hover:bg-neutral-200/70'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
