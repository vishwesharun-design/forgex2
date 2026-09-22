import React, { useRef, useEffect } from 'react';
import { Bell, Sparkles, Check, Info } from 'lucide-react';
import { NotificationItem, ForgeXTheme } from '../types';

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  theme: ForgeXTheme;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  theme,
}) => {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      id="popover-notifications"
      className={`absolute right-4 top-16 w-80 sm:w-96 rounded-2xl border p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${
        isDark
          ? 'bg-neutral-900/95 backdrop-blur-md border-neutral-800 text-white shadow-black/80'
          : 'bg-white/95 backdrop-blur-md border-neutral-200 text-neutral-900 shadow-neutral-300'
      }`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800/40 mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <h4 className="font-display font-semibold text-sm">Notifications</h4>
        </div>

        <button
          onClick={onMarkAllRead}
          className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
        >
          <Check className="w-3 h-3" />
          <span>Mark all read</span>
        </button>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-3 rounded-xl border text-xs transition-colors ${
              n.read
                ? isDark
                  ? 'bg-neutral-950/30 border-neutral-850/50 text-neutral-400'
                  : 'bg-neutral-50/50 border-neutral-200 text-neutral-500'
                : isDark
                  ? 'bg-amber-500/10 border-amber-500/30 text-neutral-200'
                  : 'bg-amber-50 border-amber-200 text-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {n.title}
              </span>
              <span className="text-[10px] text-neutral-500">
                {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="leading-relaxed text-[11px]">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
