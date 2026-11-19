import React from 'react';
import { BellRing, Clock, Newspaper } from 'lucide-react';
import { ScheduledTask } from '../types';

/**
 * Custom emblem for Daily Learning Spark (radiant spark lightbulb)
 */
export const LearningSparkIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.7 10.7c.6.5 1 1.2 1.1 2h5.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3Z" />
    <path d="M12 6.8l-1.4 2.4h2.8L12 11.6" />
  </svg>
);

export type ScheduledTaskCategory = 'learning' | 'reminder' | 'news' | 'general';

export function getScheduledTaskCategory(
  task?: Pick<ScheduledTask, 'frequency' | 'title' | 'prompt'> | null
): ScheduledTaskCategory {
  if (!task) return 'general';
  const text = `${task.title || ''} ${task.prompt || ''}`;

  if (/\b(?:learning\s*spark|daily\s+learning|5-minute\s+concept|teach\s+me\s+one\s+fascinating\s+concept)\b/i.test(text)) {
    return 'learning';
  }
  if (
    /\b(?:remind(?:er|s| me)?|alarm|don'?t\s+forget|alert\s+me)\b/i.test(text) ||
    (task.frequency === 'once' && !/\b(?:news|briefing|headlines|roundup)\b/i.test(text))
  ) {
    return 'reminder';
  }
  if (
    task.frequency === 'daily' ||
    /\b(?:news|daily|morning|briefing|roundup|update|digest|headlines|weather|market)\b/i.test(text)
  ) {
    return 'news';
  }
  return 'general';
}

export const ScheduledTaskIcon: React.FC<{
  task?: Pick<ScheduledTask, 'frequency' | 'title' | 'prompt'> | null;
  titleFallback?: string;
  className?: string;
}> = ({ task, titleFallback, className = 'w-4 h-4' }) => {
  const effectiveTask = task || (titleFallback ? { frequency: 'daily' as const, title: titleFallback, prompt: titleFallback } : null);
  const category = getScheduledTaskCategory(effectiveTask);

  if (category === 'learning') {
    return <LearningSparkIcon className={`${className} text-emerald-500`} />;
  }
  if (category === 'reminder') {
    return <BellRing className={`${className} text-amber-500`} />;
  }
  if (category === 'news') {
    return <Newspaper className={`${className} text-sky-500`} />;
  }
  return <Clock className={`${className} text-amber-500`} />;
};
