import { ChatSession, ForgeXModelId, ScheduledFrequency, ScheduledTask } from '../types';
import { authService } from './authService';
import { chatService } from './chatService';
import { firestoreStorageService } from './firestoreStorageService';
import { buildPersonalizationInstruction } from './personalizationService';

export function isReminderTask(
  task: Pick<ScheduledTask, 'frequency' | 'title' | 'prompt'>
): boolean {
  const combined = `${task.title} ${task.prompt}`;
  const hasReminderKeyword = /\b(?:remind(?:er|s| me)?|alarm|don'?t\s+forget|alert\s+me)\b/i.test(combined);
  const isBriefingOnly = /\b(?:news|headlines|briefing|roundup|learning\s*spark)\b/i.test(combined);
  if (hasReminderKeyword) return true;
  return task.frequency === 'once' && !isBriefingOnly;
}

export function isDailyBriefingTask(
  task: Pick<ScheduledTask, 'frequency' | 'title' | 'prompt'>
): boolean {
  if (isReminderTask(task) && !/\b(?:news|headlines|briefing|roundup|learning\s*spark)\b/i.test(`${task.title} ${task.prompt}`)) {
    return false;
  }
  return (
    task.frequency === 'daily' ||
    /\b(?:news|daily|morning|briefing|roundup|update|digest|headlines|weather|market|learning\s*spark)\b/i.test(
      `${task.title} ${task.prompt}`
    )
  );
}

export function formatCleanReminderText(
  task: Pick<ScheduledTask, 'title' | 'prompt'>
): { message: string; spokenText: string } {
  let core = (task.prompt || task.title || 'Scheduled reminder')
    .trim()
    .replace(/^(?:please\s+)?(?:remind\s+me\s+(?:to\s+)?|set\s+(?:a\s+)?reminder\s+(?:to\s+|for\s+)?|reminder\s*[:\-]\s*|alert\s+me\s+(?:to\s+)?)/i, '')
    .replace(/\b(?:every\s+(?:day|morning|evening|night|week|hour)|daily|weekly|hourly|once|today|tomorrow|tonight)\b/gi, ' ')
    .replace(/\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, ' ')
    .replace(/\bat\s+\d{1,2}:\d{2}\b/gi, ' ')
    .replace(/\bin\s+\d+\s*(?:minutes?|mins?|hours?|hrs?)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.\-:]+|[\s,.\-:]+$/g, '')
    .replace(/^to\s+/i, '')
    .trim();

  if (!core || core.length < 2) {
    core = task.title || task.prompt || 'Scheduled reminder';
  }
  const capitalized = core.charAt(0).toUpperCase() + core.slice(1);
  return {
    message: capitalized,
    spokenText: `Reminder: ${capitalized}`,
  };
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatTime12(timeOfDay: string = '09:00'): string {
  const [hStr, mStr] = (timeOfDay || '09:00').split(':');
  const h = parseInt(hStr || '9', 10);
  const m = parseInt(mStr || '0', 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatFrequencyLabel(task: Pick<ScheduledTask, 'frequency' | 'timeOfDay' | 'dayOfWeek'>): string {
  const formattedTime = formatTime12(task.timeOfDay);
  if (task.frequency === 'hourly') return 'Every hour';
  if (task.frequency === 'once') return `Once · ${formattedTime}`;
  if (task.frequency === 'weekly') {
    const day = typeof task.dayOfWeek === 'number' ? WEEKDAYS[task.dayOfWeek] : 'Weekly';
    return `Every ${day} · ${formattedTime}`;
  }
  return `Daily · ${formattedTime}`;
}

export interface RecommendedScheduleTemplate {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  frequency: ScheduledFrequency;
  timeOfDay: string;
  dayOfWeek?: number;
}

export const RECOMMENDED_SCHEDULE_TEMPLATES: RecommendedScheduleTemplate[] = [
  {
    id: 'rec-news',
    title: 'News updates',
    subtitle: 'Send me a daily roundup of news on topics I care about in its own chat.',
    prompt:
      'Give me a concise, well-organized daily roundup of today’s verified global, technology, and science news with key highlights and sources.',
    frequency: 'daily',
    timeOfDay: '08:30',
  },
  {
    id: 'rec-weekend-reads',
    title: 'Find weekend reads',
    subtitle: 'Send me a great article or book idea to read every Saturday in its own chat.',
    prompt:
      'Recommend 3 thought-provoking weekend long-form reads or non-fiction book picks across technology, psychology, and design with short takeaways.',
    frequency: 'weekly',
    timeOfDay: '10:00',
    dayOfWeek: 6,
  },
  {
    id: 'rec-dev-digest',
    title: 'Tech & coding digest',
    subtitle: 'Check weekly for notable developer tools, frameworks, and releases.',
    prompt:
      'Summarize the most notable developer tools, software engineering updates, and open-source releases this week.',
    frequency: 'weekly',
    timeOfDay: '09:00',
    dayOfWeek: 1,
  },
  {
    id: 'rec-learning',
    title: 'Daily learning spark',
    subtitle: 'Give me a focused 5-minute concept breakdown every evening.',
    prompt:
      'Teach me one fascinating concept in science, mathematics, or systems engineering in 5 minutes with a clear real-world example.',
    frequency: 'daily',
    timeOfDay: '19:00',
  },
  {
    id: 'rec-weekend-plan',
    title: 'Plan my weekend',
    subtitle: 'Send me creative weekend ideas and itineraries every Thursday.',
    prompt:
      'Suggest a balanced weekend itinerary mixing outdoor activity, creative downtime, good food, and a fun personal mini-project.',
    frequency: 'weekly',
    timeOfDay: '18:00',
    dayOfWeek: 4,
  },
];

export function isDirectScheduleChatIntent(rawText: string): boolean {
  const clean = rawText.trim();
  if (!clean) return false;
  if (/^(?:please\s+)?(?:remind\s+me|set\s+(?:a\s+)?reminder)\b/i.test(clean)) {
    return true;
  }
  if (
    /^(?:please\s+)?schedule\b/i.test(clean) &&
    /\b(?:every|daily|weekly|hourly|at\s+\d|in\s+\d+|morning|evening|night)\b/i.test(clean)
  ) {
    return true;
  }
  return false;
}

function getScheduledStorageKey(): string {
  const partition = authService.getCurrentUserPartitionKey();
  return `forgex_scheduled_tasks_${partition}`;
}

export function computeNextRunAt(
  frequency: ScheduledFrequency,
  timeOfDay: string = '09:00',
  dayOfWeek?: number,
  fromTimestamp: number = Date.now()
): number {
  const now = new Date(fromTimestamp);
  const [rawH, rawM] = (timeOfDay || '09:00').split(':').map((n) => parseInt(n, 10));
  const hours = Number.isFinite(rawH) && rawH >= 0 && rawH <= 23 ? rawH : 9;
  const minutes = Number.isFinite(rawM) && rawM >= 0 && rawM <= 59 ? rawM : 0;

  if (frequency === 'hourly') {
    const next = new Date(fromTimestamp);
    next.setMinutes(minutes, 0, 0);
    if (next.getTime() <= fromTimestamp) {
      next.setHours(next.getHours() + 1);
    }
    return next.getTime();
  }

  if (frequency === 'once') {
    const next = new Date(fromTimestamp);
    next.setHours(hours, minutes, 0, 0);
    if (next.getTime() <= fromTimestamp) {
      next.setDate(next.getDate() + 1);
    }
    return next.getTime();
  }

  if (frequency === 'weekly') {
    const targetDay = typeof dayOfWeek === 'number' && dayOfWeek >= 0 && dayOfWeek <= 6 ? dayOfWeek : now.getDay();
    const next = new Date(fromTimestamp);
    next.setHours(hours, minutes, 0, 0);
    const diff = (targetDay - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + diff);
    if (next.getTime() <= fromTimestamp) {
      next.setDate(next.getDate() + 7);
    }
    return next.getTime();
  }

  // daily
  const next = new Date(fromTimestamp);
  next.setHours(hours, minutes, 0, 0);
  if (next.getTime() <= fromTimestamp) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

export function parseSchedulePrompt(
  rawText: string,
  defaultFrequency: ScheduledFrequency = 'daily',
  defaultTime: string = '09:00',
  defaultDay?: number
): {
  title: string;
  prompt: string;
  frequency: ScheduledFrequency;
  timeOfDay: string;
  dayOfWeek?: number;
  nextRunAtOverride?: number;
} {
  const clean = rawText.trim();
  const lower = clean.toLowerCase();
  const isReminder = /\b(?:remind(?:er|s| me)?|alarm|don'?t\s+forget|alert\s+me)\b/i.test(lower);

  let frequency: ScheduledFrequency = isReminder ? 'once' : defaultFrequency;
  let timeOfDay = defaultTime;
  let dayOfWeek = defaultDay;
  let nextRunAtOverride: number | undefined;

  if (/\b(?:every\s+hour|hourly)\b/i.test(lower)) {
    frequency = 'hourly';
  } else if (/\b(?:once|one\s+time|tomorrow|tonight|later\s+today)\b/i.test(lower)) {
    frequency = 'once';
  } else if (/\b(?:every\s+week|weekly|every\s+(?:sun|mon|tues|wednes|thurs|fri|satur)day)\b/i.test(lower)) {
    frequency = 'weekly';
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    for (const [name, idx] of Object.entries(dayMap)) {
      if (lower.includes(name)) {
        dayOfWeek = idx;
        break;
      }
    }
  } else if (/\b(?:every\s+day|daily|every\s+morning|every\s+evening|every\s+night)\b/i.test(lower)) {
    frequency = 'daily';
  }

  // Support relative reminders like "in 2 minutes", "in 1 hour"
  const relMatch = clean.match(/\bin\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i);
  if (relMatch) {
    const qty = parseInt(relMatch[1], 10);
    const unit = relMatch[2].toLowerCase();
    const deltaMs = unit.startsWith('h') ? qty * 60 * 60 * 1000 : qty * 60 * 1000;
    if (Number.isFinite(deltaMs) && deltaMs > 0) {
      const target = new Date(Date.now() + deltaMs);
      nextRunAtOverride = target.getTime();
      timeOfDay = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;
      frequency = 'once';
    }
  }

  if (!relMatch) {
    if (/\bmorning\b/i.test(lower) && defaultTime === '09:00') {
      timeOfDay = '08:30';
    } else if (/\bevening\b/i.test(lower) && defaultTime === '09:00') {
      timeOfDay = '19:00';
    } else if (/\bnight\b/i.test(lower) && defaultTime === '09:00') {
      timeOfDay = '21:00';
    }

    // Match explicit clock times like "at 7:30 am", "at 18:00", "at 8pm", or "3:15pm"
    const timeMatch =
      clean.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i) ||
      clean.match(/\b(\d{1,2})(?::(\d{2}))\s*(am|pm)\b/i) ||
      clean.match(/\b(\d{1,2})\s*(am|pm)\b/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const hasMinutesGroup = timeMatch.length >= 4;
      const m = hasMinutesGroup && timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = (hasMinutesGroup ? timeMatch[3] : timeMatch[2])?.toLowerCase();
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        timeOfDay = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }
  }

  const title = clean.length > 48 ? `${clean.slice(0, 45).trim()}...` : clean;
  return {
    title,
    prompt: clean,
    frequency,
    timeOfDay,
    dayOfWeek,
    ...(nextRunAtOverride ? { nextRunAtOverride } : {}),
  };
}

export const scheduledTaskService = {
  getTasks(): ScheduledTask[] {
    try {
      const stored = localStorage.getItem(getScheduledStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.warn('Failed to load scheduled tasks:', err);
    }
    return [];
  },

  saveTasks(tasks: ScheduledTask[]): void {
    try {
      localStorage.setItem(getScheduledStorageKey(), JSON.stringify(tasks));
      const userId = authService.getCurrentUserId();
      if (userId && userId !== 'guest') {
        tasks.slice(0, 40).forEach((t) => {
          firestoreStorageService.saveUserScheduledTask(userId, t).catch(() => {});
        });
      }
    } catch (err) {
      console.warn('Failed to save scheduled tasks:', err);
    }
  },

  async syncWithFirestore(): Promise<ScheduledTask[]> {
    try {
      const userId = authService.getCurrentUserId();
      if (userId && userId !== 'guest') {
        const cloud = await firestoreStorageService.loadUserScheduledTasks(userId);
        if (cloud.length > 0) {
          this.saveTasks(cloud as ScheduledTask[]);
          return cloud as ScheduledTask[];
        }
        const local = this.getTasks();
        for (const t of local) {
          await firestoreStorageService.saveUserScheduledTask(userId, t);
        }
      }
    } catch (err) {
      console.warn('Scheduled task Firestore sync notice:', err);
    }
    return this.getTasks();
  },

  createTask(input: {
    title?: string;
    prompt: string;
    frequency?: ScheduledFrequency;
    timeOfDay?: string;
    dayOfWeek?: number;
    nextRunAt?: number;
  }): ScheduledTask {
    const parsed = parseSchedulePrompt(
      input.prompt,
      input.frequency || 'daily',
      input.timeOfDay || '09:00',
      input.dayOfWeek
    );
    const now = Date.now();
    const resolvedFreq = input.frequency || parsed.frequency;
    const resolvedTime = input.timeOfDay || parsed.timeOfDay;
    const resolvedDay = input.dayOfWeek ?? parsed.dayOfWeek;
    const computedNext =
      input.nextRunAt ||
      (!input.timeOfDay && parsed.nextRunAtOverride) ||
      computeNextRunAt(resolvedFreq, resolvedTime, resolvedDay, now);

    const task: ScheduledTask = {
      id: `sched_${now}_${Math.random().toString(36).slice(2, 6)}`,
      title: (input.title || parsed.title).trim(),
      prompt: input.prompt.trim(),
      frequency: resolvedFreq,
      timeOfDay: resolvedTime,
      dayOfWeek: resolvedDay,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      nextRunAt: computedNext,
      runCount: 0,
    };

    const dedicated = chatService.getOrCreateScheduledChatSession(task);
    task.chatSessionId = dedicated.id;

    const updated = [task, ...this.getTasks()];
    this.saveTasks(updated);
    return task;
  },

  ensureDedicatedChatForTask(
    taskId: string,
    modelId: ForgeXModelId = 'forge-2-ultra'
  ): ChatSession | null {
    const task = this.getTasks().find((t) => t.id === taskId);
    if (!task) return null;
    const dedicated = chatService.getOrCreateScheduledChatSession(task, modelId);
    if (task.chatSessionId !== dedicated.id) {
      this.updateTask(taskId, (prev) => ({
        ...prev,
        chatSessionId: dedicated.id,
      }));
    }
    return dedicated;
  },

  updateTask(taskId: string, updater: (prev: ScheduledTask) => ScheduledTask): ScheduledTask[] {
    const tasks = this.getTasks().map((t) => (t.id === taskId ? { ...updater(t), updatedAt: Date.now() } : t));
    this.saveTasks(tasks);
    return tasks;
  },

  toggleTaskStatus(taskId: string): ScheduledTask[] {
    return this.updateTask(taskId, (t) => {
      const nextStatus = t.status === 'active' ? 'paused' : 'active';
      let chatSessionId = t.chatSessionId;
      if (!chatSessionId) {
        const dedicated = chatService.getOrCreateScheduledChatSession(t);
        chatSessionId = dedicated.id;
      }
      return {
        ...t,
        status: nextStatus,
        ...(chatSessionId ? { chatSessionId } : {}),
        nextRunAt:
          nextStatus === 'active' && t.nextRunAt <= Date.now()
            ? computeNextRunAt(t.frequency, t.timeOfDay, t.dayOfWeek, Date.now())
            : t.nextRunAt,
      };
    });
  },

  deleteTask(taskId: string): ScheduledTask[] {
    const tasks = this.getTasks().filter((t) => t.id !== taskId);
    this.saveTasks(tasks);
    const userId = authService.getCurrentUserId();
    if (userId && userId !== 'guest') {
      firestoreStorageService.deleteUserScheduledTask(userId, taskId).catch(() => {});
    }
    return tasks;
  },

  getDueTasks(now: number = Date.now()): ScheduledTask[] {
    return this.getTasks().filter((t) => t.status === 'active' && t.nextRunAt <= now);
  },

  async runTaskNow(taskId: string, modelId: ForgeXModelId = 'forge-2-ultra'): Promise<{
    task: ScheduledTask | null;
    tasks: ScheduledTask[];
    output: string;
    error?: string;
    chatSessionId?: string;
    isReminder?: boolean;
  }> {
    const current = this.getTasks().find((t) => t.id === taskId);
    if (!current) {
      return { task: null, tasks: this.getTasks(), output: '', error: 'Task not found' };
    }

    const isReminder = isReminderTask(current);
    const needsLiveFetch = /\b(?:news|weather|headlines|briefing|roundup|stock|price|score)\b/i.test(
      `${current.title} ${current.prompt}`
    );

    // Direct reminders fire instantaneously at the user's set time without LLM latency
    if (isReminder && !needsLiveFetch) {
      const runAt = Date.now();
      const { spokenText } = formatCleanReminderText(current);
      const dedicatedSession = chatService.appendScheduledResultToDedicatedChat(
        current,
        `⏰ ${spokenText}`,
        modelId,
        {
          modelUsed: 'ForgeX Reminder',
          searchedWeb: false,
          runAt,
        }
      );
      const updatedTasks = this.updateTask(taskId, (t) => ({
        ...t,
        lastRunAt: runAt,
        lastResult: spokenText,
        lastError: undefined,
        runCount: (t.runCount || 0) + 1,
        status: t.frequency === 'once' ? 'paused' : t.status,
        nextRunAt: computeNextRunAt(t.frequency, t.timeOfDay, t.dayOfWeek, runAt),
        chatSessionId: dedicatedSession.id,
      }));
      const updatedTask = updatedTasks.find((t) => t.id === taskId) || null;
      return {
        task: updatedTask,
        tasks: updatedTasks,
        output: spokenText,
        chatSessionId: dedicatedSession.id,
        isReminder: true,
      };
    }

    const rawApiKey = localStorage.getItem('forgex_api_key') || undefined;
    const apiKey = rawApiKey && rawApiKey.startsWith('AIza') ? rawApiKey : undefined;
    const personalization = buildPersonalizationInstruction();
    const isDailyOrNews = isDailyBriefingTask(current);
    const nowDate = new Date();
    const todayIso = nowDate.toISOString().split('T')[0];
    const todayReadable = nowDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const systemInstruction = [
      'You are executing a scheduled ForgeX automated briefing/task for the user. Deliver a clear, up-to-date, well-formatted Markdown summary ready to read.',
      isDailyOrNews
        ? `LIVE TODAY-ONLY BRIEFING REQUIREMENT: Today's date is ${todayReadable} (${todayIso}). Search live news feeds and Web Search for verified stories published TODAY (${todayIso}) or within the last 24–48 hours. NEVER output stale or old news from past months or years. Cite the exact timeframe/date and publisher for each item.`
        : '',
      personalization,
    ]
      .filter(Boolean)
      .join('\n\n');

    const executionPrompt = isDailyOrNews
      ? `${current.prompt}\n\n[Live Run Context: Today is ${todayReadable} (${todayIso}). Retrieve only real, verified, breaking and today's latest updates—never old stories.]`
      : current.prompt;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          message: executionPrompt,
          history: [],
          modelId,
          searchMode: isDailyOrNews ? 'on' : 'auto',
          systemInstruction,
          ...(apiKey ? { apiKey } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.reply) {
        throw new Error(data?.error || 'Scheduled execution failed');
      }

      const runAt = Date.now();
      const dedicatedSession = chatService.appendScheduledResultToDedicatedChat(
        current,
        data.reply,
        modelId,
        {
          modelUsed: data.model,
          searchedWeb: Boolean(data.searchedWeb),
          searchQueries: Array.isArray(data.searchQueries) ? data.searchQueries : undefined,
          groundingSources: Array.isArray(data.groundingSources) ? data.groundingSources : undefined,
          runAt,
        }
      );
      const dedicatedChatId = dedicatedSession.id;

      const updatedTasks = this.updateTask(taskId, (t) => ({
        ...t,
        lastRunAt: runAt,
        lastResult: data.reply,
        lastError: undefined,
        runCount: (t.runCount || 0) + 1,
        status: t.frequency === 'once' ? 'paused' : t.status,
        nextRunAt: computeNextRunAt(t.frequency, t.timeOfDay, t.dayOfWeek, runAt),
        ...(dedicatedChatId ? { chatSessionId: dedicatedChatId } : {}),
      }));

      const updatedTask = updatedTasks.find((t) => t.id === taskId) || null;
      return {
        task: updatedTask,
        tasks: updatedTasks,
        output: data.reply,
        ...(dedicatedChatId ? { chatSessionId: dedicatedChatId } : {}),
      };
    } catch (err: any) {
      const errMsg = err?.message || 'Unable to execute scheduled task';
      const dedicated = chatService.getOrCreateScheduledChatSession(current, modelId);
      let chatSessionId = dedicated.id;
      if (!dedicated.messages || dedicated.messages.length === 0) {
        const updatedSession = chatService.appendScheduledResultToDedicatedChat(
          current,
          `Could not load today's update right now (${errMsg}). Please send a message below to ask directly or try again shortly.`,
          modelId,
          {
            modelUsed: 'ForgeX Notice',
            searchedWeb: false,
          }
        );
        chatSessionId = updatedSession.id;
      }
      const updatedTasks = this.updateTask(taskId, (t) => ({
        ...t,
        lastError: errMsg,
        chatSessionId,
      }));
      const updatedTask = updatedTasks.find((t) => t.id === taskId) || null;
      return { task: updatedTask, tasks: updatedTasks, output: '', error: errMsg, chatSessionId };
    }
  },
};
